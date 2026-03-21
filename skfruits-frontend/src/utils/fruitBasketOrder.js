/**
 * Detect fruit-basket packaging lines on persisted orders.
 * Matches cart hydration in the backend (`sizeLabel: "Packaging"`, name "… — basket" or "Fruit basket").
 */
export function isFruitBasketPackagingLine(item) {
  if (!item) return false;
  const size = String(item.sizeLabel ?? "").trim();
  const name = String(item.name ?? item.productName ?? "").trim();
  if (size !== "Packaging") return false;
  return name === "Fruit basket" || name.includes(" — basket");
}

export function orderContainsFruitBasket(items) {
  return Array.isArray(items) && items.some(isFruitBasketPackagingLine);
}
