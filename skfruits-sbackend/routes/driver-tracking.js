import express from "express";
import prisma from "../prisma.js";
import { requireRole } from "../middleware/auth.js";

const router = express.Router();

/**
 * POST /driver/tracking/event
 * Hard GPS event from driver (picked up, reached, delivered)
 * 
 * Body: {
 *   orderId: number,
 *   eventType: "picked_up" | "reached" | "delivered",
 *   latitude: number,
 *   longitude: number,
 *   accuracy?: number
 * }
 */
router.post("/event", requireRole("driver"), async (req, res) => {
  try {
    const { orderId, eventType, latitude, longitude, accuracy } = req.body;
    const driverId = req.userId;

    // Validate required fields
    if (!orderId || !eventType || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: "Missing required fields: orderId, eventType, latitude, longitude" });
    }

    // Validate event type
    const validEvents = ["picked_up", "reached", "delivered"];
    if (!validEvents.includes(eventType)) {
      return res.status(400).json({ error: `Invalid event type. Must be one of: ${validEvents.join(", ")}` });
    }

    // Validate coordinates
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ error: "Invalid latitude or longitude" });
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({ error: "Latitude must be -90 to 90, longitude must be -180 to 180" });
    }

    // Check order exists and is assigned to this driver
    const order = await prisma.order.findFirst({
      where: { 
        id: parseInt(orderId), 
        driverUserId: driverId 
      }
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found or not assigned to this driver" });
    }

    // Save hard event to DriverTrackingEvent
    const event = await prisma.driverTrackingEvent.create({
      data: {
        orderId: parseInt(orderId),
        driverId,
        eventType,
        latitude: lat,
        longitude: lng,
        accuracy: accuracy ? parseFloat(accuracy) : null,
        timestamp: new Date()
      }
    });

    // Update Order tracking fields based on event
    let trackingStatus = order.trackingStatus;
    if (eventType === "picked_up") trackingStatus = "picked_up";
    else if (eventType === "reached") trackingStatus = "reached";
    else if (eventType === "delivered") trackingStatus = "delivered";

    await prisma.order.update({
      where: { id: parseInt(orderId) },
      data: {
        driverLastLocation: JSON.stringify({
          lat,
          lng,
          timestamp: new Date().toISOString()
        }),
        driverLastLocationTime: new Date(),
        trackingStatus,
        customerCanTrack: true // Enable tracking on first event
      }
    });

    // Update DriverLiveStatus cache for real-time lookups
    await prisma.driverLiveStatus.upsert({
      where: { driverId },
      create: {
        driverId,
        currentOrderId: parseInt(orderId),
        lastLatitude: lat,
        lastLongitude: lng,
        lastLocationTime: new Date(),
        isActive: true
      },
      update: {
        currentOrderId: parseInt(orderId),
        lastLatitude: lat,
        lastLongitude: lng,
        lastLocationTime: new Date(),
        isActive: true
      }
    });

    console.log(`[DriverTracking] Event: ${eventType} for order ${orderId} by driver ${driverId}`);

    // Prepare response
    let responseData = { 
      success: true, 
      event,
      message: `${eventType} event recorded successfully`
    };

    // If driver reached destination, include animation instructions for frontend
    if (eventType === "reached" && order.addressLatitude && order.addressLongitude) {
      responseData.frontendInstruction = {
        action: "snapToDestination",
        duration: 5000, // 5 seconds snap animation
        destinationLatitude: order.addressLatitude,
        destinationLongitude: order.addressLongitude,
        message: "Driver has arrived! Snapping marker to destination..."
      };
    }

    res.json(responseData);
  } catch (error) {
    console.error("[DriverTracking] Event error:", error);
    res.status(500).json({ error: error.message || "Failed to record tracking event" });
  }
});

/**
 * POST /driver/tracking/ping
 * Lightweight location ping every 20-30 seconds (when app is foreground)
 * 
 * Body: {
 *   orderId: number,
 *   latitude: number,
 *   longitude: number,
 *   accuracy?: number
 * }
 */
router.post("/ping", requireRole("driver"), async (req, res) => {
  try {
    const { orderId, latitude, longitude, accuracy } = req.body;
    const driverId = req.userId;

    // Validate required fields
    if (!orderId || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: "Missing required fields: orderId, latitude, longitude" });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ error: "Invalid latitude or longitude" });
    }

    // Check order exists and is assigned to this driver
    const order = await prisma.order.findFirst({
      where: { 
        id: parseInt(orderId), 
        driverUserId: driverId 
      }
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found or not assigned to this driver" });
    }

    // Save as "ping" event (lightweight tracking between hard events)
    const event = await prisma.driverTrackingEvent.create({
      data: {
        orderId: parseInt(orderId),
        driverId,
        eventType: "ping",
        latitude: lat,
        longitude: lng,
        accuracy: accuracy ? parseFloat(accuracy) : null,
        timestamp: new Date()
      }
    });

    // Update driver live status cache (only, don't update Order tracking fields)
    await prisma.driverLiveStatus.upsert({
      where: { driverId },
      create: {
        driverId,
        currentOrderId: parseInt(orderId),
        lastLatitude: lat,
        lastLongitude: lng,
        lastPingTime: new Date(),
        isActive: true
      },
      update: {
        lastLatitude: lat,
        lastLongitude: lng,
        lastPingTime: new Date()
      }
    });

    res.json({ 
      success: true, 
      ping: event,
      message: "Ping received"
    });
  } catch (error) {
    console.error("[DriverTracking] Ping error:", error);
    res.status(500).json({ error: error.message || "Failed to process ping" });
  }
});

/**
 * POST /driver/tracking/beacon
 * sendBeacon call on app/tab switch (fire-and-forget, no auth required)
 * This is a best-effort endpoint for unload events
 * 
 * Body: {
 *   orderId: number,
 *   driverId: number,
 *   latitude: number,
 *   longitude: number,
 *   accuracy?: number
 * }
 */
router.post("/beacon", async (req, res) => {
  try {
    const { orderId, driverId, latitude, longitude, accuracy } = req.body;

    // Minimal validation - fire-and-forget
    if (!orderId || !driverId || latitude === undefined || longitude === undefined) {
      return res.json({ ok: true }); // Always return success for fire-and-forget
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.json({ ok: true });
    }

    // Validate that this driver is actually assigned to this order
    const order = await prisma.order.findFirst({
      where: { id: parseInt(orderId), driverUserId: parseInt(driverId) }
    });

    if (!order) {
      return res.json({ ok: true }); // Silently reject invalid assignment
    }

    // Try to save beacon event, but don't fail if there's an error
    await prisma.driverTrackingEvent.create({
      data: {
        orderId: parseInt(orderId),
        driverId: parseInt(driverId),
        eventType: "beacon",
        latitude: lat,
        longitude: lng,
        accuracy: accuracy ? parseFloat(accuracy) : null,
        timestamp: new Date()
      }
    }).catch(err => {
      console.warn("[DriverTracking] Beacon save failed (non-critical):", err.message);
    });

    res.json({ ok: true }); // Always return success
  } catch (error) {
    // Silently fail - beacon is fire-and-forget
    console.warn("[DriverTracking] Beacon error (non-critical):", error.message);
    res.json({ ok: true });
  }
});

/**
 * GET /driver/tracking/status/:orderId
 * Get current tracking status for an order (for driver app)
 * 
 * Returns: Current location, last event, statuses
 */
router.get("/status/:orderId", requireRole("driver"), async (req, res) => {
  try {
    const { orderId } = req.params;
    const driverId = req.userId;

    const order = await prisma.order.findFirst({
      where: { 
        id: parseInt(orderId), 
        driverUserId: driverId 
      }
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Get last event
    const lastEvent = await prisma.driverTrackingEvent.findFirst({
      where: { orderId: parseInt(orderId) },
      orderBy: { timestamp: "desc" },
      take: 1
    });

    res.json({
      orderId: parseInt(orderId),
      trackingStatus: order.trackingStatus,
      lastEvent: lastEvent ? {
        eventType: lastEvent.eventType,
        latitude: lastEvent.latitude,
        longitude: lastEvent.longitude,
        timestamp: lastEvent.timestamp
      } : null,
      lastLocation: order.driverLastLocation ? JSON.parse(order.driverLastLocation) : null,
      lastLocationTime: order.driverLastLocationTime
    });
  } catch (error) {
    console.error("[DriverTracking] Status fetch error:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
