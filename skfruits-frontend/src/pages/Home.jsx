import { useEffect, useMemo, useState, useRef } from "react";
import { API } from "../api";
import ProductCard from "../components/ProductCard";
import { Link } from "react-router-dom";
import BannerSlider from "../components/BannerSlider";
import { MemoReelCarousel as ReelCarousel } from "../components/ReelCarousel";
import GiftBoxLoader from "../components/GiftBoxLoader";
import { useProductLoader } from "../hooks/useProductLoader";

export default function Home() {
  const [products, setProducts] = useState([]);
  const [trendingProducts, setTrendingProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [occasions, setOccasions] = useState([]);
  const [reels, setReels] = useState([]);
  const [banners, setBanners] = useState([]);
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

  useEffect(() => {
    const ac = new AbortController();

    // Fetch categories
    fetch(`${API}/categories`, { signal: ac.signal })
      .then((res) => res.json())
      .then((data) => {
        setCategories(Array.isArray(data) ? data : []);
        setLoading((prev) => ({ ...prev, categories: false }));
      })
      .catch(() => {
        setLoading((prev) => ({ ...prev, categories: false }));
      });

    // Fetch occasions
    fetch(`${API}/occasions`, { signal: ac.signal })
      .then((res) => res.json())
      .then((data) => {
        setOccasions(Array.isArray(data) ? data : []);
        setLoading((prev) => ({ ...prev, occasions: false }));
      })
      .catch(() => {
        setLoading((prev) => ({ ...prev, occasions: false }));
      });

    // Fetch products
    fetch(`${API}/products`, { signal: ac.signal })
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setProducts(list);
        setTrendingProducts(list.filter((p) => p.isTrending));
        setLoading((prev) => ({ ...prev, products: false }));
      })
      .catch(() => {
        setLoading((prev) => ({ ...prev, products: false }));
      });

    // Fetch reels
    fetch(`${API}/reels`, { signal: ac.signal })
      .then((res) => res.json())
      .then((data) => {
        setReels(Array.isArray(data) ? data : []);
        setLoading((prev) => ({ ...prev, reels: false }));
      })
      .catch(() => {
        setLoading((prev) => ({ ...prev, reels: false }));
      });

    // Fetch primary banners for hero section
    fetch(`${API}/banners?type=primary`, { signal: ac.signal })
      .then((res) => res.json())
      .then((data) => {
        setBanners(Array.isArray(data) ? data : []);
        setLoading((prev) => ({ ...prev, banners: false }));
      })
      .catch(() => {
        setLoading((prev) => ({ ...prev, banners: false }));
      });

    return () => {
      ac.abort();
    };
  }, []);

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
  const heroBanner = banners.length > 0 ? banners[0] : null;

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
    <div className="min-h-screen bg-white fade-in">
      {/* Gift Box Loading Animation - Only shows if loading takes >= 0.1 seconds */}
      <GiftBoxLoader 
        isLoading={isAnyLoading} 
        showLoader={showAnyLoader}
      />
      {/* Hide content while loader is showing */}
      {!showAnyLoader && (
        <>
          {/* Hero Section - Shows immediately on initial load */}
          {isInitialLoad && (
        <div className="relative w-full overflow-hidden h-[300px] sm:h-[400px] lg:h-[500px]">
          {/* Use banner image if available, otherwise use gradient */}
          {heroBanner && heroBanner.imageUrl ? (
            <>
              <img
                src={heroBanner.imageUrl}
                alt={heroBanner.title || "Gift Choice"}
                className="w-full h-full object-cover"
                loading="eager"
                fetchPriority="high"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-transparent"></div>
            </>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50"></div>
          )}
          
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center px-4">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-4 text-white drop-shadow-lg">
                {heroBanner?.title || "Gift Choice"}
              </h1>
              <p className="text-lg sm:text-xl text-white/90 mb-6 drop-shadow-md">
                {heroBanner?.subtitle || "Discover the perfect gift for every occasion"}
              </p>
            </div>
          </div>
          
          {/* Decorative elements - only show if no banner image */}
          {!heroBanner && (
            <>
              <div className="absolute top-10 left-10 w-16 h-16 opacity-20 rounded-full p-2" style={{ backgroundColor: 'rgba(255, 192, 203, 0.3)' }}>
                <img src="/logo.png" alt="Gift Choice Logo" className="w-full h-full object-contain" />
              </div>
              <div className="absolute bottom-10 right-10 w-16 h-16 opacity-20 rounded-full p-2" style={{ backgroundColor: 'rgba(255, 192, 203, 0.3)' }}>
                <img src="/logo.png" alt="Gift Choice Logo" className="w-full h-full object-contain" />
              </div>
              <div className="absolute top-1/2 right-20 w-14 h-14 opacity-20 rounded-full p-2" style={{ backgroundColor: 'rgba(255, 192, 203, 0.3)' }}>
                <img src="/logo.png" alt="Gift Choice Logo" className="w-full h-full object-contain" />
              </div>
            </>
          )}
        </div>
      )}

      {/* Primary Banner Slider - Only show when data is loaded */}
      {!isInitialLoad && <BannerSlider bannerType="primary" />}

      {/* Shop By Category Section */}
      {categories.length > 0 ? (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold" style={{ color: 'oklch(20% .02 340)' }}>Shop By Category</h2>
            <Link 
              to="/categories" 
              className="text-sm font-semibold inline-flex items-center gap-1 transition-all duration-300 hover:gap-2 group"
              style={{ color: 'oklch(20% .02 340)' }}
              onMouseEnter={(e) => e.target.style.color = 'oklch(40% .02 340)'}
              onMouseLeave={(e) => e.target.style.color = 'oklch(20% .02 340)'}
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
              className="absolute left-0 top-1/2 transform -translate-y-1/2 z-10 bg-white rounded-full p-3 shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300 border active:scale-95"
              style={{ borderColor: 'oklch(92% .04 340)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'oklch(92% .04 340)';
                e.currentTarget.style.backgroundColor = 'oklch(92% .04 340)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'oklch(92% .04 340)';
                e.currentTarget.style.backgroundColor = 'white';
              }}
            >
              <svg className="w-5 h-5" style={{ color: 'oklch(40% .02 340)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  <div className="w-24 h-24 sm:w-28 sm:h-28 lg:w-32 lg:h-32 rounded-full flex items-center justify-center text-4xl sm:text-5xl border-2 group-hover:shadow-lg group-hover:scale-110 transition-all duration-300 overflow-hidden cursor-pointer"
                    style={{ 
                      backgroundColor: 'oklch(92% .04 340)',
                      borderColor: 'oklch(92% .04 340)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'oklch(88% .06 340)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'oklch(92% .04 340)';
                    }}
                  >
                    {category.imageUrl ? (
                      <img
                        src={category.imageUrl}
                        alt={category.name}
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : (
                      <div className="w-full h-full rounded-full flex items-center justify-center overflow-hidden" style={{ backgroundColor: 'oklch(92% .04 340)' }}>
                        <img src="/logo.png" alt="Gift Choice Logo" className="w-3/4 h-3/4 object-contain" />
                      </div>
                    )}
                  </div>
                  <span className="text-sm font-semibold text-center transition-colors mt-2"
                    style={{ color: 'oklch(40% .02 340)' }}
                    onMouseEnter={(e) => e.target.style.color = 'oklch(92% .04 340)'}
                    onMouseLeave={(e) => e.target.style.color = 'oklch(40% .02 340)'}
                  >
                    {category.name}
                  </span>
                </Link>
              ))}
            </div>
            <button
              onClick={() => scrollCategories("right")}
              className="absolute right-0 top-1/2 transform -translate-y-1/2 z-10 bg-white rounded-full p-3 shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300 border active:scale-95"
              style={{ borderColor: 'oklch(92% .04 340)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'oklch(92% .04 340)';
                e.currentTarget.style.backgroundColor = 'oklch(92% .04 340)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'oklch(92% .04 340)';
                e.currentTarget.style.backgroundColor = 'white';
              }}
            >
              <svg className="w-5 h-5" style={{ color: 'oklch(40% .02 340)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      ) : null}

      {/* Trending Products Section */}
      {trendingProducts.length > 0 ? (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 bg-white">
          <div className="flex items-center justify-between mb-10">
            <h2 className="text-3xl font-bold" style={{ color: 'oklch(20% .02 340)' }}>Trending Products</h2>
            <Link
              to="/categories?trending=true"
              className="text-sm font-semibold inline-flex items-center gap-1 transition-all duration-300 hover:gap-2 group"
              style={{ color: 'oklch(20% .02 340)' }}
              onMouseEnter={(e) => e.target.style.color = 'oklch(40% .02 340)'}
              onMouseLeave={(e) => e.target.style.color = 'oklch(20% .02 340)'}
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

      {/* Shop By Occasion Section */}
      {occasions.length > 0 ? (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold" style={{ color: 'oklch(20% .02 340)' }}>Shop By Occasion</h2>
            <Link 
              to="/occasion" 
              className="text-sm font-semibold inline-flex items-center gap-1 transition-all duration-300 hover:gap-2 group"
              style={{ color: 'oklch(20% .02 340)' }}
              onMouseEnter={(e) => e.target.style.color = 'oklch(40% .02 340)'}
              onMouseLeave={(e) => e.target.style.color = 'oklch(20% .02 340)'}
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
              className="absolute left-0 top-1/2 transform -translate-y-1/2 z-10 bg-white rounded-full p-3 shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300 border active:scale-95"
              style={{ borderColor: 'oklch(92% .04 340)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'oklch(92% .04 340)';
                e.currentTarget.style.backgroundColor = 'oklch(92% .04 340)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'oklch(92% .04 340)';
                e.currentTarget.style.backgroundColor = 'white';
              }}
            >
              <svg className="w-5 h-5" style={{ color: 'oklch(40% .02 340)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  to={`/occasion/${occasion.slug}`}
                  className="flex-shrink-0 flex flex-col items-center min-w-[140px] sm:min-w-[160px] group"
                >
                  <div className="w-32 h-32 sm:w-36 sm:h-36 lg:w-40 lg:h-40 rounded-lg flex items-center justify-center text-4xl sm:text-5xl group-hover:shadow-lg group-hover:scale-110 transition-all duration-300 overflow-hidden cursor-pointer"
                    style={{ 
                      backgroundColor: 'oklch(92% .04 340)'
                    }}
                  >
                    {occasion.imageUrl ? (
                      <img
                        src={occasion.imageUrl}
                        alt={occasion.name}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <div className="w-full h-full rounded-lg flex items-center justify-center overflow-hidden" style={{ backgroundColor: 'oklch(92% .04 340)' }}>
                        <img src="/logo.png" alt="Gift Choice Logo" className="w-3/4 h-3/4 object-contain" />
                      </div>
                    )}
                  </div>
                  <span className="text-sm font-semibold text-center transition-colors mt-2"
                    style={{ color: 'oklch(40% .02 340)' }}
                    onMouseEnter={(e) => e.target.style.color = 'oklch(92% .04 340)'}
                    onMouseLeave={(e) => e.target.style.color = 'oklch(40% .02 340)'}
                  >
                    {occasion.name}
                  </span>
                </Link>
              ))}
            </div>
            <button
              onClick={() => scrollOccasions("right")}
              className="absolute right-0 top-1/2 transform -translate-y-1/2 z-10 bg-white rounded-full p-3 shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300 border active:scale-95"
              style={{ borderColor: 'oklch(92% .04 340)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'oklch(92% .04 340)';
                e.currentTarget.style.backgroundColor = 'oklch(92% .04 340)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'oklch(92% .04 340)';
                e.currentTarget.style.backgroundColor = 'white';
              }}
            >
              <svg className="w-5 h-5" style={{ color: 'oklch(40% .02 340)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      ) : null}

      {/* Trending Gifts Section - Hide while loader is showing */}
      {!showAnyLoader && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 bg-white">
          <div className="flex items-center justify-between mb-10">
            <h2 className="text-3xl font-bold" style={{ color: 'oklch(20% .02 340)' }}>Gifts</h2>
            {products.length > 0 && (
              <Link
                to="/shop"
                className="text-sm font-semibold inline-flex items-center gap-1 transition-all duration-300 hover:gap-2 group"
                style={{ color: 'oklch(20% .02 340)' }}
                onMouseEnter={(e) => e.target.style.color = 'oklch(40% .02 340)'}
                onMouseLeave={(e) => e.target.style.color = 'oklch(20% .02 340)'}
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
                <div className="inline-block p-6 rounded-full mb-4" style={{ backgroundColor: 'oklch(92% .04 340)' }}>
                  <img src="/logo.png" alt="Gift Choice Logo" className="w-16 h-16 object-contain" />
                </div>
                <h3 className="text-2xl font-bold mb-2" style={{ color: 'oklch(20% .02 340)' }}>Gift Choice</h3>
                <p className="font-medium" style={{ color: 'oklch(60% .02 340)' }}>
                  More amazing gifts coming soon!
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Secondary Banner Section - Between Gifts and Reels */}
      {!isInitialLoad && <BannerSlider bannerType="secondary" />}

      {/* Reels Section */}
      {reels.length > 0 && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 bg-white">
            <h2 className="text-3xl font-bold mb-8 text-center" style={{ color: 'oklch(20% .02 340)' }}>
              Follow Us{" "}
              <a
                href="https://www.instagram.com/giftchoicebhl"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline transition-all"
                style={{ color: 'oklch(92% .04 340)' }}
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
