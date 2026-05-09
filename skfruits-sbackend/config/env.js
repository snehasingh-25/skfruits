import dotenv from "dotenv";

dotenv.config();

const isProd = process.env.NODE_ENV === "production";

function requireInProd(name) {
  const v = process.env[name];
  if (isProd && (v == null || String(v).trim() === "")) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return v;
}

requireInProd("DATABASE_URL");
if (isProd) {
  requireInProd("JWT_SECRET");
  requireInProd("SESSION_SECRET");
}

const devJwtFallback = "dev-only-insecure-jwt-secret-do-not-use-in-production";
const devSessionFallback = "dev-only-insecure-session-secret-do-not-use-in-production";

export const env = {
  isProd,
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT) || 3003,
  host: process.env.HOST || "0.0.0.0",
  databaseUrl: process.env.DATABASE_URL || "",
  jwtSecret: isProd ? process.env.JWT_SECRET : process.env.JWT_SECRET || devJwtFallback,
  sessionSecret: isProd ? process.env.SESSION_SECRET : process.env.SESSION_SECRET || devSessionFallback,
};

export const jwtSecret = env.jwtSecret;
export const sessionSecret = env.sessionSecret;
