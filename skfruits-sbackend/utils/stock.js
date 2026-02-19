import prisma from "../prisma.js";

/**
 * Deduct stock for order items inside a transaction. Prevents negative stock and race conditions.
 * @param {import("@prisma/client").Prisma.TransactionClient} tx - Prisma transaction client
 * @param {Array<{ productId: number, quantity: number }>} items - Order line items
 * @throws {Error} If any product has insufficient stock
 */
export async function deductStockForOrder(tx, items) {
  const byProduct = new Map();
  for (const item of items) {
    const pid = Number(item.productId);
    const qty = Number(item.quantity) || 0;
    if (pid && qty > 0) {
      byProduct.set(pid, (byProduct.get(pid) || 0) + qty);
    }
  }
  for (const [productId, qty] of byProduct) {
    const result = await tx.$executeRaw`
      UPDATE "Product"
      SET stock = stock - ${qty}
      WHERE id = ${productId} AND stock >= ${qty}
    `;
    if (result === 0) {
      const p = await tx.product.findUnique({
        where: { id: productId },
        select: { name: true, stock: true },
      });
      throw new Error(
        p
          ? `Insufficient stock for "${p.name}". Available: ${p.stock}`
          : "Insufficient stock for one or more items"
      );
    }
  }
}

/**
 * Validate that cart items have sufficient stock (read-only). Use before creating order.
 * @param {Array<{ productId: number, quantity: number }>} items
 * @returns {{ ok: boolean, error?: string }}
 */
export async function validateStockForItems(items) {
  const byProduct = new Map();
  for (const item of items) {
    const pid = Number(item.productId);
    const qty = Number(item.quantity) || 0;
    if (pid && qty > 0) {
      byProduct.set(pid, (byProduct.get(pid) || 0) + qty);
    }
  }
  const productIds = [...byProduct.keys()];
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true, stock: true },
  });
  for (const p of products) {
    const required = byProduct.get(p.id) || 0;
    const stock = Number(p.stock ?? 0);
    if (required > stock) {
      return {
        ok: false,
        error: stock === 0
          ? `"${p.name}" is out of stock`
          : `Insufficient stock for "${p.name}". Available: ${stock}`,
      };
    }
  }
  const missing = productIds.filter((id) => !products.find((p) => p.id === id));
  if (missing.length) {
    return { ok: false, error: "One or more products are no longer available" };
  }
  return { ok: true };
}
