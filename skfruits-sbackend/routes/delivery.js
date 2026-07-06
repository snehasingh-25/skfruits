import express from "express";
import prisma from "../prisma.js";
import { getCartItemsForOrder } from "./cart.js";
import { haversineKm } from "../utils/distance.js";
import { getCartSessionId } from "../utils/cartSession.js";
import { getDeliveryWindow } from "../utils/trackingEngine.js";
import { getGoogleMapsRoute, isGoogleMapsConfigured } from "../utils/googleMapsService.js";

const router = express.Router();

function getSessionId(req) {
  return getCartSessionId(req, { includeQuery: true });
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
    res.status(500).json({ error: error.message || "Failed to get delivery charges" });
  }
});

/**
 * GET /delivery/shop-locations
 * Public endpoint — returns all active shop locations so the tracking page
 * can display the real pickup marker instead of a hardcoded coordinate.
 */
router.get("/shop-locations", async (req, res) => {
  try {
    let locations = await prisma.shopLocation.findMany({
      where: { isActive: true },
      select: { id: true, name: true, latitude: true, longitude: true },
      orderBy: { id: "asc" },
    });
    // If no active locations exist, fall back to all locations so the map isn't blank
    if (!locations.length) {
      locations = await prisma.shopLocation.findMany({
        select: { id: true, name: true, latitude: true, longitude: true },
        orderBy: { id: "asc" },
      });
    }
    res.json(locations);
  } catch (error) {
    res.status(500).json({ error: error.message || "Failed to get shop locations" });
  }
});

/**
 * ============================================================================
 * PHASE 2: Service Area & Delivery Time Validation
 * ============================================================================
 */

/**
 * GET /delivery/check-availability
 * Query: latitude, longitude
 * 
 * Validates if delivery location is within service area (10 km from Bhilwara)
 * Response includes distance and availability message
 */
router.get("/check-availability", async (req, res) => {
  try {
    const { latitude, longitude } = req.query;
    
    if (!latitude || !longitude) {
      return res.status(400).json({ error: "Latitude and longitude required" });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ error: "Invalid latitude or longitude" });
    }

    // Fetch shop location from database (first active shop)
    const shopLocation = await prisma.shopLocation.findFirst({
      where: { isActive: true }
    });

    if (!shopLocation) {
      return res.status(500).json({ error: "Shop location not configured" });
    }

    const distanceKm = haversineKm(lat, lng, shopLocation.latitude, shopLocation.longitude);
    const serviceRadiusKm = shopLocation.serviceRadiusKm || 10;
    const isAvailable = distanceKm <= serviceRadiusKm;

    res.json({
      available: isAvailable,
      distanceKm: parseFloat(distanceKm.toFixed(2)),
      serviceRadius: serviceRadiusKm,
      shopLocation: {
        name: shopLocation.name,
        latitude: shopLocation.latitude,
        longitude: shopLocation.longitude
      },
      message: isAvailable 
        ? `Available for delivery (${distanceKm.toFixed(1)} km from ${shopLocation.name})`
        : `Sorry, we're not available here currently. We deliver within ${serviceRadiusKm} km of ${shopLocation.name}.`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /delivery/eta-enhanced
 * Query: latitude, longitude, orderTime (optional ISO string)
 * 
 * PHASE 2b: Enhanced ETA with Google Maps Integration
 * - Step 1: Haversine quick pre-check (instant, free)
 * - Step 2-3: Google Maps routing (with 1-hour cache)
 * - Step 4: Fallback to Haversine if API fails
 * - Step 5: Business rule delivery window (7 PM cutoff, 8 AM minimum)
 */
router.get("/eta-enhanced", async (req, res) => {
  try {
    const { latitude, longitude, orderTime: orderTimeParam } = req.query;
    
    if (!latitude || !longitude) {
      return res.status(400).json({ error: "Latitude and longitude required" });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ error: "Invalid latitude or longitude" });
    }

    // Fetch shop location and delivery config once
    const shopLocation = await prisma.shopLocation.findFirst({
      where: { isActive: true }
    });

    if (!shopLocation) {
      return res.status(500).json({ error: "Shop location not configured" });
    }

    let deliveryConfig = await prisma.deliveryTimeConfig.findFirst();
    if (!deliveryConfig) {
      deliveryConfig = await prisma.deliveryTimeConfig.create({ data: {} });
    }

    // STEP 1: Quick Haversine pre-check (instant, free)
    const haversineDistanceKm = haversineKm(
      lat,
      lng,
      shopLocation.latitude,
      shopLocation.longitude
    );
    
    const serviceRadiusKm = shopLocation.serviceRadiusKm || 10;
    
    // Conservative check: allow if within 15% buffer for haversine
    const roughlyAvailable = haversineDistanceKm <= serviceRadiusKm * 1.15;

    if (!roughlyAvailable) {
      return res.status(400).json({
        error: "Location not in service area",
        message: `Sorry, we're not available here currently. We deliver within ${serviceRadiusKm} km of ${shopLocation.name}.`,
        available: false,
        distanceKm: parseFloat(haversineDistanceKm.toFixed(2)),
        distanceType: "straight-line",
        serviceRadius: serviceRadiusKm
      });
    }

    // STEP 2 & 3: Get Google Maps routing distance (with cache)
    let routingDistanceKm = haversineDistanceKm;
    let routingDistanceMeters = null;
    let routingDurationMinutes = null;
    let distanceSource = "haversine-fallback";
    let cacheInfo = null;
    let routeData = null; // Store polyline and directions for frontend

    // Only call Google Maps if API is configured
    if (isGoogleMapsConfigured()) {
      try {
        
        const routeInfo = await getGoogleMapsRoute(
          shopLocation.latitude,
          shopLocation.longitude,
          lat,
          lng
        );
        
        routingDistanceMeters = routeInfo.distanceMeters;
        routingDistanceKm = routeInfo.distanceKm;
        routingDurationMinutes = routeInfo.durationMinutes;
        distanceSource = routeInfo.source;
        
        // Extract route geometry and directions for frontend
        routeData = {
          polyline: routeInfo.polyline,
          bounds: routeInfo.bounds,
          steps: routeInfo.steps
        };
        
        
        cacheInfo = {
          source: routeInfo.source,
          isCached: routeInfo.source === "cache"
        };
      } catch (apiError) {
        // Graceful fallback - just use haversine
        routingDistanceKm = haversineDistanceKm;
        cacheInfo = {
          error: apiError.message,
          fallback: true
        };
      }
    }

    // Check if within service area with routing distance
    if (routingDistanceKm > serviceRadiusKm) {
      return res.status(400).json({
        error: "Location not in service area",
        message: `Sorry, we're not available here currently. We deliver within ${serviceRadiusKm} km of ${shopLocation.name}.`,
        available: false,
        distanceKm: parseFloat(routingDistanceKm.toFixed(2)),
        distanceType: distanceSource === "haversine-fallback" ? "straight-line" : "routing",
        serviceRadius: serviceRadiusKm
      });
    }

    // STEP 5: Calculate delivery window based on business rules
    const orderTime = orderTimeParam ? new Date(orderTimeParam) : new Date();
    const cutoffHour = deliveryConfig.orderCutoffHour || 19;
    const minDeliveryHour = deliveryConfig.minDeliveryHour || 8;
    const windowStart = deliveryConfig.deliveryWindowStart || 8;
    const windowEnd = deliveryConfig.deliveryWindowEnd || 9;
    const baseProcessingMinutes = deliveryConfig.baseProcessingMinutes || 10;
    const averageSpeedKmph = deliveryConfig.averageSpeedKmph || 20;

    const windowInfo = getDeliveryWindow(
      orderTime,
      cutoffHour,
      minDeliveryHour,
      windowStart,
      windowEnd
    );

    // Calculate accurate ETA
    const processingMinutes = baseProcessingMinutes + (shopLocation.processingTimeMinutes || 0);
    const routeDeliveryMinutes = routingDurationMinutes || 
      Math.ceil((routingDistanceKm / averageSpeedKmph) * 60);
    const totalETAMinutes = processingMinutes + routeDeliveryMinutes;

    const estimatedDeliveryDate = windowInfo.deliveryDate.toISOString().slice(0, 10);

    res.json({
      available: true,
      estimatedDeliveryDate,
      estimatedDeliveryText: windowInfo.formattedWindow,
      deliveryTimeWindow: `${String(windowStart).padStart(2, "0")}:00 - ${String(windowEnd).padStart(2, "0")}:00`,
      cutoffTime: `${String(cutoffHour).padStart(2, "0")}:00`,
      note: windowInfo.message,
      orderedAt: orderTime.toISOString(),
      distance: {
        haversineKm: parseFloat(haversineDistanceKm.toFixed(2)),
        routingKm: parseFloat(routingDistanceKm.toFixed(2)),
        routingMeters: routingDistanceMeters,
        source: distanceSource,
        distanceText: cacheInfo?.source ? `${routingDistanceKm.toFixed(1)}km (${distanceSource})` : `${routingDistanceKm.toFixed(1)}km`
      },
      eta: {
        processingMinutes,
        deliveryMinutes: routeDeliveryMinutes,
        totalMinutes: totalETAMinutes,
        googleMapsMinutes: routingDurationMinutes
      },
      route: routeData, // Polyline, bounds, and turn-by-turn directions
      cache: cacheInfo,
      config: {
        cutoffHour,
        minDeliveryHour,
        windowStart,
        windowEnd
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message || "Failed to get ETA" });
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
    res.status(500).json({ error: error.message || "Failed to validate slot" });
  }
});

/** GET /delivery/checkout-summary — single call for checkout: charges + ETA (+ optional slotId for slot ETA). Backend = source of truth. */
router.get("/checkout-summary", async (req, res) => {
  try {
    const sessionId = getSessionId(req);
    const slotIdParam = req.query?.slotId != null ? Number(req.query.slotId) : null;
    const latParam = req.query?.latitude != null ? parseFloat(req.query.latitude) : null;
    const lngParam = req.query?.longitude != null ? parseFloat(req.query.longitude) : null;

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
      
      let deliveryConfig = await prisma.deliveryTimeConfig.findFirst();
      if (!deliveryConfig) {
        deliveryConfig = await prisma.deliveryTimeConfig.create({ data: {} });
      }
      const cutoffHour = deliveryConfig.orderCutoffHour || 19;

      const cutoff = new Date(orderTime);
      cutoff.setHours(cutoffHour, 0, 0, 0);
      const estimatedDate = orderTime <= cutoff ? new Date(orderTime) : addDays(orderTime, 1);
      estimatedDate.setHours(0, 0, 0, 0);
      etaResult = {
        estimatedDeliveryDate: estimatedDate.toISOString().slice(0, 10),
        estimatedDeliveryText: formatDateForETA(estimatedDate),
      };
    }

    let distanceKm = null;
    let nearestShopName = null;
    let estimatedMinutes = null;
    let serviceable = true;
    if (latParam != null && lngParam != null && !isNaN(latParam) && !isNaN(lngParam)) {
      const estimate = await estimateDeliveryTime(latParam, lngParam);
      serviceable = estimate.serviceable;
      distanceKm = estimate.distanceKm;
      if (estimate.serviceable) {
        nearestShopName = estimate.nearestShop;
        estimatedMinutes = estimate.estimatedMinutes;
      }
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
      distanceKm,
      nearestShopName,
      estimatedMinutes,
      serviceable,
      ...(etaResult.slotId != null && { slotId: etaResult.slotId }),
    });
  } catch (error) {
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
      // Normalize to UTC midnight for stable date-only handling.
      d.setUTCHours(0, 0, 0, 0);
      return d.toISOString().slice(0, 10);
    }
  }

  let deliveryConfig = await prisma.deliveryTimeConfig.findFirst();
  const cutoffHour = deliveryConfig?.orderCutoffHour || 19;

  const cutoff = new Date(orderTime);
  // Keep cutoff logic consistent with the server's date boundaries.
  // We still format the resulting date as UTC date-only to avoid +/-1 day issues.
  cutoff.setUTCHours(cutoffHour, 0, 0, 0);
  const estimatedDate = orderTime <= cutoff ? new Date(orderTime) : addDays(orderTime, 1);
  estimatedDate.setUTCHours(0, 0, 0, 0);
  return estimatedDate.toISOString().slice(0, 10);
}

// ─── Delivery-time estimation ("Delivery in X mins") ────────────────────────

/** Default config if no DeliveryTimeConfig row exists */
const DEFAULT_CONFIG = {
  averageSpeedKmph: 25,
  baseProcessingMinutes: 10,
  bufferMinutes: 5,
  maxDeliverableKm: 15,
  noDriverExtraMinutes: 15,
};

/**
 * Core estimation logic — reused by the API endpoint and by order creation.
 * @param {number} lat - customer latitude
 * @param {number} lng - customer longitude
 * @returns {Promise<object>} estimation result
 */
export async function estimateDeliveryTime(lat, lng) {
  // 1. Fetch active shop locations
  const shops = await prisma.shopLocation.findMany({ where: { isActive: true } });
  if (!shops.length) {
    return { serviceable: false, reason: "No active shop locations configured" };
  }

  // 2. Find nearest shop
  let nearest = null;
  let minDist = Infinity;
  for (const shop of shops) {
    const d = haversineKm(lat, lng, shop.latitude, shop.longitude);
    if (d < minDist) {
      minDist = d;
      nearest = shop;
    }
  }
  const distanceKm = Math.round(minDist * 100) / 100; // 2 decimal places

  // 3. Fetch config (single row) or fall back to defaults
  const configRow = await prisma.deliveryTimeConfig.findFirst();
  const config = { ...DEFAULT_CONFIG, ...configRow };

  // 4. Check serviceability
  if (distanceKm > config.maxDeliverableKm) {
    return {
      serviceable: false,
      reason: "Address is outside our delivery range",
      distanceKm,
      maxDeliverableKm: config.maxDeliverableKm,
    };
  }

  // 5. Check driver availability
  const availableDrivers = await prisma.user.count({
    where: { role: "driver", driverAvailability: "available" },
  });
  const driverAvailable = availableDrivers > 0;

  // 6. Calculate time
  const processingMins = nearest.processingTimeMinutes ?? config.baseProcessingMinutes;
  const travelMins = (distanceKm / config.averageSpeedKmph) * 60;
  const driverWait = driverAvailable ? 0 : config.noDriverExtraMinutes;
  const totalMins = Math.ceil(processingMins + travelMins + config.bufferMinutes + driverWait);

  return {
    serviceable: true,
    estimatedMinutes: totalMins,
    nearestShop: nearest.name,
    distanceKm,
    driverAvailable,
  };
}

/**
 * GET /delivery/estimate-time
 * Query: latitude, longitude
 * Returns estimated delivery time in minutes based on nearest shop + driver availability.
 */
router.get("/estimate-time", async (req, res) => {
  try {
    const lat = parseFloat(req.query.latitude);
    const lng = parseFloat(req.query.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ error: "Valid latitude and longitude are required" });
    }

    const result = await estimateDeliveryTime(lat, lng);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message || "Failed to estimate delivery time" });
  }
});

export default router;
export { calculateDeliveryCharges, getDeliveryRuleForTotal };
