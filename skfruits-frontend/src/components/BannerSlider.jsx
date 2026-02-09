import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { API } from "../api";

export default function BannerSlider({ bannerType = "primary" }) {
  const [banners, setBanners] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    fetch(`${API}/banners?type=${bannerType}`)
      .then(res => res.json())
      .then(data => {
        setBanners(data);
        if (data.length > 0) {
          setCurrentIndex(0);
        }
      })
      .catch(error => {
        console.error("Error fetching banners:", error);
      });
  }, [bannerType]);

  useEffect(() => {
    if (banners.length > 1 && !isPaused) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % banners.length);
      }, 20000); // 20 seconds

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [banners.length, isPaused]);

  const goToSlide = (index) => {
    setCurrentIndex(index);
    setIsPaused(true);
    setTimeout(() => setIsPaused(false), 5000); // Resume after 5 seconds
  };

  const goToPrevious = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + banners.length) % banners.length);
    setIsPaused(true);
    setTimeout(() => setIsPaused(false), 5000);
  };

  const goToNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % banners.length);
    setIsPaused(true);
    setTimeout(() => setIsPaused(false), 5000);
  };

  if (banners.length === 0) {
    return null;
  }

  const currentBanner = banners[currentIndex];

  // Banner aspect ratio: 3189×1408 px = 2.265:1 (width:height)
  // padding-bottom = (1408 / 3189) * 100 = 44.15%
  const bannerAspectRatio = (1408 / 3189) * 100;

  return (
    <div 
      className="relative w-full overflow-hidden"
      style={{ paddingBottom: `${bannerAspectRatio}%` }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Banner Image Container */}
      <div className="absolute inset-0 w-full h-full">
        <img
          src={currentBanner.imageUrl}
          alt={currentBanner.title}
          className="w-full h-full object-cover object-center transition-opacity duration-500"
          decoding="async"
          fetchPriority="high"
          style={{
            objectFit: 'cover',
            objectPosition: 'center'
          }}
        />
        
        {/* Overlay Gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-transparent"></div>
        
        {/* Content */}
        <div className="absolute inset-0 flex items-center">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <div className="max-w-2xl">
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 drop-shadow-lg">
                {currentBanner.title}
              </h2>
              {currentBanner.subtitle && (
                <p className="text-lg md:text-xl text-white mb-6 drop-shadow-md">
                  {currentBanner.subtitle}
                </p>
              )}
              <Link
                to={currentBanner.ctaLink || "/categories"}
                className="inline-block p-3 rounded-lg font-semibold text-sm transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
                style={{ 
                  backgroundColor: 'oklch(92% .04 340)',
                  color: 'oklch(20% .02 340)'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = 'oklch(88% .06 340)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'oklch(92% .04 340)';
                }}
              >
                {currentBanner.ctaText || "Shop Now"}
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Arrows */}
      {banners.length > 1 && (
        <>
          <button
            onClick={goToPrevious}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 bg-white/90 hover:bg-white rounded-full p-3 shadow-lg hover:shadow-xl transition-all duration-300 active:scale-95"
            aria-label="Previous banner"
          >
            <svg className="w-6 h-6" style={{ color: 'oklch(20% .02 340)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10 bg-white/90 hover:bg-white rounded-full p-3 shadow-lg hover:shadow-xl transition-all duration-300 active:scale-95"
            aria-label="Next banner"
          >
            <svg className="w-6 h-6" style={{ color: 'oklch(20% .02 340)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}

      {/* Dots Indicator */}
      {banners.length > 1 && (
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-10 flex gap-2">
          {banners.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                index === currentIndex 
                  ? 'bg-white scale-125' 
                  : 'bg-white/50 hover:bg-white/75'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
