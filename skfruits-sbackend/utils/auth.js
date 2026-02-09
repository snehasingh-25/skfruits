import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// Load environment variables explicitly with correct path
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, "../.env") });

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

// Hardcoded admin credentials from environment variables
// Remove quotes if present and trim whitespace
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL)
  .replace(/^["']|["']$/g, "")
  .trim();
const ADMIN_PASSWORD = (process.env.ADMIN_PASSWORD)
  .replace(/^["']|["']$/g, "")
  .trim();

// Debug logging - always show to help diagnose
console.log("=== Admin credentials loaded in auth.js ===");
console.log("Raw ADMIN_EMAIL from env:", process.env.ADMIN_EMAIL);
console.log("Processed ADMIN_EMAIL:", ADMIN_EMAIL);
console.log("ADMIN_PASSWORD is set:", ADMIN_PASSWORD ? "YES" : "NO");
console.log("==========================================");

export const verifyToken = (req, res, next) => {
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
    
    req.userId = decoded.userId || 1; // Default admin ID
    req.userEmail = decoded.email;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

// Export admin credentials for login
export { ADMIN_EMAIL, ADMIN_PASSWORD };
