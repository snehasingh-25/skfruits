import express from "express";
import { verifyToken } from "../utils/auth.js";
import prisma from "../prisma.js";
const router = express.Router();

// Create order (public)
router.post("/", async (req, res) => {
  try {
    const { customer, phone, email, address, items, notes } = req.body;

    // Calculate total
    const total = items.reduce((sum, item) => sum + item.subtotal, 0);

    // Create order with items
    const order = await prisma.order.create({
      data: {
        customer,
        phone: phone || null,
        email: email || null,
        address: address || null,
        total,
        notes: notes || null,
        items: {
          create: items.map(item => ({
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
