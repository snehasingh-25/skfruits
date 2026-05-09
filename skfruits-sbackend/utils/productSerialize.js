/** Safe JSON list fields stored as string or array (e.g. product.images). Never throws. */
export function parseJsonStringArray(value) {
  if (value == null || value === "") return [];
  try {
    if (Array.isArray(value)) return value;
    if (typeof value === "string") {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch {
    // ignore
  }
  return [];
}

export function parseWeightOptionsField(value) {
  if (value == null || value === "") return [];
  try {
    const w = typeof value === "string" ? JSON.parse(value) : value;
    return Array.isArray(w) ? w : [];
  } catch {
    return [];
  }
}

/** First image URL/path from product.images, or null. */
export function parseProductImage(product) {
  const arr = parseJsonStringArray(product?.images);
  return arr.length ? arr[0] : null;
}

/** Shape stored Prisma rows into API product objects (public list/detail). */
export function serializePublicProduct(p, { includeInstagramEmbeds = false } = {}) {
  const base = {
    ...p,
    images: parseJsonStringArray(p.images),
    videos: parseJsonStringArray(p.videos),
    keywords: parseJsonStringArray(p.keywords),
    weightOptions: parseWeightOptionsField(p.weightOptions),
    categories: p.categories ? p.categories.map((pc) => pc.category) : [],
  };
  if (includeInstagramEmbeds) {
    base.instagramEmbeds = parseJsonStringArray(p.instagramEmbeds);
  }
  return base;
}
