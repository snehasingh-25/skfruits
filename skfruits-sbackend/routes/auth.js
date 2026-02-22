import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import prisma from "../prisma.js";
import { requireRole } from "../utils/auth.js";
import passport  from 'passport';
import GoogleStrategy  from 'passport-google-oidc';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

// Configure Google OAuth strategy
passport.use('google', new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: '/auth/login/federated/google/callback',
  scope: ['profile', 'email']
}, async (issuer, profile, done) => {
  try {
    console.log('Google OAuth profile:', profile);
    
    const email = profile.emails?.[0]?.value;
    const name = profile.displayName;
    const googleId = profile.id;
    
    if (!email) {
      return done(new Error('No email found in Google profile'), null);
    }
    
    // Check if user exists
    let user = await prisma.user.findUnique({
      where: { email: normalizeEmail(email) }
    });
    
    if (user) {
      // Update Google ID if not set
      if (!user.googleId) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { googleId }
        });
      }
    } else {
      // Create new user
      user = await prisma.user.create({
        data: {
          email: normalizeEmail(email),
          name: name || email.split('@')[0],
          googleId,
          role: 'customer',
          password: '' // No password for OAuth users
        }
      });
    }
    
    return done(null, user);
  } catch (error) {
    console.error('Google OAuth error:', error);
    return done(error, null);
  }
}));

// Passport serialization for sessions
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: parseInt(id) }
    });
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

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
        role: "customer",
      },
    });

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: "30d" }
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

// POST /auth/login — single path: find user by email, verify password, issue JWT with role (admin/driver/customer)
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const normalizedEmail = normalizeEmail(email);
    const rawPassword = (password || "").replace(/^["']|["']$/g, "").trim();

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) return res.status(401).json({ error: "Invalid email or password", message: "Invalid email or password" });

    const match = await bcrypt.compare(rawPassword, user.password);
    if (!match) return res.status(401).json({ error: "Invalid email or password", message: "Invalid email or password" });

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: "30d" }
    );

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
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /auth/me — validate token and return user (role from DB; never trust token role for authorization)
router.get("/me", async (req, res) => {
  try {
    const token = req.headers.authorization?.replace(/^Bearer\s+/i, "").trim();
    if (!token) return res.status(401).json({ error: "No token provided" });

    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = Number(decoded.userId);
    if (!userId) return res.status(401).json({ error: "Invalid token" });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true },
    });
    if (!user) return res.status(401).json({ error: "User not found" });

    if (user.role === "admin") {
      return res.json({ user: { id: user.id, email: user.email, isAdmin: true, role: "admin" } });
    }

    if (user.role === "driver") {
      return res.json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone ?? undefined,
          createdAt: user.createdAt,
          role: "driver",
        },
      });
    }

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone ?? undefined,
        createdAt: user.createdAt,
        role: "customer",
      },
    });
  } catch (error) {
    if (error.name === "TokenExpiredError" || error.name === "JsonWebTokenError") {
      return res.status(401).json({ error: "Invalid or expired token" });
    }
    res.status(500).json({ error: error.message });
  }
});

// GET /auth/verify — admin-only token verification (used by admin dashboard)
router.get("/verify", requireRole("admin"), async (req, res) => {
  res.json({ valid: true, user: { id: req.userId, email: req.userEmail } });
});

// Google OAuth routes
router.get('/login/federated/google', (req, res, next) => {
  console.log("Initiating Google OAuth flow");
  next();
}, passport.authenticate('google', {
  scope: ['profile', 'email']
}));

// Google OAuth callback
router.get('/login/federated/google/callback',
  passport.authenticate('google', { session: false }),
  async (req, res) => {
    try {
      const user = req.user;
      
      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id, role: user.role },
        JWT_SECRET,
        { expiresIn: "30d" }
      );
      
      // Redirect to frontend with only token (user data will be fetched from /auth/me)
      const frontendURL = process.env.FRONTEND_URL || 'http://localhost:5173';
      res.redirect(`${frontendURL}/auth/callback?token=${token}`);
    } catch (error) {
      console.error('OAuth callback error:', error);
      const frontendURL = process.env.FRONTEND_URL || 'http://localhost:5173';
      res.redirect(`${frontendURL}/auth/callback?message=${encodeURIComponent('Authentication failed')}`);
    }
  }
);

export default router;
