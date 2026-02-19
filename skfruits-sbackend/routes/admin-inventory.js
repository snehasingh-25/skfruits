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

/** GET /admin/inventory */
router.get("/", requireRole("admin"), async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      orderBy: [{ name: "asc" }],
      select: { id: true, name: true, stock: true },
    });
    const list = products.map((p) => ({
      productId: p.id,
      name: p.name,
      stock: Number(p.stock ?? 0),
      status: getStockStatus(p.stock),
    }));
    res.json(list);
  } catch (error) {
    console.error("Inventory list error:", error);
    res.status(500).json({ error: error.message || "Failed to fetch inventory" });
  }
});

export default router;
