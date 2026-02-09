import { PrismaClient } from "@prisma/client";

// Prisma Singleton Pattern
// Prevents creating multiple database connections per request
// This ensures connection pooling is used efficiently
const globalForPrisma = globalThis;

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    // Connection pool configuration
    // Prisma automatically manages connection pooling with MySQL
    // The connection pool size is determined by the connection_limit parameter in DATABASE_URL
    // Example: mysql://user:pass@host:port/db?connection_limit=10&pool_timeout=20
  });

// Connection pooling is handled automatically by Prisma
// For MySQL, Prisma uses a connection pool that:
// - Reuses connections across requests
// - Manages pool size based on DATABASE_URL parameters
// - Handles connection lifecycle automatically

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// Graceful shutdown - disconnect Prisma on process exit
const gracefulShutdown = async () => {
  await prisma.$disconnect();
  console.log("Prisma client disconnected");
};

process.on("beforeExit", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);

export default prisma;
