export function normalizeEmail(v) {
  return (v || "").replace(/^["']|["']$/g, "").trim().toLowerCase();
}
