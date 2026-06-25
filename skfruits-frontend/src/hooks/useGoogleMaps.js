import { useState, useEffect } from "react";

const GOOGLE_MAPS_SCRIPT_ID = "google-maps-script";
const getApiKey = () => import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

export function useGoogleMaps() {
  const [isLoaded, setIsLoaded] = useState(() => typeof window !== "undefined" && !!window.google?.maps?.Map);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.google?.maps?.Map) {
      setIsLoaded(true);
      return;
    }

    const key = getApiKey();
    if (!key) {
      setError("Google Maps API key not configured");
      return;
    }

    // Global callback that persists
    const globalCallbackName = "__googleMapsCallback";
    
    if (!window[globalCallbackName]) {
      window[globalCallbackName] = () => {
        if (window.google?.maps?.Map) {
          setIsLoaded(true);
          setError(null);
        }
      };
    }

    // Check if script already exists
    if (document.getElementById(GOOGLE_MAPS_SCRIPT_ID)) {
      // Script is loading or loaded, wait for it
      if (window.google?.maps?.Map) {
        setIsLoaded(true);
      }
      return;
    }

    const script = document.createElement("script");
    script.id = GOOGLE_MAPS_SCRIPT_ID;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places&callback=${globalCallbackName}`;
    script.async = true;
    script.onerror = () => setError("Failed to load Google Maps script");
    document.head.appendChild(script);
  }, []);

  return { isLoaded: !!isLoaded, error };
}
