export const CART_SESSION_HEADER = "x-cart-session-id";

/**
 * Resolve cart session id: header, then optional query param, then body.
 * @param {import('express').Request} req
 * @param {{ includeQuery?: boolean }} [options]
 */
export function getCartSessionId(req, { includeQuery = false } = {}) {
  const fromHeader = req.headers[CART_SESSION_HEADER]?.trim();
  if (fromHeader) return fromHeader;
  if (includeQuery) {
    const fromQuery = req.query?.sessionId?.trim();
    if (fromQuery) return fromQuery;
  }
  const fromBody = req.body?.sessionId?.trim();
  return fromBody || null;
}
