/**
 * Tracking Engine Utilities
 * Core functions for driver position prediction and ETA calculation
 * Note: Haversine distance calculation is in utils/distance.js
 */

import { haversineKm } from "./distance.js";

/**
 * Predict driver position between last known point and destination
 * Using eased linear interpolation for realistic movement
 * 
 * @param {number} lastLat - Last known latitude
 * @param {number} lastLng - Last known longitude
 * @param {number} destLat - Destination latitude
 * @param {number} destLng - Destination longitude
 * @param {Date|string} lastEventTime - When last event was recorded
 * @param {Date|string} destinationReachTime - Expected time to reach destination
 * @returns {Object} { lat, lng, isEstimated, confidence }
 */
export function predictNextPosition(
  lastLat,
  lastLng,
  destLat,
  destLng,
  lastEventTime,
  destinationReachTime
) {
  const now = Date.now();
  const lastTime = new Date(lastEventTime).getTime();
  const destTime = new Date(destinationReachTime).getTime();

  if (now >= destTime) {
    return { lat: destLat, lng: destLng, isEstimated: false, confidence: "high" };
  }

  const progress = (now - lastTime) / (destTime - lastTime);
  const clampedProgress = Math.max(0, Math.min(1, progress));

  // Ease-in-out: slower near destination (easing function)
  const easeProgress =
    clampedProgress < 0.7
      ? clampedProgress
      : 0.7 + (clampedProgress - 0.7) * 0.3; // Slow down last 30%

  return {
    lat: lastLat + (destLat - lastLat) * easeProgress,
    lng: lastLng + (destLng - lastLng) * easeProgress,
    isEstimated: true,
    confidence: clampedProgress >= 0.8 ? "high" : "medium"
  };
}

/**
 * Calculate remaining ETA in minutes
 * 
 * @param {Date|string} destinationReachTime - Expected arrival time
 * @returns {number} Minutes remaining (0 if already reached)
 */
export function calculateRemainingETA(destinationReachTime) {
  const remainingTime = Math.max(
    0,
    new Date(destinationReachTime).getTime() - Date.now()
  );
  return Math.ceil(remainingTime / 60000); // Convert to minutes
}



/**
 * Format a date for human-readable ETA display
 * 
 * @param {Date} date - Date to format
 * @returns {string} Human-readable format (e.g., "Today by 8:00 AM - 9:00 AM")
 */
export function formatDeliveryWindow(date, startHour = 8, endHour = 9) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  let dayText = "";
  if (d.getTime() === today.getTime()) {
    dayText = "Today";
  } else if (d.getTime() === tomorrow.getTime()) {
    dayText = "Tomorrow";
  } else {
    dayText = d.toLocaleDateString("en-IN", { 
      weekday: "short", 
      day: "numeric", 
      month: "short" 
    });
  }
  
  return `${dayText} by ${String(startHour).padStart(2, "0")}:00 - ${String(endHour).padStart(2, "0")}:00`;
}

/**
 * Interpolate location along a path
 * Used for smooth animation between driver's current position and destination
 * 
 * @param {Object} start - { lat, lng }
 * @param {Object} end - { lat, lng }
 * @param {number} progress - 0 to 1 (0 = at start, 1 = at end)
 * @returns {Object} { lat, lng }
 */
export function interpolateLocation(start, end, progress) {
  const clampedProgress = Math.max(0, Math.min(1, progress));
  
  return {
    lat: start.lat + (end.lat - start.lat) * clampedProgress,
    lng: start.lng + (end.lng - start.lng) * clampedProgress
  };
}

/**
 * Check if a point is within a circular service area
 * 
 * @param {number} pointLat - Point latitude
 * @param {number} pointLng - Point longitude
 * @param {number} centerLat - Service area center latitude
 * @param {number} centerLng - Service area center longitude
 * @param {number} radiusKm - Service area radius in KM
 * @returns {boolean} True if point is within service area
 */
export function isPointInServiceArea(
  pointLat,
  pointLng,
  centerLat,
  centerLng,
  radiusKm
) {
  const distance = haversineKm(pointLat, pointLng, centerLat, centerLng);
  return distance <= radiusKm;
}

/**
 * Get delivery window based on current time and business rules
 * Business Rules:
 * - Orders after 7 PM → delivered next day
 * - Orders before 8 AM → delivered today
 * - Orders 8 AM - 7 PM → delivered today
 * 
 * @param {Date} orderTime - When the order was placed
 * @param {number} cutoffHour - Cutoff hour (default 19 = 7 PM)
 * @param {number} minDeliveryHour - Minimum delivery hour (default 8 = 8 AM)
 * @param {number} deliveryWindowStart - Window start hour (default 8)
 * @param {number} deliveryWindowEnd - Window end hour (default 9)
 * @returns {Object} { deliveryDate, message, formattedWindow }
 */
export function getDeliveryWindow(
  orderTime,
  cutoffHour = 23,
  minDeliveryHour = 8,
  deliveryWindowStart = 8,
  deliveryWindowEnd = 9
) {
  const currentHour = new Date(orderTime).getHours();
  let deliveryDate = new Date(orderTime);
  let message = "";
  let isOnDemand = false;

  if (currentHour < minDeliveryHour) {
    // Before 8 AM → same day delivery at 8 AM morning batch
    deliveryDate.setHours(deliveryWindowStart, 0, 0, 0);
    message = `Order confirmed - will be delivered today after ${deliveryWindowStart}:00 AM`;
  } else if (currentHour >= cutoffHour) {
    // After 7 PM → next day delivery at 8 AM morning batch
    deliveryDate.setDate(deliveryDate.getDate() + 1);
    deliveryDate.setHours(deliveryWindowStart, 0, 0, 0);
    message = `Order placed after ${cutoffHour}:00 - will be delivered tomorrow after ${deliveryWindowStart}:00 AM`;
  } else {
    // 8 AM to 7 PM → same day on-demand delivery (within ~60 mins)
    isOnDemand = true;
    // Delivery date stays as today (the actual ETA comes from estimateDeliveryTime)
    message = `Order confirmed - will be delivered today within 60 minutes`;
  }

  return {
    deliveryDate,
    message,
    isOnDemand,
    formattedWindow: isOnDemand
      ? "Within 60 minutes"
      : formatDeliveryWindow(deliveryDate, deliveryWindowStart, deliveryWindowEnd)
  };
}
