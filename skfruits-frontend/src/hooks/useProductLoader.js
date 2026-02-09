import { useState, useEffect, useRef } from "react";

/**
 * Custom hook for managing product loading with time-based animation trigger
 * 
 * Only shows loading animation if loading takes >= 0.1 seconds (100ms)
 * 
 * @param {boolean} isLoading - Current loading state
 * @returns {object} - { showLoader: boolean, loadingStartTime: number }
 */
export function useProductLoader(isLoading) {
  // Start with loader visible if already loading (for initial page load)
  const [showLoader, setShowLoader] = useState(isLoading);
  const loadingStartTime = useRef(isLoading ? Date.now() : null);
  const minLoadTimeReached = useRef(false);
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (isLoading) {
      // Start loading
      if (loadingStartTime.current === null) {
        loadingStartTime.current = Date.now();
        minLoadTimeReached.current = false;

        // Show loader immediately
        setShowLoader(true);

        // Mark that minimum time has been reached after 0.1 seconds
        timeoutRef.current = setTimeout(() => {
          minLoadTimeReached.current = true;
        }, 100);
      } else {
        // Already loading, ensure loader is shown
        setShowLoader(true);
      }
    } else {
      // Loading completed
      if (loadingStartTime.current !== null) {
        const loadDuration = Date.now() - loadingStartTime.current;

        // Clear the timeout if it hasn't fired yet
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }

        // If loading was very fast (< 0.1 seconds), hide loader immediately
        if (loadDuration < 100 && !minLoadTimeReached.current) {
          setShowLoader(false);
        } else {
          // Loading took >= 0.1 seconds, keep loader showing
          // The loader component will handle the fade-out animation
        }

        // Reset for next load
        loadingStartTime.current = null;
        minLoadTimeReached.current = false;
      } else {
        // Not loading and wasn't loading before
        setShowLoader(false);
      }
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isLoading]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { 
    showLoader, 
    loadingStartTime: loadingStartTime.current 
  };
}
