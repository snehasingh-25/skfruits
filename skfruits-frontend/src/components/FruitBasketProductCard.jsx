import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useFruitBasket } from "../context/FruitBasketContext";

function pickDefaultVariant(product) {
  if (product?.weightOptions) {
    try {
      const opts = Array.isArray(product.weightOptions) ? product.weightOptions : JSON.parse(product.weightOptions || "[]");
      if (opts.length === 1) return { selectedWeight: opts[0].weight || opts[0].weightValue, selectedSizeId: null };
      if (opts.length > 1) {
        const chosen = opts.reduce((min, w) => (parseFloat(w.price) < parseFloat(min.price) ? w : min));
        return { selectedWeight: chosen.weight || chosen.weightValue, selectedSizeId: null };
      }
    } catch {}
  }
  if (product?.hasSinglePrice && product.singlePrice) {
    return { selectedWeight: null, selectedSizeId: 0 };
  }
  if (product?.sizes?.length) {
    const chosen = product.sizes.reduce((min, s) => (parseFloat(s.price) < parseFloat(min.price) ? s : min));
    return { selectedWeight: null, selectedSizeId: chosen?.id ?? null };
  }
  return { selectedWeight: null, selectedSizeId: null };
}

/**
 * Product card for fruit basket picker - adds to FruitBasketContext instead of Cart
 */
export default function FruitBasketProductCard({ product }) {
  const { addFruit, isInBasket, getFruitQuantity } = useFruitBasket();
  const [isAdding, setIsAdding] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  const defaultVariant = useMemo(() => pickDefaultVariant(product), [product]);

  const images = useMemo(() => {
    if (!product?.images) return [];
    if (Array.isArray(product.images)) return product.images;
    try {
      const parsed = JSON.parse(product.images);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [product?.images]);

  const getPriceInfo = () => {
    if (product?.weightOptions) {
      try {
        const opts = Array.isArray(product.weightOptions) ? product.weightOptions : JSON.parse(product.weightOptions || "[]");
        if (opts.length > 0) {
          const min = opts.reduce((prev, curr) =>
            parseFloat(curr.price) < parseFloat(prev.price) ? curr : prev
          );
          return { selling: parseFloat(min.price), mrp: min.originalPrice ? parseFloat(min.originalPrice) : null };
        }
      } catch {}
    }
    if (product?.hasSinglePrice && product.singlePrice != null) {
      return { selling: parseFloat(product.singlePrice), mrp: product.originalPrice ? parseFloat(product.originalPrice) : null };
    }
    if (product?.sizes?.length) {
      const min = product.sizes.reduce((prev, curr) =>
        parseFloat(curr.price) < parseFloat(prev.price) ? curr : prev
      );
      return { selling: parseFloat(min.price), mrp: min.originalPrice ? parseFloat(min.originalPrice) : null };
    }
    return null;
  };

  const priceInfo = getPriceInfo();
  const displayPrice = priceInfo?.selling;
  const hasMultipleOptions =
    (product?.weightOptions && (Array.isArray(product.weightOptions) ? product.weightOptions : []).length > 1) ||
    (product?.sizes?.length > 1);

  const selectedSize = useMemo(() => {
    if (defaultVariant.selectedSizeId === 0)
      return { id: 0, label: "Standard", price: product?.singlePrice ? parseFloat(product.singlePrice) : 0 };
    if (product?.sizes?.length && defaultVariant.selectedSizeId != null) {
      return product.sizes.find((s) => s.id === defaultVariant.selectedSizeId) || null;
    }
    return null;
  }, [product, defaultVariant.selectedSizeId]);

  const handleAddToBasket = () => {
    if (isAdding) return;
    setIsAdding(true);
    setJustAdded(false);

    const ok = addFruit(product, 1, defaultVariant.selectedWeight, selectedSize);
    if (ok) {
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 800);
    }

    setIsAdding(false);
  };

  const inBasket = isInBasket(product.id, defaultVariant.selectedWeight, defaultVariant.selectedSizeId);
  const qty = getFruitQuantity(product.id, defaultVariant.selectedWeight, defaultVariant.selectedSizeId);

  return (
    <div
      className="card-soft overflow-hidden group relative transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
      style={{ borderRadius: "var(--radius-lg)" }}
    >
      <Link to={`/product/${product.id}`} className="block hover:opacity-95 transition-opacity">
        <div
          className="relative flex items-center justify-center h-48"
          style={{
            background: `linear-gradient(145deg, rgba(107,62,38,0.12) 0%, rgba(107,62,38,0.06) 45%, rgba(244,196,48,0.08) 100%)`,
            borderBottom: "1px solid var(--border)",
          }}
        >
          {images.length > 0 ? (
            <img
              src={images[0]}
              alt={product.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <img src="/logo.png" alt="SK Fruits" className="w-16 h-16 object-contain opacity-50" />
          )}
        </div>
      </Link>

      <div className="p-4">
        <Link to={`/product/${product.id}`}>
          <h3 className="font-semibold text-base line-clamp-2 mb-1 hover:text-[var(--primary)] transition-colors" style={{ color: "var(--foreground)" }}>
            {product.name}
          </h3>
        </Link>

        {displayPrice != null && (
          <div className="mb-3 flex items-baseline gap-2">
            <span className="text-lg font-bold" style={{ color: "var(--foreground)" }}>
              ₹{Number(displayPrice).toLocaleString("en-IN")}
            </span>
            {hasMultipleOptions && (
              <span className="text-sm text-muted"></span>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            handleAddToBasket();
          }}
          disabled={isAdding}
          className="w-full py-2.5 rounded-xl font-semibold transition-all duration-300 active:scale-[0.99] flex items-center justify-center gap-2 min-h-[44px]"
          style={{
            backgroundColor: inBasket ? "var(--primary)" : "var(--cta-yellow)",
            color: inBasket ? "var(--primary-foreground)" : "var(--btn-primary-fg)",
            boxShadow: "var(--shadow-soft)",
          }}
        >
          {isAdding ? (
            <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : justAdded ? (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Added</span>
            </>
          ) : inBasket ? (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              In basket {qty > 0 && `(${qty})`}
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v14M5 12h14" />
              </svg>
              Add to basket
            </>
          )}
        </button>
      </div>
    </div>
  );
}
