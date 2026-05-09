import jwt from "jsonwebtoken";
import { jwtSecret } from "../config/env.js";

const DEFAULT_EXPIRES = "30d";

export function signUserToken(userId, role, expiresIn = DEFAULT_EXPIRES) {
  return jwt.sign({ userId, role }, jwtSecret, { expiresIn });
}
