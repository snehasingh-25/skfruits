import jwt from "jsonwebtoken";
import prisma from "../prisma.js";
import { jwtSecret as JWT_SECRET } from "../config/env.js";

/**
 * Express middleware: JWT verification and role checks.
 * (HTTP routes for /auth/login, /signup, etc. live in routes/authRoutes.js.)
 */

function getBearerToken(req) {
  return req.headers.authorization?.replace(/^Bearer\s+/i, "").trim() || null;
}

/** Require valid JWT and hydrate req.auth from token. */
export const requireAuth = (req, res, next) => {
  try {
    const token = getBearerToken(req);
    if (!token) return res.status(401).json({ message: "No token provided" });
    const decoded = jwt.verify(token, JWT_SECRET);
    req.auth = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

/**
 * Role-based middleware: requireRole(roleName)
 * - Validates JWT, loads user from DB, checks user.role === roleName
 * On success sets req.userId, req.userEmail, req.role, req.auth.
 */
export const requireRole = (roleName) => async (req, res, next) => {
  try {
    const token = getBearerToken(req);
    if (!token) return res.status(401).json({ message: "No token provided" });
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = Number(decoded.userId);
    if (!userId) return res.status(401).json({ message: "Invalid token" });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true },
    });
    if (!user || user.role !== roleName) {
      return res.status(401).json({ message: "Unauthorized access" });
    }

    req.userId = user.id;
    req.userEmail = user.email;
    req.role = user.role;
    req.auth = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

/** Admin-only (DB-verified). */
export const verifyToken = requireRole("admin");

/** Same as verifyToken. */
export const requireAdmin = verifyToken;

/** Require valid JWT and set req.customerUserId. */
export const requireCustomerAuth = (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace(/^Bearer\s+/i, "").trim();
    if (!token) return res.status(401).json({ message: "Login required" });
    const decoded = jwt.verify(token, JWT_SECRET);
    req.customerUserId = Number(decoded.userId);
    if (!req.customerUserId) return res.status(401).json({ message: "Invalid token" });
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

/** JWT + DB role must be `customer`. */
export const requireCustomerOnly = async (req, res, next) => {
  try {
    const token = getBearerToken(req);
    if (!token) return res.status(401).json({ message: "Login required" });
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = Number(decoded.userId);
    if (!userId) return res.status(401).json({ message: "Invalid token" });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });
    if (!user) return res.status(401).json({ message: "User not found" });
    if (user.role !== "customer") {
      return res.status(403).json({ message: "Only customer accounts can use this feature" });
    }

    req.customerUserId = user.id;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

/** Set req.customerUserId when Bearer token is valid (no 401 if missing). */
export const optionalCustomerAuth = (req, res, next) => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "").trim();
  if (!token) return next();
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const id = Number(decoded.userId);
    if (id) req.customerUserId = id;
  } catch (_) {}
  next();
};

/** Set req.isAdmin when valid admin token (async DB check; always calls next()). */
export const optionalAdminAuth = (req, res, next) => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "").trim();
  if (!token) return next();
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = Number(decoded.userId);
    if (!userId) return next();
    prisma.user
      .findUnique({ where: { id: userId }, select: { role: true } })
      .then((u) => {
        if (u?.role === "admin") req.isAdmin = true;
      })
      .finally(() => next());
  } catch (_) {
    next();
  }
};
