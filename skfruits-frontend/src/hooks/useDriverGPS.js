import { useState, useRef, useCallback, useEffect } from "react";
import { API } from "../api";

const PING_INTERVAL_MS = 60_000; // Send location every 60 seconds (1 minute)

/**
 * Hook for managing driver GPS tracking during active deliveries.
 *
 * - Watches GPS position via navigator.geolocation.watchPosition
 * - Sends lightweight "ping" events every 60 seconds
 * - Sends hard events (picked_up, reached, delivered) on demand
 * - Fires sendBeacon on page unload for last-known position
 *
 * @param {Function} getAuthHeaders - Returns { Authorization: "Bearer ..." }
 * @returns {{ isTracking, currentLocation, error, startTracking, stopTracking, sendEvent }}
 */
export function useDriverGPS(getAuthHeaders) {
  const [isTracking, setIsTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [error, setError] = useState(null);

  const watchIdRef = useRef(null);
  const pingIntervalRef = useRef(null);
  const lastPositionRef = useRef(null);
  const activeOrderIdRef = useRef(null);

  // Send a ping with current position
  const sendPing = useCallback(async (orderId, lat, lng, accuracy) => {
    try {
      const headers = getAuthHeaders();
      if (!headers?.Authorization) return;
      await fetch(`${API}/driver/tracking/ping`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ orderId, latitude: lat, longitude: lng, accuracy }),
      });
    } catch (err) {
      console.warn("[DriverGPS] Ping failed:", err.message);
    }
  }, [getAuthHeaders]);

  // Send a hard tracking event (picked_up, reached, delivered)
  const sendEvent = useCallback(async (orderId, eventType) => {
    const pos = lastPositionRef.current;
    if (!pos) {
      console.warn("[DriverGPS] No position available for event");
      return false;
    }

    try {
      const headers = getAuthHeaders();
      if (!headers?.Authorization) return false;
      const res = await fetch(`${API}/driver/tracking/event`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({
          orderId,
          eventType,
          latitude: pos.lat,
          longitude: pos.lng,
          accuracy: pos.accuracy,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        console.error("[DriverGPS] Event failed:", data.error);
        return false;
      }
      return true;
    } catch (err) {
      console.error("[DriverGPS] Event error:", err.message);
      return false;
    }
  }, [getAuthHeaders]);

  // Start GPS tracking for a specific order
  const startTracking = useCallback((orderId) => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }

    activeOrderIdRef.current = orderId;
    setError(null);
    setIsTracking(true);

    // Watch position continuously
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        const loc = { lat: latitude, lng: longitude, accuracy };
        setCurrentLocation(loc);
        lastPositionRef.current = loc;
        setError(null);
      },
      (err) => {
        console.warn("[DriverGPS] Position error:", err.message);
        setError(
          err.code === 1 ? "Location access denied. Please enable location." :
          err.code === 2 ? "Location unavailable." :
          "Location timed out."
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 15_000,
        maximumAge: 5_000,
      }
    );

    // Send pings at regular intervals
    pingIntervalRef.current = setInterval(() => {
      const pos = lastPositionRef.current;
      const oid = activeOrderIdRef.current;
      if (pos && oid) {
        sendPing(oid, pos.lat, pos.lng, pos.accuracy);
      }
    }, PING_INTERVAL_MS);
  }, [sendPing]);

  // Stop GPS tracking
  const stopTracking = useCallback(() => {
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (pingIntervalRef.current != null) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
    setIsTracking(false);
    activeOrderIdRef.current = null;
  }, []);

  // Send beacon on page unload (fire-and-forget)
  useEffect(() => {
    const handleBeforeUnload = () => {
      const pos = lastPositionRef.current;
      const orderId = activeOrderIdRef.current;
      if (!pos || !orderId || !isTracking) return;

      // Use sendBeacon for reliable fire-and-forget
      const data = JSON.stringify({
        orderId,
        driverId: null, // Backend derives from the data; beacon doesn't have auth
        latitude: pos.lat,
        longitude: pos.lng,
        accuracy: pos.accuracy,
      });

      try {
        // Try sendBeacon first (works during unload)
        const blob = new Blob([data], { type: "application/json" });
        navigator.sendBeacon?.(`${API}/driver/tracking/beacon`, blob);
      } catch {
        // Fallback: fire-and-forget fetch
        fetch(`${API}/driver/tracking/beacon`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: data,
          keepalive: true,
        }).catch(() => {});
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isTracking]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (pingIntervalRef.current != null) {
        clearInterval(pingIntervalRef.current);
      }
    };
  }, []);

  return {
    isTracking,
    currentLocation,
    error,
    startTracking,
    stopTracking,
    sendEvent,
  };
}
