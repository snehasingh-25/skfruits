import express from "express";
import { requireRole } from "../utils/auth.js";
import prisma from "../prisma.js";
import { invalidateCache } from "../utils/cache.js";

const router = express.Router();

/** PUT /admin/products/update-stock/:id — body { stock, sizeId?: number, selectedWeight?: string } for variant-specific stock */
router.put("/update-stock/:id", requireRole("admin"), async (req, res) => {
  try {
    const productId = Number(req.params.id);
    let stock = req.body?.stock;
    const sizeId = req.body?.sizeId != null ? Number(req.body.sizeId) : null;
    const selectedWeight = typeof req.body?.selectedWeight === "string" ? req.body.selectedWeight.trim() : null;

    if (productId <= 0 || !Number.isInteger(productId)) {
      return res.status(400).json({ error: "Invalid product id" });
    }
    if (stock === undefined || stock === null) {
      return res.status(400).json({ error: "stock is required" });
    }
    stock = Number(stock);
    if (!Number.isInteger(stock) || stock < 0) {
      return res.status(400).json({ error: "stock must be a non-negative integer" });
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { sizes: true },
    });
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    if (selectedWeight) {
      let opts;
      try {
        opts = Array.isArray(product.weightOptions) ? [...product.weightOptions] : JSON.parse(product.weightOptions || "[]");
      } catch {
        return res.status(400).json({ error: "Invalid weight options for this product" });
      }
      const idx = opts.findIndex((o) => String(o.weight).trim() === selectedWeight);
      if (idx === -1) {
        return res.status(400).json({ error: `Weight "${selectedWeight}" not found for this product` });
      }
      opts[idx] = { ...opts[idx], stock };
      await prisma.product.update({
        where: { id: productId },
        data: { weightOptions: JSON.stringify(opts) },
      });
      invalidateCache("/products");
      return res.json({ id: productId, variantType: "weight", selectedWeight, stock });
    }

    if (sizeId != null) {
      const size = product.sizes?.find((s) => s.id === sizeId);
      if (!size) {
        return res.status(404).json({ error: "Size not found for this product" });
      }
      await prisma.productSize.update({
        where: { id: sizeId },
        data: { stock },
      });
      invalidateCache("/products");
      return res.json({ id: productId, variantType: "size", sizeId, stock });
    }

    await prisma.product.update({
      where: { id: productId },
      data: { stock },
    });
    invalidateCache("/products");
    return res.json({ id: productId, variantType: "single", stock });
  } catch (error) {
    console.error("Update stock error:", error);
    res.status(500).json({ error: error.message || "Failed to update stock" });
  }
});

export default router;
