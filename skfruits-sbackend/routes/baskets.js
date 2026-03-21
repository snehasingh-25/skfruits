import express from "express";
import { requireRole } from "../utils/auth.js";
import { uploadBasketImages, getImageUrl } from "../utils/upload.js";
import prisma from "../prisma.js";
import { cacheMiddleware, invalidateCache } from "../utils/cache.js";

const router = express.Router();
const CACHE_PATTERN = "/baskets";

// Get all active baskets (public) - Cached for 5 minutes
router.get("/", cacheMiddleware(5 * 60 * 1000), async (req, res) => {
  try {
    const baskets = await prisma.fruitBasket.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
    res.json(baskets);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all baskets (admin - includes inactive)
router.get("/all", requireRole("admin"), async (req, res) => {
  try {
    const baskets = await prisma.fruitBasket.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
    res.json(baskets);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single basket (public)
router.get("/:id", async (req, res) => {
  try {
    const basket = await prisma.fruitBasket.findUnique({
      where: { id: Number(req.params.id) },
    });
    if (!basket) {
      return res.status(404).json({ message: "Basket not found" });
    }
    if (!basket.isActive) {
      return res.status(404).json({ message: "Basket not found" });
    }
    res.json(basket);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create basket (Admin only)
router.post("/", requireRole("admin"), uploadBasketImages, async (req, res) => {
  try {
    invalidateCache(CACHE_PATTERN);

    const { title, price, isActive, sortOrder } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: "Title is required" });
    }
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum < 0) {
      return res.status(400).json({ error: "Valid price is required" });
    }

    let emptyImageUrl = null;
    let filledImageUrl = null;

    if (req.files?.emptyImage?.[0]) {
      emptyImageUrl = await getImageUrl(req.files.emptyImage[0]);
    }
    if (req.files?.filledImage?.[0]) {
      filledImageUrl = await getImageUrl(req.files.filledImage[0]);
    }

    const basket = await prisma.fruitBasket.create({
      data: {
        title: title.trim(),
        price: priceNum,
        emptyImageUrl: emptyImageUrl || null,
        filledImageUrl: filledImageUrl || null,
        isActive: isActive === "true" || isActive === true,
        sortOrder: sortOrder !== undefined && sortOrder !== "" ? Number(sortOrder) : 0,
      },
    });

    res.json(basket);
  } catch (error) {
    console.error("Create basket error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Update basket (Admin only)
router.put("/:id", requireRole("admin"), uploadBasketImages, async (req, res) => {
  try {
    invalidateCache(CACHE_PATTERN);

    const { title, price, isActive, sortOrder, existingEmptyImageUrl, existingFilledImageUrl } = req.body;

    const existing = await prisma.fruitBasket.findUnique({
      where: { id: Number(req.params.id) },
    });

    if (!existing) {
      return res.status(404).json({ message: "Basket not found" });
    }

    let emptyImageUrl = existingEmptyImageUrl || existing.emptyImageUrl;
    let filledImageUrl = existingFilledImageUrl || existing.filledImageUrl;

    if (req.files?.emptyImage?.[0]) {
      emptyImageUrl = await getImageUrl(req.files.emptyImage[0]);
    }
    if (req.files?.filledImage?.[0]) {
      filledImageUrl = await getImageUrl(req.files.filledImage[0]);
    }

    const updateData = {
      emptyImageUrl: emptyImageUrl || null,
      filledImageUrl: filledImageUrl || null,
      isActive: isActive === "true" || isActive === true,
      sortOrder: sortOrder !== undefined && sortOrder !== "" ? Number(sortOrder) : existing.sortOrder,
    };

    if (title !== undefined) updateData.title = title.trim();
    if (price !== undefined) {
      const priceNum = parseFloat(price);
      if (!isNaN(priceNum) && priceNum >= 0) updateData.price = priceNum;
    }

    const basket = await prisma.fruitBasket.update({
      where: { id: Number(req.params.id) },
      data: updateData,
    });

    res.json(basket);
  } catch (error) {
    console.error("Update basket error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Reorder baskets (Admin only)
router.post("/reorder", requireRole("admin"), async (req, res) => {
  try {
    const { items } = req.body;

    if (!Array.isArray(items)) {
      return res.status(400).json({ message: "Items must be an array" });
    }

    invalidateCache(CACHE_PATTERN);

    await prisma.$transaction(
      items.map((item) =>
        prisma.fruitBasket.update({
          where: { id: Number(item.id) },
          data: { sortOrder: Number(item.order) },
        })
      )
    );

    res.json({ message: "Order updated successfully" });
  } catch (error) {
    console.error("Reorder baskets error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Delete basket (Admin only)
router.delete("/:id", requireRole("admin"), async (req, res) => {
  try {
    invalidateCache(CACHE_PATTERN);

    const id = Number(req.params.id);
    const existing = await prisma.fruitBasket.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({ message: "Basket not found" });
    }

    await prisma.fruitBasket.delete({
      where: { id },
    });

    res.json({ message: "Basket deleted successfully" });
  } catch (error) {
    console.error("Delete basket error:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
