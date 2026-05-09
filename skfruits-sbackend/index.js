import { env, sessionSecret } from "./config/env.js";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import passport from "passport";
import "./config/passport.js";
import session from "express-session";

import { createCorsOptions, isOriginAllowed } from "./config/cors.js";
import { requireAdmin } from "./middleware/auth.js";

import productRoutes from "./routes/products.js";
import categoryRoutes from "./routes/categories.js";
import orderRoutes from "./routes/orders.js";
import authRoutes from "./routes/authRoutes.js";
import contactRoutes from "./routes/contact.js";
import cartRoutes from "./routes/cart.js";
import reelRoutes from "./routes/reels.js";
import seasonalRoutes from "./routes/seasonal.js";
import bannerRoutes from "./routes/banners.js";
import basketRoutes from "./routes/baskets.js";
import savedFruitBasketRoutes from "./routes/saved-fruit-baskets.js";
import homeRoutes from "./routes/home.js";
import recommendationRoutes from "./routes/recommendations.js";
import sizeOptionRoutes from "./routes/size-options.js";
import generateDescriptionRoutes from "./routes/generate-description.js";
import chatRoutes from "./routes/chat.js";
import addressRoutes from "./routes/addresses.js";
import paymentRoutes from "./routes/payments.js";
import adminOrderRoutes from "./routes/admin-orders.js";
import adminAnalyticsRoutes from "./routes/admin-analytics.js";
import adminProductsRoutes from "./routes/admin-products.js";
import adminInventoryRoutes from "./routes/admin-inventory.js";
import adminReviewRoutes from "./routes/admin-reviews.js";
import adminDriverRoutes from "./routes/admin-drivers.js";
import adminDeliveryRoutes from "./routes/admin-delivery.js";
import driverRoutes from "./routes/driver.js";
import wishlistRoutes from "./routes/wishlist.js";
import reviewRoutes from "./routes/reviews.js";
import deliveryRoutes from "./routes/delivery.js";
import driverTrackingRoutes from "./routes/driver-tracking.js";
import trackingRoutes from "./routes/tracking.js";
import cache from "./utils/cache.js";
import { ensureAdminUser } from "./utils/ensureAdminUser.js";
import { getFruitBasketPackagingProductId } from "./utils/fruitBasketPackagingProduct.js";
import {
  globalPublicRateLimiter,
  writeMethodRateLimiter,
  authRateLimiter,
  formSubmissionRateLimiter,
  publicChatRateLimiter,
  publicBrowseRateLimiter,
  productListRateLimiter,
  generateDescriptionRateLimiter,
  adminWriteRateLimiter,
  limitPostOnly,
} from "./utils/rateLimit.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

app.set("trust proxy", 1);

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

app.use(cors(createCorsOptions()));

// Enable HTTP keep-alive for connection pooling
app.set("keepAliveTimeout", 65000); // 65 seconds
app.set("headersTimeout", 66000); // 66 seconds (must be > keepAliveTimeout)

app.use(express.json());

// Configure session middleware for OAuth
app.use(
  session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: env.isProd,
      httpOnly: true,
      sameSite: env.isProd ? "none" : "lax",
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

const RATE_LIMIT_SKIP_PATHS = new Set(["/health", "/test", "/"]);
app.use((req, res, next) => {
  if (RATE_LIMIT_SKIP_PATHS.has(req.path)) return next();
  return globalPublicRateLimiter(req, res, next);
});
app.use(writeMethodRateLimiter);

// Serve uploaded files
app.use(
  "/uploads",
  express.static(join(__dirname, "uploads"), {
    etag: true,
    lastModified: true,
    maxAge: "30d",
    immutable: true,
  })
);

// Routes
app.get("/", (req, res) => {
  res.send("Backend is alive 🌱");
});

// Simple test endpoint (non-production only)
app.get("/test", (req, res) => {
  if (env.isProd) {
    return res.status(404).json({ error: "Not found" });
  }
  const serverInfo = req.socket?.server?.address();
  res.json({
    message: "Server is responding",
    timestamp: new Date().toISOString(),
    env: {
      nodeEnv: env.nodeEnv,
      port: env.port,
      host: env.host,
      hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
    },
    server: {
      actualPort: serverInfo?.port,
      actualAddress: serverInfo?.address,
      family: serverInfo?.family,
    },
  });
});

// Cache stats (admin JWT required)
app.get("/cache/stats", requireAdmin, (req, res) => {
  res.json(cache.getStats());
});

// Health check endpoint with database connection test
app.get("/health", async (req, res) => {
  try {
    const prisma = (await import("./prisma.js")).default;
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: "healthy",
      database: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: "unhealthy",
      database: "disconnected",
      error: env.isProd ? "Database unavailable" : error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

app.use("/products", productListRateLimiter, productRoutes);
app.use("/categories", publicBrowseRateLimiter, categoryRoutes);
app.use("/orders", publicBrowseRateLimiter, orderRoutes);
app.use("/auth", authRateLimiter, authRoutes);
app.use("/contact", limitPostOnly(formSubmissionRateLimiter), contactRoutes);
app.use("/cart", publicBrowseRateLimiter, cartRoutes);
app.use("/reels", publicBrowseRateLimiter, reelRoutes);
app.use("/seasonal", publicBrowseRateLimiter, seasonalRoutes);
app.use("/banners", publicBrowseRateLimiter, bannerRoutes);
app.use("/baskets", publicBrowseRateLimiter, basketRoutes);
app.use("/saved-fruit-baskets", publicBrowseRateLimiter, savedFruitBasketRoutes);
app.use("/home", publicBrowseRateLimiter, homeRoutes);
app.use("/recommendations", publicBrowseRateLimiter, recommendationRoutes);
app.use("/size-options", publicBrowseRateLimiter, sizeOptionRoutes);
app.use("/generate-description", generateDescriptionRateLimiter, generateDescriptionRoutes);
app.use("/chat", publicChatRateLimiter, chatRoutes);
app.use("/addresses", publicBrowseRateLimiter, addressRoutes);
app.use("/payments", publicBrowseRateLimiter, paymentRoutes);
app.use("/admin/orders", adminWriteRateLimiter, adminOrderRoutes);
app.use("/admin/analytics", adminWriteRateLimiter, adminAnalyticsRoutes);
app.use("/admin/products", adminWriteRateLimiter, adminProductsRoutes);
app.use("/admin/inventory", adminWriteRateLimiter, adminInventoryRoutes);
app.use("/admin/reviews", adminWriteRateLimiter, adminReviewRoutes);
app.use("/admin/drivers", adminWriteRateLimiter, adminDriverRoutes);
app.use("/admin/delivery", adminWriteRateLimiter, adminDeliveryRoutes);
app.use("/driver", publicBrowseRateLimiter, driverRoutes);
app.use("/driver/tracking", publicBrowseRateLimiter, driverTrackingRoutes);
app.use("/wishlist", publicBrowseRateLimiter, wishlistRoutes);
app.use("/reviews", publicBrowseRateLimiter, reviewRoutes);
app.use("/delivery", publicBrowseRateLimiter, deliveryRoutes);
app.use("/tracking", publicBrowseRateLimiter, trackingRoutes);

// Global error handling middleware (must be after all routes)
app.use((err, req, res, next) => {
  const origin = req.headers.origin;
  if (origin && isOriginAllowed(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }

  const status = err.status || 500;
  const exposeMessage = !env.isProd || status < 500;
  const message = exposeMessage ? err.message || "Internal server error" : "Internal server error";

  res.status(status).json({
    error: message,
    ...(!env.isProd && { stack: err.stack }),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

const PORT = env.port;
const HOST = env.host;

// Create HTTP server with keep-alive enabled
let server;
try {
  server = app.listen(PORT, HOST, async () => {
    await ensureAdminUser();
    await getFruitBasketPackagingProductId();
  });

  server.on("error", () => {
    process.exit(1);
  });
} catch (error) {
  process.exit(1);
}

// Enable keep-alive on the server
server.keepAliveTimeout = 65000; // 65 seconds
server.headersTimeout = 66000; // 66 seconds

// Graceful shutdown
const gracefulShutdown = async () => {
  try {
    if (server) {
      await new Promise((resolve) => {
        server.close(() => resolve());
      });
    }

    try {
      const prisma = (await import("./prisma.js")).default;
      await prisma.$disconnect();
    } catch {
      // ignore
    }

    process.exit(0);
  } catch {
    process.exit(1);
  }
};

process.on("SIGTERM", () => gracefulShutdown());
process.on("SIGINT", () => gracefulShutdown());
