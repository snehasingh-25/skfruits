import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { API } from "../api";
import { shuffleArray } from "../utils/shuffle";
import { useFruitBasket } from "../context/FruitBasketContext";
import FruitBasketProductCard from "../components/FruitBasketProductCard";

export default function FruitBasketFruits() {
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryFilter = searchParams.get("category") || "";
  const searchQuery = searchParams.get("q") || "";
  const { selectedBasket, fruitsCount, getBasketTotal, hasFruits } = useFruitBasket();
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const categoryScrollRef = useRef(null);

  useEffect(() => {
    fetch(`${API}/categories`)
      .then((res) => res.json())
      .then((data) => setCategories(Array.isArray(data) ? data : []))
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (categoryFilter) params.append("category", categoryFilter);
        const res = await fetch(`${API}/products${params.toString() ? `?${params.toString()}` : ""}`);
        const data = await res.json();
        let list = Array.isArray(data) ? data : [];
        if (searchQuery.trim()) {
          const q = searchQuery.trim().toLowerCase();
          list = list.filter(
            (p) =>
              (p.name && p.name.toLowerCase().includes(q)) ||
              (p.keywords && JSON.parse(p.keywords || "[]").some((k) => k.toLowerCase().includes(q)))
          );
        }
        setProducts(shuffleArray(list));
      } catch {
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [categoryFilter, searchQuery]);

  const scrollCategories = (dir) => {
    if (!categoryScrollRef.current) return;
    categoryScrollRef.current.scrollBy({ left: dir === "left" ? -200 : 200, behavior: "smooth" });
  };

  const handleSearchChange = (e) => {
    const params = new URLSearchParams(searchParams);
    const v = e.target.value.trim();
    if (v) params.set("q", v);
    else params.delete("q");
    setSearchParams(params);
  };

  const handleCategoryClick = (slug) => {
    const params = new URLSearchParams(searchParams);
    if (slug) params.set("category", slug);
    else params.delete("category");
    setSearchParams(params);
  };

  if (!selectedBasket) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ backgroundColor: "var(--background)" }}>
        <p className="text-lg mb-4" style={{ color: "var(--foreground-muted)" }}>
          Please select a basket first
        </p>
        <Link to="/fruit-basket/create" className="btn-primary-brand px-6 py-3 rounded-xl font-semibold">
          Choose Basket
        </Link>
      </div>
    );
  }

  const total = getBasketTotal();

  return (
    <div className="min-h-screen pb-40 sm:pb-24" style={{ backgroundColor: "var(--background)" }}>
      <div className="sticky top-0 z-10 px-4 py-3 border-b" style={{ backgroundColor: "var(--background)", borderColor: "var(--border)" }}>
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <Link
            to="/fruit-basket/create"
            className="shrink-0 p-2 rounded-full hover:bg-[var(--secondary)] transition"
            aria-label="Back to basket selection"
          >
            <svg className="w-5 h-5" style={{ color: "var(--foreground)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <input
            type="search"
            placeholder="Search fruits..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="flex-1 px-4 py-2.5 rounded-xl border-2 border-design text-sm focus:outline-none focus:border-[var(--primary)]"
            style={{ backgroundColor: "var(--input)", color: "var(--foreground)" }}
          />
        </div>

        <div className="max-w-6xl mx-auto mt-3">
          <div className="relative flex items-center">
            <button
              onClick={() => scrollCategories("left")}
              className="hidden sm:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full items-center justify-center shadow"
              style={{ backgroundColor: "var(--card-white)", borderColor: "var(--border)" }}
              aria-label="Scroll left"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div
              ref={categoryScrollRef}
              className="flex gap-2 overflow-x-auto scrollbar-hide px-1 sm:px-10"
              style={{ WebkitOverflowScrolling: "touch" }}
            >
              <button
                onClick={() => handleCategoryClick("")}
                className={`shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition ${
                  !categoryFilter ? "btn-primary-brand" : ""
                }`}
                style={
                  categoryFilter
                    ? { backgroundColor: "var(--secondary)", color: "var(--foreground)" }
                    : undefined
                }
              >
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryClick(cat.slug)}
                  className={`shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition ${
                    categoryFilter === cat.slug ? "btn-primary-brand" : ""
                  }`}
                  style={
                    categoryFilter !== cat.slug
                      ? { backgroundColor: "var(--secondary)", color: "var(--foreground)" }
                      : undefined
                  }
                >
                  {cat.name}
                </button>
              ))}
            </div>
            <button
              onClick={() => scrollCategories("right")}
              className="hidden sm:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full items-center justify-center shadow"
              style={{ backgroundColor: "var(--card-white)", borderColor: "var(--border)" }}
              aria-label="Scroll right"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-xl font-bold" style={{ color: "var(--foreground)" }}>
            {categoryFilter
              ? categories.find((c) => c.slug === categoryFilter)?.name || "Products"
              : "All Fruits"}
          </h2>
          <Link
            to="/fruit-basket/create/review"
            className="hidden sm:flex items-center gap-2 btn-primary-brand px-5 py-2.5 rounded-xl font-semibold"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            View Basket ({fruitsCount}) · ₹{total.toFixed(2)}
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="rounded-2xl h-64 animate-pulse" style={{ backgroundColor: "var(--muted)" }} />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16">
            <p className="font-medium" style={{ color: "var(--foreground-muted)" }}>
              No products found
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((product) => (
              <FruitBasketProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>

      {/* Mobile sticky bottom bar */}
      <div
        className="fixed bottom-19 left-0 right-0 z-50 px-4 py-3 border-t sm:hidden"
        style={{ backgroundColor: "var(--card-white)", borderColor: "var(--border)", boxShadow: "0 -4px 20px rgba(0,0,0,0.08)" }}
      >
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div>
            <div className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
              {selectedBasket.title} · {fruitsCount} item{fruitsCount !== 1 ? "s" : ""}
            </div>
            <div className="text-lg font-bold" style={{ color: "var(--primary)" }}>
              ₹{total.toFixed(2)}
            </div>
          </div>
          <Link
            to="/fruit-basket/create/review"
            className="btn-primary-brand px-6 py-3 rounded-xl font-semibold"
          >
            View Basket
          </Link>
        </div>
      </div>
    </div>
  );
}
