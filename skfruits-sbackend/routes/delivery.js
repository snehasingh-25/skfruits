import express from "express";
import prisma from "../prisma.js";
import { getCartItemsForOrder } from "./cart.js";

const router = express.Router();
const CART_SESSION_HEADER = "x-cart-session-id";

function getSessionId(req) {
  return req.headers[CART_SESSION_HEADER]?.trim() || req.query?.sessionId?.trim() || req.body?.sessionId?.trim() || null;
}

/** Get applicable delivery rule for a cart total (highest minimumOrderAmount that is <= cartTotal) */
async function getDeliveryRuleForTotal(cartTotal) {
  const rules = await prisma.deliveryRule.findMany({
    where: { minimumOrderAmount: { lte: cartTotal } },
    orderBy: { minimumOrderAmount: "desc" },
    take: 1,
  });
  return rules[0] || null;
}

/** Calculate delivery fee server-side. Returns { deliveryFee, isFreeDelivery } */
async function calculateDeliveryCharges(cartTotal) {
  if (cartTotal <= 0) {
    return { deliveryFee: 0, isFreeDelivery: true };
  }
  const rule = await getDeliveryRuleForTotal(cartTotal);
  if (!rule) {
    return { deliveryFee: 0, isFreeDelivery: false };
  }
  const freeThreshold = rule.freeDeliveryThreshold ?? Infinity;
  const isFreeDelivery = cartTotal >= freeThreshold;
  const deliveryFee = isFreeDelivery ? 0 : Number(rule.deliveryFee ?? 0);
  return { deliveryFee: Math.max(0, deliveryFee), isFreeDelivery };
}

/**
 * GET /delivery/charges
 * Query: sessionId (optional if X-Cart-Session-Id header set)
 * Backend computes cart total from session and returns delivery fee.
 */
router.get("/charges", async (req, res) => {
  try {
    const sessionId = getSessionId(req);
    let cartTotal = 0;
    if (sessionId) {
      const items = await getCartItemsForOrder(sessionId);
      if (items?.length) {
        cartTotal = items.reduce((sum, item) => sum + Number(item.subtotal || 0), 0);
      }
    }
    const result = await calculateDeliveryCharges(cartTotal);
    res.json(result);
  } catch (error) {
    console.error("Delivery charges error:", error);
    res.status(500).json({ error: error.message || "Failed to get delivery charges" });
  }
});

/** Same-day cutoff hour (e.g. 14 = 2 PM); after this, ETA is next day */
const SAME_DAY_CUTOFF_HOUR = 14;

function addDays(d, days) {
  const out = new Date(d);
  out.setDate(out.getDate() + days);
  return out;
}

function formatDateForETA(date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const tomorrow = addDays(today, 1);
  if (d.getTime() === today.getTime()) return "Delivered Today";
  if (d.getTime() === tomorrow.getTime()) return "Delivered by Tomorrow";
  return `Delivered by ${d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}`;
}

/**
 * GET /delivery/eta
 * Query: slotId (optional), date (optional YYYY-MM-DD), orderTime (optional ISO string)
 * Returns estimatedDeliveryDate and estimatedDeliveryText.
 */
router.get("/eta", async (req, res) => {
  try {
    const { slotId, date: slotDateParam, orderTime: orderTimeParam } = req.query || {};
    const orderTime = orderTimeParam ? new Date(orderTimeParam) : new Date();

    if (slotId) {
      const slotIdNum = Number(slotId);
      if (!Number.isInteger(slotIdNum)) {
        return res.status(400).json({ error: "Invalid slotId" });
      }
      const slot = await prisma.deliverySlot.findFirst({
        where: { id: slotIdNum, isActive: true },
      });
      if (!slot) {
        return res.status(404).json({ error: "Slot not found or inactive" });
      }
      const slotDate = typeof slot.date === "string" ? new Date(slot.date) : slot.date;
      const estimatedDeliveryDate = slotDate.toISOString().slice(0, 10);
      res.json({
        estimatedDeliveryDate,
        estimatedDeliveryText: formatDateForETA(slotDate),
      });
      return;
    }

    if (slotDateParam) {
      const d = new Date(slotDateParam);
      if (Number.isNaN(d.getTime())) {
        return res.status(400).json({ error: "Invalid date" });
      }
      const estimatedDeliveryDate = d.toISOString().slice(0, 10);
      res.json({
        estimatedDeliveryDate,
        estimatedDeliveryText: formatDateForETA(d),
      });
      return;
    }

    // Default ETA: same day if before cutoff, else next day
    const now = orderTime;
    const cutoff = new Date(now);
    cutoff.setHours(SAME_DAY_CUTOFF_HOUR, 0, 0, 0);
    const estimatedDate = now <= cutoff ? new Date(now) : addDays(now, 1);
    estimatedDate.setHours(0, 0, 0, 0);
    const estimatedDeliveryDate = estimatedDate.toISOString().slice(0, 10);

    res.json({
      estimatedDeliveryDate,
      estimatedDeliveryText: formatDateForETA(estimatedDate),
    });
  } catch (error) {
    console.error("Delivery ETA error:", error);
    res.status(500).json({ error: error.message || "Failed to get ETA" });
  }
});

/**
 * GET /delivery/slots
 * Query: from (optional YYYY-MM-DD), days (optional, default 7)
 * Returns available slots: isActive, date >= today, bookedCount < maxOrders (or maxOrders null).
 */
router.get("/slots", async (req, res) => {
  try {
    const fromParam = req.query?.from;
    const days = Math.min(14, Math.max(1, Number(req.query?.days) || 7));
    const fromDate = fromParam ? new Date(fromParam) : new Date();
    if (Number.isNaN(fromDate.getTime())) {
      return res.status(400).json({ error: "Invalid from date" });
    }
    fromDate.setHours(0, 0, 0, 0);
    const toDate = addDays(fromDate, days);
    const toDateStr = toDate.toISOString().slice(0, 10);
    const fromDateStr = fromDate.toISOString().slice(0, 10);

    const slots = await prisma.deliverySlot.findMany({
      where: {
        isActive: true,
        date: { gte: fromDate, lte: toDate },
      },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const available = slots
      .filter((s) => {
        const d = typeof s.date === "string" ? new Date(s.date) : s.date;
        d.setHours(0, 0, 0, 0);
        if (d < today) return false;
        if (s.maxOrders != null && s.bookedCount >= s.maxOrders) return false;
        return true;
      })
      .map((s) => {
        const dateObj = typeof s.date === "string" ? new Date(s.date) : s.date;
        return {
          id: s.id,
          date: dateObj.toISOString().slice(0, 10),
          startTime: s.startTime,
          endTime: s.endTime,
          maxOrders: s.maxOrders,
          bookedCount: s.bookedCount,
          available: s.maxOrders == null ? true : s.bookedCount < s.maxOrders,
        };
      });

    res.json({ slots: available });
  } catch (error) {
    console.error("Delivery slots error:", error);
    res.status(500).json({ error: error.message || "Failed to get slots" });
  }
});

/**
 * POST /delivery/slots/book
 * Body: { slotId }
 * Validates slot is available; does not reserve (reservation happens at order create).
 * Returns { available: true } or 400 if slot full/invalid.
 */
router.post("/slots/book", async (req, res) => {
  try {
    const slotId = Number(req.body?.slotId);
    if (!Number.isInteger(slotId)) {
      return res.status(400).json({ error: "Invalid slotId" });
    }
    const slot = await prisma.deliverySlot.findFirst({
      where: { id: slotId, isActive: true },
    });
    if (!slot) {
      return res.status(400).json({ error: "Slot not found or inactive" });
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const slotDate = typeof slot.date === "string" ? new Date(slot.date) : slot.date;
    slotDate.setHours(0, 0, 0, 0);
    if (slotDate < today) {
      return res.status(400).json({ error: "Slot date has passed" });
    }
    if (slot.maxOrders != null && slot.bookedCount >= slot.maxOrders) {
      return res.status(400).json({ error: "Slot is full" });
    }
    res.json({ available: true, slotId: slot.id });
  } catch (error) {
    console.error("Delivery slot book check error:", error);
    res.status(500).json({ error: error.message || "Failed to validate slot" });
  }
});

/** GET /delivery/checkout-summary — single call for checkout: charges + ETA (+ optional slotId for slot ETA). Backend = source of truth. */
router.get("/checkout-summary", async (req, res) => {
  try {
    const sessionId = getSessionId(req);
    const slotIdParam = req.query?.slotId != null ? Number(req.query.slotId) : null;
    let cartTotal = 0;
    if (sessionId) {
      const items = await getCartItemsForOrder(sessionId);
      if (items?.length) {
        cartTotal = items.reduce((sum, item) => sum + Number(item.subtotal || 0), 0);
      }
    }

    const charges = await calculateDeliveryCharges(cartTotal);

    let etaResult = {};
    if (Number.isInteger(slotIdParam) && slotIdParam > 0) {
      const slot = await prisma.deliverySlot.findFirst({
        where: { id: slotIdParam, isActive: true },
      });
      if (slot) {
        const slotDate = typeof slot.date === "string" ? new Date(slot.date) : slot.date;
        etaResult = {
          estimatedDeliveryDate: slotDate.toISOString().slice(0, 10),
          estimatedDeliveryText: formatDateForETA(slotDate),
          slotId: slot.id,
        };
      }
    }
    if (!etaResult.estimatedDeliveryDate) {
      const orderTime = new Date();
      const cutoff = new Date(orderTime);
      cutoff.setHours(SAME_DAY_CUTOFF_HOUR, 0, 0, 0);
      const estimatedDate = orderTime <= cutoff ? new Date(orderTime) : addDays(orderTime, 1);
      estimatedDate.setHours(0, 0, 0, 0);
      etaResult = {
        estimatedDeliveryDate: estimatedDate.toISOString().slice(0, 10),
        estimatedDeliveryText: formatDateForETA(estimatedDate),
      };
    }

    const subtotal = Math.max(0, cartTotal);
    const deliveryFee = Math.max(0, charges.deliveryFee);
    const discountAmount = 0; // Future: apply coupon/promo server-side
    const total = Math.max(0, subtotal - discountAmount + deliveryFee);

    res.json({
      subtotal,
      discountAmount,
      deliveryFee: charges.deliveryFee,
      isFreeDelivery: charges.isFreeDelivery,
      total,
      estimatedDeliveryDate: etaResult.estimatedDeliveryDate,
      estimatedDeliveryText: etaResult.estimatedDeliveryText,
      ...(etaResult.slotId != null && { slotId: etaResult.slotId }),
    });
  } catch (error) {
    console.error("Checkout summary error:", error);
    res.status(500).json({ error: error.message || "Failed to get checkout summary" });
  }
});

/** Resolve estimated delivery date for order: from slot or default ETA. */
export async function getEstimatedDeliveryForOrder(deliverySlotId, orderTime = new Date()) {
  if (deliverySlotId != null && Number.isInteger(Number(deliverySlotId))) {
    const slot = await prisma.deliverySlot.findFirst({
      where: { id: Number(deliverySlotId), isActive: true },
    });
    if (slot) {
      const d = typeof slot.date === "string" ? new Date(slot.date) : slot.date;
      return d.toISOString().slice(0, 10);
    }
  }
  const cutoff = new Date(orderTime);
  cutoff.setHours(SAME_DAY_CUTOFF_HOUR, 0, 0, 0);
  const estimatedDate = orderTime <= cutoff ? new Date(orderTime) : addDays(orderTime, 1);
  estimatedDate.setHours(0, 0, 0, 0);
  return estimatedDate.toISOString().slice(0, 10);
}

export default router;
export { calculateDeliveryCharges, getDeliveryRuleForTotal };
