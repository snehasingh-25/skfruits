import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { memo, useMemo } from "react";
import { useToast } from "../context/ToastContext";

function ProductCard({ product, compact = false }) {
  const { addToCart } = useCart();
  const toast = useToast();
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

  const handleAddToCart = () => {
    // Handle single price products
    if (product.hasSinglePrice && product.singlePrice) {
      // Create a virtual size object for single price products
      const virtualSize = { id: 0, label: "Standard", price: parseFloat(product.singlePrice) };
      addToCart(product, virtualSize, 1);
      return;
    }
    
    if (!product.sizes || product.sizes.length === 0) {
      toast.error("This product has no sizes available");
      return;
    }

    // If only one size, add directly. Otherwise, navigate to product detail
    if (product.sizes.length === 1) {
      addToCart(product, product.sizes[0], 1);
    } else {
      // Navigate to product detail to select size
      window.location.href = `/product/${product.id}`;
    }
  };

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

  return (
    <div className={`bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden group ${compact ? "flex gap-3" : ""}`}>
      {/* Product Image */}
      <Link to={`/product/${product.id}`} className={compact ? "shrink-0" : "block"}>
        <div className={`relative flex items-center justify-center overflow-hidden cursor-pointer bg-white ${compact ? "h-20 w-20 rounded-lg" : "h-64"}`}>
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
            <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: 'oklch(92% .04 340)' }}>
              <img src="/logo.png" alt="Gift Choice Logo" className="w-24 h-24 object-contain opacity-50" />
            </div>
          )}
          
          {/* Badges - Top Right */}
          {!compact && (
          <div className="absolute top-3 right-3 flex flex-col gap-1.5">
            {product.isReady60Min && (
              <span className="px-2 py-0.5 text-xs rounded-full font-semibold shadow-sm" style={{ backgroundColor: 'oklch(92% .04 340)', color: 'oklch(20% .02 340)' }}>
                60 Min
              </span>
            )}
            {product.isFestival && (
              <span className="px-2 py-0.5 text-xs rounded-full font-semibold shadow-sm" style={{ backgroundColor: 'oklch(92% .04 340)', color: 'oklch(20% .02 340)' }}>
                Festival
              </span>
            )}
            {product.isNew && (
              <span className="px-2 py-0.5 text-xs rounded-full font-semibold shadow-sm" style={{ backgroundColor: 'oklch(92% .04 340)', color: 'oklch(20% .02 340)' }}>
                New
              </span>
            )}
            {product.badge && (
              <span className="px-2 py-0.5 text-xs rounded-full font-semibold shadow-sm" style={{ backgroundColor: 'oklch(92% .04 340)', color: 'oklch(20% .02 340)' }}>
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
          <h3 className={`font-semibold line-clamp-1 transition-colors cursor-pointer ${compact ? "text-sm mb-0.5" : "text-base mb-1.5"}`} style={{ color: 'oklch(20% .02 340)' }} onMouseEnter={(e) => e.target.style.color = 'oklch(92% .04 340)'} onMouseLeave={(e) => e.target.style.color = 'oklch(20% .02 340)'}>
            {product.name}
          </h3>
        </Link>
        {!compact && <p className="text-sm mb-3 line-clamp-2 min-h-[2.5rem]" style={{ color: 'oklch(50% .02 340)' }}>{product.description}</p>}

        {/* Price - Amazon-style: MRP struck through, selling price bold, optional discount % */}
        {displayPrice != null && (
          <div className={compact ? "mb-1.5 flex items-baseline gap-2" : "mb-3 flex flex-wrap items-baseline gap-2"}>
            <span className={compact ? "text-sm font-bold" : "text-lg font-bold"} style={{ color: 'oklch(20% .02 340)' }}>
              ₹{Number(displayPrice).toLocaleString('en-IN')}
              {!product.hasSinglePrice && product.sizes && product.sizes.length > 1 && (
                <span className="text-sm font-normal ml-1" style={{ color: 'oklch(50% .02 340)' }}>onwards</span>
              )}
            </span>
            {displayMrp != null && displayMrp > displayPrice && (
              <>
                <span className="text-sm line-through" style={{ color: 'oklch(55% .02 340)' }}>
                  ₹{Number(displayMrp).toLocaleString('en-IN')}
                </span>
                {discountPct != null && discountPct > 0 && (
                  <span className="text-xs font-semibold text-green-600">
                    {discountPct}% OFF
                  </span>
                )}
              </>
            )}
          </div>
        )}

        {/* Add Button */}
        <button
          onClick={handleAddToCart}
          className={`rounded-lg font-medium transition-all duration-300 hover:opacity-90 active:scale-95 text-sm flex items-center justify-center gap-2 ${compact ? "px-3 py-1.5" : "w-full py-2.5"}`}
          style={{ backgroundColor: 'oklch(92% .04 340)', color: 'oklch(20% .02 340)' }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          Add
        </button>
      </div>
    </div>
  );
}

export default memo(ProductCard);