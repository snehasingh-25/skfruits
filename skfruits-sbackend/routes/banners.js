import express from "express";
import { verifyToken } from "../utils/auth.js";
import upload, { getImageUrl } from "../utils/upload.js";
import prisma from "../prisma.js";
import { cacheMiddleware, invalidateCache } from "../utils/cache.js";
const router = express.Router();

// Get all active banners (public) - Cached for 5 minutes
router.get("/", cacheMiddleware(5 * 60 * 1000), async (req, res) => {
  try {
    const { type } = req.query; // Optional filter: "primary" or "secondary"
    const where = { isActive: true };
    if (type) {
      where.bannerType = type;
    }
    
    const banners = await prisma.banner.findMany({
      where,
      orderBy: { order: "asc" },
    });

    res.json(banners);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all banners (admin - includes inactive)
router.get("/all", verifyToken, async (req, res) => {
  try {
    const banners = await prisma.banner.findMany({
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    });

    res.json(banners);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single banner (admin)
router.get("/:id", verifyToken, async (req, res) => {
  try {
    const banner = await prisma.banner.findUnique({
      where: { id: Number(req.params.id) },
    });

    if (!banner) {
      return res.status(404).json({ message: "Banner not found" });
    }

    res.json(banner);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create banner (Admin only)
router.post("/", verifyToken, upload.single("image"), async (req, res) => {
  try {
    // Invalidate banners cache on create
    invalidateCache("/banners");
    
    const { title, subtitle, ctaText, ctaLink, bannerType, isActive, order } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: "Image is required" });
    }

    const imageUrl = await getImageUrl(req.file);

    const banner = await prisma.banner.create({
      data: {
        title,
        subtitle: subtitle || null,
        imageUrl,
        ctaText: ctaText || null,
        ctaLink: ctaLink || null,
        bannerType: bannerType || "primary",
        isActive: isActive === "true" || isActive === true,
        order: order ? Number(order) : 0,
      },
    });

    res.json(banner);
  } catch (error) {
    console.error("Create banner error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Update banner (Admin only)
router.put("/:id", verifyToken, upload.single("image"), async (req, res) => {
  try {
    const { title, subtitle, ctaText, ctaLink, bannerType, isActive, order, existingImage } = req.body;

    const existingBanner = await prisma.banner.findUnique({
      where: { id: Number(req.params.id) },
    });

    if (!existingBanner) {
      return res.status(404).json({ message: "Banner not found" });
    }

    let imageUrl = existingImage || existingBanner.imageUrl;
    if (req.file) {
      imageUrl = await getImageUrl(req.file);
    }

    const banner = await prisma.banner.update({
      where: { id: Number(req.params.id) },
      data: {
        title,
        subtitle: subtitle || null,
        imageUrl,
        ctaText: ctaText || null,
        ctaLink: ctaLink || null,
        bannerType: bannerType || "primary",
        isActive: isActive === "true" || isActive === true,
        order: order ? Number(order) : 0,
      },
    });

    res.json(banner);
  } catch (error) {
    console.error("Update banner error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Update order for multiple banners (Admin only)
router.post("/reorder", verifyToken, async (req, res) => {
  try {
    const { items } = req.body; // Array of { id, order }
    
    if (!Array.isArray(items)) {
      return res.status(400).json({ message: "Items must be an array" });
    }

    // Invalidate banners cache
    invalidateCache("/banners");

    // Update all banners in a transaction
    await prisma.$transaction(
      items.map((item) =>
        prisma.banner.update({
          where: { id: Number(item.id) },
          data: { order: Number(item.order) },
        })
      )
    );

    res.json({ message: "Order updated successfully" });
  } catch (error) {
    console.error("Reorder banners error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Delete banner (Admin only)
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    // Invalidate banners cache on delete
    invalidateCache("/banners");
    
    await prisma.banner.delete({
      where: { id: Number(req.params.id) },
    });

    res.json({ message: "Banner deleted successfully" });
  } catch (error) {
    console.error("Delete banner error:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
