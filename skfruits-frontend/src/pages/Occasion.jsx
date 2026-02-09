import { useEffect, useRef, useState } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { API } from "../api";
import ProductCard from "../components/ProductCard";
import GiftBoxLoader from "../components/GiftBoxLoader";
import { useProductLoader } from "../hooks/useProductLoader";

export default function Occasion() {
  const { slug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryFilter = searchParams.get("category") || "";
  const [occasions, setOccasions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedOccasion, setSelectedOccasion] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Time-based loader (only shows if loading >= 1 second)
  const { showLoader: showOccasionLoader } = useProductLoader(loading);
  const occasionScrollRef = useRef(null);

  const fetchAllProducts = async (category = "") => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (category) {
        params.append("category", category);
      }
      const qs = params.toString();
      const res = await fetch(`${API}/products${qs ? `?${qs}` : ""}`);
      const data = await res.json();
      setProducts(data || []);
    } catch (error) {
      console.error("Error fetching products:", error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchOccasionProducts = async (occasionSlug, category = "") => {
    try {
      if (category) {
        // Fetch products filtered by both occasion and category
        const params = new URLSearchParams();
        params.append("occasion", occasionSlug);
        params.append("category", category);
        const res = await fetch(`${API}/products?${params.toString()}`);
        const data = await res.json();
        setProducts(data || []);
        
        // Also fetch occasion details
        const occasionRes = await fetch(`${API}/occasions/${occasionSlug}`);
        const occasionData = await occasionRes.json();
        setSelectedOccasion(occasionData);
      } else {
        // Fetch all products for the occasion
        const res = await fetch(`${API}/occasions/${occasionSlug}`);
        const data = await res.json();
        setSelectedOccasion(data);
        setProducts(data.products || []);
      }
    } catch (error) {
      console.error("Error fetching occasion products:", error);
    }
  };

  useEffect(() => {
    let isMounted = true;
    
    // Fetch all occasions and categories
    Promise.all([
      fetch(`${API}/occasions`).then(res => res.json()),
      fetch(`${API}/categories`).then(res => res.json())
    ])
      .then(([occasionsData, categoriesData]) => {
        if (!isMounted) return;
        
        setOccasions(occasionsData);
        setCategories(categoriesData);
        
        // If slug is provided, find and set the occasion
        if (slug) {
          const occasion = occasionsData.find(o => o.slug === slug);
          if (occasion) {
            setSelectedOccasion(occasion);
          }
        } else {
          setSelectedOccasion(null);
        }
        setLoading(false);
      })
      .catch(error => {
        if (!isMounted) return;
        console.error("Error fetching data:", error);
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [slug]);

  useEffect(() => {
    if (selectedOccasion && slug) {
      fetchOccasionProducts(selectedOccasion.slug, categoryFilter);
      return;
    }
    if (!slug) {
      fetchAllProducts(categoryFilter);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryFilter, slug, selectedOccasion?.slug]);

  const handleOccasionClick = (occasion) => {
    setSelectedOccasion(occasion);
    fetchOccasionProducts(occasion.slug, categoryFilter);
  };

  const handleCategoryChange = (e) => {
    const newCategory = e.target.value;
    const params = new URLSearchParams(searchParams);
    if (newCategory) {
      params.set("category", newCategory);
    } else {
      params.delete("category");
    }
    setSearchParams(params);
  };

  const clearCategoryFilter = () => {
    const params = new URLSearchParams(searchParams);
    params.delete("category");
    setSearchParams(params);
  };

  const scrollOccasions = (direction) => {
    if (!occasionScrollRef.current) return;
    const scrollAmount = 320;
    occasionScrollRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  if (loading) {
    return (
      <>
        <GiftBoxLoader 
          isLoading={loading} 
          showLoader={showOccasionLoader}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-white py-16">
      <div className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4" style={{ color: 'oklch(20% .02 340)' }}>
            Shop by Occasion
          </h2>
          <p className="text-lg" style={{ color: 'oklch(60% .02 340)' }}>
            Find the perfect gift for every special moment
          </p>
        </div>

        {/* Occasions (horizontal scroll like Home) */}
        <div className="relative mb-12">
          <button
            onClick={() => scrollOccasions("left")}
            className="hidden sm:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full p-3 shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300 border active:scale-95"
            style={{ borderColor: "oklch(92% .04 340)" }}
            aria-label="Scroll occasions left"
          >
            <svg className="w-5 h-5" style={{ color: "oklch(40% .02 340)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div
            ref={occasionScrollRef}
            className="flex gap-3 sm:gap-4 overflow-x-auto scrollbar-thin pb-4 px-1 sm:px-10"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {occasions.map((occasion) => (
              <Link
                key={occasion.id}
                to={`/occasion/${occasion.slug}`}
                onClick={() => handleOccasionClick(occasion)}
                className="flex-shrink-0 flex flex-col items-center min-w-[140px] sm:min-w-[160px] group"
              >
                <div
                  className="w-32 h-32 sm:w-36 sm:h-36 lg:w-40 lg:h-40 rounded-lg overflow-hidden flex items-center justify-center group-hover:shadow-lg group-hover:scale-110 transition-all duration-300"
                  style={{
                    backgroundColor: "oklch(92% .04 340)",
                  }}
                >
                  {occasion.imageUrl ? (
                    <img
                      src={occasion.imageUrl}
                      alt={occasion.name}
                      className="w-full h-full object-cover rounded-lg"
                    />
                    ) : (
                      <img src="/logo.png" alt="Gift Choice Logo" className="w-3/4 h-3/4 object-contain" />
                    )}
                </div>
                <h3 className="font-semibold text-sm text-center mt-2" style={{ color: "oklch(20% .02 340)" }}>
                  {occasion.name}
                </h3>
              </Link>
            ))}
          </div>

          <button
            onClick={() => scrollOccasions("right")}
            className="hidden sm:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full p-3 shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300 border active:scale-95"
            style={{ borderColor: "oklch(92% .04 340)" }}
            aria-label="Scroll occasions right"
          >
            <svg className="w-5 h-5" style={{ color: "oklch(40% .02 340)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Products for Selected Occasion */}
        {selectedOccasion && slug && (
          <div className="mt-12">
            <div className="mb-8">
              <h3 className="text-3xl font-bold mb-2" style={{ color: 'oklch(20% .02 340)' }}>
                {selectedOccasion.name}
              </h3>
              {selectedOccasion.description && (
                <p className="text-lg mb-4" style={{ color: 'oklch(60% .02 340)' }}>
                  {selectedOccasion.description}
                </p>
              )}

              {/* Category Filter */}
              <div className="flex flex-wrap items-center gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-semibold" style={{ color: 'oklch(40% .02 340)' }}>
                    Filter by Category:
                  </label>
                  <select
                    value={categoryFilter}
                    onChange={handleCategoryChange}
                    className="px-4 py-2 rounded-lg border-2 text-sm transition-all duration-300 focus:outline-none"
                    style={{
                      borderColor: 'oklch(92% .04 340)',
                      backgroundColor: 'white',
                      color: 'oklch(20% .02 340)'
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'oklch(88% .06 340)'}
                    onBlur={(e) => e.target.style.borderColor = 'oklch(92% .04 340)'}
                  >
                    <option value="">All Categories</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.slug}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                {categoryFilter && (
                  <button
                    onClick={clearCategoryFilter}
                    className="px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300"
                    style={{
                      backgroundColor: 'oklch(92% .04 340)',
                      color: 'oklch(20% .02 340)'
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = 'oklch(88% .06 340)'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = 'oklch(92% .04 340)'}
                  >
                    Clear Filter
                  </button>
                )}
              </div>

              {categoryFilter && (
                <p className="text-sm mb-4" style={{ color: 'oklch(60% .02 340)' }}>
                  Showing products in {categories.find(c => c.slug === categoryFilter)?.name || categoryFilter} category
                </p>
              )}
            </div>
            {products.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-5 gap-6">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="inline-block p-6 rounded-full mb-4" style={{ backgroundColor: 'oklch(92% .04 340)' }}>
                  <img src="/logo.png" alt="Gift Choice Logo" className="w-16 h-16 object-contain" />
                </div>
                <p className="font-medium" style={{ color: 'oklch(60% .02 340)' }}>
                  No products available for this occasion yet
                </p>
              </div>
            )}
          </div>
        )}

        {/* All products when no occasion slug is selected (e.g. /occasion) */}
        {!slug && (
          <div className="mt-12">
            <div className="mb-8">
              <h3 className="text-3xl font-bold mb-2" style={{ color: 'oklch(20% .02 340)' }}>
                All Products
              </h3>

              {/* Category Filter (still useful on /occasion) */}
              <div className="flex flex-wrap items-center gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-semibold" style={{ color: 'oklch(40% .02 340)' }}>
                    Filter by Category:
                  </label>
                  <select
                    value={categoryFilter}
                    onChange={handleCategoryChange}
                    className="px-4 py-2 rounded-lg border-2 text-sm transition-all duration-300 focus:outline-none"
                    style={{
                      borderColor: 'oklch(92% .04 340)',
                      backgroundColor: 'white',
                      color: 'oklch(20% .02 340)'
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'oklch(88% .06 340)'}
                    onBlur={(e) => e.target.style.borderColor = 'oklch(92% .04 340)'}
                  >
                    <option value="">All Categories</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.slug}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                {categoryFilter && (
                  <button
                    onClick={clearCategoryFilter}
                    className="px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300"
                    style={{
                      backgroundColor: 'oklch(92% .04 340)',
                      color: 'oklch(20% .02 340)'
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = 'oklch(88% .06 340)'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = 'oklch(92% .04 340)'}
                  >
                    Clear Filter
                  </button>
                )}
              </div>

              {categoryFilter && (
                <p className="text-sm mb-4" style={{ color: 'oklch(60% .02 340)' }}>
                  Showing products in {categories.find(c => c.slug === categoryFilter)?.name || categoryFilter} category
                </p>
              )}
            </div>

            {products.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-5 gap-6">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="inline-block p-6 rounded-full mb-4" style={{ backgroundColor: 'oklch(92% .04 340)' }}>
                  <img src="/logo.png" alt="Gift Choice Logo" className="w-16 h-16 object-contain" />
                </div>
                <p className="font-medium" style={{ color: 'oklch(60% .02 340)' }}>
                  No products available yet
                </p>
              </div>
            )}
          </div>
        )}

        {/* Show all occasions if none selected */}
        {!selectedOccasion && occasions.length === 0 && (
          <div className="text-center py-16">
            <div className="inline-block p-6 rounded-full mb-4" style={{ backgroundColor: 'oklch(92% .04 340)' }}>
              <img src="/logo.png" alt="Gift Choice Logo" className="w-16 h-16 object-contain" />
            </div>
            <p className="font-medium" style={{ color: 'oklch(60% .02 340)' }}>
              No occasions available yet
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
