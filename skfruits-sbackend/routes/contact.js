import express from "express";
import { verifyToken } from "../utils/auth.js";
import prisma from "../prisma.js";
const router = express.Router();

// Submit contact form
router.post("/", async (req, res) => {
  try {
    const { name, email, phone, message } = req.body;

    const contactMessage = await prisma.contactMessage.create({
      data: {
        name,
        email,
        phone: phone || null,
        message,
      },
    });

    res.json({ message: "Message sent successfully", contactMessage });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all messages (Admin only)
router.get("/", verifyToken, async (req, res) => {
  try {
    const messages = await prisma.contactMessage.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark message as read (Admin only)
router.patch("/:id/read", verifyToken, async (req, res) => {
  try {
    const message = await prisma.contactMessage.update({
      where: { id: Number(req.params.id) },
      data: { read: true },
    });
    res.json(message);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete message (Admin only)
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    await prisma.contactMessage.delete({
      where: { id: Number(req.params.id) },
    });
    res.json({ message: "Message deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
