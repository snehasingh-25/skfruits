/**
 * HTTP routes mounted at /auth — signup, login, session/me, Google OAuth, admin verify.
 * JWT middleware lives in middleware/auth.js; Passport strategies in config/passport.js.
 */
import express from "express";
import bcrypt from "bcryptjs";
import passport from "passport";
import prisma from "../prisma.js";
import { requireRole, requireAuth } from "../middleware/auth.js";
import { normalizeEmail } from "../utils/normalizeEmail.js";
import { signUserToken } from "../utils/jwtTokens.js";

const router = express.Router();

function shapeUserResponse(user) {
  if (user.role === "admin") {
    return { id: user.id, email: user.email, isAdmin: true, role: "admin" };
  }
  if (user.role === "driver") {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone ?? undefined,
      createdAt: user.createdAt,
      role: "driver",
    };
  }
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone ?? undefined,
    createdAt: user.createdAt,
    role: "customer",
  };
}

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
        role: "customer",
      },
    });

    const token = signUserToken(user.id, user.role);

    res.status(201).json({
      token,
      user: { id: user.id, name: user.name, email: user.email, phone: user.phone ?? undefined },
    });
  } catch (error) {
    res.status(500).json({ error: error.message || "Signup failed" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const normalizedEmail = normalizeEmail(email);
    const rawPassword = (password || "").replace(/^["']|["']$/g, "").trim();

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password", message: "Invalid email or password" });
    }

    const match = await bcrypt.compare(rawPassword, user.password);
    if (!match) {
      return res.status(401).json({ error: "Invalid email or password", message: "Invalid email or password" });
    }

    const token = signUserToken(user.id, user.role);

    if (user.role === "admin") {
      return res.json({
        token,
        user: { id: user.id, email: user.email, isAdmin: true, role: "admin" },
      });
    }

    if (user.role === "driver") {
      return res.json({
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone ?? undefined,
          role: "driver",
        },
      });
    }

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone ?? undefined,
        role: "customer",
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/me", requireAuth, async (req, res) => {
  try {
    const userId = Number(req.auth.userId);
    if (!userId) return res.status(401).json({ error: "Invalid token" });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true },
    });
    if (!user) return res.status(401).json({ error: "User not found" });

    res.json({ user: shapeUserResponse(user) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/verify", requireRole("admin"), async (req, res) => {
  res.json({ valid: true, user: { id: req.userId, email: req.userEmail } });
});

router.get("/login/federated/google", passport.authenticate("google", { scope: ["profile", "email"] }));

router.get(
  "/login/federated/google/callback",
  passport.authenticate("google", { session: false }),
  async (req, res) => {
    try {
      const user = req.user;
      const token = signUserToken(user.id, user.role);
      const frontendURL = process.env.FRONTEND_URL || "http://localhost:5173";
      res.redirect(`${frontendURL}/auth/callback?token=${token}`);
    } catch (error) {
      const frontendURL = process.env.FRONTEND_URL || "http://localhost:5173";
      res.redirect(`${frontendURL}/auth/callback?message=${encodeURIComponent("Authentication failed")}`);
    }
  }
);

export default router;
