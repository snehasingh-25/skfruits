import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import prisma from "../prisma.js";
import { ADMIN_EMAIL, ADMIN_PASSWORD } from "../utils/auth.js";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

const normalizeEmail = (v) => (v || "").replace(/^["']|["']$/g, "").trim().toLowerCase();

// POST /auth/signup — customer signup
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body || {};
    const trimmedName = (name || "").trim();
    const normalizedEmail = normalizeEmail(email);

    if (!trimmedName) return res.status(400).json({ error: "Name is required" });
    if (!normalizedEmail) return res.status(400).json({ error: "Email is required" });
    if (!password || String(password).length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) return res.status(400).json({ error: "Email already registered" });

    const hashedPassword = await bcrypt.hash(String(password), 10);
    const user = await prisma.user.create({
      data: {
        name: trimmedName,
        email: normalizedEmail,
        password: hashedPassword,
      },
    });

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      token,
      user: { id: user.id, name: user.name, email: user.email, phone: user.phone ?? undefined },
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ error: error.message || "Signup failed" });
  }
});

// POST /auth/login — admin first, then customer
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const normalizedEmail = normalizeEmail(email);
    const normalizedPassword = (password || "").replace(/^["']|["']$/g, "").trim();
    const normalizedAdminEmail = (ADMIN_EMAIL || "").replace(/^["']|["']$/g, "").trim().toLowerCase();
    const normalizedAdminPassword = (ADMIN_PASSWORD || "").replace(/^["']|["']$/g, "").trim();

    // Admin login (unchanged behavior)
    if (normalizedEmail === normalizedAdminEmail && normalizedAdminPassword && normalizedPassword === normalizedAdminPassword) {
      // Keep isAdmin so /auth/verify (admin) and cart (customer) can distinguish
      const token = jwt.sign(
        { userId: 1, email: ADMIN_EMAIL, isAdmin: true },
        JWT_SECRET,
        { expiresIn: "7d" }
      );
      return res.json({
        token,
        user: { id: 1, email: ADMIN_EMAIL, isAdmin: true },
      });
    }

    // Customer login
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) return res.status(401).json({ error: "Invalid email or password", message: "Invalid email or password" });

    const match = await bcrypt.compare(normalizedPassword, user.password);
    if (!match) return res.status(401).json({ error: "Invalid email or password", message: "Invalid email or password" });

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, phone: user.phone ?? undefined },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /auth/me — validate token and return user (customer or admin)
router.get("/me", async (req, res) => {
  try {
    const token = req.headers.authorization?.replace(/^Bearer\s+/i, "").trim();
    if (!token) return res.status(401).json({ error: "No token provided" });

    const decoded = jwt.verify(token, JWT_SECRET);

    if (decoded.isAdmin || decoded.email === ADMIN_EMAIL) {
      return res.json({ user: { id: 1, email: ADMIN_EMAIL } });
    }

    const user = await prisma.user.findUnique({
      where: { id: Number(decoded.userId) },
      select: { id: true, name: true, email: true, phone: true, createdAt: true },
    });
    if (!user) return res.status(401).json({ error: "User not found" });

    res.json({ user });
  } catch (error) {
    if (error.name === "TokenExpiredError" || error.name === "JsonWebTokenError") {
      return res.status(401).json({ error: "Invalid or expired token" });
    }
    res.status(500).json({ error: error.message });
  }
});

// GET /auth/verify — admin-only token verification (used by admin dashboard)
router.get("/verify", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "No token provided" });

    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.email !== ADMIN_EMAIL) {
      return res.status(401).json({ message: "Unauthorized access" });
    }

    res.json({ valid: true, user: { id: 1, email: ADMIN_EMAIL } });
  } catch (error) {
    res.status(401).json({ message: "Invalid token" });
  }
});

export default router;
