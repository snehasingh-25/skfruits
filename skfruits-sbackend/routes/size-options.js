import express from "express";
import { verifyToken } from "../utils/auth.js";
import prisma from "../prisma.js";

const router = express.Router();

// Get all size options (public – for product form dropdown/checkboxes)
router.get("/", async (req, res) => {
  try {
    const options = await prisma.sizeOption.findMany({
      orderBy: [{ order: "asc" }, { label: "asc" }],
    });
    res.json(options);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a size option (Admin only) – e.g. when admin adds a new "custom" size
router.post("/", verifyToken, async (req, res) => {
  try {
    const { label, order } = req.body;
    if (!label || typeof label !== "string" || !label.trim()) {
      return res.status(400).json({ message: "Label is required" });
    }
    const trimmed = label.trim();
    const existing = await prisma.sizeOption.findUnique({
      where: { label: trimmed },
    });
    if (existing) {
      return res.json(existing);
    }
    const option = await prisma.sizeOption.create({
      data: {
        label: trimmed,
        order: order != null ? Number(order) : 0,
      },
    });
    res.status(201).json(option);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
