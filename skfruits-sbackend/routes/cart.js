import express from "express";
import jwt from "jsonwebtoken";
import prisma from "../prisma.js";
import { randomUUID } from "crypto";

const router = express.Router();
const CART_SESSION_HEADER = "x-cart-session-id";
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

function getSessionId(req) {
  return req.headers[CART_SESSION_HEADER]?.trim() || req.body?.sessionId?.trim() || null;
}

/** Optional: set req.customerUserId when Bearer token is a customer (not admin). */
function optionalCustomerAuth(req, res, next) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "").trim();
  if (!token) return next();
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role === "admin") return next();
    req.customerUserId = Number(decoded.userId);
  } catch (_) {}
  next();
}

/** Get stock for a single variant (weight, size, or product-level). */
function getVariantStock(product, item) {
  if (item.selectedWeight && product.weightOptions) {
    try {
      const opts = Array.isArray(product.weightOptions) ? product.weightOptions : JSON.parse(product.weightOptions);
      const w = opts.find((o) => String(o.weight).trim() === String(item.selectedWeight).trim());
      if (w) return Math.max(0, Number(w.stock ?? product.stock ?? 0));
    } catch {}
    return 0;
  }
  if (item.productSizeId != null && product.sizes?.length) {
    const size = product.sizes.find((s) => s.id === item.productSizeId);
    if (size) return Math.max(0, Number(size.stock ?? 0));
    return 0;
  }
  return Math.max(0, Number(product.stock ?? 0));
}

/** Hydrate cart items to frontend shape: id, productId, productName, productImage, sizeId, sizeLabel, price, quantity, subtotal, stock (variant-specific) */
async function hydrateCartItems(items) {
  if (!items?.length) return [];
  const productIds = [...new Set(items.map((i) => i.productId))];
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    include: { sizes: true },
  });
  const productMap = new Map(products.map((p) => [p.id, p]));

  return items
    .map((item) => {
      const product = productMap.get(item.productId);
      if (!product) return null;
      const images = (() => {
        try {
          const raw = product.images;
          if (Array.isArray(raw)) return raw;
          return raw ? JSON.parse(raw) : [];
        } catch {
          return [];
        }
      })();
      const productImage = images.length ? images[0] : null;
      let sizeLabel = "Standard";
      let price = 0;
      let sizeId = 0;

      // Weight-based product (fruits)
      if (item.selectedWeight && product.weightOptions) {
        try {
          const weightOptions = Array.isArray(product.weightOptions)
            ? product.weightOptions
            : JSON.parse(product.weightOptions);
          const selectedOption = weightOptions.find((w) => w.weight === item.selectedWeight);
          if (!selectedOption) return null;
          sizeLabel = item.selectedWeight;
          price = parseFloat(selectedOption.price);
        } catch {
          return null;
        }
      } else if (item.productSizeId != null) {
        const size = product.sizes.find((s) => s.id === item.productSizeId);
        if (!size) return null;
        sizeLabel = size.label;
        price = parseFloat(size.price);
        sizeId = size.id;
      } else if (product.hasSinglePrice && product.singlePrice != null) {
        price = parseFloat(product.singlePrice);
      } else {
        return null;
      }

      const quantity = Math.max(1, item.quantity);
      const subtotal = price * quantity;
      const stock = getVariantStock(product, item);
      return {
        id: String(item.id),
        productId: product.id,
        productName: product.name,
        productImage,
        sizeId,
        sizeLabel,
        selectedWeight: item.selectedWeight || null,
        price,
        quantity,
        subtotal,
        stock,
      };
    })
    .filter(Boolean);
}

/** Get cart items hydrated for order creation (used by orders/create). Returns null if no cart or empty. */
export async function getCartItemsForOrder(sessionId) {
  if (!sessionId?.trim()) return null;
  const cart = await prisma.cart.findUnique({
    where: { sessionId: sessionId.trim() },
    include: { items: { orderBy: { id: "asc" } } },
  });
  if (!cart || !cart.items.length) return null;
  return hydrateCartItems(cart.items);
}

/** Get or create cart by sessionId (guest) */
async function getOrCreateCart(sessionId) {
  if (sessionId) {
    const cart = await prisma.cart.findUnique({
      where: { sessionId },
      include: { items: { orderBy: { id: "asc" } } },
    });
    if (cart) return cart;
  }
  const newSessionId = sessionId || randomUUID();
  const cart = await prisma.cart.create({
    data: { sessionId: newSessionId },
    include: { items: { orderBy: { id: "asc" } } },
  });
  return cart;
}

/** Get or create cart by userId (logged-in customer) */
async function getOrCreateCartByUserId(userId) {
  let cart = await prisma.cart.findFirst({
    where: { userId: Number(userId) },
    include: { items: { orderBy: { id: "asc" } } },
  });
  if (cart) return cart;
  const sessionId = `user-${userId}-${randomUUID()}`;
  cart = await prisma.cart.create({
    data: { sessionId, userId: Number(userId) },
    include: { items: { orderBy: { id: "asc" } } },
  });
  return cart;
}

// GET /cart — get cart for session or user (create if needed); returns { sessionId, items }
router.get("/", optionalCustomerAuth, async (req, res) => {
  try {
    if (req.customerUserId) {
      const cart = await getOrCreateCartByUserId(req.customerUserId);
      const items = await hydrateCartItems(cart.items);
      res.setHeader(CART_SESSION_HEADER, cart.sessionId);
      return res.json({ sessionId: cart.sessionId, items });
    }
    const sessionId = getSessionId(req);
    const cart = await getOrCreateCart(sessionId);
    const items = await hydrateCartItems(cart.items);
    res.setHeader(CART_SESSION_HEADER, cart.sessionId);
    res.json({ sessionId: cart.sessionId, items });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /cart/items — add or update item: { productId, productSizeId?: number | null, selectedWeight?: string, quantity }
router.post("/items", optionalCustomerAuth, async (req, res) => {
  try {
    const { productId, productSizeId = null, selectedWeight = null, quantity = 1 } = req.body || {};
    if (!productId || quantity < 1) {
      return res.status(400).json({ error: "productId and positive quantity required" });
    }
    const cart = req.customerUserId
      ? await getOrCreateCartByUserId(req.customerUserId)
      : await getOrCreateCart(getSessionId(req));

    const product = await prisma.product.findUnique({
      where: { id: Number(productId) },
      include: { sizes: true },
    });
    if (!product) return res.status(404).json({ error: "Product not found" });

    const sizeIdForStock = productSizeId === undefined || productSizeId === null ? null : Number(productSizeId);
    const variantStock = getVariantStock(product, {
      productSizeId: sizeIdForStock,
      selectedWeight: selectedWeight || null,
    });
    if (variantStock <= 0) {
      return res.status(400).json({ error: "This variant is out of stock" });
    }
    const currentQtySameVariant = cart.items
      .filter(
        (i) =>
          i.productId === Number(productId) &&
          (i.productSizeId ?? null) === sizeIdForStock &&
          (i.selectedWeight ?? null) === (selectedWeight || null)
      )
      .reduce((sum, i) => sum + i.quantity, 0);
    if (currentQtySameVariant + quantity > variantStock) {
      return res.status(400).json({
        error: `Only ${variantStock} unit(s) available for this variant`,
        available: variantStock,
      });
    }

    // Validate weight-based product
    if (selectedWeight) {
      if (!product.weightOptions) {
        return res.status(400).json({ error: "This product does not have weight options" });
      }
      try {
        const weightOptions = Array.isArray(product.weightOptions)
          ? product.weightOptions
          : JSON.parse(product.weightOptions);
        const weightExists = weightOptions.some((w) => w.weight === selectedWeight);
        if (!weightExists) {
          return res.status(400).json({ error: `Invalid weight: ${selectedWeight}` });
        }
      } catch {
        return res.status(400).json({ error: "Invalid weight options data" });
      }
    } else {
      // Validate size-based product
      const sizeId = productSizeId === undefined || productSizeId === null ? null : Number(productSizeId);
      if (sizeId !== null) {
        const size = product.sizes.find((s) => s.id === sizeId);
        if (!size) return res.status(400).json({ error: "Invalid product size" });
      } else if (!product.hasSinglePrice || product.singlePrice == null) {
        return res.status(400).json({ error: "Product requires either a weight, size, or single price" });
      }
    }

    const sizeId = productSizeId === undefined || productSizeId === null ? null : Number(productSizeId);
    const existing = await prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        productId: Number(productId),
        productSizeId: sizeId,
        selectedWeight: selectedWeight,
      },
    });

    let item;
    if (existing) {
      item = await prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + quantity },
      });
    } else {
      item = await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: Number(productId),
          productSizeId: sizeId,
          selectedWeight: selectedWeight,
          quantity,
        },
      });
    }

    const hydrated = await hydrateCartItems([item]);
    res.setHeader(CART_SESSION_HEADER, cart.sessionId);
    res.status(201).json({ sessionId: cart.sessionId, item: hydrated[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /cart/items/:id — update quantity; body { quantity }. If quantity <= 0, item is removed.
router.patch("/items/:id", optionalCustomerAuth, async (req, res) => {
  try {
    const cart = req.customerUserId
      ? await getOrCreateCartByUserId(req.customerUserId)
      : await getOrCreateCart(getSessionId(req));
    const id = Number(req.params.id);
    const { quantity } = req.body || {};

    if (quantity === undefined || quantity === null) {
      return res.status(400).json({ error: "quantity required" });
    }

    const existing = await prisma.cartItem.findFirst({
      where: { id, cartId: cart.id },
    });
    if (!existing) return res.status(404).json({ error: "Cart item not found" });

    const product = await prisma.product.findUnique({
      where: { id: existing.productId },
      include: { sizes: true },
    });
    if (!product) return res.status(404).json({ error: "Product not found" });
    const variantStock = getVariantStock(product, {
      productSizeId: existing.productSizeId,
      selectedWeight: existing.selectedWeight,
    });
    const otherQtySameVariant = cart.items
      .filter(
        (i) =>
          i.productId === existing.productId &&
          (i.productSizeId ?? null) === (existing.productSizeId ?? null) &&
          (i.selectedWeight ?? null) === (existing.selectedWeight ?? null) &&
          i.id !== id
      )
      .reduce((sum, i) => sum + i.quantity, 0);
    if (quantity > 0 && otherQtySameVariant + quantity > variantStock) {
      return res.status(400).json({
        error: variantStock === 0 ? "This variant is out of stock" : `Only ${variantStock} unit(s) available for this variant`,
        available: variantStock,
      });
    }

    if (quantity <= 0) {
      await prisma.cartItem.delete({ where: { id } });
      res.setHeader(CART_SESSION_HEADER, cart.sessionId);
      return res.json({ sessionId: cart.sessionId, removed: true });
    }

    const item = await prisma.cartItem.update({
      where: { id },
      data: { quantity },
    });
    const hydrated = await hydrateCartItems([item]);
    res.setHeader(CART_SESSION_HEADER, cart.sessionId);
    res.json({ sessionId: cart.sessionId, item: hydrated[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /cart/items/:id
router.delete("/items/:id", optionalCustomerAuth, async (req, res) => {
  try {
    const cart = req.customerUserId
      ? await getOrCreateCartByUserId(req.customerUserId)
      : await getOrCreateCart(getSessionId(req));
    const id = Number(req.params.id);

    const existing = await prisma.cartItem.findFirst({
      where: { id, cartId: cart.id },
    });
    if (!existing) return res.status(404).json({ error: "Cart item not found" });

    await prisma.cartItem.delete({ where: { id } });
    res.setHeader(CART_SESSION_HEADER, cart.sessionId);
    res.json({ sessionId: cart.sessionId, removed: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /cart — clear all items for this session's cart
router.delete("/", optionalCustomerAuth, async (req, res) => {
  try {
    if (req.customerUserId) {
      const cart = await prisma.cart.findFirst({ where: { userId: req.customerUserId } });
      if (cart) await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
      res.json({ sessionId: null, items: [] });
      return;
    }
    const sessionId = getSessionId(req);
    if (!sessionId) {
      return res.json({ sessionId: null, items: [] });
    }
    const cart = await prisma.cart.findUnique({ where: { sessionId } });
    if (cart) {
      await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    }
    res.setHeader(CART_SESSION_HEADER, sessionId);
    res.json({ sessionId, items: [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /cart/merge — merge guest cart into user cart (requires customer auth)
router.post("/merge", optionalCustomerAuth, async (req, res) => {
  try {
    const userId = req.customerUserId;
    if (!userId) return res.status(401).json({ error: "Login required to merge cart" });

    const guestSessionId = req.body?.guestSessionId?.trim() || getSessionId(req);
    if (!guestSessionId) {
      const cart = await getOrCreateCartByUserId(userId);
      const items = await hydrateCartItems(cart.items);
      return res.json({ sessionId: cart.sessionId, items });
    }

    const guestCart = await prisma.cart.findUnique({
      where: { sessionId: guestSessionId },
      include: { items: true },
    });

    const userCart = await getOrCreateCartByUserId(userId);

    if (guestCart?.items?.length) {
      for (const gi of guestCart.items) {
        const existing = await prisma.cartItem.findFirst({
          where: {
            cartId: userCart.id,
            productId: gi.productId,
            productSizeId: gi.productSizeId,
            selectedWeight: gi.selectedWeight,
          },
        });
        if (existing) {
          await prisma.cartItem.update({
            where: { id: existing.id },
            data: { quantity: existing.quantity + gi.quantity },
          });
        } else {
          await prisma.cartItem.create({
            data: {
              cartId: userCart.id,
              productId: gi.productId,
              productSizeId: gi.productSizeId,
              selectedWeight: gi.selectedWeight,
              quantity: gi.quantity,
            },
          });
        }
      }
      await prisma.cartItem.deleteMany({ where: { cartId: guestCart.id } });
      await prisma.cart.delete({ where: { id: guestCart.id } });
    }

    const updated = await prisma.cart.findUnique({
      where: { id: userCart.id },
      include: { items: { orderBy: { id: "asc" } } },
    });
    const items = await hydrateCartItems(updated.items);
    res.setHeader(CART_SESSION_HEADER, updated.sessionId);
    res.json({ sessionId: updated.sessionId, items });
  } catch (error) {
    console.error("Cart merge error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Legacy: POST /cart/sync — keep for backwards compatibility (existing product APIs unchanged)
router.post("/sync", async (req, res) => {
  try {
    const { items } = req.body;

    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ error: "Invalid items array" });
    }

    const productIds = [...new Set(items.map((item) => item.productId))];
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      include: { sizes: true, categories: { include: { category: true } } },
    });

    const productsMap = {};
    products.forEach((p) => {
      productsMap[p.id] = {
        ...p,
        images: p.images ? JSON.parse(p.images) : [],
        keywords: p.keywords ? JSON.parse(p.keywords) : [],
      };
    });

    const syncedItems = items
      .map((item) => {
        const product = productsMap[item.productId];
        if (!product) return null;
        const size = product.sizes.find((s) => s.id === item.sizeId);
        if (!size) return null;
        return {
          id: `${item.productId}-${item.sizeId}`,
          productId: product.id,
          productName: product.name,
          productImage: product.images?.length ? product.images[0] : null,
          sizeId: size.id,
          sizeLabel: size.label,
          price: parseFloat(size.price),
          quantity: item.quantity,
          subtotal: parseFloat(size.price) * item.quantity,
        };
      })
      .filter((item) => item !== null);

    res.json({ items: syncedItems });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
