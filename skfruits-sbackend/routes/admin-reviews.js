import express from "express";
import { requireRole } from "../utils/auth.js";
import prisma from "../prisma.js";

const router = express.Router();

/** GET /admin/reviews — Fetch all reviews with product and user association (admin only). */
router.get("/", requireRole("admin"), async (req, res) => {
  try {
    const reviews = await prisma.review.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        product: {
          select: { id: true, name: true },
        },
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });
    res.json(
      reviews.map((r) => ({
        id: r.id,
        productId: r.productId,
        productName: r.product?.name ?? null,
        userId: r.userId,
        userName: r.user?.name ?? null,
        userEmail: r.user?.email ?? null,
        rating: r.rating,
        comment: r.comment ?? "",
        createdAt: r.createdAt,
      }))
    );
  } catch (error) {
    console.error("Admin reviews GET error:", error);
    res.status(500).json({ error: "Failed to fetch reviews" });
  }
});

export default router;
