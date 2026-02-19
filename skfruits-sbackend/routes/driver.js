import express from "express";
import { requireRole } from "../utils/auth.js";
import prisma from "../prisma.js";
import { releaseDriverIfAssigned } from "../utils/driverAssignment.js";

const router = express.Router();

/** Driver can only move: shipped -> out_for_delivery, out_for_delivery -> delivered */
const DRIVER_ALLOWED_TRANSITIONS = {
  shipped: ["out_for_delivery"],
  out_for_delivery: ["delivered"],
};

function orderStatusDisplay(status) {
  const map = {
    pending: "Processing",
    processing: "Processing",
    confirmed: "Confirmed",
    shipped: "Shipped",
    out_for_delivery: "Out for Delivery",
    delivered: "Delivered",
    cancelled: "Cancelled",
  };
  return map[String(status).toLowerCase()] || status;
}

function normalizeStatus(value) {
  if (!value || typeof value !== "string") return null;
  const v = value.trim().toLowerCase().replace(/\s+/g, "_");
  if (v === "out_for_delivery" || v === "out for delivery") return "out_for_delivery";
  return ["shipped", "out_for_delivery", "delivered"].includes(v) ? v : null;
}

/** GET /driver/me — validate driver token, return minimal profile (driver role only) */
router.get("/me", requireRole("driver"), async (req, res) => {
  res.json({
    userId: req.userId,
    email: req.userEmail,
    role: req.role,
  });
});

/** GET /driver/orders — orders assigned to this driver (driver role only) */
router.get("/orders", requireRole("driver"), async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: { driverUserId: req.userId },
      include: {
        items: {
          include: { product: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    const list = orders.map((order) => ({
      id: order.id,
      createdAt: order.createdAt,
      status: order.status,
      orderStatus: orderStatusDisplay(order.status),
      customer: order.customer,
      phone: order.phone,
      email: order.email,
      address: order.address,
      addressLatitude: order.addressLatitude ?? null,
      addressLongitude: order.addressLongitude ?? null,
      total: order.total,
      deliveryFee: order.deliveryFee,
      estimatedDeliveryDate: order.estimatedDeliveryDate,
      notes: order.notes,
      items: (order.items || []).map((item) => ({
        productName: item.productName,
        sizeLabel: item.sizeLabel,
        quantity: item.quantity,
        price: item.price,
        subtotal: item.subtotal,
      })),
    }));
    res.json(list);
  } catch (error) {
    console.error("Driver orders error:", error);
    res.status(500).json({ error: error.message || "Failed to fetch orders" });
  }
});

/** PUT /driver/orders/:id/status — driver updates order status (out_for_delivery | delivered only, for orders assigned to this driver) */
router.put("/orders/:id/status", requireRole("driver"), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id || Number.isNaN(id)) return res.status(400).json({ error: "Invalid order id" });
    const newStatus = normalizeStatus(req.body?.status ?? req.body?.orderStatus);
    if (!newStatus) return res.status(400).json({ error: "Valid status required: out_for_delivery or delivered" });

    const order = await prisma.order.findFirst({
      where: { id, driverUserId: req.userId },
    });
    if (!order) return res.status(404).json({ error: "Order not found or not assigned to you" });

    const current = String(order.status).toLowerCase().replace(/\s+/g, "_");
    const allowed = DRIVER_ALLOWED_TRANSITIONS[current];
    if (!allowed || !allowed.includes(newStatus)) {
      return res.status(400).json({
        error: `Cannot change status from ${orderStatusDisplay(order.status)} to ${orderStatusDisplay(newStatus)}`,
      });
    }

    const updated = await prisma.order.update({
      where: { id },
      data: { status: newStatus },
    });

    if (newStatus === "delivered") {
      await releaseDriverIfAssigned(prisma, { driverUserId: updated.driverUserId });
    }

    res.json({
      id: updated.id,
      status: updated.status,
      orderStatus: orderStatusDisplay(updated.status),
    });
  } catch (error) {
    console.error("Driver update order status error:", error);
    res.status(500).json({ error: error.message || "Failed to update order status" });
  }
});

export default router;
