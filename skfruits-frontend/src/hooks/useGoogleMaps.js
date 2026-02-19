import { useState, useEffect } from "react";

const GOOGLE_MAPS_SCRIPT_ID = "google-maps-script";
const getApiKey = () => import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

export function useGoogleMaps() {
  const [isLoaded, setIsLoaded] = useState(() => typeof window !== "undefined" && !!window.google?.maps?.places);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.google?.maps?.places) {
      setIsLoaded(true);
      return;
    }
    const key = getApiKey();
    if (!key) {
      setError("Google Maps API key not configured");
      return;
    }
    if (document.getElementById(GOOGLE_MAPS_SCRIPT_ID)) {
      // Script already added, wait for load
      const check = setInterval(() => {
        if (window.google?.maps?.places) {
          setIsLoaded(true);
          setError(null);
          clearInterval(check);
        }
      }, 100);
      return () => clearInterval(check);
    }
    const script = document.createElement("script");
    script.id = GOOGLE_MAPS_SCRIPT_ID;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places&loading=async`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.google?.maps?.places) {
        setIsLoaded(true);
        setError(null);
      } else {
        setError("Google Maps failed to load");
      }
    };
    script.onerror = () => setError("Failed to load Google Maps script");
    document.head.appendChild(script);
    return () => {};
  }, []);

  return { isLoaded: !!isLoaded, error };
}
