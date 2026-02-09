import express from "express";
import prisma from "../prisma.js";
const router = express.Router();

// Get cart items details (public) - for syncing cart with product data
router.post("/sync", async (req, res) => {
  try {
    const { items } = req.body; // Array of { productId, sizeId, quantity }

    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ error: "Invalid items array" });
    }

    // Fetch product details for all items
    const productIds = [...new Set(items.map(item => item.productId))];
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      include: {
        sizes: true,
        categories: {
          include: {
            category: true,
          }
        },
      },
    });

    // Map products by ID for quick lookup
    const productsMap = {};
    products.forEach(p => {
      productsMap[p.id] = {
        ...p,
        images: p.images ? JSON.parse(p.images) : [],
        keywords: p.keywords ? JSON.parse(p.keywords) : [],
      };
    });

    // Build response with product details
    const syncedItems = items.map(item => {
      const product = productsMap[item.productId];
      if (!product) return null;

      const size = product.sizes.find(s => s.id === item.sizeId);
      if (!size) return null;

      return {
        id: `${item.productId}-${item.sizeId}`,
        productId: product.id,
        productName: product.name,
        productImage: product.images && product.images.length > 0 ? product.images[0] : null,
        sizeId: size.id,
        sizeLabel: size.label,
        price: parseFloat(size.price),
        quantity: item.quantity,
        subtotal: parseFloat(size.price) * item.quantity,
      };
    }).filter(item => item !== null);

    res.json({ items: syncedItems });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
