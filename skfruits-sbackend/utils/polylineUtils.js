/**
 * Polyline Encoding/Decoding Utilities
 * 
 * Google Maps returns encoded polylines. This utility:
 * 1. Decodes encoded polyline strings to lat/lng arrays
 * 2. Calculates distance along polyline
 * 3. Interpolates position at specific distance along the route
 */

/**
 * Decode Google Maps encoded polyline string to array of {lat, lng}
 * 
 * Algorithm: Each coordinate is encoded as signed values, with each value split into chunks.
 * More info: https://developers.google.com/maps/documentation/utilities/polylinealgorithm
 * 
 * @param {string} encoded - Encoded polyline string from Google Maps
 * @returns {Array} Array of {lat, lng} coordinate objects
 */
export function decodePolyline(encoded) {
  const poly = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    // Decode latitude
    let result = 0;
    let shift = 0;
    let byte;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    lat += (result & 1) ? ~(result >> 1) : result >> 1;

    // Decode longitude
    result = 0;
    shift = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    lng += (result & 1) ? ~(result >> 1) : result >> 1;

    poly.push({
      lat: lat / 1e5,
      lng: lng / 1e5
    });
  }

  return poly;
}

/**
 * Calculate distance in km between two coordinates using Haversine formula
 * 
 * @param {number} lat1 - First latitude
 * @param {number} lng1 - First longitude
 * @param {number} lat2 - Second latitude
 * @param {number} lng2 - Second longitude
 * @returns {number} Distance in kilometers
 */
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth's radius in kilometers
  const toRad = Math.PI / 180;
  
  const dLat = (lat2 - lat1) * toRad;
  const dLng = (lng2 - lng1) * toRad;
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) * 
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculate total distance of a polyline by summing all segment distances
 * 
 * @param {Array} polylinePoints - Array of {lat, lng} objects
 * @returns {number} Total distance in kilometers
 */
export function getPolylineDistance(polylinePoints) {
  if (!polylinePoints || polylinePoints.length < 2) return 0;
  
  let totalDist = 0;
  for (let i = 0; i < polylinePoints.length - 1; i++) {
    const p1 = polylinePoints[i];
    const p2 = polylinePoints[i + 1];
    totalDist += haversineDistance(p1.lat, p1.lng, p2.lat, p2.lng);
  }
  return totalDist;
}

/**
 * Find position on polyline at a specific distance along the route
 * 
 * Algorithm:
 * 1. Sum distances from start until we exceed targetDistance
 * 2. Interpolate between the two points that bracket the target distance
 * 3. Return the interpolated coordinate
 * 
 * @param {Array} polylinePoints - Array of {lat, lng} objects
 * @param {number} targetDistKm - Target distance along polyline in km
 * @returns {Object|null} {lat, lng} at that distance or null if out of bounds
 */
export function getPositionAtDistance(polylinePoints, targetDistKm) {
  if (!polylinePoints || polylinePoints.length < 2) return null;
  if (targetDistKm < 0) return polylinePoints[0];
  
  let distanceSoFar = 0;
  
  for (let i = 0; i < polylinePoints.length - 1; i++) {
    const p1 = polylinePoints[i];
    const p2 = polylinePoints[i + 1];
    
    const segmentDist = haversineDistance(p1.lat, p1.lng, p2.lat, p2.lng);
    const distAfterSegment = distanceSoFar + segmentDist;
    
    // Check if target distance falls in this segment
    if (distAfterSegment >= targetDistKm) {
      // Calculate how far along this segment we need to go (0 to 1)
      const remaining = targetDistKm - distanceSoFar;
      const progress = segmentDist === 0 ? 0 : remaining / segmentDist;
      
      // Linear interpolation between p1 and p2
      return {
        lat: p1.lat + (p2.lat - p1.lat) * progress,
        lng: p1.lng + (p2.lng - p1.lng) * progress
      };
    }
    
    distanceSoFar = distAfterSegment;
  }
  
  // Target distance is beyond the end of polyline, return last point
  return polylinePoints[polylinePoints.length - 1];
}

/**
 * Calculate predicted position of driver along the route
 * 
 * Given:
 * - Current position (lastLat, lastLng)
 * - Remaining distance to destination
 * - Encoded polyline from Google Maps
 * 
 * Returns interpolated position along the ACTUAL ROUTE (not straight line)
 * 
 * @param {number} orderDistKm - Total distance for order (from Google Maps)
 * @param {number} remainingDistKm - Calculated remaining distance from current pos to destination
 * @param {string} encodedPolyline - Encoded polyline from Google Maps
 * @returns {Object} {lat, lng} or null if can't calculate
 */
export function predictPositionOnRoute(orderDistKm, remainingDistKm, encodedPolyline) {
  if (!encodedPolyline) return null;
  
  try {
    const polylinePoints = decodePolyline(encodedPolyline);
    if (polylinePoints.length < 2) return null;
    
    // Distance traveled along the route so far
    const distanceTraveled = Math.max(0, orderDistKm - remainingDistKm);
    
    // Get position at that distance along the actual polyline
    return getPositionAtDistance(polylinePoints, distanceTraveled);
  } catch (error) {
    console.error("[Polyline] Prediction error:", error);
    return null;
  }
}

/**
 * Get driver position based on ETA-aware progress with GPS-like randomness
 * 
 * Algorithm:
 * 1. Calculate expected progress: distance_covered / total_distance
 * 2. Get polyline position at that progress point
 * 3. Add small random offset (±50-100 meters) to simulate GPS jitter
 * 4. Return position with slight natural variation
 * 
 * This ensures:
 * - Marker moves at pace consistent with ETA (not too fast/slow)
 * - Has realistic GPS noise (±50m typical accuracy)
 * - Feels natural, not robotic
 * 
 * @param {number} totalDistKm - Total route distance from Google Maps
 * @param {number} remainingDistKm - Current remaining distance to destination
 * @param {string} encodedPolyline - Encoded polyline from Google Maps
 * @returns {Object} {lat, lng, isEstimated} with ETA-aware positioning
 */
export function getETAawarePosition(totalDistKm, remainingDistKm, encodedPolyline) {
  if (!encodedPolyline) return null;
  
  try {
    const polylinePoints = decodePolyline(encodedPolyline);
    if (polylinePoints.length < 2) return null;
    
    // Calculate how far along the route they should be based on distance
    const distanceCoveredKm = Math.max(0, totalDistKm - remainingDistKm);
    const expectedProgressRatio = Math.min(1, distanceCoveredKm / totalDistKm);
    
    // Get position at that progress point on polyline
    const basePosition = getPositionAtDistance(polylinePoints, distanceCoveredKm);
    if (!basePosition) return null;
    
    // Add small random GPS jitter (±30-80 meters = ±0.0003 to ±0.0007 degrees)
    // This makes movement feel realistic, not perfectly smooth
    const randomLatOffset = (Math.random() - 0.5) * 0.0012; // ±60m
    const randomLngOffset = (Math.random() - 0.5) * 0.0012; // ±60m
    
    return {
      lat: basePosition.lat + randomLatOffset,
      lng: basePosition.lng + randomLngOffset,
      isEstimated: true,
      progressRatio: expectedProgressRatio
    };
  } catch (error) {
    console.error("[Polyline] ETA-aware position error:", error);
    return null;
  }
}

export default {
  decodePolyline,
  getPolylineDistance,
  getPositionAtDistance,
  predictPositionOnRoute,
  getETAawarePosition
};
