import express from "express";
import { requireRole } from "../utils/auth.js";
import prisma from "../prisma.js";
import { releaseDriverIfAssigned } from "../utils/driverAssignment.js";

const router = express.Router();

const STATUS_VALUES = ["processing", "confirmed", "shipped", "out_for_delivery", "delivered", "cancelled"];

/** Allowed next status from current (logical flow). */
const ALLOWED_TRANSITIONS = {
  pending: ["processing", "confirmed", "cancelled"],
  processing: ["confirmed", "cancelled"],
  confirmed: ["shipped", "cancelled"],
  shipped: ["out_for_delivery"],
  out_for_delivery: ["delivered"],
  delivered: [],
  cancelled: [],
};

function normalizeStatus(value) {
  if (!value || typeof value !== "string") return null;
  const v = value.trim().toLowerCase().replace(/\s+/g, "_");
  if (v === "out_for_delivery" || v === "out for delivery") return "out_for_delivery";
  if (STATUS_VALUES.includes(v)) return v;
  if (v === "pending") return "processing";
  return null;
}

function paymentStatus(order) {
  if (order.paymentMethod === "cod") return "COD";
  if (order.razorpayPaymentId) return "Paid";
  return "Pending";
}

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

function parseProductImage(product) {
  if (!product?.images) return null;
  try {
    const raw = product.images;
    const arr = Array.isArray(raw) ? raw : (typeof raw === "string" ? JSON.parse(raw) : []);
    return arr.length ? arr[0] : null;
  } catch {
    return null;
  }
}

/** GET /admin/orders — all orders, newest first (admin only), includes assigned driver */
router.get("/", requireRole("admin"), async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      include: {
        items: {
          include: { product: true },
        },
        driverUser: { select: { id: true, name: true, phone: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    const list = orders.map((order) => ({
      id: order.id,
      createdAt: order.createdAt,
      driverUserId: order.driverUserId,
      driver: order.driverUser ? { id: order.driverUser.id, name: order.driverUser.name, phone: order.driverUser.phone } : null,
      customerDetails: {
        name: order.customer,
        phone: order.phone,
        email: order.email,
        address: order.address,
      },
      totalAmount: order.total,
      paymentStatus: paymentStatus(order),
      orderStatus: orderStatusDisplay(order.status),
      status: order.status,
      items: (order.items || []).map((item) => ({
        productId: item.productId,
        productName: item.productName,
        sizeLabel: item.sizeLabel,
        quantity: item.quantity,
        price: item.price,
        subtotal: item.subtotal,
        image: parseProductImage(item.product),
      })),
    }));
    res.json(list);
  } catch (error) {
    console.error("Admin orders list error:", error);
    res.status(500).json({ error: error.message || "Failed to fetch orders" });
  }
});

/** GET /admin/orders/:id — full order details (admin only), includes assigned driver */
router.get("/:id", requireRole("admin"), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid order id" });
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: { product: true },
        },
        driverUser: {
          select: { id: true, name: true, email: true, phone: true },
        },
      },
    });
    if (!order) return res.status(404).json({ error: "Order not found" });
    res.json({
      id: order.id,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      driverUserId: order.driverUserId,
      driver: order.driverUser
        ? { id: order.driverUser.id, name: order.driverUser.name, email: order.driverUser.email, phone: order.driverUser.phone }
        : null,
      customerDetails: {
        name: order.customer,
        phone: order.phone,
        email: order.email,
        address: order.address,
      },
      totalAmount: order.total,
      paymentStatus: paymentStatus(order),
      orderStatus: orderStatusDisplay(order.status),
      status: order.status,
      paymentMethod: order.paymentMethod,
      razorpayOrderId: order.razorpayOrderId,
      razorpayPaymentId: order.razorpayPaymentId,
      notes: order.notes,
      items: (order.items || []).map((item) => ({
        productId: item.productId,
        productName: item.productName,
        sizeLabel: item.sizeLabel,
        quantity: item.quantity,
        price: item.price,
        subtotal: item.subtotal,
        image: parseProductImage(item.product),
      })),
    });
  } catch (error) {
    console.error("Admin order detail error:", error);
    res.status(500).json({ error: error.message || "Failed to fetch order" });
  }
});

/** PUT /admin/orders/:id/assign-driver — assign or reassign driver (admin only). Body: { driverUserId } (null to unassign) */
router.put("/:id/assign-driver", requireRole("admin"), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const driverUserId = req.body?.driverUserId != null ? Number(req.body.driverUserId) : null;
    if (!id) return res.status(400).json({ error: "Invalid order id" });

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) return res.status(404).json({ error: "Order not found" });

    if (driverUserId != null) {
      const driverUser = await prisma.user.findFirst({ where: { id: driverUserId, role: "driver" } });
      if (!driverUser) return res.status(400).json({ error: "Driver not found" });
    }

    const previousDriverUserId = order.driverUserId;

    await releaseDriverIfAssigned(prisma, { driverUserId: previousDriverUserId });

    const updated = await prisma.order.update({
      where: { id },
      data: { driverUserId: driverUserId || null },
    });

    if (driverUserId != null) {
      await prisma.user.updateMany({
        where: { id: driverUserId, role: "driver" },
        data: { driverStatus: "busy" },
      });
    }

    const driverUser = updated.driverUserId
      ? await prisma.user.findUnique({
          where: { id: updated.driverUserId },
          select: { id: true, name: true, email: true, phone: true },
        })
      : null;
    res.json({
      id: updated.id,
      driverUserId: updated.driverUserId,
      driver: driverUser ? { id: driverUser.id, name: driverUser.name, email: driverUser.email, phone: driverUser.phone } : null,
    });
  } catch (error) {
    console.error("Admin assign driver error:", error);
    res.status(500).json({ error: error.message || "Failed to assign driver" });
  }
});

/** PUT /admin/orders/update-status/:id — validate transition and update (admin only) */
router.put("/update-status/:id", requireRole("admin"), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const rawStatus = req.body?.orderStatus ?? req.body?.status;
    const newStatus = normalizeStatus(rawStatus);
    if (!id) return res.status(400).json({ error: "Invalid order id" });
    if (!newStatus) return res.status(400).json({ error: "Valid orderStatus required" });

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) return res.status(404).json({ error: "Order not found" });

    const current = String(order.status).toLowerCase().replace(/\s+/g, "_");
    const allowed = ALLOWED_TRANSITIONS[current] || ALLOWED_TRANSITIONS.pending || [];
    if (!allowed.includes(newStatus)) {
      return res.status(400).json({
        error: `Cannot change status from ${orderStatusDisplay(order.status)} to ${orderStatusDisplay(newStatus)}`,
        allowedNext: allowed.map(orderStatusDisplay),
      });
    }

    const updated = await prisma.order.update({
      where: { id },
      data: { status: newStatus },
      include: {
        items: {
          include: { product: true },
        },
      },
    });
    if (newStatus === "delivered") {
      await releaseDriverIfAssigned(prisma, { driverUserId: updated.driverUserId, driverId: updated.driverId });
    }
    res.json({
      id: updated.id,
      status: updated.status,
      orderStatus: orderStatusDisplay(updated.status),
      customerDetails: {
        name: updated.customer,
        phone: updated.phone,
        email: updated.email,
        address: updated.address,
      },
      totalAmount: updated.total,
      paymentStatus: paymentStatus(updated),
      items: (updated.items || []).map((item) => ({
        productId: item.productId,
        productName: item.productName,
        sizeLabel: item.sizeLabel,
        quantity: item.quantity,
        price: item.price,
        subtotal: item.subtotal,
        image: parseProductImage(item.product),
      })),
    });
  } catch (error) {
    console.error("Admin update status error:", error);
    res.status(500).json({ error: error.message || "Failed to update order" });
  }
});

export default router;
