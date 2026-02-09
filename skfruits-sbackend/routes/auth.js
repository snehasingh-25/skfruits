import express from "express";
import jwt from "jsonwebtoken";
import { ADMIN_EMAIL, ADMIN_PASSWORD } from "../utils/auth.js";
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;

// Login - using hardcoded admin credentials from environment variables
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    // Trim and normalize inputs (remove quotes if present)
    const normalizedEmail = email.replace(/^["']|["']$/g, "").trim().toLowerCase();
    const normalizedPassword = password.replace(/^["']|["']$/g, "").trim();
    const normalizedAdminEmail = ADMIN_EMAIL.replace(/^["']|["']$/g, "").trim().toLowerCase();
    const normalizedAdminPassword = ADMIN_PASSWORD.replace(/^["']|["']$/g, "").trim();

    // Debug logging (remove in production)
    if (process.env.NODE_ENV !== "production") {
      console.log("Login attempt:");
      console.log("Provided email:", normalizedEmail);
      console.log("Expected email:", normalizedAdminEmail);
      console.log("Email match:", normalizedEmail === normalizedAdminEmail);
      console.log("Password match:", normalizedPassword === normalizedAdminPassword);
    }

    // Check against hardcoded admin credentials
    if (normalizedEmail !== normalizedAdminEmail || normalizedPassword !== normalizedAdminPassword) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: 1, email: ADMIN_EMAIL },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Login successful",
      token,
      user: { id: 1, email: ADMIN_EMAIL },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Verify token
router.get("/verify", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Verify the email matches the hardcoded admin email
    if (decoded.email !== ADMIN_EMAIL) {
      return res.status(401).json({ message: "Unauthorized access" });
    }

    res.json({ valid: true, user: { id: 1, email: ADMIN_EMAIL } });
  } catch (error) {
    res.status(401).json({ message: "Invalid token" });
  }
});

export default router;
