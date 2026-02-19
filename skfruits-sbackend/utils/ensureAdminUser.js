import bcrypt from "bcryptjs";
import prisma from "../prisma.js";

const SALT_ROUNDS = 10;

function normalizeEnv(value) {
  return (value || "").replace(/^["']|["']$/g, "").trim();
}

/**
 * Ensures an admin user exists in the database.
 * Reads ADMIN_EMAIL and ADMIN_PASSWORD from env.
 * - If no user with that email exists: creates User with hashed password and role "admin".
 * - If user already exists: does nothing (no duplicate, no password overwrite).
 * Password is always hashed with bcrypt; never stored in plaintext.
 */
export async function ensureAdminUser() {
  const rawEmail = process.env.ADMIN_EMAIL;
  const rawPassword = process.env.ADMIN_PASSWORD;

  const email = normalizeEnv(rawEmail)?.toLowerCase();
  const password = normalizeEnv(rawPassword);

  if (!email || !password) {
    console.log("ensureAdminUser: ADMIN_EMAIL or ADMIN_PASSWORD not set; skipping admin seed.");
    return;
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      console.log("ensureAdminUser: Admin user already exists, skipping.");
      return;
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    await prisma.user.create({
      data: {
        name: "Admin",
        email,
        password: hashedPassword,
        role: "admin",
      },
    });
    console.log("ensureAdminUser: Admin user created successfully.");
  } catch (err) {
    console.error("ensureAdminUser error:", err.message);
    // Do not throw; server should still start
  }
}
