/** Session key for optional order notes (e.g. fruit basket gift message) */
export const ORDER_NOTES_SESSION_KEY = "skfruits_order_notes";

export function setPendingOrderNotes(text) {
  try {
    if (text?.trim()) sessionStorage.setItem(ORDER_NOTES_SESSION_KEY, text.trim());
    else sessionStorage.removeItem(ORDER_NOTES_SESSION_KEY);
  } catch {
    // ignore
  }
}

export function getPendingOrderNotes() {
  try {
    return sessionStorage.getItem(ORDER_NOTES_SESSION_KEY)?.trim() || "";
  } catch {
    return "";
  }
}

export function clearPendingOrderNotes() {
  try {
    sessionStorage.removeItem(ORDER_NOTES_SESSION_KEY);
  } catch {
    // ignore
  }
}
