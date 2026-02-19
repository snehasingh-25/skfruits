import { useEffect, useState, useRef } from "react";
import { API } from "../api";
import ProductCard from "./ProductCard";

/**
 * Reusable carousel section: title + horizontal scroll of product cards.
 * - If productIds provided: fetches products by ids (preserves order), shows skeleton while loading.
 * - If products provided: renders directly.
 * - Hides section if no products to show.
 */
export default function ProductCarouselSection({
  title,
  productIds = [],
  products: productsProp = null,
  excludeProductId = null,
  className = "",
}) {
  const [products, setProducts] = useState(Array.isArray(productsProp) ? productsProp : []);
  const [loading, setLoading] = useState(!!(productIds.length > 0 && !productsProp));
  const scrollRef = useRef(null);

  const idsToFetch = excludeProductId
    ? productIds.filter((id) => Number(id) !== Number(excludeProductId))
    : productIds;

  useEffect(() => {
    if (productsProp != null && Array.isArray(productsProp)) {
      setProducts(productsProp);
      setLoading(false);
      return;
    }
    if (idsToFetch.length === 0) {
      setProducts([]);
      setLoading(false);
      return;
    }
    const ac = new AbortController();
    setLoading(true);
    fetch(`${API}/products?ids=${idsToFetch.join(",")}`, { signal: ac.signal })
      .then((res) => res.json())
      .then((data) => {
        setProducts(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (err?.name !== "AbortError") console.error("ProductCarouselSection fetch error:", err);
        setProducts([]);
      })
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, [idsToFetch.join(","), productsProp]);

  const list = products.filter((p) => !excludeProductId || p.id !== Number(excludeProductId));
  if (list.length === 0 && !loading) return null;

  return (
    <section className={`mt-10 px-4 sm:px-6 lg:px-8 ${className}`}>
      <h2 className="text-2xl font-bold font-display mb-6" style={{ color: "var(--foreground)" }}>
        {title}
      </h2>
      {loading ? (
        <>
          <div className="grid grid-cols-2 gap-4 sm:hidden">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-80 rounded-xl animate-pulse"
                style={{ background: "var(--muted)", boxShadow: "var(--shadow-soft)" }}
              />
            ))}
          </div>
          <div className="hidden sm:flex gap-4 overflow-x-hidden">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="flex-shrink-0 w-64 h-80 rounded-xl animate-pulse"
                style={{ background: "var(--muted)", boxShadow: "var(--shadow-soft)" }}
              />
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:hidden">
            {list.map((product) => (
              <div key={product.id}>
                <ProductCard product={product} />
              </div>
            ))}
          </div>
          <div
            ref={scrollRef}
            className="hidden sm:flex gap-4 overflow-x-auto scroll-smooth scrollbar-thin pb-2"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {list.map((product) => (
              <div key={`carousel-${product.id}`} className="flex-shrink-0 w-64">
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
