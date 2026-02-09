import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { useCart } from "../context/CartContext";
import Typed from "typed.js";
import Fuse from "fuse.js";
import { API } from "../api";

export default function Navbar() {
  const { getCartCount } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [allProducts, setAllProducts] = useState([]);
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const typedElementRef = useRef(null);
  const typedInstanceRef = useRef(null);
  const searchInputRef = useRef(null);
  const suggestionsRef = useRef(null);

  const isActive = (path) => location.pathname === path;

  const navItems = [
    { path: "/", label: "Home" },
    { path: "/categories", label: "Categories" },
    { path: "/occasion", label: "Occasions" },
    { path: "/new", label: "New Arrivals"},
    { path: "/about", label: "About" },
    { path: "/contact", label: "Contact" },
  ];

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Track viewport so we only mount ONE typed placeholder element at a time
  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth < 768); // md breakpoint
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // Fetch all products for fuzzy search
  useEffect(() => {
    fetch(`${API}/products`)
      .then(res => res.json())
      .then(data => {
        setAllProducts(data);
      })
      .catch(error => {
        console.error("Error fetching products for search:", error);
      });
  }, []);

  // Fuzzy search suggestions
  useEffect(() => {
    if (searchQuery.trim().length > 0 && allProducts.length > 0) {
      const fuse = new Fuse(allProducts, {
        keys: ['name', 'description', 'keywords'],
        threshold: 0.4, // 0 = perfect match, 1 = match anything
        includeScore: true,
        minMatchCharLength: 2,
      });

      const results = fuse.search(searchQuery);
      const suggestions = results.slice(0, 5).map(result => result.item);
      
      // Use setTimeout to avoid synchronous setState in effect
      setTimeout(() => {
        setSearchSuggestions(suggestions);
        setShowSuggestions(suggestions.length > 0);
      }, 0);
    } else {
      setTimeout(() => {
        setSearchSuggestions([]);
        setShowSuggestions(false);
      }, 0);
    }
  }, [searchQuery, allProducts]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Initialize Typed.js for search bar
  useEffect(() => {
    // Destroy + recreate so Typed always attaches to the currently mounted span (mobile vs desktop)
    if (typedInstanceRef.current) {
      typedInstanceRef.current.destroy();
      typedInstanceRef.current = null;
    }

    if (typedElementRef.current) {
      typedInstanceRef.current = new Typed(typedElementRef.current, {
        strings: [" Find the perfect gift", " A gift for your loved ones"],
        typeSpeed: 50,
        backSpeed: 30,
        backDelay: 2000,
        loop: true,
        showCursor: false,
      });
    }

    return () => {
      if (typedInstanceRef.current) {
        typedInstanceRef.current.destroy();
        typedInstanceRef.current = null;
      }
    };
  }, [isMobile]);

  // Control typing based on searchQuery
  useEffect(() => {
    if (typedInstanceRef.current) {
      if (searchQuery) {
        typedInstanceRef.current.stop();
      } else {
        typedInstanceRef.current.start();
      }
    }
  }, [searchQuery]);

  return (
    <nav
      className={`sticky top-0 z-50 backdrop-blur-sm transition-all ${
        scrolled
          ? "bg-white shadow-lg border-b"
          : "bg-white/95"
      }`}
      style={{ borderColor: scrolled ? 'oklch(92% .04 340)' : 'transparent' }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <img 
              src="/logo.png" 
              alt="GiftChoice Logo" 
              className="h-12 w-auto transform group-hover:scale-110 transition-all duration-300"
            />
          </Link>

          {/* Desktop Menu */}
          <div className="hidden lg:flex items-center gap-2">
            {navItems.map((item) => (
              <div key={item.path} className="relative group">
                <Link
                  to={item.path}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ease-in-out ${
                    isActive(item.path)
                      ? "border-2"
                      : ""
                  }`}
                  style={{
                    color: isActive(item.path) ? 'oklch(20% .02 340)' : 'oklch(40% .02 340)',
                    backgroundColor: isActive(item.path) ? 'oklch(92% .04 340)' : 'transparent',
                    borderColor: isActive(item.path) ? 'oklch(92% .04 340)' : 'transparent'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive(item.path)) {
                      e.currentTarget.style.backgroundColor = 'oklch(92% .04 340)';
                      e.currentTarget.style.color = 'oklch(20% .02 340)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive(item.path)) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = 'oklch(40% .02 340)';
                    }
                  }}
                >
                  {item.label}
                  {item.badge && (
                    <span className="ml-2 text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'oklch(92% .04 340)', color: 'oklch(20% .02 340)' }}>
                      {item.badge}
                    </span>
                  )}
                </Link>

              </div>
            ))}
          </div>

          {/* Search + Cart + Mobile Button */}
          <div className="flex items-center gap-3">
            
            {/* Search */}
            <div className="relative hidden md:block">
              <div className="relative">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    // Stop typing when user starts typing
                    if (typedInstanceRef.current && e.target.value) {
                      typedInstanceRef.current.stop();
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && searchQuery.trim()) {
                      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
                      setShowSuggestions(false);
                    } else if (e.key === 'Escape') {
                      setShowSuggestions(false);
                    }
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'oklch(92% .04 340)';
                    e.target.style.backgroundColor = 'white';
                    e.target.style.color = 'oklch(20% .02 340)';
                    // Pause typing when focused
                    if (typedInstanceRef.current) {
                      typedInstanceRef.current.stop();
                    }
                    if (searchSuggestions.length > 0) {
                      setShowSuggestions(true);
                    }
                  }}
                  onBlur={(e) => {
                    // Delay to allow click on suggestions
                    setTimeout(() => {
                      if (!searchQuery) {
                        e.target.style.borderColor = 'oklch(92% .04 340)';
                        e.target.style.backgroundColor = 'oklch(92% .04 340)';
                        e.target.style.color = 'transparent';
                        // Resume typing when blurred and no query
                        if (typedInstanceRef.current) {
                          typedInstanceRef.current.start();
                        }
                      }
                      setShowSuggestions(false);
                    }, 200);
                  }}
                  className="rounded-full px-5 py-2.5 pr-10 w-60 text-sm transition-all duration-300 relative z-10"
                  style={{
                    backgroundColor: searchQuery ? 'white' : 'oklch(92% .04 340)',
                    border: '1px solid oklch(92% .04 340)',
                    color: searchQuery ? 'oklch(20% .02 340)' : 'transparent'
                  }}
                />
                {!searchQuery && !isMobile && (
                  <span
                    ref={typedElementRef}
                    className="absolute left-5 top-1/2 -translate-y-1/2 pointer-events-none text-sm z-20"
                    style={{ color: 'oklch(60% .02 340)' }}
                  ></span>
                )}
                <button
                  onClick={() => {
                    if (searchQuery.trim()) {
                      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
                      setShowSuggestions(false);
                    }
                  }}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 cursor-pointer z-30"
                >
                  <svg
                    className="w-4 h-4"
                    style={{ color: 'oklch(60% .02 340)' }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </button>

                {/* Search Suggestions Dropdown */}
                {showSuggestions && searchSuggestions.length > 0 && (
                  <div
                    ref={suggestionsRef}
                    className="absolute top-full left-0 mt-2 w-60 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-80 overflow-y-auto"
                    style={{ borderColor: 'oklch(92% .04 340)' }}
                  >
                    <div className="p-2">
                      <div className="text-xs font-semibold px-3 py-2" style={{ color: 'oklch(60% .02 340)' }}>
                        Suggestions
                      </div>
                      {searchSuggestions.map((product) => {
                        const images = product.images ? (Array.isArray(product.images) ? product.images : JSON.parse(product.images)) : [];
                        return (
                          <Link
                            key={product.id}
                            to={`/product/${product.id}`}
                            onClick={() => {
                              setShowSuggestions(false);
                              setSearchQuery("");
                            }}
                            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer group"
                            style={{ 
                              backgroundColor: 'transparent'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = 'oklch(92% .04 340)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                          >
                            {images.length > 0 ? (
                              <img
                                src={images[0]}
                                alt={product.name}
                                className="w-12 h-12 object-cover rounded-lg"
                              />
                            ) : (
                            <div className="w-12 h-12 rounded-lg flex items-center justify-center overflow-hidden" style={{ backgroundColor: 'oklch(92% .04 340)' }}>
                              <img src="/logo.png" alt="Gift Choice Logo" className="w-10 h-10 object-contain opacity-50" />
                            </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-sm truncate" style={{ color: 'oklch(20% .02 340)' }}>
                                {product.name}
                              </div>
                              {((product.categories && product.categories.length > 0) || product.category) && (
                                <div className="text-xs truncate" style={{ color: 'oklch(60% .02 340)' }}>
                                  {product.categories && product.categories.length > 0
                                    ? product.categories.map(c => c.name || c.category?.name).join(", ")
                                    : product.category?.name}
                                </div>
                              )}
                            </div>
                          </Link>
                        );
                      })}
                      <Link
                        to={`/search?q=${encodeURIComponent(searchQuery.trim())}`}
                        onClick={() => setShowSuggestions(false)}
                        className="block px-3 py-2 rounded-lg text-sm font-semibold text-center transition-colors"
                        style={{ 
                          color: 'oklch(20% .02 340)',
                          backgroundColor: 'oklch(92% .04 340)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'oklch(88% .06 340)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'oklch(92% .04 340)';
                        }}
                      >
                        View all results for "{searchQuery}"
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Cart */}
            <Link to="/cart" className="relative group">
              <button 
                className="p-2.5 rounded-full hover:scale-110 transition-all duration-300 active:scale-95"
                style={{ backgroundColor: 'oklch(92% .04 340)' }}
                onMouseEnter={(e) => e.target.style.backgroundColor = 'white'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'oklch(92% .04 340)'}
              >
                <svg className="w-6 h-6 transition-transform duration-300 group-hover:rotate-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'oklch(20% .02 340)' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                {getCartCount() > 0 && (
                  <span className="absolute top-0 right-0 w-5 h-5 text-xs rounded-full flex items-center justify-center font-semibold animate-pulse" style={{ backgroundColor: 'oklch(92% .04 340)', color: 'oklch(20% .02 340)' }}>
                    {getCartCount()}
                  </span>
                )}
              </button>
              <span className="absolute -top-9 right-0 text-xs text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-1 group-hover:translate-y-0" style={{ backgroundColor: 'oklch(20% .02 340)' }}>
                Your Cart
              </span>
            </Link>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg transition-all duration-300 active:scale-95"
              style={{ color: 'oklch(40% .02 340)' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'oklch(92% .04 340)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isMobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Search (Nykaa-style) */}
        <div className="md:hidden pb-3">
          <div className="relative">
            <button
              type="button"
              aria-label="Search"
              onClick={() => {
                if (searchQuery.trim()) {
                  navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
                  setShowSuggestions(false);
                }
              }}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 z-30"
            >
              <svg
                className="w-4 h-4"
                style={{ color: "oklch(60% .02 340)" }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </button>

            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (typedInstanceRef.current && e.target.value) {
                  typedInstanceRef.current.stop();
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && searchQuery.trim()) {
                  navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
                  setShowSuggestions(false);
                } else if (e.key === "Escape") {
                  setShowSuggestions(false);
                }
              }}
              placeholder=""
              className="w-full rounded-full pl-10 pr-4 py-2.5 text-sm border transition-all duration-300"
              style={{
                backgroundColor: "white",
                borderColor: "oklch(92% .04 340)",
                color: searchQuery ? "oklch(20% .02 340)" : "transparent",
              }}
              onFocus={() => {
                // reveal text + pause typing
                if (searchInputRef.current) {
                  searchInputRef.current.style.color = "oklch(20% .02 340)";
                }
                if (typedInstanceRef.current) typedInstanceRef.current.stop();
                if (searchSuggestions.length > 0) setShowSuggestions(true);
              }}
              onBlur={() => {
                setTimeout(() => {
                  setShowSuggestions(false);
                  if (!searchQuery) {
                    if (typedInstanceRef.current) typedInstanceRef.current.start();
                  }
                }, 200);
              }}
            />

            {!searchQuery && isMobile && (
              <span
                ref={typedElementRef}
                className="absolute left-10 top-1/2 -translate-y-1/2 pointer-events-none text-sm z-20"
                style={{ color: "oklch(60% .02 340)" }}
              ></span>
            )}

            {/* Mobile Suggestions */}
            {showSuggestions && searchSuggestions.length > 0 && (
              <div
                ref={suggestionsRef}
                className="absolute top-full left-0 mt-2 w-full bg-white rounded-lg shadow-xl border z-50 max-h-80 overflow-y-auto"
                style={{ borderColor: "oklch(92% .04 340)" }}
              >
                <div className="p-2">
                  <div
                    className="text-xs font-semibold px-3 py-2"
                    style={{ color: "oklch(60% .02 340)" }}
                  >
                    Suggestions
                  </div>
                  {searchSuggestions.map((product) => {
                    const images = product.images
                      ? Array.isArray(product.images)
                        ? product.images
                        : JSON.parse(product.images)
                      : [];
                    return (
                      <Link
                        key={product.id}
                        to={`/product/${product.id}`}
                        onClick={() => {
                          setShowSuggestions(false);
                          setSearchQuery("");
                        }}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer group"
                        style={{ backgroundColor: "transparent" }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor =
                            "oklch(92% .04 340)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "transparent";
                        }}
                      >
                        {images.length > 0 ? (
                          <img
                            src={images[0]}
                            alt={product.name}
                            className="w-12 h-12 object-cover rounded-lg"
                          />
                        ) : (
                          <div
                            className="w-12 h-12 rounded-lg flex items-center justify-center overflow-hidden"
                            style={{ backgroundColor: "oklch(92% .04 340)" }}
                          >
                            <img src="/logo.png" alt="Gift Choice Logo" className="w-10 h-10 object-contain opacity-50" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div
                            className="font-semibold text-sm truncate"
                            style={{ color: "oklch(20% .02 340)" }}
                          >
                            {product.name}
                          </div>
                          {product.category && (
                            <div
                              className="text-xs truncate"
                              style={{ color: "oklch(60% .02 340)" }}
                            >
                              {product.category.name}
                            </div>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                  <Link
                    to={`/search?q=${encodeURIComponent(searchQuery.trim())}`}
                    onClick={() => setShowSuggestions(false)}
                    className="block px-3 py-2 rounded-lg text-sm font-semibold text-center transition-colors"
                    style={{
                      color: "oklch(20% .02 340)",
                      backgroundColor: "oklch(92% .04 340)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor =
                        "oklch(88% .06 340)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor =
                        "oklch(92% .04 340)";
                    }}
                  >
                    View all results for "{searchQuery}"
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Menu */}
        <div
          className={`lg:hidden overflow-hidden transition-all duration-300 ${
            isMobileMenuOpen ? "max-h-96 py-4" : "max-h-0"
          }`}
        >
          <div className="flex flex-col gap-1 border-t pt-4" style={{ borderColor: 'oklch(92% .04 340)' }}>
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ${
                  isActive(item.path)
                    ? "border-2"
                    : "active:scale-95"
                }`}
                style={{
                  color: isActive(item.path) ? 'oklch(20% .02 340)' : 'oklch(40% .02 340)',
                  backgroundColor: isActive(item.path) ? 'oklch(92% .04 340)' : 'transparent',
                  borderColor: isActive(item.path) ? 'oklch(92% .04 340)' : 'transparent'
                }}
                onMouseEnter={(e) => {
                  if (!isActive(item.path)) {
                    e.currentTarget.style.backgroundColor = 'oklch(92% .04 340)';
                    e.currentTarget.style.color = 'oklch(20% .02 340)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive(item.path)) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = 'oklch(40% .02 340)';
                  }
                }}
              >
                {item.label}
                {item.badge && (
                  <span className="ml-2 text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'oklch(92% .04 340)', color: 'oklch(20% .02 340)' }}>
                    {item.badge}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}
