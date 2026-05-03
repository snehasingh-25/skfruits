import NodeCache from "node-cache";

const cache = new NodeCache({ stdTTL: 3600 }); // 1 hour TTL

/**
 * Get route information from Google Maps Directions API
 * Caches results for 1 hour to minimize API calls
 * 
 * @param {number} originLat - Starting latitude (shop)
 * @param {number} originLng - Starting longitude (shop)
 * @param {number} destLat - Destination latitude (customer)
 * @param {number} destLng - Destination longitude (customer)
 * @returns {Object} { distanceKm, distanceMeters, durationMinutes, distanceText, durationText, source }
 * @throws {Error} If API call fails and no cache available
 */
export async function getGoogleMapsRoute(originLat, originLng, destLat, destLng) {
  const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
  
  if (!GOOGLE_MAPS_API_KEY) {
    throw new Error("GOOGLE_MAPS_API_KEY not configured in environment");
  }

  // Create cache key (rounded to 4 decimals to catch nearby deliveries)
  const cacheKey = `route_${Math.round(originLat * 10000)}_${Math.round(originLng * 10000)}_${Math.round(destLat * 10000)}_${Math.round(destLng * 10000)}`;
  
  // STEP 1: Check cache first
  const cached = cache.get(cacheKey);
  if (cached) {
    console.log(`[GoogleMaps] Cache HIT for key: ${cacheKey}`);
    return { ...cached, source: "cache" };
  }

  console.log(`[GoogleMaps] Cache MISS for key: ${cacheKey}, calling API...`);

  try {
    // STEP 2: Call Google Maps Directions API
    const url = new URL("https://maps.googleapis.com/maps/api/directions/json");
    url.searchParams.append("origin", `${originLat},${originLng}`);
    url.searchParams.append("destination", `${destLat},${destLng}`);
    url.searchParams.append("key", GOOGLE_MAPS_API_KEY);
    url.searchParams.append("mode", "driving");
    url.searchParams.append("alternatives", "false");

    console.log(`[GoogleMaps] Calling API: ${url.toString().substring(0, 100)}...`);

    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.status !== "OK") {
      throw new Error(`Google Maps API error: ${data.status}${data.error_message ? ` - ${data.error_message}` : ""}`);
    }

    if (!data.routes || data.routes.length === 0) {
      throw new Error("No route found by Google Maps");
    }

    const route = data.routes[0];
    const leg = route.legs[0];

    const result = {
      distanceMeters: leg.distance.value,
      distanceKm: parseFloat((leg.distance.value / 1000).toFixed(2)),
      durationSeconds: leg.duration.value,  // Seconds (always accurate)
      durationMinutes: Math.ceil(leg.duration.value / 60),
      distanceText: leg.distance.text,
      durationText: leg.duration.text,
      // Route geometry for frontend rendering
      polyline: route.overview_polyline.points, // Encoded polyline string
      bounds: {
        northeast: route.bounds.northeast,
        southwest: route.bounds.southwest
      },
      // Turn-by-turn directions
      steps: leg.steps.map(step => ({
        instruction: step.html_instructions, // HTML formatted direction
        distance: step.distance.value,
        duration: step.duration.value,
        startLocation: step.start_location,
        endLocation: step.end_location,
        maneuver: step.maneuver // e.g., "turn-right", "straight"
      }))
    };

    // STEP 3: Cache the result
    cache.set(cacheKey, result);
    console.log(`[GoogleMaps] Cached route result for key: ${cacheKey}`);

    return {
      ...result,
      source: "google-maps-api"
    };
  } catch (error) {
    console.error(`[GoogleMaps] API call failed: ${error.message}`);
    throw error;
  }
}

/**
 * Clear all cached routes (useful on service restart or manual flush)
 */
export function clearRouteCache() {
  const stats = cache.getStats();
  console.log(`[GoogleMaps] Cleared cache with ${stats.keys} keys`);
  cache.flushAll();
}

/**
 * Get cache statistics for monitoring
 * @returns {Object} Cache stats including keys count, hits, misses
 */
export function getCacheStats() {
  return cache.getStats();
}

/**
 * Validate Google Maps API key is configured
 * @returns {boolean} True if API key is set
 */
export function isGoogleMapsConfigured() {
  return !!process.env.GOOGLE_MAPS_API_KEY;
}
