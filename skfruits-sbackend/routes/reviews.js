import express from "express";
import prisma from "../prisma.js";
import { requireCustomerAuth, optionalCustomerAuth, optionalAdminAuth } from "../utils/auth.js";

const router = express.Router();

/** Check if user has purchased a product (has Order with userId and OrderItem with productId). */
async function userHasPurchasedProduct(userId, productId) {
  const order = await prisma.order.findFirst({
    where: {
      userId: Number(userId),
      items: {
        some: { productId: Number(productId) },
      },
    },
    select: { id: true },
  });
  return !!order;
}

/** GET /reviews/eligibility/:productId — Returns { canReview, hasPurchased, existingReview } for authenticated user. */
router.get("/eligibility/:productId", requireCustomerAuth, async (req, res) => {
  try {
    const userId = req.customerUserId;
    const productId = Number(req.params.productId);
    if (!productId || Number.isNaN(productId)) {
      return res.status(400).json({ error: "Invalid product id" });
    }
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }
    const [existingReview, hasPurchased] = await Promise.all([
      prisma.review.findUnique({
        where: { userId_productId: { userId, productId } },
        select: { id: true, rating: true, comment: true, createdAt: true },
      }),
      userHasPurchasedProduct(userId, productId),
    ]);
    const canReview = hasPurchased && !existingReview;
    res.json({
      canReview,
      hasPurchased,
      existingReview: existingReview
        ? {
            id: existingReview.id,
            rating: existingReview.rating,
            comment: existingReview.comment,
            createdAt: existingReview.createdAt,
          }
        : null,
    });
  } catch (error) {
    console.error("Reviews eligibility error:", error);
    res.status(500).json({ error: "Failed to check eligibility" });
  }
});

/** POST /reviews/add — Body: { productId, rating, comment }. Auth required. Validate rating 1–5. Recommend: only if purchased. Prevent duplicate. */
router.post("/add", requireCustomerAuth, async (req, res) => {
  try {
    const userId = req.customerUserId;
    const { productId: rawProductId, rating: rawRating, comment } = req.body || {};
    const productId = Number(rawProductId);
    if (!productId || Number.isNaN(productId)) {
      return res.status(400).json({ error: "productId is required" });
    }
    const rating = typeof rawRating === "number" ? rawRating : parseInt(rawRating, 10);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ error: "Rating must be an integer between 1 and 5" });
    }
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }
    const hasPurchased = await userHasPurchasedProduct(userId, productId);
    if (!hasPurchased) {
      return res.status(403).json({ error: "Purchase this product to leave a review" });
    }
    const existing = await prisma.review.findUnique({
      where: { userId_productId: { userId, productId } },
    });
    if (existing) {
      return res.status(409).json({ error: "You have already reviewed this product" });
    }
    const review = await prisma.review.create({
      data: {
        productId,
        userId,
        rating,
        comment: typeof comment === "string" ? comment.trim() || null : null,
      },
      include: { user: { select: { name: true } } },
    });
    res.status(201).json({
      id: review.id,
      userName: review.user?.name ?? "Anonymous",
      rating: review.rating,
      comment: review.comment ?? "",
      createdAt: review.createdAt,
    });
  } catch (error) {
    console.error("Review add error:", error);
    res.status(500).json({ error: "Failed to add review" });
  }
});

/** PUT /reviews/update/:id — Only review owner can update. */
router.put("/update/:id", requireCustomerAuth, async (req, res) => {
  try {
    const userId = req.customerUserId;
    const reviewId = Number(req.params.id);
    if (!reviewId || Number.isNaN(reviewId)) {
      return res.status(400).json({ error: "Invalid review id" });
    }
    const { rating: rawRating, comment } = req.body || {};
    const rating = rawRating !== undefined ? (typeof rawRating === "number" ? rawRating : parseInt(rawRating, 10)) : undefined;
    if (rating !== undefined && (!Number.isInteger(rating) || rating < 1 || rating > 5)) {
      return res.status(400).json({ error: "Rating must be an integer between 1 and 5" });
    }
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
    });
    if (!review) {
      return res.status(404).json({ error: "Review not found" });
    }
    if (review.userId !== userId) {
      return res.status(403).json({ error: "You can only edit your own review" });
    }
    const updated = await prisma.review.update({
      where: { id: reviewId },
      data: {
        ...(rating !== undefined && { rating }),
        ...(comment !== undefined && { comment: typeof comment === "string" ? comment.trim() || null : null }),
      },
      include: { user: { select: { name: true } } },
    });
    res.json({
      id: updated.id,
      userName: updated.user?.name ?? "Anonymous",
      rating: updated.rating,
      comment: updated.comment ?? "",
      createdAt: updated.createdAt,
    });
  } catch (error) {
    console.error("Review update error:", error);
    res.status(500).json({ error: "Failed to update review" });
  }
});

/** DELETE /reviews/delete/:id — Owner or admin allowed. */
router.delete("/delete/:id", optionalCustomerAuth, optionalAdminAuth, async (req, res) => {
  try {
    const reviewId = Number(req.params.id);
    if (!reviewId || Number.isNaN(reviewId)) {
      return res.status(400).json({ error: "Invalid review id" });
    }
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
    });
    if (!review) {
      return res.status(404).json({ error: "Review not found" });
    }
    const isOwner = req.customerUserId != null && review.userId === req.customerUserId;
    const isAdmin = req.isAdmin === true;
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: "Not authorized to delete this review" });
    }
    await prisma.review.delete({
      where: { id: reviewId },
    });
    res.status(200).json({ message: "Review deleted" });
  } catch (error) {
    console.error("Review delete error:", error);
    res.status(500).json({ error: "Failed to delete review" });
  }
});

export default router;
