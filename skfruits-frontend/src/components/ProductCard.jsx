import { useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import { memo, useMemo, useState, useEffect } from "react";
import { useToast } from "../context/ToastContext";
import VariantDropdown from "./VariantDropdown";
import VariantBottomSheet from "./VariantBottomSheet";

function ProductCard({ product, compact = false }) {
  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist, togglingId } = useWishlist();
  const toast = useToast();
  const navigate = useNavigate();

  const isWishlisted = isInWishlist(product?.id);
  const isToggling = togglingId === product?.id;
  const [isAdding, setIsAdding] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const [showVariantModal, setShowVariantModal] = useState(false);

  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.innerWidth < 768
  );

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Parse product images (can come as JSON string or array)
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

  // Build a unified list from weight options, sizes, or single-price fallback
  const variantsList = useMemo(() => {
    if (!product) return [];

    const parsePrice = (val) => (val != null && val !== "" ? parseFloat(val) : null);

    // Weight-based products (e.g. fruits sold by kg)
    if (product.weightOptions) {
      try {
        const opts = Array.isArray(product.weightOptions)
          ? product.weightOptions
          : JSON.parse(product.weightOptions);

        if (opts?.length > 0) {
          return opts.map((w, i) => ({
            id: w.id || `w-${i}`,
            label: w.weight,
            price: parseFloat(w.price),
            originalPrice: parsePrice(w.originalPrice),
            stock: Number(w.stock ?? product.stock ?? 0),
            type: "weight",
            raw: w,
          }));
        }
      } catch {
        // malformed JSON — fall through
      }
    }

    // Size-based products
    if (product.sizes?.length > 0) {
      return product.sizes.map((s, i) => ({
        id: s.id || `s-${i}`,
        label: s.label,
        price: parseFloat(s.price),
        originalPrice: parsePrice(s.originalPrice),
        stock: Number(s.stock ?? product.stock ?? 0),
        type: "size",
        raw: s,
      }));
    }

    // Single-price products
    if (product.hasSinglePrice && product.singlePrice != null) {
      return [{
        id: "single",
        label: "Standard",
        price: parseFloat(product.singlePrice),
        originalPrice: parsePrice(product.originalPrice),
        stock: Number(product.stock ?? 0),
        type: "single",
        raw: null,
      }];
    }

    return [];
  }, [product]);

  // Default to the cheapest variant
  const defaultIdx = useMemo(() => {
    if (variantsList.length === 0) return 0;
    return variantsList.reduce(
      (best, v, i) => (v.price < best.price ? { idx: i, price: v.price } : best),
      { idx: 0, price: Number.MAX_VALUE }
    ).idx;
  }, [variantsList]);

  const [selectedIdx, setSelectedIdx] = useState(0);
  useEffect(() => setSelectedIdx(defaultIdx), [defaultIdx]);

  // Derived display values from the active variant
  const activeVariant = variantsList[selectedIdx] || null;
  const displayPrice = activeVariant?.price ?? null;
  const displayMrp =
    activeVariant?.originalPrice > displayPrice ? activeVariant.originalPrice : null;
  const discountPct =
    displayMrp != null
      ? Math.round(((displayMrp - displayPrice) / displayMrp) * 100)
      : null;


  // Navigate to product detail — unless the click landed on an interactive element
  const handleCardClick = (e) => {
    if (
      e.target.closest("button") ||
      e.target.closest("ul") ||
      e.target.closest(".variant-modal-content") ||
      e.target.closest(".wishlist-heart-btn")
    ) return;

    navigate(`/product/${product.id}`);
  };

  // Add selected variant to cart
  const handleAddToCart = async (e) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }

    if (!variantsList.length) {
      toast.error("This product is not available for purchase");
      return;
    }

    const variant = variantsList[selectedIdx];
    if (!variant) return;

    // On mobile, open the variant picker sheet first
    if (isMobile && !showVariantModal) {
      setShowVariantModal(true);
      return;
    }

    if (isAdding) return;
    setIsAdding(true);
    setJustAdded(false);

    try {
      let ok = false;

      if (variant.type === "weight") {
        ok = await addToCart(product, null, 1, variant.label);
      } else if (variant.type === "size") {
        ok = await addToCart(product, variant.raw, 1);
      } else {
        ok = await addToCart(product, { id: 0, label: "Standard", price: variant.price }, 1);
      }

      if (ok) {
        setJustAdded(true);
        setTimeout(() => setJustAdded(false), 1300);
        setShowVariantModal(false);
      }
    } catch {
      toast.error("Failed to add product to cart");
    } finally {
      setIsAdding(false);
    }
  };

  // Open WhatsApp with a pre-filled order message
  const handleWhatsAppOrder = () => {
    const phone = "919116546255";
    const priceText = displayPrice != null
      ? `Price: ₹${Number(displayPrice).toLocaleString("en-IN")}`
      : "Price: varies by weight/size";

    const msg = `Hi! I want to order ${product?.name || "this product"}. ${priceText}. Please share available options and delivery details.`;

    try {
      localStorage.setItem("skfruits_last_whatsapp_product", product?.name || "");
      localStorage.setItem("skfruits_last_whatsapp_price", priceText);
    } catch { /* ignore */ }

    window.open(
      `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  return (
    <>
      <div
        onClick={handleCardClick}
        className={`card-soft min-w-0 overflow-hidden group relative cursor-pointer
          transition-all duration-300 hover:-translate-y-1 hover:shadow-lg
          ${compact ? "flex gap-3" : ""}`}
      >
        {/* ── Image Area ── */}
        <div className={`${compact ? "shrink-0" : "block"} hover:opacity-95 transition-opacity duration-200`}>
          <div
            className={`relative flex items-center justify-center overflow-hidden bg-white ${
              compact
                ? "h-20 w-20 rounded-[var(--radius-md)] p-1.5"
                : "aspect-square w-full rounded-[var(--radius-lg)] p-1.5"
            }`}
            style={{
              background: "linear-gradient(145deg, rgba(107,62,38,0.95) 0%, rgba(107,62,38,0.75) 45%, rgba(244,196,48,0.14) 100%)",
              boxShadow: "inset 0 0 0 1px rgba(245,230,211,0.14)",
            }}
          >
            {/* Basket weave texture */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-[0.5px] rounded-[var(--radius-lg)] opacity-20"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(90deg, rgba(245,230,211,0.55) 0 2px, transparent 2px 8px), repeating-linear-gradient(0deg, rgba(245,230,211,0.35) 0 2px, transparent 2px 10px)",
                mixBlendMode: "overlay",
              }}
            />

            {/* Inner white card with the product image */}
            <div
              className="relative overflow-hidden w-full h-full rounded-[var(--radius-md)] bg-white"
              style={{ boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.05)" }}
            >
              {images.length > 0 ? (
                <img
                  src={images[0]}
                  alt={product.name}
                  className={`w-full h-full transition-transform duration-300 group-hover:scale-105 ${
                    compact ? "rounded-[var(--radius-md)] object-cover" : "object-contain"
                  }`}
                  loading="lazy"
                  decoding="async"
                  width={320}
                  height={320}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <img src="/logo.png" alt="SK Fruits" className="w-24 h-24 object-contain opacity-50" />
                </div>
              )}

              {/* Subtle gradient overlay on hover */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                style={{ background: "linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.18) 100%)" }}
              />
            </div>

            {/* ── Overlay buttons (only on full-size cards) ── */}
            {!compact && (
              <>
                {/* Quick add */}
                <button
                  type="button"
                  aria-label="Quick add to cart"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleAddToCart(); }}
                  disabled={isAdding}
                  className="absolute bottom-3 right-3 z-20 rounded-full h-9 w-9 flex items-center justify-center shadow-lg
                    transition-all duration-300 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed
                    group-hover:opacity-100 opacity-0 translate-y-2 group-hover:translate-y-0"
                  style={{
                    backgroundColor: "var(--cta-yellow)",
                    color: "var(--btn-primary-fg)",
                    border: "1px solid rgba(0,0,0,0.06)",
                  }}
                >
                  {isAdding ? (
                    <span className="inline-block w-4 h-4 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />
                  ) : justAdded ? (
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20 6L9 17l-5-5" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
                    </svg>
                  )}
                </button>

                {/* WhatsApp order */}
                <button
                  type="button"
                  aria-label="Order on WhatsApp"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleWhatsAppOrder(); }}

                  className="absolute bottom-3 left-3 z-20 rounded-full h-9 w-9 flex items-center justify-center shadow-lg
                    transition-all duration-300 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed
                    group-hover:opacity-100 opacity-0 translate-y-2 group-hover:translate-y-0"
                  style={{ backgroundColor: "var(--accent)", color: "white", border: "1px solid rgba(0,0,0,0.06)" }}
                >
                  <svg width="18" height="18" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                    <path fill="currentColor" d="M19.11 17.52c-.16-.08-.97-.48-1.12-.54-.15-.06-.26-.08-.37.08-.1.16-.42.54-.51.65-.1.1-.19.12-.35.04-.16-.08-.68-.25-1.3-.8-.48-.43-.8-.96-.9-1.13-.09-.16-.01-.25.07-.33.08-.08.16-.19.25-.28.08-.1.1-.16.15-.27.05-.11.02-.21-.02-.29-.04-.08-.37-.95-.51-1.29-.14-.34-.29-.29-.39-.3h-.34c-.11 0-.29.04-.44.19-.15.15-.57.56-.57 1.36 0 .8.58 1.57.66 1.68.08.11 1.13 1.72 2.74 2.41.38.17.68.27.91.35.38.12.72.1.99.06.31-.05.97-.4 1.11-.79.14-.39.14-.72.1-.79-.04-.08-.15-.12-.31-.2Z" />
                    <path fill="currentColor" d="M16.03 4.78c-6.21 0-11.25 5.04-11.25 11.25 0 2.02.55 3.96 1.59 5.66l-1.07 3.94 4.07-1.05c1.64.9 3.49 1.37 5.39 1.37 6.21 0 11.25-5.04 11.25-11.25S22.24 4.78 16.03 4.78Zm0 20.02c-1.75 0-3.44-.46-4.91-1.34l-.35-.21-2.53.65.65-2.46-.22-.36c-.94-1.5-1.44-3.25-1.44-5.03 0-5.02 4.09-9.11 9.11-9.11s9.11 4.09 9.11 9.11-4.09 9.11-9.11 9.11Z" />
                  </svg>
                </button>
              </>
            )}

            {/* Wishlist toggle */}
            {!compact && (
              <button
                type="button"
                aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleWishlist(product.id); }}
                disabled={isToggling}
                className="absolute top-3 left-3 z-10 w-10 h-10 rounded-full flex items-center justify-center
                  transition-all duration-300 hover:scale-110 active:scale-95 disabled:opacity-60 wishlist-heart-btn"
                style={{
                  backgroundColor: "var(--background)",
                  color: isWishlisted ? "var(--destructive)" : "var(--foreground)",
                  boxShadow: "var(--shadow-soft, 0 2px 8px rgba(0,0,0,0.08))",
                }}
              >
                {isWishlisted ? (
                  <svg className="w-5 h-5 wishlist-heart-filled" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 wishlist-heart-outline" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                )}
              </button>
            )}


          </div>
        </div>

        {/* ── Product Info ── */}
        <div className={compact ? "py-1 pr-2 flex-1 min-w-0" : "p-4"}>
          <h3
            className={`font-semibold line-clamp-1 transition-colors cursor-pointer ${
              compact ? "text-sm mb-0.5" : "text-base mb-1.5"
            }`}
            style={{ color: "var(--foreground)" }}
            onMouseEnter={(e) => (e.target.style.color = "var(--primary)")}
            onMouseLeave={(e) => (e.target.style.color = "var(--foreground)")}
          >
            {product.name}
          </h3>

          {/* Variant picker */}
          {variantsList.length >= 1 && (
            <VariantDropdown
              variants={variantsList}
              selectedIdx={selectedIdx}
              onChange={setSelectedIdx}
            />
          )}

          {/* Price line */}
          {displayPrice != null && (
            <div className={compact ? "mb-1.5 min-w-0" : "mb-3 min-w-0"}>
              <div className="truncate text-[var(--foreground)]">
                <span className={`align-baseline font-bold ${compact ? "text-sm" : "text-lg"}`}>
                  ₹{Number(displayPrice).toLocaleString("en-IN")}
                </span>
                {displayMrp != null && (
                  <>
                    <span className="text-sm line-through text-design-muted ml-2 align-baseline">
                      ₹{Number(displayMrp).toLocaleString("en-IN")}
                    </span>
                    {discountPct > 0 && (
                      <span className="text-xs font-semibold ml-2 align-baseline" style={{ color: "var(--success)" }}>
                        {discountPct}% OFF
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Add to cart */}
          <button
            onClick={(e) => handleAddToCart(e)}
            disabled={isAdding}
            className={`rounded-lg font-semibold transition-all duration-300 active:scale-[0.99]
              min-h-[44px] text-sm flex items-center justify-center gap-2
              ${compact ? "px-3 py-1.5" : "w-full py-2.5"}`}
            style={{
              borderRadius: "var(--radius-lg)",
              backgroundColor: "var(--accent)",
              color: "white",
              boxShadow: "var(--shadow-soft)",
              border: "1px solid rgba(0,0,0,0.08)",
            }}
            onMouseEnter={(e) => {
              if (isAdding) return;
              e.currentTarget.style.backgroundColor = "var(--cta-yellow)";
              e.currentTarget.style.color = "#1a1a1a";
            }}
            onMouseLeave={(e) => {
              if (isAdding) return;
              e.currentTarget.style.backgroundColor = "var(--accent)";
              e.currentTarget.style.color = "white";
            }}
          >
            {isAdding ? (
              <span className="inline-block w-4 h-4 border-2 border-white/90 border-t-transparent rounded-full animate-spin" />
            ) : justAdded ? (
              <span className="inline-flex items-center justify-center add-success-pop">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 6L9 17l-5-5" />
                </svg>
                <span className="ml-1 hidden sm:inline">Added</span>
              </span>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Add to cart
              </>
            )}
          </button>
        </div>
      </div>

      <VariantBottomSheet
        isOpen={showVariantModal}
        onClose={() => setShowVariantModal(false)}
        product={product}
        variantsList={variantsList}
        selectedIdx={selectedIdx}
        setSelectedIdx={setSelectedIdx}
        isAdding={isAdding}
        handleAddToCart={handleAddToCart}
      />
    </>
  );
}

export function ProductCardSkeleton({ compact = false }) {
  return (
    <div className={`card-soft overflow-hidden group relative ${compact ? "flex gap-3" : ""}`}>
      <div
        className={`flex items-center justify-center ${
          compact
            ? "h-20 w-20 rounded-[var(--radius-md)] p-1.5"
            : "aspect-square w-full rounded-[var(--radius-lg)] p-1.5"
        }`}
      >
        <div className="w-full h-full animate-pulse" style={{ background: "var(--muted)", borderRadius: "inherit" }} />
      </div>
      <div className={compact ? "py-1 pr-2 flex-1 min-w-0" : "p-4"}>
        <div className="h-4 w-3/4 animate-pulse rounded" style={{ background: "var(--muted)" }} />
        {!compact && <div className="h-4 w-full mt-3 animate-pulse rounded" style={{ background: "var(--muted)" }} />}
        <div className="h-10 mt-5 animate-pulse rounded-lg" style={{ background: "rgba(76,175,80,0.14)" }} />
      </div>
    </div>
  );
}

export default memo(ProductCard);