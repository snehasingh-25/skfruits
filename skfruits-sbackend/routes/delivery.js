import express from "express";
import prisma from "../prisma.js";
import { getCartItemsForOrder } from "./cart.js";
import { haversineKm } from "../utils/distance.js";
import { 
  getDeliveryWindow, 
  formatDeliveryWindow,
  isPointInServiceArea 
} from "../utils/trackingEngine.js";
import { 
  getGoogleMapsRoute, 
  getCacheStats,
  isGoogleMapsConfigured 
} from "../utils/googleMapsService.js";

const router = express.Router();
const CART_SESSION_HEADER = "x-cart-session-id";

function getSessionId(req) {
  return req.headers[CART_SESSION_HEADER]?.trim() || req.query?.sessionId?.trim() || req.body?.sessionId?.trim() || null;
}

/** Get applicable delivery rule for a cart total (highest minimumOrderAmount that is <= cartTotal) */
async function getDeliveryRuleForTotal(cartTotal) {
  const rules = await prisma.deliveryRule.findMany({
    where: { minimumOrderAmount: { lte: cartTotal } },
    orderBy: { minimumOrderAmount: "desc" },
    take: 1,
  });
  return rules[0] || null;
}

/** Calculate delivery fee server-side. Returns { deliveryFee, isFreeDelivery } */
async function calculateDeliveryCharges(cartTotal) {
  if (cartTotal <= 0) {
    return { deliveryFee: 0, isFreeDelivery: true };
  }
  const rule = await getDeliveryRuleForTotal(cartTotal);
  if (!rule) {
    return { deliveryFee: 0, isFreeDelivery: false };
  }
  const freeThreshold = rule.freeDeliveryThreshold ?? Infinity;
  const isFreeDelivery = cartTotal >= freeThreshold;
  const deliveryFee = isFreeDelivery ? 0 : Number(rule.deliveryFee ?? 0);
  return { deliveryFee: Math.max(0, deliveryFee), isFreeDelivery };
}

/**
 * GET /delivery/charges
 * Query: sessionId (optional if X-Cart-Session-Id header set)
 * Backend computes cart total from session and returns delivery fee.
 */
router.get("/charges", async (req, res) => {
  try {
    const sessionId = getSessionId(req);
    let cartTotal = 0;
    if (sessionId) {
      const items = await getCartItemsForOrder(sessionId);
      if (items?.length) {
        cartTotal = items.reduce((sum, item) => sum + Number(item.subtotal || 0), 0);
      }
    }
    const result = await calculateDeliveryCharges(cartTotal);
    res.json(result);
  } catch (error) {
    console.error("Delivery charges error:", error);
    res.status(500).json({ error: error.message || "Failed to get delivery charges" });
  }
});

/**
 * ============================================================================
 * PHASE 2: Service Area & Delivery Time Validation
 * ============================================================================
 */

/**
 * GET /delivery/check-availability
 * Query: latitude, longitude
 * 
 * Validates if delivery location is within service area (10 km from Bhilwara)
 * Response includes distance and availability message
 */
router.get("/check-availability", async (req, res) => {
  try {
    const { latitude, longitude } = req.query;
    
    if (!latitude || !longitude) {
      return res.status(400).json({ error: "Latitude and longitude required" });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ error: "Invalid latitude or longitude" });
    }

    // Fetch shop location from database (first active shop)
    const shopLocation = await prisma.shopLocation.findFirst({
      where: { isActive: true }
    });

    if (!shopLocation) {
      return res.status(500).json({ error: "Shop location not configured" });
    }

    const distanceKm = haversineKm(lat, lng, shopLocation.latitude, shopLocation.longitude);
    const serviceRadiusKm = shopLocation.serviceRadiusKm || 10;
    const isAvailable = distanceKm <= serviceRadiusKm;

    res.json({
      available: isAvailable,
      distanceKm: parseFloat(distanceKm.toFixed(2)),
      serviceRadius: serviceRadiusKm,
      shopLocation: {
        name: shopLocation.name,
        latitude: shopLocation.latitude,
        longitude: shopLocation.longitude
      },
      message: isAvailable 
        ? `Available for delivery (${distanceKm.toFixed(1)} km from ${shopLocation.name})`
        : `Sorry, we're not available here currently. We deliver within ${serviceRadiusKm} km of ${shopLocation.name}.`
    });
  } catch (error) {
    console.error("Availability check error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /delivery/eta-enhanced
 * Query: latitude, longitude, orderTime (optional ISO string)
 * 
 * PHASE 2b: Enhanced ETA with Google Maps Integration
 * - Step 1: Haversine quick pre-check (instant, free)
 * - Step 2-3: Google Maps routing (with 1-hour cache)
 * - Step 4: Fallback to Haversine if API fails
 * - Step 5: Business rule delivery window (7 PM cutoff, 8 AM minimum)
 */
router.get("/eta-enhanced", async (req, res) => {
  try {
    const { latitude, longitude, orderTime: orderTimeParam } = req.query;
    
    if (!latitude || !longitude) {
      return res.status(400).json({ error: "Latitude and longitude required" });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ error: "Invalid latitude or longitude" });
    }

    // Fetch shop location and delivery config once
    const shopLocation = await prisma.shopLocation.findFirst({
      where: { isActive: true }
    });

    if (!shopLocation) {
      return res.status(500).json({ error: "Shop location not configured" });
    }

    let deliveryConfig = await prisma.deliveryTimeConfig.findFirst();
    if (!deliveryConfig) {
      deliveryConfig = await prisma.deliveryTimeConfig.create({ data: {} });
    }

    // STEP 1: Quick Haversine pre-check (instant, free)
    const haversineDistanceKm = haversineKm(
      lat,
      lng,
      shopLocation.latitude,
      shopLocation.longitude
    );
    
    const serviceRadiusKm = shopLocation.serviceRadiusKm || 10;
    
    // Conservative check: allow if within 15% buffer for haversine
    const roughlyAvailable = haversineDistanceKm <= serviceRadiusKm * 1.15;

    if (!roughlyAvailable) {
      return res.status(400).json({
        error: "Location not in service area",
        message: `Sorry, we're not available here currently. We deliver within ${serviceRadiusKm} km of ${shopLocation.name}.`,
        available: false,
        distanceKm: parseFloat(haversineDistanceKm.toFixed(2)),
        distanceType: "straight-line",
        serviceRadius: serviceRadiusKm
      });
    }

    // STEP 2 & 3: Get Google Maps routing distance (with cache)
    let routingDistanceKm = haversineDistanceKm;
    let routingDistanceMeters = null;
    let routingDurationMinutes = null;
    let distanceSource = "haversine-fallback";
    let cacheInfo = null;
    let routeData = null; // Store polyline and directions for frontend

    // Only call Google Maps if API is configured
    if (isGoogleMapsConfigured()) {
      try {
        console.log(`[ETA] Calling Google Maps for route from (${shopLocation.latitude},${shopLocation.longitude}) to (${lat},${lng})`);
        
        const routeInfo = await getGoogleMapsRoute(
          shopLocation.latitude,
          shopLocation.longitude,
          lat,
          lng
        );
        
        routingDistanceMeters = routeInfo.distanceMeters;
        routingDistanceKm = routeInfo.distanceKm;
        routingDurationMinutes = routeInfo.durationMinutes;
        distanceSource = routeInfo.source;
        
        // Extract route geometry and directions for frontend
        routeData = {
          polyline: routeInfo.polyline,
          bounds: routeInfo.bounds,
          steps: routeInfo.steps
        };
        
        console.log(`[ETA] Google Maps success: ${routingDistanceKm}km, ${routingDurationMinutes}min, source: ${routeInfo.source}`);
        
        cacheInfo = {
          source: routeInfo.source,
          isCached: routeInfo.source === "cache"
        };
      } catch (apiError) {
        console.warn(`[ETA] Google Maps API failed, using haversine fallback: ${apiError.message}`);
        // Graceful fallback - just use haversine
        routingDistanceKm = haversineDistanceKm;
        cacheInfo = {
          error: apiError.message,
          fallback: true
        };
      }
    }

    // Check if within service area with routing distance
    if (routingDistanceKm > serviceRadiusKm) {
      return res.status(400).json({
        error: "Location not in service area",
        message: `Sorry, we're not available here currently. We deliver within ${serviceRadiusKm} km of ${shopLocation.name}.`,
        available: false,
        distanceKm: parseFloat(routingDistanceKm.toFixed(2)),
        distanceType: distanceSource === "haversine-fallback" ? "straight-line" : "routing",
        serviceRadius: serviceRadiusKm
      });
    }

    // STEP 5: Calculate delivery window based on business rules
    const orderTime = orderTimeParam ? new Date(orderTimeParam) : new Date();
    const cutoffHour = deliveryConfig.orderCutoffHour || 19;
    const minDeliveryHour = deliveryConfig.minDeliveryHour || 8;
    const windowStart = deliveryConfig.deliveryWindowStart || 8;
    const windowEnd = deliveryConfig.deliveryWindowEnd || 9;
    const baseProcessingMinutes = deliveryConfig.baseProcessingMinutes || 10;
    const averageSpeedKmph = deliveryConfig.averageSpeedKmph || 20;

    const windowInfo = getDeliveryWindow(
      orderTime,
      cutoffHour,
      minDeliveryHour,
      windowStart,
      windowEnd
    );

    // Calculate accurate ETA
    const processingMinutes = baseProcessingMinutes + (shopLocation.processingTimeMinutes || 0);
    const routeDeliveryMinutes = routingDurationMinutes || 
      Math.ceil((routingDistanceKm / averageSpeedKmph) * 60);
    const totalETAMinutes = processingMinutes + routeDeliveryMinutes;

    const estimatedDeliveryDate = windowInfo.deliveryDate.toISOString().slice(0, 10);

    res.json({
      available: true,
      estimatedDeliveryDate,
      estimatedDeliveryText: windowInfo.formattedWindow,
      deliveryTimeWindow: `${String(windowStart).padStart(2, "0")}:00 - ${String(windowEnd).padStart(2, "0")}:00`,
      cutoffTime: `${String(cutoffHour).padStart(2, "0")}:00`,
      note: windowInfo.message,
      orderedAt: orderTime.toISOString(),
      distance: {
        haversineKm: parseFloat(haversineDistanceKm.toFixed(2)),
        routingKm: parseFloat(routingDistanceKm.toFixed(2)),
        routingMeters: routingDistanceMeters,
        source: distanceSource,
        distanceText: cacheInfo?.source ? `${routingDistanceKm.toFixed(1)}km (${distanceSource})` : `${routingDistanceKm.toFixed(1)}km`
      },
      eta: {
        processingMinutes,
        deliveryMinutes: routeDeliveryMinutes,
        totalMinutes: totalETAMinutes,
        googleMapsMinutes: routingDurationMinutes
      },
      route: routeData, // Polyline, bounds, and turn-by-turn directions
      cache: cacheInfo,
      config: {
        cutoffHour,
        minDeliveryHour,
        windowStart,
        windowEnd
      }
    });
  } catch (error) {
    console.error("Enhanced delivery ETA error:", error);
    res.status(500).json({ error: error.message || "Failed to get ETA" });
  }
});



/** GET /delivery/checkout-summary — single call for checkout: delivery charges. Backend = source of truth. */
router.get("/checkout-summary", async (req, res) => {
  try {
    const sessionId = getSessionId(req);
    let cartTotal = 0;
    if (sessionId) {
      const items = await getCartItemsForOrder(sessionId);
      if (items?.length) {
        cartTotal = items.reduce((sum, item) => sum + Number(item.subtotal || 0), 0);
      }
    }

    const charges = await calculateDeliveryCharges(cartTotal);

    // Compute delivery date/text from window logic
    const configRow = await prisma.deliveryTimeConfig.findFirst();
    const config = {
      orderCutoffHour: 19,
      minDeliveryHour: 8,
      deliveryWindowStart: 8,
      deliveryWindowEnd: 9,
      ...configRow
    };
    const windowInfo = getDeliveryWindow(
      new Date(),
      config.orderCutoffHour,
      config.minDeliveryHour,
      config.deliveryWindowStart,
      config.deliveryWindowEnd
    );
    const estimatedDeliveryDate = windowInfo.deliveryDate.toISOString().slice(0, 10);

    const subtotal = Math.max(0, cartTotal);
    const deliveryFee = Math.max(0, charges.deliveryFee);
    const discountAmount = 0; // Future: apply coupon/promo server-side
    const total = Math.max(0, subtotal - discountAmount + deliveryFee);

    res.json({
      subtotal,
      discountAmount,
      deliveryFee: charges.deliveryFee,
      isFreeDelivery: charges.isFreeDelivery,
      total,
      estimatedDeliveryDate,
      estimatedDeliveryText: windowInfo.isOnDemand
        ? windowInfo.formattedWindow              // "Within 60 minutes"
        : windowInfo.message,                     // "will be delivered today after 8:00 AM"
    });
  } catch (error) {
    console.error("Checkout summary error:", error);
    res.status(500).json({ error: error.message || "Failed to get checkout summary" });
  }
});



export default router;
export { calculateDeliveryCharges, getDeliveryRuleForTotal };
