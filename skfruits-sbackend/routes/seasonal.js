import express from "express";
import { requireRole } from "../utils/auth.js";
import upload, { getImageUrl } from "../utils/upload.js";
import prisma from "../prisma.js";
import { cacheMiddleware, invalidateCache } from "../utils/cache.js";

const router = express.Router();

const CACHE_KEY = "/seasonal";

// Get all seasonals (public, active only) - Cached
router.get("/", cacheMiddleware(5 * 60 * 1000), async (req, res) => {
  try {
    const seasonals = await prisma.seasonal.findMany({
      where: { isActive: true },
      orderBy: [{ order: "asc" }, { name: "asc" }],
    });
    res.json(seasonals);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all seasonals (admin - includes inactive)
router.get("/all", requireRole("admin"), async (req, res) => {
  try {
    const seasonals = await prisma.seasonal.findMany({
      orderBy: [{ order: "asc" }, { name: "asc" }],
    });
    res.json(seasonals);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single seasonal by slug (public)
router.get("/:slug", cacheMiddleware(5 * 60 * 1000), async (req, res) => {
  try {
    const seasonal = await prisma.seasonal.findFirst({
      where: { slug: req.params.slug, isActive: true },
    });
    if (!seasonal) {
      return res.status(404).json({ message: "Seasonal not found" });
    }
    res.json(seasonal);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create seasonal (Admin only)
router.post("/", requireRole("admin"), upload.single("image"), async (req, res) => {
  try {
    invalidateCache(CACHE_KEY);
    const { name, slug, description, order, isActive } = req.body;
    let imageUrl = null;
    if (req.file) {
      imageUrl = await getImageUrl(req.file);
    }
    const seasonal = await prisma.seasonal.create({
      data: {
        name,
        slug: slug || name.toLowerCase().replace(/\s+/g, "-"),
        description: description || null,
        imageUrl: imageUrl || null,
        order: order !== undefined && order !== null && order !== "" ? Number(order) : 0,
        isActive: isActive !== undefined ? isActive === true || isActive === "true" : true,
      },
    });
    res.json(seasonal);
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(400).json({ message: "Slug already exists" });
    }
    res.status(500).json({ error: error.message });
  }
});

// Reorder seasonals (Admin only) - must be before PUT /:id
router.post("/reorder", requireRole("admin"), async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ message: "Items must be an array" });
    }
    invalidateCache(CACHE_KEY);
    await prisma.$transaction(
      items.map((item) =>
        prisma.seasonal.update({
          where: { id: Number(item.id) },
          data: { order: Number(item.order) },
        })
      )
    );
    res.json({ message: "Order updated successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update seasonal (Admin only)
router.put("/:id", requireRole("admin"), upload.single("image"), async (req, res) => {
  try {
    invalidateCache(CACHE_KEY);
    const { name, slug, description, existingImageUrl, order, isActive } = req.body;
    let imageUrl = existingImageUrl || null;
    if (req.file) {
      imageUrl = await getImageUrl(req.file);
    }
    const seasonal = await prisma.seasonal.update({
      where: { id: Number(req.params.id) },
      data: {
        name,
        slug: slug || name.toLowerCase().replace(/\s+/g, "-"),
        description: description || null,
        imageUrl: imageUrl || null,
        order: order !== undefined && order !== null && order !== "" ? Number(order) : 0,
        isActive: isActive !== undefined ? isActive === true || isActive === "true" : true,
      },
    });
    res.json(seasonal);
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(400).json({ message: "Slug already exists" });
    }
    res.status(500).json({ error: error.message });
  }
});

// Delete seasonal (Admin only)
router.delete("/:id", requireRole("admin"), async (req, res) => {
  try {
    invalidateCache(CACHE_KEY);
    await prisma.seasonal.delete({
      where: { id: Number(req.params.id) },
    });
    res.json({ message: "Seasonal deleted successfully" });
  } catch (error) {
    if (error.code === "P2003") {
      return res.status(400).json({ message: "Cannot delete seasonal." });
    }
    res.status(500).json({ error: error.message });
  }
});

export default router;
