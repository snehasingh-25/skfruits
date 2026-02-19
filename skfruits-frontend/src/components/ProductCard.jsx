import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import { memo, useMemo } from "react";
import { useToast } from "../context/ToastContext";

function ProductCard({ product, compact = false }) {
  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist, togglingId } = useWishlist();
  const toast = useToast();
  const isWishlisted = isInWishlist(product?.id);
  const isToggling = togglingId === product?.id;
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

  // Get selling price and optional MRP (from singlePrice or lowest from sizes)
  const getPriceInfo = () => {
    if (product.hasSinglePrice && product.singlePrice != null) {
      const selling = parseFloat(product.singlePrice);
      const mrp = product.originalPrice != null && product.originalPrice !== "" ? parseFloat(product.originalPrice) : null;
      return { selling, mrp };
    }
    if (!product.sizes || product.sizes.length === 0) return null;
    const withMrp = product.sizes.map((s) => ({
      selling: parseFloat(s.price),
      mrp: s.originalPrice != null && s.originalPrice !== "" ? parseFloat(s.originalPrice) : null,
    }));
    const minSelling = Math.min(...withMrp.map((x) => x.selling));
    const minWithMrp = withMrp.find((x) => x.selling === minSelling);
    return minWithMrp ? { selling: minWithMrp.selling, mrp: minWithMrp.mrp } : { selling: minSelling, mrp: null };
  };

  const priceInfo = getPriceInfo();
  const displayPrice = priceInfo ? priceInfo.selling : null;
  const displayMrp = priceInfo && priceInfo.mrp != null && priceInfo.mrp > displayPrice ? priceInfo.mrp : null;
  const discountPct =
    displayMrp != null && displayMrp > 0 && displayPrice < displayMrp
      ? Math.round(((displayMrp - displayPrice) / displayMrp) * 100)
      : null;

  const stock = typeof product.stock === "number" ? product.stock : 0;
  const outOfStock = stock <= 0;
  const lowStock = stock > 0 && stock <= 5;

  const handleAddToCart = () => {
    if (outOfStock) {
      toast.error("This product is out of stock");
      return;
    }
    // Handle single price products
    if (product.hasSinglePrice && product.singlePrice) {
      const virtualSize = { id: 0, label: "Standard", price: parseFloat(product.singlePrice) };
      addToCart(product, virtualSize, 1);
      return;
    }
    if (!product.sizes || product.sizes.length === 0) {
      toast.error("This product has no sizes available");
      return;
    }
    if (product.sizes.length === 1) {
      addToCart(product, product.sizes[0], 1);
    } else {
      window.location.href = `/product/${product.id}`;
    }
  };

  return (
    <div className={`card-soft overflow-hidden group ${compact ? "flex gap-3" : ""}`}>
      {/* Product Image */}
      <Link to={`/product/${product.id}`} className={`${compact ? "shrink-0" : "block"} hover:opacity-95 transition-opacity duration-200`}>
        <div className={`relative flex items-center justify-center overflow-hidden cursor-pointer ${compact ? "h-20 w-20 rounded-[var(--radius-md)]" : "h-64"}`} style={{ backgroundColor: 'var(--card-white)' }}>
          {images.length > 0 ? (
            <img
              src={images[0]}
              alt={product.name}
              className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${compact ? "rounded-lg" : ""}`}
              loading="lazy"
              decoding="async"
              width={320}
              height={320}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-design-secondary">
              <img src="/logo.png" alt="SK Fruits" className="w-24 h-24 object-contain opacity-50" />
            </div>
          )}

          {/* Wishlist heart - Top Left (so it doesn't overlap badges) */}
          {!compact && (
            <button
              type="button"
              aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleWishlist(product.id);
              }}
              disabled={isToggling}
              className="absolute top-3 left-3 z-10 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 disabled:opacity-60 wishlist-heart-btn"
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

          {/* Badges - Top Right */}
          {!compact && (
          <div className="absolute top-3 right-3 flex flex-col gap-1.5">
            {product.isReady60Min && (
              <span className="px-2 py-0.5 text-xs rounded-full font-semibold shadow-sm bg-design-secondary text-design-foreground">
                60 Min
              </span>
            )}
            {product.isFestival && (
              <span className="px-2 py-0.5 text-xs rounded-full font-semibold shadow-sm bg-design-secondary text-design-foreground">
                Festival
              </span>
            )}
            {product.isNew && (
              <span className="px-2 py-0.5 text-xs rounded-full font-semibold shadow-sm bg-design-secondary text-design-foreground">
                New
              </span>
            )}
            {product.badge && (
              <span className="px-2 py-0.5 text-xs rounded-full font-semibold shadow-sm bg-design-secondary text-design-foreground">
                {product.badge}
              </span>
            )}
          </div>
          )}
        </div>
      </Link>

      {/* Product Info */}
      <div className={compact ? "py-1 pr-2 flex-1 min-w-0" : "p-4"}>
        <Link to={`/product/${product.id}`}>
          <h3 className={`font-semibold line-clamp-1 transition-colors cursor-pointer ${compact ? "text-sm mb-0.5" : "text-base mb-1.5"}`} style={{ color: 'var(--foreground)' }} onMouseEnter={(e) => { e.target.style.color = 'var(--primary)'; }} onMouseLeave={(e) => { e.target.style.color = 'var(--foreground)'; }}>
            {product.name}
          </h3>
        </Link>
        {!compact && <p className="text-sm mb-3 line-clamp-2 min-h-[2.5rem] text-design-muted">{product.description}</p>}

        {/* Price - Amazon-style: MRP struck through, selling price bold, optional discount % */}
        {displayPrice != null && (
          <div className={compact ? "mb-1.5 flex items-baseline gap-2" : "mb-3 flex flex-wrap items-baseline gap-2"}>
            <span className={compact ? "text-sm font-bold" : "text-lg font-bold"} style={{ color: 'var(--foreground)' }}>
              ₹{Number(displayPrice).toLocaleString('en-IN')}
              {!product.hasSinglePrice && product.sizes && product.sizes.length > 1 && (
                <span className="text-sm font-normal ml-1 text-design-muted">onwards</span>
              )}
            </span>
            {displayMrp != null && displayMrp > displayPrice && (
              <>
                <span className="text-sm line-through text-design-muted">
                  ₹{Number(displayMrp).toLocaleString('en-IN')}
                </span>
                {discountPct != null && discountPct > 0 && (
                  <span className="text-xs font-semibold" style={{ color: 'var(--success)' }}>
                    {discountPct}% OFF
                  </span>
                )}
              </>
            )}
          </div>
        )}

        {/* Stock status */}
        {outOfStock && (
          <p className="text-xs font-semibold mb-2" style={{ color: "var(--destructive)" }}>
            Out of Stock
          </p>
        )}
        {lowStock && !outOfStock && (
          <p className="text-xs font-medium mb-2" style={{ color: "var(--accent)" }}>
            Only {stock} left
          </p>
        )}

        {/* Add Button — Primary: yellow-400 bg, gray-900 text, hover orange */}
        <button
          onClick={handleAddToCart}
          disabled={outOfStock}
          className={`rounded-lg font-medium transition-all duration-300 active:scale-95 text-sm flex items-center justify-center gap-2 ${compact ? "px-3 py-1.5" : "w-full py-2.5"} ${outOfStock ? "opacity-60 cursor-not-allowed" : "btn-primary-brand"}`}
          style={{ borderRadius: 'var(--radius-lg)' }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          {outOfStock ? "Out of Stock" : "Add"}
        </button>
      </div>
    </div>
  );
}

export default memo(ProductCard);