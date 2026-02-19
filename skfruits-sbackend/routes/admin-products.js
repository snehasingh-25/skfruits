import express from "express";
import { requireRole } from "../utils/auth.js";
import prisma from "../prisma.js";
import { invalidateCache } from "../utils/cache.js";

const router = express.Router();

/** PUT /admin/products/update-stock/:id — body { stock } */
router.put("/update-stock/:id", requireRole("admin"), async (req, res) => {
  try {
    const id = Number(req.params.id);
    let stock = req.body?.stock;
    if (id <= 0 || !Number.isInteger(id)) {
      return res.status(400).json({ error: "Invalid product id" });
    }
    if (stock === undefined || stock === null) {
      return res.status(400).json({ error: "stock is required" });
    }
    stock = Number(stock);
    if (!Number.isInteger(stock) || stock < 0) {
      return res.status(400).json({ error: "stock must be a non-negative integer" });
    }

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    const updated = await prisma.product.update({
      where: { id },
      data: { stock },
    });
    invalidateCache("/products");
    res.json({ id: updated.id, stock: updated.stock });
  } catch (error) {
    console.error("Update stock error:", error);
    res.status(500).json({ error: error.message || "Failed to update stock" });
  }
});

export default router;
