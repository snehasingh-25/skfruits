import { useState, useEffect, useRef, useCallback } from "react";
import { API } from "../api";

/**
 * Hook for polling live tracking data for a customer order.
 *
 * Uses the polling endpoint (GET /tracking/order/:orderId/polling)
 * since SSE requires custom auth headers which EventSource doesn't support.
 *
 * @param {number|string} orderId
 * @param {Function} getAuthHeaders - Returns { Authorization: "Bearer ..." }
 * @param {Object} options
 * @param {boolean} options.enabled - Whether polling is active (default: true)
 * @param {boolean} options.includeHistory - Whether to include event history (default: true)
 * @returns {{ trackingData, isConnected, error, isDelivered, refetch }}
 */
export function useOrderTracking(orderId, getAuthHeaders, options = {}) {
  const { enabled = true, includeHistory = true } = options;

  const [trackingData, setTrackingData] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const [isDelivered, setIsDelivered] = useState(false);

  const timerRef = useRef(null);
  const retriesRef = useRef(0);
  const MAX_RETRIES = 5;

  const fetchTracking = useCallback(async () => {
    if (!orderId || !enabled) return;

    const headers = getAuthHeaders();
    if (!headers?.Authorization) {
      setError("Not authenticated");
      return;
    }

    try {
      const url = `${API}/tracking/order/${orderId}/polling${includeHistory ? "?includeHistory=true" : ""}`;
      const res = await fetch(url, { headers, credentials: "include" });

      if (res.status === 403) {
        // Tracking not available yet (driver hasn't picked up) — keep polling
        setError("Tracking not available yet — driver will start soon");
        setIsConnected(false);
        timerRef.current = setTimeout(fetchTracking, 5000);
        return;
      }

      if (res.status === 404) {
        setError("Order not found");
        setIsConnected(false);
        return;
      }

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      setTrackingData(data);
      setIsConnected(true);
      setError(null);
      retriesRef.current = 0;

      // Check if delivered — stop polling
      if (data.status === "delivered") {
        setIsDelivered(true);
        return; // Don't schedule next poll
      }

      // Schedule next poll based on server recommendation
      const nextPoll = data.pollNextIn || 5000;
      timerRef.current = setTimeout(fetchTracking, nextPoll);
    } catch (err) {
      retriesRef.current += 1;
      setIsConnected(false);

      if (retriesRef.current >= MAX_RETRIES) {
        setError("Connection lost. Please refresh.");
        return;
      }

      // Exponential backoff: 3s, 6s, 12s, 24s, 48s
      const backoff = Math.min(3000 * Math.pow(2, retriesRef.current - 1), 60000);
      setError(`Reconnecting... (attempt ${retriesRef.current}/${MAX_RETRIES})`);
      timerRef.current = setTimeout(fetchTracking, backoff);
    }
  }, [orderId, enabled, includeHistory, getAuthHeaders]);

  // Start polling when enabled
  useEffect(() => {
    if (!enabled || !orderId) return;

    fetchTracking();

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [enabled, orderId, fetchTracking]);

  // Manual refetch
  const refetch = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    retriesRef.current = 0;
    fetchTracking();
  }, [fetchTracking]);

  return {
    trackingData,
    isConnected,
    error,
    isDelivered,
    refetch,
  };
}
