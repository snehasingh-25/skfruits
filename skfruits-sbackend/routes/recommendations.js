import express from "express";
import prisma from "../prisma.js";
import { cacheMiddleware } from "../utils/cache.js";
const router = express.Router();

/**
 * Product Recommendation Engine
 * GET /recommendations/:productId?limit=10
 * 
 * Returns 6-10 product recommendations based on the current product
 * Priority: Same category → Price range → Trending → New → Best sellers
 */
router.get("/:productId", cacheMiddleware(10 * 60 * 1000), async (req, res) => {
  try {
    const productId = parseInt(req.params.productId, 10);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 6), 20);

    // Get the current product
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        categories: {
          include: {
            category: true,
          },
        },
        occasions: {
          include: {
            occasion: true,
          },
        },
        sizes: true,
      },
    });

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Extract product attributes
    const categoryIds = product.categories.map((pc) => pc.category.id);
    const occasionIds = product.occasions.map((po) => po.occasion.id);
    const priceRange = getPriceRange(product);

    // Build recommendation query with priority
    const recommendations = await getRecommendations(
      productId,
      categoryIds,
      occasionIds,
      priceRange,
      limit
    );

    res.json(recommendations);
  } catch (error) {
    console.error("Recommendation error:", error);
    res.status(500).json({ error: "Failed to fetch recommendations" });
  }
});

/**
 * Calculate price range (±20%)
 */
function getPriceRange(product) {
  let basePrice;
  if (product.hasSinglePrice && product.singlePrice) {
    basePrice = parseFloat(product.singlePrice);
  } else if (product.sizes && product.sizes.length > 0) {
    const prices = product.sizes.map((s) => parseFloat(s.price));
    basePrice = Math.min(...prices); // Use lowest price
  } else {
    basePrice = 0;
  }

  const tolerance = basePrice * 0.2; // 20% tolerance
  return {
    min: basePrice - tolerance,
    max: basePrice + tolerance,
    base: basePrice,
  };
}

/**
 * Get product price (for filtering)
 */
function getProductPrice(product) {
  if (product.hasSinglePrice && product.singlePrice) {
    return parseFloat(product.singlePrice);
  } else if (product.sizes && product.sizes.length > 0) {
    const prices = product.sizes.map((s) => parseFloat(s.price));
    return Math.min(...prices);
  }
  return 0;
}

/**
 * Main recommendation algorithm
 */
async function getRecommendations(productId, categoryIds, occasionIds, priceRange, limit) {
  const recommendations = [];
  const seen = new Set([productId]);

  // Priority 1: Same category + similar price
  const sameCategory = await prisma.product.findMany({
    where: {
      id: { not: productId },
      categories: {
        some: {
          categoryId: {
            in: categoryIds,
          },
        },
      },
    },
    include: {
      sizes: true,
      categories: {
        include: {
          category: true,
        },
      },
      occasions: {
        include: {
          occasion: true,
        },
      },
    },
    orderBy: [
      { isTrending: "desc" }, // Prioritize trending
      { createdAt: "desc" }, // Then newest
    ],
    take: limit * 2, // Fetch more to filter by price
  });

  // Filter by price range and add to recommendations
  for (const p of sameCategory) {
    if (recommendations.length >= limit) break;
    const price = getProductPrice(p);
    if (price >= priceRange.min && price <= priceRange.max && !seen.has(p.id)) {
      recommendations.push(p);
      seen.add(p.id);
    }
  }

  // Priority 2: Same category (any price) if we don't have enough
  if (recommendations.length < limit) {
    for (const p of sameCategory) {
      if (recommendations.length >= limit) break;
      if (!seen.has(p.id)) {
        recommendations.push(p);
        seen.add(p.id);
      }
    }
  }

  // Priority 3: Same occasion
  if (recommendations.length < limit) {
    const sameOccasion = await prisma.product.findMany({
      where: {
        id: { not: productId },
        occasions: {
          some: {
            occasionId: {
              in: occasionIds,
            },
          },
        },
      },
      include: {
        sizes: true,
        categories: {
          include: {
            category: true,
          },
        },
        occasions: {
          include: {
            occasion: true,
          },
        },
      },
      orderBy: [
        { isTrending: "desc" },
        { createdAt: "desc" },
      ],
      take: limit * 2,
    });

    for (const p of sameOccasion) {
      if (recommendations.length >= limit) break;
      if (!seen.has(p.id)) {
        recommendations.push(p);
        seen.add(p.id);
      }
    }
  }

  // Priority 4: Trending products (global)
  if (recommendations.length < limit) {
    const trending = await prisma.product.findMany({
      where: {
        id: { not: productId },
        isTrending: true,
      },
      include: {
        sizes: true,
        categories: {
          include: {
            category: true,
          },
        },
        occasions: {
          include: {
            occasion: true,
          },
        },
      },
      orderBy: [{ createdAt: "desc" }],
      take: limit * 2,
    });

    for (const p of trending) {
      if (recommendations.length >= limit) break;
      if (!seen.has(p.id)) {
        recommendations.push(p);
        seen.add(p.id);
      }
    }
  }

  // Priority 5: New products (global)
  if (recommendations.length < limit) {
    const newProducts = await prisma.product.findMany({
      where: {
        id: { not: productId },
        isNew: true,
      },
      include: {
        sizes: true,
        categories: {
          include: {
            category: true,
          },
        },
        occasions: {
          include: {
            occasion: true,
          },
        },
      },
      orderBy: [{ createdAt: "desc" }],
      take: limit * 2,
    });

    for (const p of newProducts) {
      if (recommendations.length >= limit) break;
      if (!seen.has(p.id)) {
        recommendations.push(p);
        seen.add(p.id);
      }
    }
  }

  // Priority 6: Festival/Special products
  if (recommendations.length < limit) {
    const festival = await prisma.product.findMany({
      where: {
        id: { not: productId },
        isFestival: true,
      },
      include: {
        sizes: true,
        categories: {
          include: {
            category: true,
          },
        },
        occasions: {
          include: {
            occasion: true,
          },
        },
      },
      orderBy: [{ createdAt: "desc" }],
      take: limit * 2,
    });

    for (const p of festival) {
      if (recommendations.length >= limit) break;
      if (!seen.has(p.id)) {
        recommendations.push(p);
        seen.add(p.id);
      }
    }
  }

  // Priority 7: Any product if still needed
  if (recommendations.length < limit) {
    const anyProducts = await prisma.product.findMany({
      where: {
        id: { not: productId },
      },
      include: {
        sizes: true,
        categories: {
          include: {
            category: true,
          },
        },
        occasions: {
          include: {
            occasion: true,
          },
        },
      },
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
      take: limit * 2,
    });

    for (const p of anyProducts) {
      if (recommendations.length >= limit) break;
      if (!seen.has(p.id)) {
        recommendations.push(p);
        seen.add(p.id);
      }
    }
  }

  return recommendations.slice(0, limit);
}

export default router;
