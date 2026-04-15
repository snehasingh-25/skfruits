import jwt from "jsonwebtoken";

const store = new Map();

const DEFAULT_WINDOW_MS = 60 * 1000;
const DEFAULT_MAX_REQUESTS = 60;

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

export function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.ip || req.socket?.remoteAddress || "unknown";
}

/** Prefer stable user id from Bearer JWT (no DB); fallback to IP. */
export function getUserOrIpKey(req) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "").trim();
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const id = decoded?.userId;
      if (id != null && id !== "") return `user:${id}`;
    } catch {
      // invalid token → same bucket as anonymous for this IP
    }
  }
  return getClientIp(req);
}

export function createRateLimiter({
  windowMs = DEFAULT_WINDOW_MS,
  maxRequests = DEFAULT_MAX_REQUESTS,
  keyGenerator,
  /** If set, one shared bucket per client (ignores path) — e.g. all /auth/* share one limit. */
  scope,
  message = "Too many requests. Please try again later.",
} = {}) {
  return function rateLimiter(req, res, next) {
    const now = Date.now();
    const key = typeof keyGenerator === "function" ? keyGenerator(req) : getClientIp(req);
    const bucketKey = scope ? `${scope}:${key}` : `${req.method}:${req.baseUrl || ""}:${req.path || ""}:${key}`;
    const existing = store.get(bucketKey);

    if (!existing || existing.resetAt <= now) {
      const resetAt = now + windowMs;
      store.set(bucketKey, { count: 1, resetAt });
      res.setHeader("RateLimit-Limit", String(maxRequests));
      res.setHeader("RateLimit-Remaining", String(Math.max(0, maxRequests - 1)));
      res.setHeader("RateLimit-Reset", String(Math.ceil(resetAt / 1000)));
      return next();
    }

    if (existing.count >= maxRequests) {
      const retryAfterSec = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
      res.setHeader("RateLimit-Limit", String(maxRequests));
      res.setHeader("RateLimit-Remaining", "0");
      res.setHeader("RateLimit-Reset", String(Math.ceil(existing.resetAt / 1000)));
      res.setHeader("Retry-After", String(retryAfterSec));
      return res.status(429).json({
        error: message,
        retryAfter: retryAfterSec,
      });
    }

    existing.count += 1;
    store.set(bucketKey, existing);
    res.setHeader("RateLimit-Limit", String(maxRequests));
    res.setHeader("RateLimit-Remaining", String(Math.max(0, maxRequests - existing.count)));
    res.setHeader("RateLimit-Reset", String(Math.ceil(existing.resetAt / 1000)));
    return next();
  };
}

/** Only rate-limit mutating HTTP methods. */
export function createWriteMethodRateLimiter(options) {
  const inner = createRateLimiter(options);
  return function writeMethodRateLimiter(req, res, next) {
    const m = req.method;
    if (m === "POST" || m === "PUT" || m === "PATCH" || m === "DELETE") {
      return inner(req, res, next);
    }
    return next();
  };
}

export const globalPublicRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 120,
  message: "Too many requests. Please slow down and try again.",
});

/** Stricter cap for product catalog endpoints (scraping / heavy listing). */
export const productListRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 60,
  message: "Too many product list requests. Please slow down and try again.",
});

/** Standard cap for public read/browse APIs (categories, home, reels, etc.). */
export const publicBrowseRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 60,
  message: "Too many requests. Please slow down and try again.",
});

export const writeMethodRateLimiter = createWriteMethodRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 30,
  message: "Too many write requests. Please slow down and try again.",
});

export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 10,
  scope: "auth",
  message: "Too many authentication attempts. Please try again later.",
});

export const formSubmissionRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  maxRequests: 5,
  message: "Too many submissions. Please try again later.",
});

export const publicChatRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  maxRequests: 10,
  scope: "chat",
  message: "Too many chat requests. Please try again later.",
});

/** AI / heavy text generation — shared per IP for all paths under this mount. */
export const generateDescriptionRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  maxRequests: 20,
  scope: "generate-description",
  message: "Too many description requests. Please try again later.",
});

export const adminWriteRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 30,
  keyGenerator: getUserOrIpKey,
  message: "Too many admin actions. Please slow down and try again.",
});

/** Apply a limiter only to POST (e.g. public contact form, not admin GET /contact). */
export function limitPostOnly(limiter) {
  return (req, res, next) => {
    if (req.method !== "POST") return next();
    return limiter(req, res, next);
  };
}

setInterval(() => {
  const now = Date.now();
  for (const [key, value] of store.entries()) {
    if (!value || value.resetAt <= now) {
      store.delete(key);
    }
  }
}, 60 * 1000).unref();
