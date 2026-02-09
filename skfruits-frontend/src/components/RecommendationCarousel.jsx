import { useEffect, useRef, useState, memo } from "react";
import ProductCard from "./ProductCard";

// Rotating section titles
const SECTION_TITLES = [
  "You May Also Like",
  "Customers Also Loved",
  "Recommended For You",
  "Similar Products",
];

function RecommendationCarousel({ products = [], isLoading = false }) {
  const scrollContainerRef = useRef(null);
  const autoScrollTimeoutRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [title, setTitle] = useState(SECTION_TITLES[0]);

  // Set random title on mount
  useEffect(() => {
    setTitle(SECTION_TITLES[Math.floor(Math.random() * SECTION_TITLES.length)]);
  }, []);

  // Check scroll position
  const checkScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  // Initial scroll check
  useEffect(() => {
    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, [products]);

  // Auto-scroll every 5 seconds
  useEffect(() => {
    if (!scrollContainerRef.current || products.length === 0) return;

    const autoScroll = () => {
      const container = scrollContainerRef.current;
      if (!container) return;

      const { scrollLeft, scrollWidth, clientWidth } = container;
      const maxScroll = scrollWidth - clientWidth;

      if (scrollLeft >= maxScroll) {
        // Reset to start with smooth animation
        container.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        // Scroll to next item (approximately 280px = card width + gap)
        container.scrollBy({ left: 280, behavior: "smooth" });
      }
    };

    autoScrollTimeoutRef.current = setInterval(autoScroll, 5000);

    return () => {
      if (autoScrollTimeoutRef.current) {
        clearInterval(autoScrollTimeoutRef.current);
      }
    };
  }, [products.length]);

  const handleScroll = (direction) => {
    if (scrollContainerRef.current) {
      // Clear auto-scroll when user interacts
      if (autoScrollTimeoutRef.current) {
        clearInterval(autoScrollTimeoutRef.current);
      }

      const scrollAmount = 280; // Approximate card width + gap
      scrollContainerRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });

      // Restart auto-scroll after user interaction
      setTimeout(() => {
        autoScrollTimeoutRef.current = setInterval(() => {
          if (scrollContainerRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
            const maxScroll = scrollWidth - clientWidth;
            if (scrollLeft >= maxScroll) {
              scrollContainerRef.current.scrollTo({ left: 0, behavior: "smooth" });
            } else {
              scrollContainerRef.current.scrollBy({ left: 280, behavior: "smooth" });
            }
          }
        }, 5000);
      }, 500);
    }
  };

  if (isLoading) {
    return (
      <section className="mt-12 px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl sm:text-3xl font-extrabold mb-6" style={{ color: "oklch(20% .02 340)" }}>
          {title}
        </h2>
        <div className="flex gap-4 overflow-x-hidden">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="flex-shrink-0 w-64 h-80 rounded-lg animate-pulse"
              style={{ backgroundColor: "oklch(92% .04 340)" }}
            />
          ))}
        </div>
      </section>
    );
  }

  if (!products || products.length === 0) {
    return null;
  }

  return (
    <section className="mt-12 px-4 sm:px-6 lg:px-8">
      {/* Title with counter */}
      <div className="mb-6">
        <h2 className="text-2xl sm:text-3xl font-extrabold" style={{ color: "oklch(20% .02 340)" }}>
          {title}
        </h2>
        <p className="text-sm mt-1" style={{ color: "oklch(55% .02 340)" }}>
          {products.length} items selected just for you
        </p>
      </div>

      {/* Carousel Container */}
      <div className="relative group">
        {/* Left Scroll Button */}
        {canScrollLeft && (
          <button
            onClick={() => handleScroll("left")}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full shadow-lg transition-all duration-200 opacity-0 group-hover:opacity-100 hover:scale-110"
            style={{ backgroundColor: "white", color: "oklch(20% .02 340)" }}
            aria-label="Scroll left"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>
        )}

        {/* Scrollable Container */}
        <div
          ref={scrollContainerRef}
          onScroll={checkScroll}
          className="flex gap-4 overflow-x-auto scroll-smooth scrollbar-hide"
          style={{
            scrollBehavior: "smooth",
            WebkitOverflowScrolling: "touch", // Smooth scrolling on iOS
          }}
        >
          {products.map((product) => (
            <div
              key={product.id}
              className="flex-shrink-0 w-64"
            >
              <ProductCard product={product} />
            </div>
          ))}
        </div>

        {/* Right Scroll Button */}
        {canScrollRight && (
          <button
            onClick={() => handleScroll("right")}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full shadow-lg transition-all duration-200 opacity-0 group-hover:opacity-100 hover:scale-110"
            style={{ backgroundColor: "white", color: "oklch(20% .02 340)" }}
            aria-label="Scroll right"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
        )}
      </div>

      {/* Scroll Indicator Dots (optional) */}
      <div className="mt-4 flex justify-center gap-1.5">
        {[...Array(Math.ceil(products.length / 4))].map((_, i) => (
          <div
            key={i}
            className="h-1.5 rounded-full transition-all duration-300"
            style={{
              width: i === 0 ? "24px" : "8px",
              backgroundColor: i === 0 ? "oklch(55% .18 145)" : "oklch(92% .04 340)",
            }}
          />
        ))}
      </div>
    </section>
  );
}

export default memo(RecommendationCarousel);
