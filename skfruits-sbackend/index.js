import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

import productRoutes from "./routes/products.js";
import categoryRoutes from "./routes/categories.js";
import orderRoutes from "./routes/orders.js";
import authRoutes from "./routes/auth.js";
import contactRoutes from "./routes/contact.js";
import cartRoutes from "./routes/cart.js";
import reelRoutes from "./routes/reels.js";
import occasionRoutes from "./routes/occasions.js";
import bannerRoutes from "./routes/banners.js";
import recommendationRoutes from "./routes/recommendations.js";
import sizeOptionRoutes from "./routes/size-options.js";
import generateDescriptionRoutes from "./routes/generate-description.js";
import chatRoutes from "./routes/chat.js";
import cache from "./utils/cache.js";

// Log startup information
console.log("=== Server Startup ===");
console.log("Node version:", process.version);
console.log("Current directory:", process.cwd());

dotenv.config();

console.log("Environment variables loaded");
console.log("PORT:", process.env.PORT || "3000 (default)");
console.log("HOST:", process.env.HOST || "0.0.0.0 (default)");
console.log("DATABASE_URL:", process.env.DATABASE_URL ? "Set ✓" : "NOT SET ✗");
console.log("NODE_ENV:", process.env.NODE_ENV || "development");

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://giftchoice.net",
      "https://www.giftchoice.net",
      "https://midnightblue-fish-476058.hostingersite.com"
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
  })
);





// Enable HTTP keep-alive for connection pooling
app.set("keepAliveTimeout", 65000); // 65 seconds
app.set("headersTimeout", 66000); // 66 seconds (must be > keepAliveTimeout)

// CORS configuration

app.use(express.json());

// Request logging middleware (for debugging)
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

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

// Simple test endpoint (no database required)
app.get("/test", (req, res) => {
  const serverInfo = req.socket?.server?.address();
  res.json({ 
    message: "Server is responding",
    timestamp: new Date().toISOString(),
    env: {
      nodeEnv: process.env.NODE_ENV,
      port: process.env.PORT || 3000,
      host: process.env.HOST || "0.0.0.0",
      hasDatabaseUrl: !!process.env.DATABASE_URL
    },
    server: {
      actualPort: serverInfo?.port,
      actualAddress: serverInfo?.address,
      family: serverInfo?.family
    }
  });
});

// Cache stats endpoint (for monitoring)
app.get("/cache/stats", (req, res) => {
  res.json(cache.getStats());
});

// Health check endpoint with database connection test
app.get("/health", async (req, res) => {
  try {
    const prisma = (await import("./prisma.js")).default;
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    res.json({ 
      status: "healthy", 
      database: "connected",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Health check failed:", error);
    res.status(503).json({ 
      status: "unhealthy", 
      database: "disconnected",
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.use("/products", productRoutes);
app.use("/categories", categoryRoutes);
app.use("/orders", orderRoutes);
app.use("/auth", authRoutes);
app.use("/contact", contactRoutes);
app.use("/cart", cartRoutes);
app.use("/reels", reelRoutes);
app.use("/occasions", occasionRoutes);
app.use("/banners", bannerRoutes);
app.use("/recommendations", recommendationRoutes);
app.use("/size-options", sizeOptionRoutes);
app.use("/generate-description", generateDescriptionRoutes);
app.use("/chat", chatRoutes);

// Global error handling middleware (must be after all routes)
app.use((err, req, res, next) => {
  console.error("Unhandled error:", {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });
  
  // Ensure CORS headers are set even on errors
  const origin = req.headers.origin;
  const allowedOrigins = [
    "http://localhost:5173",
    "https://giftchoice.net",
    "https://www.giftchoice.net",
    "https://midnightblue-fish-476058.hostingersite.com"
  ];
  
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }
  
  res.status(err.status || 500).json({
    error: err.message || "Internal server error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "0.0.0.0"; // Listen on all interfaces for production

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  // Don't exit the process, just log it
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  // Don't exit immediately, let the server try to handle it
});

// Create HTTP server with keep-alive enabled
let server;
try {
  console.log(`Attempting to start server on ${HOST}:${PORT}...`);
  server = app.listen(PORT, HOST, () => {
    const actualPort = server.address().port;
    const actualAddress = server.address().address;
    console.log("=== Server Started Successfully ===");
    console.log(`✓ Server running on ${HOST}:${PORT}`);
    console.log(`✓ Actual listening address: ${actualAddress}:${actualPort}`);
    console.log(`✓ Environment PORT variable: ${process.env.PORT || 'not set (using default 3000)'}`);
    console.log("✓ HTTP keep-alive: Enabled");
    console.log("✓ Prisma connection pooling: Enabled (singleton pattern)");
    console.log("✓ Backend caching: Enabled (5min TTL for products, categories, occasions, banners, reels)");
    console.log("✓ Environment:", process.env.NODE_ENV || "development");
    console.log("=== Ready to accept requests ===");
  });

  server.on("error", (error) => {
    console.error("=== Server Error ===");
    console.error("Error code:", error.code);
    console.error("Error message:", error.message);
    if (error.code === "EADDRINUSE") {
      console.error(`✗ Port ${PORT} is already in use`);
      console.error("Please stop the process using this port or change the PORT environment variable");
    } else {
      console.error("Full error:", error);
    }
    process.exit(1);
  });
} catch (error) {
  console.error("=== Failed to Start Server ===");
  console.error("Error:", error);
  console.error("Stack:", error.stack);
  process.exit(1);
}

// Enable keep-alive on the server
server.keepAliveTimeout = 65000; // 65 seconds
server.headersTimeout = 66000; // 66 seconds

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM signal received: closing HTTP server");
  server.close(() => {
    console.log("HTTP server closed");
  });
});

process.on("SIGINT", async () => {
  console.log("SIGINT signal received: closing HTTP server");
  server.close(() => {
    console.log("HTTP server closed");
  });
});
