import express from "express";
import bcrypt from "bcryptjs";
import { requireRole } from "../utils/auth.js";
import prisma from "../prisma.js";

const router = express.Router();

const DRIVER_STATUS_VALUES = ["available", "busy", "offline"];
const SALT_ROUNDS = 10;

function normalizeEmail(v) {
  return (v || "").replace(/^["']|["']$/g, "").trim().toLowerCase();
}

function normalizeStatus(value) {
  if (!value || typeof value !== "string") return null;
  const v = value.trim().toLowerCase();
  return DRIVER_STATUS_VALUES.includes(v) ? v : null;
}

/** Generate a unique placeholder email when driver is added without email (User.email is required). */
function driverPlaceholderEmail() {
  return `driver-${Date.now()}-${Math.random().toString(36).slice(2, 11)}@drivers.local`;
}

/**
 * POST /admin/drivers/add
 * Body: { name, phone, password, email? }
 * Creates a User with role "driver" and driverStatus "available" (for login and order assignment).
 */
router.post("/add", requireRole("admin"), async (req, res) => {
  try {
    const { name, phone, password, email } = req.body || {};
    const nameStr = typeof name === "string" ? name.trim() : "";
    const phoneStr = typeof phone === "string" ? phone.trim() : "";
    const emailNorm = email != null && String(email).trim() !== "" ? normalizeEmail(email) : null;
    const rawPassword = password != null ? String(password).trim() : "";

    if (!nameStr) {
      return res.status(400).json({ error: "Name is required" });
    }
    if (!phoneStr) {
      return res.status(400).json({ error: "Phone is required" });
    }
    if (!rawPassword || rawPassword.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const loginEmail = emailNorm ?? driverPlaceholderEmail();
    if (emailNorm != null) {
      const existing = await prisma.user.findUnique({ where: { email: loginEmail } });
      if (existing) {
        return res.status(400).json({ error: "A user with this email already exists" });
      }
    }

    const hashedPassword = await bcrypt.hash(rawPassword, SALT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        name: nameStr,
        email: loginEmail,
        phone: phoneStr,
        password: hashedPassword,
        role: "driver",
        driverStatus: "available",
      },
    });

    res.status(201).json({
      id: user.id,
      userId: user.id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      status: user.driverStatus ?? "available",
      createdAt: user.createdAt,
    });
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(400).json({ error: "A user with this email already exists" });
    }
    console.error("Admin add driver error:", error);
    res.status(500).json({ error: error.message || "Failed to add driver" });
  }
});

/**
 * GET /admin/drivers
 * Returns all drivers (Users with role = driver) and their status.
 */
router.get("/", requireRole("admin"), async (req, res) => {
  try {
    const drivers = await prisma.user.findMany({
      where: { role: "driver" },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, email: true, phone: true, driverStatus: true, createdAt: true },
    });
    res.json(
      drivers.map((d) => ({
        id: d.id,
        userId: d.id,
        name: d.name,
        phone: d.phone,
        email: d.email,
        status: d.driverStatus ?? "available",
        createdAt: d.createdAt,
      }))
    );
  } catch (error) {
    console.error("Admin list drivers error:", error);
    res.status(500).json({ error: error.message || "Failed to fetch drivers" });
  }
});

/**
 * PUT /admin/drivers/update-status/:id
 * Body: { status }
 * :id = userId. Updates driver status (User.driverStatus) for User with role = driver.
 */
router.put("/update-status/:id", requireRole("admin"), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: "Invalid driver id" });
    }

    const status = normalizeStatus(req.body?.status);
    if (!status) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${DRIVER_STATUS_VALUES.join(", ")}`,
      });
    }

    const user = await prisma.user.findFirst({ where: { id, role: "driver" } });
    if (!user) {
      return res.status(404).json({ error: "Driver not found" });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { driverStatus: status },
      select: { id: true, name: true, email: true, phone: true, driverStatus: true, createdAt: true },
    });

    res.json({
      id: updated.id,
      userId: updated.id,
      name: updated.name,
      phone: updated.phone,
      email: updated.email,
      status: updated.driverStatus ?? "available",
      createdAt: updated.createdAt,
    });
  } catch (error) {
    console.error("Admin update driver status error:", error);
    res.status(500).json({ error: error.message || "Failed to update status" });
  }
});

export default router;
