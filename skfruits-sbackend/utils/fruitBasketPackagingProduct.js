import prisma from "../prisma.js";

const PACKAGING_NAME = "Fruit Basket (Packaging)";

let cachedId = null;

/**
 * Ensures a system product exists for fruit-basket packaging cart lines.
 * Price is always taken from FruitBasket + packagingPrice on CartItem, not from this product.
 */
export async function getFruitBasketPackagingProductId() {
  if (cachedId) return cachedId;
  try {
    let p = await prisma.product.findFirst({
      where: { name: PACKAGING_NAME },
      select: { id: true },
    });
    if (!p) {
      p = await prisma.product.create({
        data: {
          name: PACKAGING_NAME,
          description:
            "System line item for custom fruit basket packaging fee. Do not delete or use as a regular product.",
          images: "[]",
          keywords: "[]",
          hasSinglePrice: true,
          singlePrice: 0,
          stock: 999999,
        },
        select: { id: true },
      });
      console.log(`fruitBasketPackaging: created packaging product id=${p.id}`);
    }
    cachedId = p.id;
    return cachedId;
  } catch (e) {
    console.error("getFruitBasketPackagingProductId:", e.message);
    return null;
  }
}
