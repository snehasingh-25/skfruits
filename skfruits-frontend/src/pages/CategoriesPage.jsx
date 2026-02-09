import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { API } from "../api";
import { Link } from "react-router-dom";
import ProductCard from "../components/ProductCard";
import GiftBoxLoader from "../components/GiftBoxLoader";
import { useProductLoader } from "../hooks/useProductLoader";

export default function CategoriesPage() {
  const { slug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const occasionFilter = searchParams.get("occasion") || "";
  const trendingFilter = searchParams.get("trending") === "true";
  const [categories, setCategories] = useState([]);
  const [occasions, setOccasions] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const categoryScrollRef = useRef(null);
  
  // Time-based loader for products (only shows if loading >= 1 second)
  const { showLoader: showProductLoader } = useProductLoader(loading);

  useEffect(() => {
    Promise.all([
      fetch(`${API}/categories`).then(res => res.json()),
      fetch(`${API}/occasions`).then(res => res.json())
    ])
      .then(([categoriesData, occasionsData]) => {
        setCategories(categoriesData);
        setOccasions(occasionsData);
        if (slug) {
          const category = categoriesData.find(cat => cat.slug === slug);
          if (category) {
            setSelectedCategory(category);
          } else if (categoriesData.length > 0) {
            setSelectedCategory(categoriesData[0]);
          }
        } else if (categoriesData.length > 0) {
          setSelectedCategory(categoriesData[0]);
        }
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching data:", error);
        setLoading(false);
      });
  }, [slug]);

  useEffect(() => {
    if (slug && selectedCategory) {
      fetchCategoryProducts(selectedCategory.slug, occasionFilter, trendingFilter);
      return;
    }

    // No slug (e.g. /categories): show all products (optionally filtered by occasion or trending)
    if (!slug) {
      fetchAllProducts(occasionFilter, trendingFilter);
      return;
    }

    setProducts([]);
    setLoading(false);
  }, [selectedCategory, slug, occasionFilter, trendingFilter]);

  const fetchCategoryProducts = async (categorySlug, occasion = "", trending = false) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("category", categorySlug);
      if (occasion) {
        params.append("occasion", occasion);
      }
      if (trending) {
        params.append("trending", "true");
      }
      const res = await fetch(`${API}/products?${params.toString()}`);
      const data = await res.json();
      // If backend doesn't support trending filter, filter on frontend
      const filteredData = trending 
        ? (Array.isArray(data) ? data.filter(p => p.isTrending) : [])
        : (Array.isArray(data) ? data : []);
      setProducts(filteredData);
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllProducts = async (occasion = "", trending = false) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (occasion) {
        params.append("occasion", occasion);
      }
      if (trending) {
        params.append("trending", "true");
      }
      const qs = params.toString();
      const res = await fetch(`${API}/products${qs ? `?${qs}` : ""}`);
      const data = await res.json();
      // If backend doesn't support trending filter, filter on frontend
      const filteredData = trending 
        ? (Array.isArray(data) ? data.filter(p => p.isTrending) : [])
        : (Array.isArray(data) ? data : []);
      setProducts(filteredData);
    } catch (error) {
      console.error("Error fetching products:", error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  // Removed getCategoryEmoji - all categories use logo as fallback

  const handleCategoryClick = (category) => {
    setSelectedCategory(category);
    if (category.slug) {
      fetchCategoryProducts(category.slug, occasionFilter, trendingFilter);
    }
  };

  const handleOccasionChange = (e) => {
    const newOccasion = e.target.value;
    const params = new URLSearchParams(searchParams);
    if (newOccasion) {
      params.set("occasion", newOccasion);
    } else {
      params.delete("occasion");
    }
    setSearchParams(params);
  };

  const clearOccasionFilter = () => {
    const params = new URLSearchParams(searchParams);
    params.delete("occasion");
    setSearchParams(params);
  };

  const scrollCategories = (direction) => {
    if (!categoryScrollRef.current) return;
    const scrollAmount = 320;
    categoryScrollRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  // Time-based loader for initial categories load
  const { showLoader: showInitialLoader } = useProductLoader(loading && !selectedCategory);
  
  if (loading && !selectedCategory) {
    return (
      <>
        <GiftBoxLoader 
          isLoading={loading && !selectedCategory} 
          showLoader={showInitialLoader}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-white py-16">
      {/* Gift Box Loading Animation - Only shows if product loading takes >= 1 second */}
      <GiftBoxLoader 
        isLoading={loading && selectedCategory !== null} 
        showLoader={showProductLoader}
      />
      <div className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4" style={{ color: 'oklch(20% .02 340)' }}>
            Shop by Category
          </h2>
          <p className="text-lg" style={{ color: 'oklch(60% .02 340)' }}>
            Browse our wide range of gift categories
          </p>
        </div>

        {/* Categories (horizontal scroll like Home) */}
        <div className="relative mb-12">
          <button
            onClick={() => scrollCategories("left")}
            className="hidden sm:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full p-3 shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300 border active:scale-95"
            style={{ borderColor: "oklch(92% .04 340)" }}
            aria-label="Scroll categories left"
          >
            <svg className="w-5 h-5" style={{ color: "oklch(40% .02 340)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div
            ref={categoryScrollRef}
            className="flex gap-3 sm:gap-4 overflow-x-auto scrollbar-thin pb-4 px-1 sm:px-10"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {categories.map((category) => (
              <Link
                key={category.id}
                to={`/category/${category.slug}`}
                onClick={() => handleCategoryClick(category)}
                className="flex-shrink-0 flex flex-col items-center min-w-[100px] sm:min-w-[120px] group"
              >
                <div
                  className="w-24 h-24 sm:w-28 sm:h-28 lg:w-32 lg:h-32 rounded-full overflow-hidden flex items-center justify-center border-2 group-hover:shadow-lg group-hover:scale-110 transition-all duration-300"
                  style={{
                    backgroundColor: "oklch(92% .04 340)",
                    borderColor: "oklch(92% .04 340)",
                  }}
                >
                  {category.imageUrl ? (
                    <img
                      src={category.imageUrl}
                      alt={category.name}
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : (
                    <img src="/logo.png" alt="Gift Choice Logo" className="w-3/4 h-3/4 object-contain" />
                  )}
                </div>
                <h3 className="font-semibold text-sm text-center mt-2" style={{ color: "oklch(20% .02 340)" }}>
                  {category.name}
                </h3>
              </Link>
            ))}
          </div>

          <button
            onClick={() => scrollCategories("right")}
            className="hidden sm:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full p-3 shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300 border active:scale-95"
            style={{ borderColor: "oklch(92% .04 340)" }}
            aria-label="Scroll categories right"
          >
            <svg className="w-5 h-5" style={{ color: "oklch(40% .02 340)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Products for Selected Category */}
        {selectedCategory && slug && (
          <div className="mt-12">
            <div className="mb-8">
              <h3 className="text-3xl font-bold mb-2" style={{ color: 'oklch(20% .02 340)' }}>
                {selectedCategory.name}
              </h3>
              {selectedCategory.description && (
                <p className="text-lg mb-4" style={{ color: 'oklch(60% .02 340)' }}>
                  {selectedCategory.description}
                </p>
              )}

              {/* Occasion Filter */}
              <div className="flex flex-wrap items-center gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-semibold" style={{ color: 'oklch(40% .02 340)' }}>
                    Filter by Occasion:
                  </label>
                  <select
                    value={occasionFilter}
                    onChange={handleOccasionChange}
                    className="px-4 py-2 rounded-lg border-2 text-sm transition-all duration-300 focus:outline-none"
                    style={{
                      borderColor: 'oklch(92% .04 340)',
                      backgroundColor: 'white',
                      color: 'oklch(20% .02 340)'
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'oklch(88% .06 340)'}
                    onBlur={(e) => e.target.style.borderColor = 'oklch(92% .04 340)'}
                  >
                    <option value="">All Occasions</option>
                    {occasions.map((occ) => (
                      <option key={occ.id} value={occ.slug}>
                        {occ.name}
                      </option>
                    ))}
                  </select>
                </div>

                {occasionFilter && (
                  <button
                    onClick={clearOccasionFilter}
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

              {occasionFilter && (
                <p className="text-sm mb-4" style={{ color: 'oklch(60% .02 340)' }}>
                  Showing products for {occasions.find(o => o.slug === occasionFilter)?.name || occasionFilter}
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
                  No products available in this category yet
                </p>
              </div>
            )}
          </div>
        )}

        {/* All products when no category slug is selected (e.g. /categories) */}
        {!slug && (
          <div className="mt-12">
            <div className="mb-8">
              <h3 className="text-3xl font-bold mb-2" style={{ color: 'oklch(20% .02 340)' }}>
                {trendingFilter ? "Trending Products" : "All Products"}
              </h3>

              {/* Occasion Filter (still useful on /categories) */}
              <div className="flex flex-wrap items-center gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-semibold" style={{ color: 'oklch(40% .02 340)' }}>
                    Filter by Occasion:
                  </label>
                  <select
                    value={occasionFilter}
                    onChange={handleOccasionChange}
                    className="px-4 py-2 rounded-lg border-2 text-sm transition-all duration-300 focus:outline-none"
                    style={{
                      borderColor: 'oklch(92% .04 340)',
                      backgroundColor: 'white',
                      color: 'oklch(20% .02 340)'
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'oklch(88% .06 340)'}
                    onBlur={(e) => e.target.style.borderColor = 'oklch(92% .04 340)'}
                  >
                    <option value="">All Occasions</option>
                    {occasions.map((occ) => (
                      <option key={occ.id} value={occ.slug}>
                        {occ.name}
                      </option>
                    ))}
                  </select>
                </div>

                {occasionFilter && (
                  <button
                    onClick={clearOccasionFilter}
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

              {occasionFilter && (
                <p className="text-sm mb-4" style={{ color: 'oklch(60% .02 340)' }}>
                  Showing products for {occasions.find(o => o.slug === occasionFilter)?.name || occasionFilter}
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

        {/* Show all categories if none selected */}
        {!selectedCategory && categories.length === 0 && (
          <div className="text-center py-16">
            <div className="inline-block p-6 rounded-full mb-4" style={{ backgroundColor: 'oklch(92% .04 340)' }}>
              <img src="/logo.png" alt="Gift Choice Logo" className="w-16 h-16 object-contain" />
            </div>
            <p className="font-medium" style={{ color: 'oklch(60% .02 340)' }}>
              No categories available yet
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
