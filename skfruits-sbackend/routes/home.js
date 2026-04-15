import express from "express";
import prisma from "../prisma.js";
import { cacheMiddleware } from "../utils/cache.js";
import { PACKAGING_PRODUCT_NAME } from "../utils/fruitBasketPackagingProduct.js";

const router = express.Router();

/**
 * GET /home — Single request for homepage: categories, products, reels, primary banners.
 * Cached 5 minutes.
 */
router.get("/", cacheMiddleware(5 * 60 * 1000), async (req, res) => {
  try {
    const [categories, products, reels, banners] = await Promise.all([
      prisma.category.findMany({
        include: { _count: { select: { products: true } } },
        orderBy: [{ order: "asc" }, { name: "asc" }],
      }),
      prisma.product.findMany({
        where: { name: { not: PACKAGING_PRODUCT_NAME } },
        include: {
          sizes: true,
          categories: { include: { category: true } },
        },
        orderBy: [{ order: "asc" }, { createdAt: "desc" }],
      }),
      prisma.reel.findMany({
        where: { isActive: true },
        orderBy: { order: "asc" },
        include: {
          product: {
            include: {
              sizes: true,
              categories: { include: { category: true } },
            },
          },
        },
      }),
      prisma.banner.findMany({
        where: { isActive: true, bannerType: "primary" },
        orderBy: { order: "asc" },
      }),
    ]);

    const parsedProducts = products.map((p) => ({
      ...p,
      images: p.images ? JSON.parse(p.images) : [],
      videos: p.videos ? JSON.parse(p.videos) : [],
      keywords: p.keywords ? JSON.parse(p.keywords) : [],
      weightOptions: p.weightOptions
        ? (() => {
            try {
              const w = JSON.parse(p.weightOptions);
              return Array.isArray(w) ? w : [];
            } catch {
              return [];
            }
          })()
        : [],
      categories: p.categories ? p.categories.map((pc) => pc.category) : [],
    }));

    res.json({
      categories,
      products: parsedProducts,
      reels,
      banners,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
