import express from "express";
import { requireRole } from "../utils/auth.js";
import prisma from "../prisma.js";

const router = express.Router();
const LOW_STOCK_THRESHOLD = 5;

function getStockStatus(stock) {
  const s = Number(stock ?? 0);
  if (s <= 0) return "Out of Stock";
  if (s <= LOW_STOCK_THRESHOLD) return "Low Stock";
  return "In Stock";
}

/**
 * GET /admin/inventory
 * Returns one row per variant: product + size, product + weight, or product (single).
 * Each row: { productId, productName, variantType: 'size'|'weight'|'single', variantLabel, sizeId?, selectedWeight?, stock, status, rowId }
 */
router.get("/", requireRole("admin"), async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      orderBy: [{ name: "asc" }],
      include: { sizes: true },
    });

    const list = [];
    for (const p of products) {
      const productName = p.name;

      // Weight variants (fruits)
      if (p.weightOptions) {
        let opts;
        try {
          opts = Array.isArray(p.weightOptions) ? p.weightOptions : JSON.parse(p.weightOptions || "[]");
        } catch {
          opts = [];
        }
        if (opts.length > 0) {
          for (const w of opts) {
            const weightLabel = String(w.weight || "").trim();
            const stock = Math.max(0, Number(w.stock ?? p.stock ?? 0));
            list.push({
              productId: p.id,
              productName,
              variantType: "weight",
              variantLabel: weightLabel,
              selectedWeight: weightLabel,
              sizeId: null,
              stock,
              status: getStockStatus(stock),
              rowId: `${p.id}_weight_${weightLabel}`,
            });
          }
          continue;
        }
      }

      // Size variants
      if (p.sizes && p.sizes.length > 0) {
        for (const s of p.sizes) {
          const stock = Math.max(0, Number(s.stock ?? 0));
          list.push({
            productId: p.id,
            productName,
            variantType: "size",
            variantLabel: s.label,
            sizeId: s.id,
            selectedWeight: null,
            stock,
            status: getStockStatus(stock),
            rowId: `${p.id}_size_${s.id}`,
          });
        }
        continue;
      }

      // Single price (no sizes, no weights)
      const stock = Math.max(0, Number(p.stock ?? 0));
      list.push({
        productId: p.id,
        productName,
        variantType: "single",
        variantLabel: "Single",
        sizeId: null,
        selectedWeight: null,
        stock,
        status: getStockStatus(stock),
        rowId: `${p.id}_single`,
      });
    }

    res.json(list);
  } catch (error) {
    console.error("Inventory list error:", error);
    res.status(500).json({ error: error.message || "Failed to fetch inventory" });
  }
});

export default router;
