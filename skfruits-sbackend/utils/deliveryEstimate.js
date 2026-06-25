/**
 * Delivery Estimate Utilities
 * 
 * Lightweight haversine-based delivery estimation for order creation.
 * These do NOT call Google Maps — they use straight-line distance and config-based speeds.
 * Google Maps routing is only used later during driver assignment (admin-orders.js).
 */

import prisma from "../prisma.js";
import { haversineKm } from "./distance.js";
import { getDeliveryWindow } from "./trackingEngine.js";

/** Default config if no DeliveryTimeConfig row exists */
const DEFAULT_CONFIG = {
  averageSpeedKmph: 20,
  baseProcessingMinutes: 10,
  bufferMinutes: 5,
  maxDeliverableKm: 10,
  noDriverExtraMinutes: 15,
  orderCutoffHour: 23,
  minDeliveryHour: 8,
  deliveryWindowStart: 8,
  deliveryWindowEnd: 9,
};

/**
 * Resolve estimated delivery DATE for an order.
 * Uses getDeliveryWindow (cutoff/window logic) or slot date if provided.
 * 
 * Returns ISO date string like "2026-05-03".
 * Does NOT call Google Maps.
 * 
 * @param {number|null} deliverySlotId - Delivery slot ID (optional)
 * @param {Date} orderTime - When the order was placed (default: now)
 * @returns {Promise<string>} ISO date string "YYYY-MM-DD"
 */
export async function getEstimatedDeliveryForOrder(deliverySlotId, orderTime = new Date()) {
  // If a delivery slot is provided, use its date
  if (deliverySlotId != null && Number.isInteger(Number(deliverySlotId))) {
    const slot = await prisma.deliverySlot.findFirst({
      where: { id: Number(deliverySlotId), isActive: true },
    });
    if (slot) {
      const d = typeof slot.date === "string" ? new Date(slot.date) : slot.date;
      // Normalize to UTC midnight for stable date-only handling.
      d.setUTCHours(0, 0, 0, 0);
      return d.toISOString().slice(0, 10);
    }
  }

  // No slot — use delivery window logic (cutoff rules)
  const configRow = await prisma.deliveryTimeConfig.findFirst();
  const config = { ...DEFAULT_CONFIG, ...configRow };

  const windowInfo = getDeliveryWindow(
    orderTime,
    config.orderCutoffHour,
    config.minDeliveryHour,
    config.deliveryWindowStart,
    config.deliveryWindowEnd
  );

  // Normalize delivery date to UTC midnight for stable date-only output
  const deliveryDate = new Date(windowInfo.deliveryDate);
  deliveryDate.setUTCHours(0, 0, 0, 0);
  return deliveryDate.toISOString().slice(0, 10);
}

/**
 * Estimate delivery time in minutes using haversine distance + config.
 * Finds nearest active shop, calculates processing + travel + buffer time.
 * 
 * Does NOT call Google Maps — uses straight-line distance and average speed.
 * 
 * @param {number} lat - Customer latitude
 * @param {number} lng - Customer longitude
 * @returns {Promise<object>} { serviceable, estimatedMinutes?, nearestShop?, distanceKm?, driverAvailable? }
 */
export async function estimateDeliveryTime(lat, lng) {
  // 1. Fetch active shop locations
  const shops = await prisma.shopLocation.findMany({ where: { isActive: true } });
  if (!shops.length) {
    return { serviceable: false, reason: "No active shop locations configured" };
  }

  // 2. Find nearest shop (haversine — instant, free)
  let nearest = null;
  let minDist = Infinity;
  for (const shop of shops) {
    const d = haversineKm(lat, lng, shop.latitude, shop.longitude);
    if (d < minDist) {
      minDist = d;
      nearest = shop;
    }
  }
  const distanceKm = Math.round(minDist * 100) / 100; // 2 decimal places

  // 3. Fetch config (single row) or fall back to defaults
  const configRow = await prisma.deliveryTimeConfig.findFirst();
  const config = { ...DEFAULT_CONFIG, ...configRow };

  // 4. Check serviceability
  if (distanceKm > config.maxDeliverableKm) {
    return {
      serviceable: false,
      reason: "Address is outside our delivery range",
      distanceKm,
      maxDeliverableKm: config.maxDeliverableKm,
    };
  }

  // 5. Check driver availability (uses driverAvailability field)
  const availableDrivers = await prisma.user.count({
    where: { role: "driver", driverAvailability: "available" },
  });
  const driverAvailable = availableDrivers > 0;

  // 6. Calculate time: processing + travel + buffer + driver wait
  const processingMins = nearest.processingTimeMinutes ?? config.baseProcessingMinutes;
  const travelMins = (distanceKm / config.averageSpeedKmph) * 60;
  const driverWait = driverAvailable ? 0 : config.noDriverExtraMinutes;
  const totalMins = Math.ceil(processingMins + travelMins + config.bufferMinutes + driverWait);

  return {
    serviceable: true,
    estimatedMinutes: totalMins,
    nearestShop: nearest.name,
    distanceKm,
    driverAvailable,
  };
}
