import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { API } from "../api";
import { shuffleArray } from "../utils/shuffle";
import { Link } from "react-router-dom";
import ProductCard from "../components/ProductCard";

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
      setProducts(shuffleArray(filteredData));
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
      setProducts(shuffleArray(filteredData));
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

  if (loading && !selectedCategory) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--background)" }}>
        <div
          className="animate-spin rounded-full w-10 h-10 border-2 border-t-transparent"
          style={{ borderColor: "var(--primary)" }}
          aria-hidden="true"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen py-16 bg-page-products">
      <div className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="font-display text-4xl font-bold mb-4" style={{ color: "var(--foreground)" }}>
            Shop by Category
          </h2>
          <p className="text-lg" style={{ color: "var(--foreground-muted)" }}>
            FreshFruit — Browse our wide range of categories
          </p>
        </div>

        {/* Categories (horizontal scroll like Home) */}
        <div className="relative mb-12">
          <button
            onClick={() => scrollCategories("left")}
            className="hidden sm:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 rounded-full p-3 shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300 border active:scale-95"
            style={{ backgroundColor: 'var(--card-white)', borderColor: 'var(--border)' }}
            aria-label="Scroll categories left"
          >
            <svg className="w-5 h-5" style={{ color: "var(--foreground-muted)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  className="w-24 h-24 sm:w-28 sm:h-28 lg:w-32 lg:h-32 rounded-full overflow-hidden flex items-center justify-center border-2 border-design group-hover:shadow-lg group-hover:scale-110 transition-all duration-300 bg-design-secondary"
                >
                  {category.imageUrl ? (
                    <img
                      src={category.imageUrl}
                      alt={category.name}
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : (
                    <img src="/logo.png" alt="SK Fruits" className="w-3/4 h-3/4 object-contain" />
                  )}
                </div>
                <h3 className="font-semibold text-sm text-center mt-2 text-design-foreground">
                  {category.name}
                </h3>
              </Link>
            ))}
          </div>

          <button
            onClick={() => scrollCategories("right")}
            className="hidden sm:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 rounded-full p-3 shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300 border active:scale-95"
            style={{ backgroundColor: 'var(--card-white)', borderColor: 'var(--border)' }}
            aria-label="Scroll categories right"
          >
            <svg className="w-5 h-5" style={{ color: "var(--foreground-muted)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Products for Selected Category */}
        {selectedCategory && slug && (
          <div className="mt-12">
            <div className="mb-8">
              <h3 className="font-display text-3xl font-bold mb-2" style={{ color: "var(--foreground)" }}>
                {selectedCategory.name}
              </h3>
              {selectedCategory.description && (
                <p className="text-lg mb-4" style={{ color: "var(--foreground-muted)" }}>
                  {selectedCategory.description}
                </p>
              )}

              {/* Occasion Filter */}
              <div className="flex flex-wrap items-center gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                    Filter by Occasion:
                  </label>
                  <select
                    value={occasionFilter}
                    onChange={handleOccasionChange}
                    className="px-4 py-2 rounded-lg border-2 border-design text-sm transition-all duration-300 focus:outline-none focus:border-[var(--primary)] bg-[var(--background)] text-design-foreground"
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
                    className="px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 bg-[var(--background)] text-design-foreground border border-design hover:bg-design-secondary"
                  >
                    Clear Filter
                  </button>
                )}
              </div>

              {occasionFilter && (
                <p className="text-sm mb-4" style={{ color: "var(--foreground-muted)" }}>
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
                <div className="inline-block p-6 rounded-full mb-4" style={{ backgroundColor: "var(--muted)" }}>
                  <img src="/logo.png" alt="SK Fruits" className="w-16 h-16 object-contain" />
                </div>
                <p className="font-medium" style={{ color: "var(--foreground-muted)" }}>
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
              <h3 className="font-display text-3xl font-bold mb-2" style={{ color: "var(--foreground)" }}>
                {trendingFilter ? "Trending Products" : "All Products"}
              </h3>

              {/* Occasion Filter (still useful on /categories) */}
              <div className="flex flex-wrap items-center gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                    Filter by Occasion:
                  </label>
                  <select
                    value={occasionFilter}
                    onChange={handleOccasionChange}
                    className="px-4 py-2 rounded-lg border-2 border-design text-sm transition-all duration-300 focus:outline-none focus:border-[var(--primary)] bg-[var(--background)] text-design-foreground"
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
                    className="px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 bg-[var(--background)] text-design-foreground border border-design hover:bg-design-secondary"
                  >
                    Clear Filter
                  </button>
                )}
              </div>

              {occasionFilter && (
                <p className="text-sm mb-4" style={{ color: "var(--foreground-muted)" }}>
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
                <div className="inline-block p-6 rounded-full mb-4" style={{ backgroundColor: "var(--muted)" }}>
                  <img src="/logo.png" alt="SK Fruits" className="w-16 h-16 object-contain" />
                </div>
                <p className="font-medium" style={{ color: "var(--foreground-muted)" }}>
                  No products available yet
                </p>
              </div>
            )}
          </div>
        )}

        {/* Show all categories if none selected */}
        {!selectedCategory && categories.length === 0 && (
          <div className="text-center py-16">
            <div className="inline-block p-6 rounded-full mb-4" style={{ backgroundColor: "var(--muted)" }}>
              <img src="/logo.png" alt="SK Fruits" className="w-16 h-16 object-contain" />
            </div>
            <p className="font-medium" style={{ color: "var(--foreground-muted)" }}>
              No categories available yet
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
