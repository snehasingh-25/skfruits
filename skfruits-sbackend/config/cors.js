const DEFAULT_ORIGINS = [
  "http://localhost:5173",
  "https://skfruits.com",
  "https://www.skfruits.com",
  "https://skfruits.onrender.com",
];

export function getAllowedCorsOrigins() {
  const raw = process.env.CORS_ORIGINS;
  if (raw != null && String(raw).trim() !== "") {
    return String(raw)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return DEFAULT_ORIGINS;
}

export function isOriginAllowed(origin) {
  if (!origin) return false;
  return getAllowedCorsOrigins().includes(origin);
}

export function createCorsOptions() {
  const allowed = new Set(getAllowedCorsOrigins());
  return {
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }
      if (allowed.has(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Cart-Session-Id"],
    credentials: true,
  };
}
