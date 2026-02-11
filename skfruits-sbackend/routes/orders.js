import express from "express";
import { verifyToken } from "../utils/auth.js";
import prisma from "../prisma.js";
import { getCartItemsForOrder } from "./cart.js";

const router = express.Router();

// POST /orders/create — create order from cart (guest checkout)
// Body: { sessionId, customerDetails: { name, phone, address, city, state, pincode, email? } }
router.post("/create", async (req, res) => {
  try {
    const { sessionId, customerDetails } = req.body || {};
    if (!sessionId || !customerDetails || typeof customerDetails !== "object") {
      return res.status(400).json({ error: "sessionId and customerDetails required" });
    }

    const { name, phone, address, city, state, pincode, email } = customerDetails;
    if (!name?.trim()) return res.status(400).json({ error: "Full name is required" });
    if (!phone?.trim()) return res.status(400).json({ error: "Phone number is required" });
    if (!address?.trim()) return res.status(400).json({ error: "Address is required" });
    if (!city?.trim()) return res.status(400).json({ error: "City is required" });
    if (!state?.trim()) return res.status(400).json({ error: "State is required" });
    if (!pincode?.trim()) return res.status(400).json({ error: "Pincode is required" });

    const items = await getCartItemsForOrder(sessionId);
    if (!items || items.length === 0) {
      return res.status(400).json({ error: "Cart is empty" });
    }

    const total = items.reduce((sum, item) => sum + Number(item.subtotal || 0), 0);
    const addressLine = [address.trim(), city.trim(), state.trim(), pincode.trim()].filter(Boolean).join(", ");

    const order = await prisma.order.create({
      data: {
        customer: name.trim(),
        phone: phone.trim(),
        email: email?.trim() || null,
        address: addressLine,
        total,
        status: "pending",
        items: {
          create: items.map((item) => ({
            productId: item.productId,
            productName: item.productName,
            sizeLabel: item.sizeLabel,
            quantity: item.quantity,
            price: Number(item.price),
            subtotal: Number(item.subtotal),
          })),
        },
      },
    });

    res.json({ orderId: order.id, success: true });
  } catch (error) {
    console.error("Order create error:", error);
    res.status(500).json({ error: error.message || "Failed to create order" });
  }
});

// Create order (public) — legacy shape; keep for backwards compatibility
router.post("/", async (req, res) => {
  try {
    const { customer, phone, email, address, items, notes } = req.body;

    if (!items?.length) return res.status(400).json({ error: "Items required" });
    const total = items.reduce((sum, item) => sum + item.subtotal, 0);

    const order = await prisma.order.create({
      data: {
        customer,
        phone: phone || null,
        email: email || null,
        address: address || null,
        total,
        notes: notes || null,
        items: {
          create: items.map((item) => ({
            productId: item.productId,
            productName: item.productName,
            sizeLabel: item.sizeLabel,
            quantity: item.quantity,
            price: item.price,
            subtotal: item.subtotal,
          })),
        },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all orders (Admin only)
router.get("/", verifyToken, async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update order status (Admin only)
router.patch("/:id/status", verifyToken, async (req, res) => {
  try {
    const { status } = req.body;
    
    const order = await prisma.order.update({
      where: { id: Number(req.params.id) },
      data: { status },
    });
    
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
