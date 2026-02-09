import { useEffect, useState } from "react";

/**
 * GiftBoxLoader - Animated loading screen that only shows if loading takes >= 0.1 seconds
 * 
 * @param {boolean} isLoading - Whether data is currently loading
 * @param {boolean} showLoader - Whether to show the loader (controlled by time-based logic)
 * @param {function} onComplete - Callback when animation completes
 */
export default function GiftBoxLoader({ isLoading, showLoader, onComplete }) {
  const [animationPhase, setAnimationPhase] = useState("loading"); // loading, bursting, fading
  // Show immediately if loading or if showLoader is true
  const [shouldRender, setShouldRender] = useState(isLoading || showLoader);

  useEffect(() => {
    // Always show when loading
    if (isLoading) {
      setShouldRender(true);
      setAnimationPhase("loading");
      return;
    }

    // When loading completes and showLoader is true, trigger burst animation
    if (!isLoading && showLoader) {
      setAnimationPhase("bursting");
      
      // After burst animation, fade out
      const fadeTimer = setTimeout(() => {
        setAnimationPhase("fading");
        
        // Remove from DOM after fade completes
        const removeTimer = setTimeout(() => {
          setShouldRender(false);
          if (onComplete) onComplete();
        }, 500); // Match fade-out duration
        
        return () => clearTimeout(removeTimer);
      }, 600); // Burst animation duration
      
      return () => clearTimeout(fadeTimer);
    }

    // If not loading and showLoader is false, hide immediately
    if (!isLoading && !showLoader) {
      setShouldRender(false);
    }
  }, [isLoading, showLoader, onComplete]);

  if (!shouldRender) return null;

  return (
    <div 
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-white transition-opacity duration-500 ${
        animationPhase === "fading" ? "opacity-0" : "opacity-100"
      }`}
      style={{ 
        pointerEvents: animationPhase === "fading" ? "none" : "auto",
        zIndex: 9999
      }}
    >
      <div className="relative flex flex-col items-center justify-center">
        {/* Video Loader */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="w-42 h-42 sm:w-42 sm:h-42 object-contain"
          style={{
            display: animationPhase === "loading" ? "block" : "none"
          }}
        >
          <source src="/gift.webm" type="video/mp4" />
          Your browser does not support the video tag.
        </video>

        {/* Loading Text (only during loading phase) */}
        {animationPhase === "loading" && (
          <p 
            className="mt-8 text-center text-lg font-semibold"
            style={{ color: "oklch(40% .02 340)" }}
          >
            Preparing your gifts...
          </p>
        )}
      </div>
    </div>
  );
}
