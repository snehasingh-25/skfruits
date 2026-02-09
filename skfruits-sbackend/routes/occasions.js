import express from "express";
import { verifyToken } from "../utils/auth.js";
import upload, { getImageUrl } from "../utils/upload.js";
import prisma from "../prisma.js";
import { cacheMiddleware, invalidateCache } from "../utils/cache.js";
const router = express.Router();

// Get all occasions (public) - Cached for 5 minutes
router.get("/", cacheMiddleware(5 * 60 * 1000), async (req, res) => {
  try {
    const occasions = await prisma.occasion.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: { products: true }
        }
      },
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    });

    res.json(occasions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all occasions (admin - includes inactive)
router.get("/all", verifyToken, async (req, res) => {
  try {
    const occasions = await prisma.occasion.findMany({
      include: {
        _count: {
          select: { products: true }
        }
      },
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    });

    res.json(occasions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single occasion (public) - Cached for 5 minutes
router.get("/:slug", cacheMiddleware(5 * 60 * 1000), async (req, res) => {
  try {
    const occasion = await prisma.occasion.findUnique({
      where: { slug: req.params.slug },
      include: {
        products: {
          include: {
            product: {
              include: {
                sizes: true,
                categories: {
                  include: {
                    category: true,
                  }
                },
              }
            }
          }
        },
        _count: {
          select: { products: true }
        }
      },
    });

    if (!occasion) {
      return res.status(404).json({ message: "Occasion not found" });
    }

    // Transform products
    const products = occasion.products.map(po => {
      const p = po.product;
      return {
        ...p,
        images: p.images ? JSON.parse(p.images) : [],
        keywords: p.keywords ? JSON.parse(p.keywords) : [],
        categories: p.categories ? p.categories.map(pc => pc.category) : [],
      };
    });

    res.json({
      ...occasion,
      products,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create occasion (Admin only)
router.post("/", verifyToken, upload.single("image"), async (req, res) => {
  try {
    // Invalidate occasions cache on create
    invalidateCache("/occasions");
    
    const { name, slug, description, isActive } = req.body;

    let imageUrl = null;
    if (req.file) {
      imageUrl = await getImageUrl(req.file);
    }

    const occasion = await prisma.occasion.create({
      data: {
        name,
        slug,
        description: description || null,
        imageUrl,
        isActive: isActive === "true" || isActive === true,
      },
    });

    res.json(occasion);
  } catch (error) {
    console.error("Create occasion error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Update occasion (Admin only)
router.put("/:id", verifyToken, upload.single("image"), async (req, res) => {
  try {
    // Invalidate occasions cache on update
    invalidateCache("/occasions");
    
    const { name, slug, description, isActive, existingImage } = req.body;

    const existingOccasion = await prisma.occasion.findUnique({
      where: { id: Number(req.params.id) },
    });

    if (!existingOccasion) {
      return res.status(404).json({ message: "Occasion not found" });
    }

    let imageUrl = existingImage || existingOccasion.imageUrl;
    if (req.file) {
      imageUrl = await getImageUrl(req.file);
    }

    const occasion = await prisma.occasion.update({
      where: { id: Number(req.params.id) },
      data: {
        name,
        slug,
        description: description || null,
        imageUrl,
        isActive: isActive === "true" || isActive === true,
      },
    });

    res.json(occasion);
  } catch (error) {
    console.error("Update occasion error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Delete occasion (Admin only)
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    // Invalidate occasions cache on delete
    invalidateCache("/occasions");
    
    await prisma.occasion.delete({
      where: { id: Number(req.params.id) },
    });

    res.json({ message: "Occasion deleted successfully" });
  } catch (error) {
    console.error("Delete occasion error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Update order for multiple occasions (Admin only)
router.post("/reorder", verifyToken, async (req, res) => {
  try {
    const { items } = req.body; // Array of { id, order }
    
    if (!Array.isArray(items)) {
      return res.status(400).json({ message: "Items must be an array" });
    }

    // Invalidate occasions cache
    invalidateCache("/occasions");

    // Update all occasions in a transaction
    await prisma.$transaction(
      items.map((item) =>
        prisma.occasion.update({
          where: { id: Number(item.id) },
          data: { order: Number(item.order) },
        })
      )
    );

    res.json({ message: "Order updated successfully" });
  } catch (error) {
    console.error("Reorder occasions error:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
