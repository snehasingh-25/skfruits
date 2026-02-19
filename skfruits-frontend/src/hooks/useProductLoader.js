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
  // Only show loader after min delay (100ms), so fast responses don't flash the gift box
  const [showLoader, setShowLoader] = useState(false);
  const loadingStartTime = useRef(isLoading ? Date.now() : null);
  const minLoadTimeReached = useRef(false);
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (isLoading) {
      // Start loading
      if (loadingStartTime.current === null) {
        loadingStartTime.current = Date.now();
        minLoadTimeReached.current = false;

        // Only show the fancy loader after 100ms (avoids flash for fast local requests)
        timeoutRef.current = setTimeout(() => {
          minLoadTimeReached.current = true;
          setShowLoader(true);
        }, 100);
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

        // If loading finished before we ever showed the loader, keep it hidden
        if (!minLoadTimeReached.current) {
          setShowLoader(false);
        }
        // Otherwise loader was shown; GiftBoxLoader will handle fade-out

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
