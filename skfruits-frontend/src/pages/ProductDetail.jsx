import { useEffect, useMemo, useState, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { API } from "../api";
import { useCart } from "../context/CartContext";
import { useToast } from "../context/ToastContext";
import ProductCard from "../components/ProductCard";
import RecommendationCarousel from "../components/RecommendationCarousel";
import GiftBoxLoader from "../components/GiftBoxLoader";
import { useProductLoader } from "../hooks/useProductLoader";
import { initializeInstagramEmbeds } from "../utils/instagramEmbed";

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const toast = useToast();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSize, setSelectedSize] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [expanded, setExpanded] = useState(() => new Set(["details"]));
  const [similarProducts, setSimilarProducts] = useState([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  const [recommendedProducts, setRecommendedProducts] = useState([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  
  // Time-based loader (only shows if loading >= 1 second)
  const { showLoader: showProductLoader } = useProductLoader(loading);
  const { showLoader: showSimilarLoader } = useProductLoader(loadingSimilar);

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

  const videos = useMemo(() => {
    if (!product?.videos || !Array.isArray(product.videos)) return [];
    return product.videos;
  }, [product?.videos]);

  const instagramEmbeds = useMemo(() => {
    if (!product?.instagramEmbeds) return [];
    if (Array.isArray(product.instagramEmbeds)) return product.instagramEmbeds.filter(e => e.enabled);
    try {
      const parsed = JSON.parse(product.instagramEmbeds);
      return Array.isArray(parsed) ? parsed.filter(e => e.enabled) : [];
    } catch {
      return [];
    }
  }, [product?.instagramEmbeds]);

  // Combined media: images, videos, and Instagram embeds
  const media = useMemo(() => {
    const imgItems = images.map((url) => ({ type: "image", url }));
    const vidItems = videos.map((url) => ({ type: "video", url }));
    const instaItems = instagramEmbeds.map((embed) => ({ type: "instagram", url: embed.url }));
    return [...imgItems, ...vidItems, ...instaItems];
  }, [images, videos, instagramEmbeds]);

  const activeMedia = media[activeImageIndex] || media[0] || null;
  const activeImage = activeMedia?.type === "image" ? activeMedia.url : null;
  const activeVideo = activeMedia?.type === "video" ? activeMedia.url : null;
  const activeInstagram = activeMedia?.type === "instagram" ? activeMedia.url : null;
  const instagramEmbedRef = useRef(null);

  const toggleSection = (key) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    fetch(`${API}/products/${id}`, { signal: ac.signal })
      .then((res) => res.json())
      .then((data) => {
        setProduct(data);
        // Handle single price products
        if (data?.hasSinglePrice && data.singlePrice) {
          setSelectedSize({
            id: 0,
            label: "Standard",
            price: parseFloat(data.singlePrice),
            originalPrice: data.originalPrice != null && data.originalPrice !== "" ? parseFloat(data.originalPrice) : null,
          });
        } else if (data?.sizes && data.sizes.length > 0) {
          setSelectedSize(data.sizes[0]);
        } else {
          setSelectedSize(null);
        }
        setQuantity(1);
        setActiveImageIndex(0);
        setLoading(false);

        // Initialize Instagram embeds if present (after DOM renders)
        if (data?.instagramEmbeds?.length > 0) {
          setTimeout(() => initializeInstagramEmbeds(), 300);
        }

        // Fetch recommendations using the recommendation engine
        setLoadingRecommendations(true);
        fetch(`${API}/recommendations/${data.id}?limit=10`, { signal: ac.signal })
          .then((res) => res.json())
          .then((products) => {
            setRecommendedProducts(Array.isArray(products) ? products : []);
            setLoadingRecommendations(false);
          })
          .catch((error) => {
            if (error?.name === "AbortError") return;
            console.error("Error fetching recommendations:", error);
            setLoadingRecommendations(false);
          });

        // Fetch similar products from the same category (use first category if multiple)
        const firstCategory = data?.categories && data.categories.length > 0 ? data.categories[0] : data?.category;
        if (firstCategory?.slug) {
          setLoadingSimilar(true);
          fetch(`${API}/products?category=${firstCategory.slug}&limit=10`, { signal: ac.signal })
            .then((res) => res.json())
            .then((products) => {
              // Filter out the current product
              const similar = Array.isArray(products) 
                ? products.filter((p) => p.id !== Number(id))
                : [];
              setSimilarProducts(similar);
              setLoadingSimilar(false);
            })
            .catch((error) => {
              if (error?.name === "AbortError") return;
              console.error("Error fetching similar products:", error);
              setLoadingSimilar(false);
            });
        } else {
          setLoadingSimilar(false);
        }
      })
      .catch((error) => {
        if (error?.name === "AbortError") return;
        console.error("Error fetching product:", error);
        setLoading(false);
      });

    return () => ac.abort();
  }, [id]);

  const handleAddToCart = () => {
    // For single price products, selectedSize is auto-set, so we can proceed
    if (!selectedSize && !(product?.hasSinglePrice && product?.singlePrice)) {
      toast.error("Please select a size");
      return;
    }

    const success = addToCart(product, selectedSize, quantity);
    if (success) {
      toast.success("Added to cart");
      // Optionally navigate to cart
      // navigate("/cart");
    }
  };

  if (loading) {
    return (
      <>
        <GiftBoxLoader 
          isLoading={loading} 
          showLoader={showProductLoader}
        />
      </>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Product not found</h2>
          <Link to="/" className="text-pink-600 hover:underline">
            Go back to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Gift Box Loading Animation for similar products */}
      <GiftBoxLoader 
        isLoading={loadingSimilar} 
        showLoader={showSimilarLoader}
      />
      <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto">
        {/* Top bar */}
        <div className="px-4 sm:px-6 lg:px-8 pt-6">
          <nav className="mb-5">
            <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:text-sm" style={{ color: "oklch(55% .02 340)" }}>
              <li>
                <Link to="/" className="hover:underline" style={{ color: "oklch(40% .02 340)" }}>
                  Home
                </Link>
              </li>
              <li>/</li>
              <li>
                <Link to="/categories" className="hover:underline" style={{ color: "oklch(40% .02 340)" }}>
                  Shop
                </Link>
              </li>
              {product.categories && product.categories.length > 0 ? (
                <>
                  <li>/</li>
                  <li>
                    <Link to={`/category/${product.categories[0].slug}`} className="hover:underline" style={{ color: "oklch(40% .02 340)" }}>
                      {product.categories[0].name}
                    </Link>
                  </li>
                </>
              ) : product.category ? (
                <>
                  <li>/</li>
                  <li>
                    <Link to={`/category/${product.category.slug}`} className="hover:underline" style={{ color: "oklch(40% .02 340)" }}>
                      {product.category.name}
                    </Link>
                  </li>
                </>
              ) : null}
              <li>/</li>
              <li className="font-semibold" style={{ color: "oklch(20% .02 340)" }}>
                {product.name}
              </li>
            </ol>
          </nav>
        </div>

        <div className="px-4 sm:px-6 lg:px-8 pb-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* Left: Media gallery */}
            <section className="lg:col-span-7">
              <div className="lg:flex lg:gap-4">
                {/* Thumbnails (desktop vertical) */}
                {media.length > 1 ? (
                  <div className="hidden lg:flex flex-col gap-3 w-20 shrink-0">
                    {media.slice(0, 8).map((item, idx) => {
                      const active = idx === activeImageIndex;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setActiveImageIndex(idx)}
                          onMouseEnter={() => setActiveImageIndex(idx)}
                          className={[
                            "relative rounded-xl overflow-hidden border transition-transform duration-200",
                            active ? "ring-2 ring-offset-2" : "hover:scale-[1.02]",
                          ].join(" ")}
                          style={{
                            borderColor: active ? "oklch(88% .06 340)" : "oklch(92% .04 340)",
                            ringColor: "oklch(88% .06 340)",
                          }}
                        >
                          <div className="aspect-square bg-white">
                            {item.type === "instagram" ? (
                              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500">
                                <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                                </svg>
                              </div>
                            ) : item.type === "video" ? (
                              <video
                                src={item.url}
                                className="w-full h-full object-cover"
                                muted
                                playsInline
                                preload="metadata"
                              />
                            ) : (
                              <img
                                src={item.url}
                                alt={`${product.name} ${idx + 1}`}
                                className="w-full h-full object-cover"
                                loading="lazy"
                                decoding="async"
                                width={96}
                                height={96}
                              />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : null}

                {/* Primary image, video, or Instagram embed */}
                <div className="flex-1">
                  <div className="relative rounded-3xl overflow-hidden bg-white border" style={{ borderColor: "oklch(92% .04 340)" }}>
                    <div className="relative w-full" style={{ paddingBottom: activeMedia?.type === "instagram" ? "125%" : activeMedia?.type === "video" ? "56.25%" : "100%" }}>
                      {activeMedia?.type === "instagram" ? (
                        <div 
                          ref={instagramEmbedRef}
                          className="absolute inset-0 w-full h-full overflow-auto bg-gray-50 flex items-center justify-center p-4"
                          dangerouslySetInnerHTML={{
                            __html: `
                              <blockquote 
                                class="instagram-media" 
                                data-instgrm-permalink="${activeInstagram}/?utm_source=ig_embed&utm_campaign=loading" 
                                data-instgrm-version="14"
                                style="
                                  background:#FFF; 
                                  border:0; 
                                  border-radius:3px; 
                                  box-shadow:0 0 1px 0 rgba(0,0,0,0.5),0 1px 10px 0 rgba(0,0,0,0.15); 
                                  margin: 1px auto; 
                                  max-width:540px; 
                                  min-width:326px; 
                                  padding:0; 
                                  width:99.375%;
                                "
                              ></blockquote>
                            `
                          }}
                        />
                      ) : activeMedia?.type === "video" ? (
                        <video
                          src={activeMedia.url}
                          className="absolute inset-0 w-full h-full object-contain bg-black"
                          controls
                          playsInline
                          preload="metadata"
                        />
                      ) : activeImage ? (
                        <img
                          src={activeImage}
                          alt={product.name}
                          className="absolute inset-0 w-full h-full object-cover"
                          decoding="async"
                          loading="eager"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: "oklch(92% .04 340)" }}>
                          <img src="/logo.png" alt="Gift Choice Logo" className="w-24 h-24 object-contain opacity-50" />
                        </div>
                      )}

                      {/* Badges */}
                      <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                        {product.isReady60Min ? (
                          <span className="px-3 py-1 text-xs font-bold rounded-full bg-white/90 shadow" style={{ color: "oklch(20% .02 340)" }}>
                            60 Min
                          </span>
                        ) : null}
                        {product.isFestival ? (
                          <span className="px-3 py-1 text-xs font-bold rounded-full bg-white/90 shadow" style={{ color: "oklch(20% .02 340)" }}>
                            Festival
                          </span>
                        ) : null}
                        {product.isNew ? (
                          <span className="px-3 py-1 text-xs font-bold rounded-full bg-white/90 shadow" style={{ color: "oklch(20% .02 340)" }}>
                            New
                          </span>
                        ) : null}
                        {product.badge ? (
                          <span className="px-3 py-1 text-xs font-bold rounded-full bg-pink-500 text-white shadow">
                            {product.badge}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {/* Thumbnails (mobile horizontal) */}
                  {media.length > 1 ? (
                    <div className="mt-4 flex gap-3 overflow-x-auto pb-2 lg:hidden" style={{ WebkitOverflowScrolling: "touch" }}>
                      {media.slice(0, 10).map((item, idx) => {
                        const active = idx === activeImageIndex;
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setActiveImageIndex(idx)}
                            className={[
                              "shrink-0 w-20 rounded-2xl overflow-hidden border transition-transform duration-200",
                              active ? "ring-2 ring-offset-2" : "active:scale-95",
                            ].join(" ")}
                            style={{ borderColor: "oklch(92% .04 340)" }}
                          >
                            <div className="aspect-square bg-white">
                              {item.type === "video" ? (
                                <video
                                  src={item.url}
                                  className="w-full h-full object-cover"
                                  muted
                                  playsInline
                                  preload="metadata"
                                />
                              ) : (
                                <img
                                  src={item.url}
                                  alt={`${product.name} ${idx + 1}`}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                  decoding="async"
                                  width={96}
                                  height={96}
                                />
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              </div>
            </section>

            {/* Right: Sticky buy box */}
            <aside className="lg:col-span-5">
              <div className="lg:sticky lg:top-6">
                <div className="rounded-3xl border bg-white p-6 shadow-sm" style={{ borderColor: "oklch(92% .04 340)" }}>
                  <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight" style={{ color: "oklch(20% .02 340)" }}>
                    {product.name}
                  </h1>

                  <div className="mt-3 flex flex-wrap items-baseline gap-2">
                    {selectedSize ? (
                      <>
                        <div className="text-2xl font-extrabold" style={{ color: "oklch(20% .02 340)" }}>
                          ₹{Number(selectedSize.price).toLocaleString("en-IN")}
                        </div>
                        {(() => {
                          const mrp = selectedSize.originalPrice ?? (product?.hasSinglePrice ? product?.originalPrice : null);
                          if (mrp == null || Number(mrp) <= Number(selectedSize.price)) return null;
                          return (
                            <>
                              <span className="text-base line-through" style={{ color: "oklch(55% .02 340)" }}>
                                ₹{Number(mrp).toLocaleString("en-IN")}
                              </span>
                              <span className="text-sm font-semibold text-green-600">
                                {Math.round(((mrp - selectedSize.price) / mrp) * 100)}% OFF
                              </span>
                            </>
                          );
                        })()}
                        <div className="text-sm font-semibold" style={{ color: "oklch(55% .02 340)" }}>
                          {selectedSize.label}
                        </div>
                      </>
                    ) : product?.hasSinglePrice && product?.singlePrice != null ? (
                      <>
                        <div className="text-2xl font-extrabold" style={{ color: "oklch(20% .02 340)" }}>
                          ₹{Number(product.singlePrice).toLocaleString("en-IN")}
                        </div>
                        {product.originalPrice != null && Number(product.originalPrice) > Number(product.singlePrice) && (
                          <>
                            <span className="text-base line-through" style={{ color: "oklch(55% .02 340)" }}>
                              ₹{Number(product.originalPrice).toLocaleString("en-IN")}
                            </span>
                            <span className="text-sm font-semibold text-green-600">
                              {Math.round(((product.originalPrice - product.singlePrice) / product.originalPrice) * 100)}% OFF
                            </span>
                          </>
                        )}
                      </>
                    ) : (
                      <div className="text-sm font-semibold" style={{ color: "oklch(55% .02 340)" }}>
                        Select a size to see price
                      </div>
                    )}
                  </div>


                  {/* Size selector - only show for products with multiple sizes */}
                  {product.hasSinglePrice ? (
                    <div className="mt-6 rounded-2xl border px-4 py-3" style={{ borderColor: "oklch(92% .04 340)" }}>
                      <div className="text-sm font-semibold" style={{ color: "oklch(55% .02 340)" }}>
                        Price
                      </div>
                      <div className="flex flex-wrap items-baseline gap-2 mt-1">
                        <span className="text-lg font-extrabold" style={{ color: "oklch(20% .02 340)" }}>
                          ₹{Number(product.singlePrice).toLocaleString("en-IN")}
                        </span>
                        {product.originalPrice != null && Number(product.originalPrice) > Number(product.singlePrice) && (
                          <>
                            <span className="text-sm line-through" style={{ color: "oklch(55% .02 340)" }}>
                              ₹{Number(product.originalPrice).toLocaleString("en-IN")}
                            </span>
                            <span className="text-xs font-semibold text-green-600">
                              {Math.round(((product.originalPrice - product.singlePrice) / product.originalPrice) * 100)}% OFF
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  ) : product.sizes?.length ? (
                    <div className="mt-6">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-bold" style={{ color: "oklch(20% .02 340)" }}>
                          Select size
                        </div>
                        {selectedSize ? (
                          <div className="text-xs font-semibold" style={{ color: "oklch(55% .02 340)" }}>
                            Selected: {selectedSize.label}
                          </div>
                        ) : null}
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-3">
                        {product.sizes.map((size) => {
                          const active = selectedSize?.id === size.id;
                          return (
                            <button
                              key={size.id}
                              type="button"
                              onClick={() => setSelectedSize(size)}
                              className={[
                                "rounded-2xl border px-4 py-3 text-left transition-transform duration-200",
                                active ? "ring-2 ring-offset-2" : "hover:shadow-sm active:scale-[0.99]",
                              ].join(" ")}
                              style={{
                                borderColor: active ? "oklch(88% .06 340)" : "oklch(92% .04 340)",
                              }}
                            >
                              <div className="text-sm font-bold" style={{ color: "oklch(20% .02 340)" }}>
                                {size.label}
                              </div>
                              <div className="flex flex-wrap items-baseline gap-1.5 mt-0.5">
                                <span className="text-sm font-extrabold" style={{ color: "oklch(40% .02 340)" }}>
                                  ₹{Number(size.price).toLocaleString("en-IN")}
                                </span>
                                {size.originalPrice != null && Number(size.originalPrice) > Number(size.price) && (
                                  <span className="text-xs line-through" style={{ color: "oklch(55% .02 340)" }}>
                                    ₹{Number(size.originalPrice).toLocaleString("en-IN")}
                                  </span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-6 rounded-2xl border px-4 py-3 text-sm font-semibold" style={{ borderColor: "oklch(92% .04 340)", color: "oklch(55% .02 340)" }}>
                      Sizes are not available for this product.
                    </div>
                  )}

                  {/* Quantity */}
                  <div className="mt-6">
                    <div className="text-sm font-bold" style={{ color: "oklch(20% .02 340)" }}>
                      Quantity
                    </div>
                    <div className="mt-3 inline-flex items-center gap-3 rounded-2xl border px-3 py-2" style={{ borderColor: "oklch(92% .04 340)" }}>
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        className="w-9 h-9 rounded-xl border font-black"
                        style={{ borderColor: "oklch(92% .04 340)", color: "oklch(20% .02 340)" }}
                      >
                        −
                      </button>
                      <div className="w-10 text-center text-lg font-extrabold" style={{ color: "oklch(20% .02 340)" }}>
                        {quantity}
                      </div>
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => q + 1)}
                        className="w-9 h-9 rounded-xl border font-black"
                        style={{ borderColor: "oklch(92% .04 340)", color: "oklch(20% .02 340)" }}
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Total */}
                  {selectedSize ? (
                    <div className="mt-6 rounded-2xl border px-4 py-4" style={{ borderColor: "oklch(92% .04 340)" }}>
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold" style={{ color: "oklch(55% .02 340)" }}>
                          Total
                        </div>
                        <div className="text-2xl font-extrabold" style={{ color: "oklch(20% .02 340)" }}>
                          ₹{(Number(selectedSize.price) * quantity).toFixed(0)}
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {/* CTAs */}
                  <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      onClick={handleAddToCart}
                      disabled={!selectedSize && !(product?.hasSinglePrice && product?.singlePrice)}
                      className="w-full py-3 rounded-2xl font-bold transition-transform duration-200 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ backgroundColor: "oklch(92% .04 340)", color: "oklch(20% .02 340)" }}
                    >
                      Add to cart
                    </button>
                    <button
                      onClick={() => {
                        if (!selectedSize && !(product?.hasSinglePrice && product?.singlePrice)) {
                          toast.error("Please select a size");
                          return;
                        }
                        const sizeLabel = product.hasSinglePrice ? "Standard" : selectedSize.label;
                        const price = product.hasSinglePrice ? product.singlePrice : selectedSize.price;
                        const message = `Hi! I'm interested in:\n\nProduct: ${product.name}\n${product.hasSinglePrice ? '' : `Size: ${sizeLabel}\n`}Quantity: ${quantity}\nPrice: ₹${price}\nTotal: ₹${(Number(price) * quantity).toFixed(2)}`;
                        window.open(`https://wa.me/917976948872?text=${encodeURIComponent(message)}`);
                      }}
                      disabled={!selectedSize && !(product?.hasSinglePrice && product?.singlePrice)}
                      className="w-full py-3 rounded-2xl font-bold transition-transform duration-200 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ backgroundColor: "oklch(55% .18 145)", color: "white" }}
                    >
                      WhatsApp
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="mt-4 w-full text-sm font-semibold underline"
                    style={{ color: "oklch(40% .02 340)" }}
                  >
                    Continue shopping
                  </button>
                </div>

                {/* Accordions */}
                <div className="mt-4 rounded-3xl border bg-white overflow-hidden" style={{ borderColor: "oklch(92% .04 340)" }}>
                  <button
                    type="button"
                    onClick={() => toggleSection("details")}
                    className="w-full flex items-center justify-between px-5 py-4 text-left"
                  >
                    <div className="font-bold" style={{ color: "oklch(20% .02 340)" }}>
                      Product details
                    </div>
                    <div className="text-xl font-black" style={{ color: "oklch(40% .02 340)" }}>
                      {expanded.has("details") ? "−" : "+"}
                    </div>
                  </button>
                  {expanded.has("details") ? (
                    <div className="px-5 pb-5 text-sm leading-relaxed" style={{ color: "oklch(55% .02 340)" }}>
                      {product.description}
                    </div>
                  ) : null}

                  <div className="h-px" style={{ backgroundColor: "oklch(92% .04 340)" }} />

                  
                </div>
              </div>
            </aside>
          </div>

          {/* Similar Products Section */}
          {similarProducts.length > 0 && (
            <section className="mt-16 px-4 sm:px-6 lg:px-8">
              <h2 className="text-2xl sm:text-3xl font-extrabold mb-6" style={{ color: "oklch(20% .02 340)" }}>
                Similar Products
              </h2>
              {similarProducts.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6">
                  {similarProducts.map((similarProduct) => (
                    <ProductCard key={similarProduct.id} product={similarProduct} />
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Recommendation Carousel Section */}
          <RecommendationCarousel 
            products={recommendedProducts} 
            isLoading={loadingRecommendations}
          />
        </div>
      </div>
    </div>
    </>
  );
}
