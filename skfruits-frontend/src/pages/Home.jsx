import { useEffect, useMemo, useState, useRef } from "react";
import { API } from "../api";
import ProductCard from "../components/ProductCard";
import { Link } from "react-router-dom";
import BannerSlider from "../components/BannerSlider";
import { MemoReelCarousel as ReelCarousel } from "../components/ReelCarousel";
import GiftBoxLoader from "../components/GiftBoxLoader";
import ProductCarouselSection from "../components/ProductCarouselSection";
import { useProductLoader } from "../hooks/useProductLoader";
import { useRecentlyViewed } from "../context/RecentlyViewedContext";
import { useWishlist } from "../context/WishlistContext";
import { useUserAuth } from "../context/UserAuthContext";
import { shuffleArray } from "../utils/shuffle";

export default function Home() {
  const { recentIds } = useRecentlyViewed();
  const { wishlistItems } = useWishlist();
  const { isAuthenticated, getAuthHeaders } = useUserAuth();
  const [products, setProducts] = useState([]);
  const [trendingProducts, setTrendingProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [occasions, setOccasions] = useState([]);
  const [reels, setReels] = useState([]);
  const [banners, setBanners] = useState([]);
  const [topRatedProducts, setTopRatedProducts] = useState([]);
  const [buyAgainIds, setBuyAgainIds] = useState([]);
  const [visibleProductsCount, setVisibleProductsCount] = useState(10);
  const [loading, setLoading] = useState({
    categories: true,
    occasions: true,
    products: true,
    reels: true,
    banners: true,
  });
  const scrollRef = useRef(null);
  const occasionScrollRef = useRef(null);
  const scrollEndTimerRef = useRef(null);
  const occasionScrollEndTimerRef = useRef(null);
  
  // Time-based loader for products (used by useProductLoader internally; main content uses showAnyLoader)
  const isProductsLoading = loading.products;
  useProductLoader(isProductsLoading);

  // Single request for homepage data (faster: 1 round-trip instead of 5)
  useEffect(() => {
    const ac = new AbortController();
    fetch(`${API}/home`, { signal: ac.signal })
      .then((res) => res.json())
      .then((data) => {
        if (!data || data.error) {
          setLoading((prev) => ({ ...prev, categories: false, occasions: false, products: false, reels: false, banners: false }));
          return;
        }
        setCategories(Array.isArray(data.categories) ? data.categories : []);
        setOccasions(Array.isArray(data.occasions) ? data.occasions : []);
        const list = shuffleArray(Array.isArray(data.products) ? data.products : []);
        setProducts(list);
        setTrendingProducts(list.filter((p) => p.isTrending));
        setReels(Array.isArray(data.reels) ? data.reels : []);
        setBanners(Array.isArray(data.banners) ? data.banners : []);
        setLoading((prev) => ({ ...prev, categories: false, occasions: false, products: false, reels: false, banners: false }));
      })
      .catch(() => {
        setLoading((prev) => ({ ...prev, categories: false, occasions: false, products: false, reels: false, banners: false }));
      });
    return () => ac.abort();
  }, []);

  // Lazy: top-rated products
  useEffect(() => {
    const ac = new AbortController();
    fetch(`${API}/products/top-rated?limit=12`, { signal: ac.signal })
      .then((res) => res.json())
      .then((data) => setTopRatedProducts(Array.isArray(data) ? data : []))
      .catch(() => setTopRatedProducts([]));
    return () => ac.abort();
  }, []);

  // Lazy: buy-again product IDs (authenticated)
  useEffect(() => {
    if (!isAuthenticated) {
      setBuyAgainIds([]);
      return;
    }
    const headers = getAuthHeaders();
    if (!headers.Authorization) return;
    const ac = new AbortController();
    fetch(`${API}/orders/my-orders`, { headers, credentials: "include", signal: ac.signal })
      .then((res) => res.json())
      .then((orders) => {
        if (!Array.isArray(orders)) return;
        const ids = [];
        const seen = new Set();
        for (const order of orders) {
          const items = order.items || order.orderItems || [];
          for (const item of items) {
            const pid = item.productId ?? item.product?.id;
            if (pid && !seen.has(pid)) {
              seen.add(pid);
              ids.push(pid);
            }
          }
        }
        setBuyAgainIds(ids.slice(0, 12));
      })
      .catch(() => setBuyAgainIds([]));
    return () => ac.abort();
  }, [isAuthenticated, getAuthHeaders]);

  // Clean up scroll-end timers on unmount
  useEffect(() => {
    return () => {
      if (scrollEndTimerRef.current) clearTimeout(scrollEndTimerRef.current);
      if (occasionScrollEndTimerRef.current) clearTimeout(occasionScrollEndTimerRef.current);
    };
  }, []);

  // After initial content is visible, progressively render more product cards
  useEffect(() => {
    if (!products.length) return;
    if (visibleProductsCount >= Math.min(products.length, 25)) return;
    const t = setTimeout(() => setVisibleProductsCount((c) => Math.min(c + 5, 25)), 600);
    return () => clearTimeout(t);
  }, [products.length, visibleProductsCount]);

  const visibleProducts = useMemo(
    () => (Array.isArray(products) ? products.slice(0, visibleProductsCount) : []),
    [products, visibleProductsCount]
  );

  // Removed getCategoryIcon - all categories use logo as fallback

  // Infinite carousel: triple the list so we can scroll seamlessly and reset position
  const categoriesTriple = useMemo(
    () => (categories.length > 0 ? [...categories, ...categories, ...categories] : []),
    [categories]
  );
  const occasionsTriple = useMemo(
    () => (occasions.length > 0 ? [...occasions, ...occasions, ...occasions] : []),
    [occasions]
  );
  const categorySetWidthRef = useRef(0);
  const occasionSetWidthRef = useRef(0);

  // Initialize scroll position to middle set and handle loop reset (categories)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || categories.length === 0) return;
    const setWidth = el.scrollWidth / 3;
    categorySetWidthRef.current = setWidth;
    el.scrollLeft = setWidth;
  }, [categories]);

  useEffect(() => {
    const el = occasionScrollRef.current;
    if (!el || occasions.length === 0) return;
    const setWidth = el.scrollWidth / 3;
    occasionSetWidthRef.current = setWidth;
    el.scrollLeft = setWidth;
  }, [occasions]);

  const scrollCategories = (direction) => {
    const el = scrollRef.current;
    if (!el || categories.length === 0) return;
    const scrollAmount = 300;
    el.scrollBy({ left: direction === "left" ? -scrollAmount : scrollAmount, behavior: "smooth" });
    const setWidth = categorySetWidthRef.current || el.scrollWidth / 3;
    setTimeout(() => {
      if (!scrollRef.current) return;
      const sl = scrollRef.current.scrollLeft;
      if (sl >= setWidth * 2 - 50) scrollRef.current.scrollLeft = sl - setWidth;
      else if (sl <= 50) scrollRef.current.scrollLeft = sl + setWidth;
    }, 350);
  };

  const scrollOccasions = (direction) => {
    const el = occasionScrollRef.current;
    if (!el || occasions.length === 0) return;
    const scrollAmount = 300;
    el.scrollBy({ left: direction === "left" ? -scrollAmount : scrollAmount, behavior: "smooth" });
    const setWidth = occasionSetWidthRef.current || el.scrollWidth / 3;
    setTimeout(() => {
      if (!occasionScrollRef.current) return;
      const sl = occasionScrollRef.current.scrollLeft;
      if (sl >= setWidth * 2 - 50) occasionScrollRef.current.scrollLeft = sl - setWidth;
      else if (sl <= 50) occasionScrollRef.current.scrollLeft = sl + setWidth;
    }, 350);
  };

  // Scroll loop reset on scroll end (for drag/swipe and so middle set stays in sync)
  const handleCategoryScrollEnd = () => {
    const el = scrollRef.current;
    if (!el || categories.length === 0) return;
    const setWidth = categorySetWidthRef.current || el.scrollWidth / 3;
    const sl = el.scrollLeft;
    if (sl >= setWidth * 2 - 50) el.scrollLeft = sl - setWidth;
    else if (sl <= 50) el.scrollLeft = sl + setWidth;
  };
  const handleOccasionScrollEnd = () => {
    const el = occasionScrollRef.current;
    if (!el || occasions.length === 0) return;
    const setWidth = occasionSetWidthRef.current || el.scrollWidth / 3;
    const sl = el.scrollLeft;
    if (sl >= setWidth * 2 - 50) el.scrollLeft = sl - setWidth;
    else if (sl <= 50) el.scrollLeft = sl + setWidth;
  };

  // Check if any data is still loading
  const isInitialLoad = loading.categories || loading.occasions || loading.products || loading.reels || loading.banners;

  // Time-based loader for all data (similar to useProductLoader)
  const [showAnyLoader, setShowAnyLoader] = useState(isInitialLoad);
  const loadingStartTime = useRef(null);
  const minLoadTimeReached = useRef(false);
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (isInitialLoad) {
      if (loadingStartTime.current === null) {
        loadingStartTime.current = Date.now();
        minLoadTimeReached.current = false;
        const id = setTimeout(() => setShowAnyLoader(true), 0);
        timeoutRef.current = setTimeout(() => {
          minLoadTimeReached.current = true;
        }, 100);
        return () => {
          clearTimeout(id);
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
        };
      } else {
        const id = setTimeout(() => setShowAnyLoader(true), 0);
        return () => clearTimeout(id);
      }
    } else {
      if (loadingStartTime.current !== null) {
        const loadDuration = Date.now() - loadingStartTime.current;
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        if (loadDuration < 100 && !minLoadTimeReached.current) {
          setTimeout(() => setShowAnyLoader(false), 0);
        } else {
          setTimeout(() => setShowAnyLoader(false), Math.max(0, 100 - loadDuration));
        }
        loadingStartTime.current = null;
      }
    }
  }, [isInitialLoad]);

  const isAnyLoading = isInitialLoad;

  return (
    <div className="min-h-screen fade-in" style={{ backgroundColor: 'var(--background)' }}>
      {/* Gift Box Loading Animation - Only shows if loading takes >= 0.1 seconds */}
      <GiftBoxLoader 
        isLoading={isAnyLoading} 
        showLoader={showAnyLoader}
      />
      {/* Hide content while loader is showing */}
      {!showAnyLoader && (
        <>
          {/* Hero Section - desktop: text left, image right; phone: photo as bg with text overlay */}
          <section className="w-full overflow-hidden bg-[#f3ece1] relative min-h-[70vh] lg:min-h-0">
            {/* Phone: photo as full-bleed background (low opacity + blur) */}
            <div className="absolute inset-0 z-0 lg:hidden">
              <img
                src="/hero2.png"
                alt=""
                aria-hidden
                className="absolute inset-0 w-full h-full object-cover object-center opacity-40 blur-sm"
                loading="eager"
                fetchPriority="high"
              />
            </div>
            <div className="relative z-10 flex flex-col lg:flex-row lg:items-stretch">
              {/* Text - overlay on phone, left column on desktop */}
              <div className="flex flex-col justify-center lg:w-1/2 px-6 sm:px-8 md:px-10 lg:px-12 xl:px-16 py-12 sm:py-16 lg:py-12 min-h-[70vh] lg:min-h-0">
                <h1 className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-5xl xl:text-6xl font-bold text-design-foreground">
                  SK Fruits
                </h1>
                <div className="mt-4 sm:mt-5 font-bold text-xl sm:text-2xl md:text-3xl lg:text-3xl uppercase tracking-wide leading-tight" style={{ color: "#8B6914" }}>
                  <div>Fresh</div>
                  <div>Grocery</div>
                  <div>Delivery</div>
                </div>
                <p className="mt-4 sm:mt-5 text-sm sm:text-base md:text-lg text-design-muted max-w-xl leading-relaxed">
                  Discover everyday essentials, fresh produce, and quality brands all under one roof at your favorite grocery store.
                </p>
              </div>
              {/* Image - right on desktop only; hidden on phone (bg layer used instead) */}
              <div
                className="relative hidden lg:block lg:shrink-0 lg:w-auto"
                style={{ width: 1000, height: 500, maxWidth: "100%" }}
              >
                <img
                  src="/hero2.png"
                  alt="SK Fruits - Fresh premium fruits"
                  width={1000}
                  height={500}
                  className="w-full h-full object-cover object-center"
                  loading="eager"
                  fetchPriority="high"
                />
              </div>
            </div>
          </section>

          {/* Shop By Category Section */}
      {categories.length > 0 ? (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-8">
            <h2 className="font-display text-3xl font-bold text-design-foreground">Shop By Category</h2>
            <Link 
              to="/categories" 
              className="text-sm font-semibold inline-flex items-center gap-1 transition-all duration-300 hover:gap-2 group text-design-foreground hover:opacity-80"
            >
              View All
              <svg className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
          <div className="relative">
            <button
              onClick={() => scrollCategories("left")}
              className="absolute left-0 top-1/2 transform -translate-y-1/2 z-10 rounded-full p-3 shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300 border border-design active:scale-95 bg-[var(--background)] hover:bg-design-secondary"
            >
              <svg className="w-5 h-5 text-design-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div
              ref={scrollRef}
              className="flex gap-3 sm:gap-4 overflow-x-auto scrollbar-hide pb-4 px-1 sm:px-2"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              onScroll={() => {
                if (scrollEndTimerRef.current) clearTimeout(scrollEndTimerRef.current);
                scrollEndTimerRef.current = setTimeout(handleCategoryScrollEnd, 150);
              }}
            >
              {categoriesTriple.map((category, i) => (
                <Link
                  key={`cat-${i}-${category.id}`}
                  to={`/category/${category.slug}`}
                  className="flex-shrink-0 flex flex-col items-center min-w-[100px] sm:min-w-[120px] group"
                >
                  <div className="w-24 h-24 sm:w-28 sm:h-28 lg:w-32 lg:h-32 rounded-full flex items-center justify-center text-4xl sm:text-5xl border-2 border-design group-hover:shadow-lg group-hover:scale-110 transition-all duration-300 overflow-hidden cursor-pointer bg-design-secondary group-hover:border-[var(--border)]"
                  >
                    {category.imageUrl ? (
                      <img
                        src={category.imageUrl}
                        alt={category.name}
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : (
                      <div className="w-full h-full rounded-full flex items-center justify-center overflow-hidden bg-design-secondary">
                        <img src="/logo.png" alt="SK Fruits" className="w-3/4 h-3/4 object-contain" />
                      </div>
                    )}
                  </div>
                  <span className="text-sm font-semibold text-center transition-colors mt-2 text-design-muted group-hover:text-design-foreground">
                    {category.name}
                  </span>
                </Link>
              ))}
            </div>
            <button
              onClick={() => scrollCategories("right")}
              className="absolute right-0 top-1/2 transform -translate-y-1/2 z-10 rounded-full p-3 shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300 border border-design active:scale-95 bg-[var(--background)] hover:bg-design-secondary"
            >
              <svg className="w-5 h-5 text-design-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      ) : null}

          {/* Primary Banner Slider (admin-managed banners) */}
          {!isInitialLoad && <BannerSlider bannerType="primary" />}

      {/* Popular Fruits (Trending) */}
      {trendingProducts.length > 0 ? (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6" style={{ backgroundColor: 'var(--background)' }}>
          <div className="flex items-center justify-between mb-10">
            <h2 className="font-display text-3xl font-bold text-design-foreground">Popular Fruits</h2>
            <Link
              to="/categories?trending=true"
              className="text-sm font-semibold inline-flex items-center gap-1 transition-all duration-300 hover:gap-2 group text-design-foreground hover:opacity-80"
            >
              View All
              <svg className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
          <div
            className="flex gap-5 overflow-x-auto pb-4 px-1 snap-x snap-mandatory scrollbar-thin"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {trendingProducts.map((p) => (
              <div
                key={p.id}
                className="shrink-0 snap-start w-[48%] lg:w-[20%]"
              >
                <ProductCard product={p} />
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Top Rated */}
      {topRatedProducts.length > 0 && (
        <div className="max-w-7xl mx-auto">
          <ProductCarouselSection title="Top Rated" products={topRatedProducts} />
        </div>
      )}

       {/* Personalized: Recently Viewed */}
       {recentIds.length > 0 && (
        <div className="max-w-7xl mx-auto">
          <ProductCarouselSection title="Recently Viewed" productIds={recentIds} />
        </div>
      )}

      {/* Mins banner image */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <img
          src="/mins.png"
          alt=""
          width={752}
          height={332}
          className="w-full max-w-[752px] h-auto mx-auto object-contain rounded-xl"
          style={{ aspectRatio: "752 / 332" }}
        />
      </div>

      {/* Personalized: Buy Again */}
      {buyAgainIds.length > 0 && (
        <div className="max-w-7xl mx-auto">
          <ProductCarouselSection title="Buy Again" productIds={buyAgainIds} />
        </div>
      )}

      {/* Shop By Occasion Section (Seasonal Picks) */}
      {occasions.length > 0 ? (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-8">
            <h2 className="font-display text-3xl font-bold text-design-foreground">Shop By Occasion</h2>
            <Link 
              to="/exotic" 
              className="text-sm font-semibold inline-flex items-center gap-1 transition-all duration-300 hover:gap-2 group text-design-foreground hover:opacity-80"
            >
              View All
              <svg className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
          <div className="relative">
            <button
              onClick={() => scrollOccasions("left")}
              className="absolute left-0 top-1/2 transform -translate-y-1/2 z-10 rounded-full p-3 shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300 border border-design active:scale-95 bg-[var(--background)] hover:bg-design-secondary"
            >
              <svg className="w-5 h-5 text-design-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div
              ref={occasionScrollRef}
              className="flex gap-5 overflow-x-auto scrollbar-hide pb-4 px-2"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              onScroll={() => {
                if (occasionScrollEndTimerRef.current) clearTimeout(occasionScrollEndTimerRef.current);
                occasionScrollEndTimerRef.current = setTimeout(handleOccasionScrollEnd, 150);
              }}
            >
              {occasionsTriple.map((occasion, i) => (
                <Link
                  key={`occ-${i}-${occasion.id}`}
                  to={`/exotic/${occasion.slug}`}
                  className="flex-shrink-0 flex flex-col items-center min-w-[140px] sm:min-w-[160px] group"
                >
                  <div className="w-32 h-32 sm:w-36 sm:h-36 lg:w-40 lg:h-40 rounded-lg flex items-center justify-center text-4xl sm:text-5xl group-hover:shadow-lg group-hover:scale-110 transition-all duration-300 overflow-hidden cursor-pointer bg-design-secondary"
                  >
                    {occasion.imageUrl ? (
                      <img
                        src={occasion.imageUrl}
                        alt={occasion.name}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <div className="w-full h-full rounded-lg flex items-center justify-center overflow-hidden bg-design-secondary">
                        <img src="/logo.png" alt="SK Fruits" className="w-3/4 h-3/4 object-contain" />
                      </div>
                    )}
                  </div>
                  <span className="text-sm font-semibold text-center transition-colors mt-2 text-design-muted group-hover:text-design-foreground">
                    {occasion.name}
                  </span>
                </Link>
              ))}
            </div>
            <button
              onClick={() => scrollOccasions("right")}
              className="absolute right-0 top-1/2 transform -translate-y-1/2 z-10 rounded-full p-3 shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300 border border-design active:scale-95 bg-[var(--background)] hover:bg-design-secondary"
            >
              <svg className="w-5 h-5 text-design-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      ) : null}

      {/* Trending Gifts Section - Hide while loader is showing */}
      {!showAnyLoader && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6" style={{ backgroundColor: 'var(--background)' }}>
          <div className="flex items-center justify-between mb-10">
            <h2 className="font-display text-3xl font-bold text-design-foreground">Our Products</h2>
            {products.length > 0 && (
              <Link
                to="/shop"
                className="text-sm font-semibold inline-flex items-center gap-1 transition-all duration-300 hover:gap-2 group text-design-foreground hover:opacity-80"
              >
                View All
                <svg className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {visibleProducts.length > 0 ? (
              visibleProducts.map((p) => <ProductCard key={p.id} product={p} />)
            ) : (
              <div className="col-span-full text-center py-16">
                <div className="inline-block p-6 rounded-full mb-4 bg-design-secondary">
                  <img src="/logo.png" alt="SK Fruits" className="w-16 h-16 object-contain" />
                </div>
                <h3 className="font-display text-2xl font-bold mb-2 text-design-foreground">SK Fruits</h3>
                <p className="font-medium text-design-muted">
                  More amazing gifts coming soon!
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Secondary Banner Section - Between Gifts and Reels */}
      {!isInitialLoad && <BannerSlider bannerType="secondary" />}
      
      {/* Personalized: From Your Wishlist */}
      {wishlistItems.length > 0 && (
        <div className="max-w-7xl mx-auto">
          <ProductCarouselSection
            title="From Your Wishlist"
            products={wishlistItems.map((item) => item.product).filter(Boolean)}
          />
        </div>
      )}

      {/* Reels Section */}
      {reels.length > 0 && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6" style={{ backgroundColor: 'var(--background)' }}>
            <h2 className="font-display text-3xl font-bold mb-8 text-center text-design-foreground">
              Follow Us{" "}
              <a
                href="https://www.instagram.com/giftchoicebhl"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline transition-all text-[var(--primary)]"
              >
                @giftchoicebhl
              </a>
            </h2>
            <ReelCarousel reels={reels} />
          </div>
      )}
        </>
      )}
    </div>
  );
}
