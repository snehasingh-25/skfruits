import express from "express";
import { requireRole } from "../utils/auth.js";
import prisma from "../prisma.js";

const router = express.Router();

/** Revenue = successful payments: online (razorpayPaymentId) OR COD delivered */
const revenueWhere = {
  status: { not: "cancelled" },
  OR: [
    { razorpayPaymentId: { not: null } },
    { paymentMethod: "cod", status: "delivered" },
  ],
};

/** GET /admin/analytics/summary */
router.get("/summary", requireRole("admin"), async (req, res) => {
  try {
    const [
      revenueResult,
      totalOrdersCount,
      pendingCount,
      deliveredCount,
      uniqueCustomers,
    ] = await Promise.all([
      prisma.order.aggregate({
        where: revenueWhere,
        _sum: { total: true },
      }),
      prisma.order.count(),
      prisma.order.count({
        where: {
          status: { in: ["processing", "confirmed", "shipped", "out_for_delivery"] },
        },
      }),
      prisma.order.count({ where: { status: "delivered" } }),
      prisma.order.findMany({
        where: { userId: { not: null } },
        select: { userId: true },
        distinct: ["userId"],
      }),
    ]);

    const totalRevenue = Number(revenueResult._sum?.total ?? 0);
    const totalOrders = totalOrdersCount;
    const totalCustomers = uniqueCustomers.length;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    res.json({
      totalRevenue,
      totalOrders,
      totalCustomers,
      averageOrderValue: Math.round(averageOrderValue * 100) / 100,
      pendingOrders: pendingCount,
      deliveredOrders: deliveredCount,
    });
  } catch (error) {
    console.error("Analytics summary error:", error);
    res.status(500).json({ error: error.message || "Failed to fetch analytics summary" });
  }
});

/** GET /admin/analytics/revenue-trend
 * Query: period=day|week|month (default day), from=ISO date, to=ISO date
 */
router.get("/revenue-trend", requireRole("admin"), async (req, res) => {
  try {
    const period = (req.query.period || "day").toLowerCase();
    const fromRaw = req.query.from;
    const toRaw = req.query.to;
    const trunc = period === "month" ? "month" : period === "week" ? "week" : "day";

    const where = { ...revenueWhere };
    if (fromRaw) {
      const from = new Date(fromRaw);
      if (!Number.isNaN(from.getTime())) where.createdAt = { ...where.createdAt, gte: from };
    }
    if (toRaw) {
      const to = new Date(toRaw);
      if (!Number.isNaN(to.getTime())) {
        where.createdAt = { ...where.createdAt, lte: to };
      }
    }

    const orders = await prisma.order.findMany({
      where,
      select: { createdAt: true, total: true },
    });

    const buckets = new Map();
    for (const o of orders) {
      const d = new Date(o.createdAt);
      let key;
      if (trunc === "month") {
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
      } else if (trunc === "week") {
        const weekStart = new Date(d);
        weekStart.setDate(d.getDate() - d.getDay());
        key = weekStart.toISOString().slice(0, 10);
      } else {
        key = d.toISOString().slice(0, 10);
      }
      buckets.set(key, (buckets.get(key) || 0) + Number(o.total));
    }

    const result = Array.from(buckets.entries())
      .map(([date, revenue]) => ({ date, revenue: Math.round(revenue * 100) / 100 }))
      .sort((a, b) => a.date.localeCompare(b.date));

    res.json(result);
  } catch (error) {
    console.error("Revenue trend error:", error);
    res.status(500).json({ error: error.message || "Failed to fetch revenue trend" });
  }
});

/** GET /admin/analytics/top-products */
router.get("/top-products", requireRole("admin"), async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);
    const orderItems = await prisma.orderItem.groupBy({
      by: ["productId"],
      _sum: { subtotal: true, quantity: true },
      where: {
        order: revenueWhere,
      },
    });

    const productIds = [...new Set(orderItems.map((i) => i.productId))];
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true },
    });
    const nameById = Object.fromEntries(products.map((p) => [p.id, p.name]));

    const list = orderItems.map((item) => ({
      productId: item.productId,
      name: nameById[item.productId] ?? `Product #${item.productId}`,
      totalSold: Number(item._sum.quantity ?? 0),
      revenueGenerated: Math.round(Number(item._sum.subtotal ?? 0) * 100) / 100,
    }));

    list.sort((a, b) => b.revenueGenerated - a.revenueGenerated);
    res.json(list.slice(0, limit));
  } catch (error) {
    console.error("Top products error:", error);
    res.status(500).json({ error: error.message || "Failed to fetch top products" });
  }
});

/** GET /admin/analytics/order-status-distribution */
router.get("/order-status-distribution", requireRole("admin"), async (req, res) => {
  try {
    const groups = await prisma.order.groupBy({
      by: ["status"],
      _count: { id: true },
    });
    const result = groups.map((g) => ({
      status: g.status,
      count: g._count.id,
    }));
    result.sort((a, b) => b.count - a.count);
    res.json(result);
  } catch (error) {
    console.error("Order status distribution error:", error);
    res.status(500).json({ error: error.message || "Failed to fetch order status distribution" });
  }
});

export default router;
