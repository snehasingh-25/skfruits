import express from "express";
import prisma from "../prisma.js";
import { haversineKm } from "../utils/distance.js";
import { requireCustomerOnly } from "../middleware/auth.js";
import { getETAawarePosition } from "../utils/polylineUtils.js";

const router = express.Router();

/**
 * GET /tracking/order/:orderId
 * Fetch current tracking snapshot for an order
 * Customer can only track their own orders
 * 
 * Returns: status, etaMinutes, lastKnownLocation, predictedLocation, confidence
 */
router.get("/order/:orderId", requireCustomerOnly, async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.customerUserId;

    const order = await prisma.order.findFirst({
      where: { 
        id: parseInt(orderId), 
        userId 
      },
      include: {
        driverUser: {
          select: { phone: true, name: true }
        }
      }
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (!order.customerCanTrack) {
      return res.status(403).json({ 
        error: "Tracking not available yet",
        message: "Driver will start tracking once they pick up your order"
      });
    }

    // Get last tracking event
    const lastEvent = await prisma.driverTrackingEvent.findFirst({
      where: { orderId: parseInt(orderId) },
      orderBy: { timestamp: "desc" },
      take: 1
    });

    if (!lastEvent) {
      return res.json({
        orderId: parseInt(orderId),
        status: order.trackingStatus || "not_started",
        etaMinutes: null,
        lastKnownLocation: null,
        predictedLocation: null,
        locationFreshnessSeconds: null,
        canTrack: false,
        message: "No tracking data available yet"
      });
    }

    const now = Date.now();
    const eventTime = new Date(lastEvent.timestamp).getTime();
    const freshnessSeconds = Math.floor((now - eventTime) / 1000);

    let predictedLocation = {
      lat: lastEvent.latitude,
      lng: lastEvent.longitude,
      isEstimated: false
    };
    let etaMinutes = 0;
    let confidence = "high";
    let polyline = null;

    // If not delivered yet and customer address available, estimate ETA
    if (
      order.trackingStatus !== "delivered" &&
      order.addressLatitude &&
      order.addressLongitude
    ) {
      const distKm = haversineKm(
        lastEvent.latitude,
        lastEvent.longitude,
        order.addressLatitude,
        order.addressLongitude
      );

      // Use Google Maps duration if available, otherwise fallback to distance calc
      if (order.routePolyline) {
        try {
          const routeData = JSON.parse(order.routePolyline);
          const originalDurationMinutes = routeData.durationSeconds / 60;
          const totalDistKm = routeData.distanceKm;
          
          // Calculate progress ratio and remaining time
          const progressRatio = (totalDistKm - distKm) / totalDistKm;
          etaMinutes = Math.ceil(originalDurationMinutes * (1 - progressRatio));
          etaMinutes = Math.max(1, etaMinutes); // At least 1 minute remaining
        } catch (err) {
          console.warn("[Tracking] Error calculating ETA from route:", err);
          etaMinutes = 0; // No route data
        }
      } else {
        etaMinutes = 0; // No route polyline yet
      }

      // Freshness indicator
      if (freshnessSeconds > 600) {
        confidence = "low"; // More than 10 minutes old
      } else if (freshnessSeconds > 180) {
        confidence = "medium"; // More than 3 minutes old
      }

      // Use ETA-aware positioning with polyline (smooth but with realistic GPS jitter)
      if (order.routePolyline) {
        try {
          const routeData = JSON.parse(order.routePolyline);
          polyline = routeData.polyline;

          // Get position based on ETA progress (with GPS-like randomness)
          const pos = getETAawarePosition(routeData.distanceKm, distKm, routeData.polyline);
          if (pos) {
            predictedLocation = pos;
          } else {
            // Fallback to actual GPS position if calculation fails
            predictedLocation = {
              lat: lastEvent.latitude,
              lng: lastEvent.longitude,
              isEstimated: false
            };
          }
        } catch (err) {
          console.warn("[Tracking] Parse routePolyline error:", err);
          // Fallback to actual position
          predictedLocation = {
            lat: lastEvent.latitude,
            lng: lastEvent.longitude,
            isEstimated: false
          };
        }
      }
    }

    res.json({
      orderId: parseInt(orderId),
      status: order.trackingStatus || "in_transit",
      etaMinutes: Math.max(0, etaMinutes),
      lastKnownLocation: {
        lat: lastEvent.latitude,
        lng: lastEvent.longitude,
        accuracy: lastEvent.accuracy
      },
      predictedLocation,
      locationFreshnessSeconds: freshnessSeconds,
      lastUpdateTime: lastEvent.timestamp,
      confidence,
      canTrack: true,
      message: confidence === "high" ? "Live tracking" : "Last position updated recently",
      polyline, // ← Frontend renders this as the route on the map
      driverPhone: order.driverUser?.phone || null,
      driverName: order.driverUser?.name || null
    });
  } catch (error) {
    console.error("[Tracking] Fetch error:", error);
    res.status(500).json({ error: error.message || "Failed to fetch tracking" });
  }
});

/**
 * GET /tracking/order/:orderId/sse
 * Real-time SSE stream with updates every 3-5 seconds
 * Customer can only track their own orders
 * 
 * Streams: { status, etaMinutes, lastKnownLocation, predictedLocation, timestamp }
 */
router.get("/order/:orderId/sse", requireCustomerOnly, async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.customerUserId;

    const order = await prisma.order.findFirst({
      where: { 
        id: parseInt(orderId), 
        userId       },
      include: {
        driverUser: {
          select: { phone: true, name: true }
        }      }
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (!order.customerCanTrack) {
      return res.status(403).json({ error: "Tracking not available yet" });
    }

    // Set SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("Access-Control-Allow-Origin", "*");

    // Helper function to send tracking update
    const sendTrackingUpdate = async () => {
      try {
        // Re-fetch order state each tick so status changes are reflected immediately
        const currentOrder = await prisma.order.findFirst({
          where: { id: parseInt(orderId), userId },
          select: {
            trackingStatus: true,
            routePolyline: true,
            addressLatitude: true,
            addressLongitude: true,
            driverUser: { select: { phone: true, name: true } }
          }
        });

        if (!currentOrder) {
          res.write(`data: ${JSON.stringify({ error: "Order not found" })}\n\n`);
          return;
        }

        const lastEvent = await prisma.driverTrackingEvent.findFirst({
          where: { orderId: parseInt(orderId) },
          orderBy: { timestamp: "desc" },
          take: 1
        });

        if (!lastEvent) {
          const data = {
            orderId: parseInt(orderId),
            status: currentOrder.trackingStatus,
            etaMinutes: 0,
            lastKnownLocation: null,
            predictedLocation: null,
            timestamp: new Date().toISOString()
          };
          res.write(`data: ${JSON.stringify(data)}\n\n`);
          return;
        }

        const now = Date.now();
        const eventTime = new Date(lastEvent.timestamp).getTime();
        const freshnessSeconds = Math.floor((now - eventTime) / 1000);

        let etaMinutes = 0;
        let confidence = "high";
        let predictedLocation = {
          lat: lastEvent.latitude,
          lng: lastEvent.longitude,
          isEstimated: false
        };
        let polyline = null;

        if (
          currentOrder.trackingStatus !== "delivered" &&
          currentOrder.addressLatitude &&
          currentOrder.addressLongitude
        ) {
          const distKm = haversineKm(
            lastEvent.latitude,
            lastEvent.longitude,
            currentOrder.addressLatitude,
            currentOrder.addressLongitude
          );

        // Use Google Maps duration if available
        if (currentOrder.routePolyline) {
          try {
            const routeData = JSON.parse(currentOrder.routePolyline);
            const originalDurationMinutes = routeData.durationSeconds / 60;
            const totalDistKm = routeData.distanceKm;
            
            // Calculate progress ratio and remaining time
            const progressRatio = (totalDistKm - distKm) / totalDistKm;
            etaMinutes = Math.ceil(originalDurationMinutes * (1 - progressRatio));
            etaMinutes = Math.max(1, etaMinutes); // At least 1 minute remaining
          } catch (err) {
            console.warn("[Tracking SSE] Error calculating ETA from route:", err);
            etaMinutes = 0;
          }
        } else {
          etaMinutes = 0;
        }
          // Use ETA-aware positioning with polyline (smooth but with realistic GPS jitter)
          if (currentOrder.routePolyline) {
            try {
              const routeData = JSON.parse(currentOrder.routePolyline);
              polyline = routeData.polyline;
              const routeTotalDistKm = routeData.distanceKm;

              // Get position based on ETA progress (with GPS-like randomness)
              const pos = getETAawarePosition(routeTotalDistKm, distKm, routeData.polyline);
              if (pos) {
                // Check if driver is in final 10% of journey
                const finalSegmentThreshold = routeTotalDistKm * 0.1; // Last 10%
                if (distKm < finalSegmentThreshold) {
                  // Apply aggressive slowdown to prevent premature arrival marker
                  const slowdownFraction = 0.02; // Move only 2% per update
                  predictedLocation = {
                    lat: lastEvent.latitude + (pos.lat - lastEvent.latitude) * slowdownFraction,
                    lng: lastEvent.longitude + (pos.lng - lastEvent.longitude) * slowdownFraction,
                    isEstimated: true
                  };
                } else {
                  predictedLocation = pos;
                }
              } else {
                // Fallback to actual GPS position if calculation fails
                predictedLocation = {
                  lat: lastEvent.latitude,
                  lng: lastEvent.longitude,
                  isEstimated: false
                };
              }
            } catch (err) {
              console.warn("[Tracking SSE] Parse routePolyline error:", err);
              // Fallback to actual position
              predictedLocation = {
                lat: lastEvent.latitude,
                lng: lastEvent.longitude,
                isEstimated: false
              };
            }
          }
        }

        const data = {
          orderId: parseInt(orderId),
          status: currentOrder.trackingStatus,
          etaMinutes: Math.max(0, etaMinutes),
          lastKnownLocation: {
            lat: lastEvent.latitude,
            lng: lastEvent.longitude
          },
          predictedLocation,
          locationFreshnessSeconds: freshnessSeconds,
          confidence,
          polyline, // ← Frontend renders this route
          driverPhone: currentOrder.driverUser?.phone || null,
          driverName: currentOrder.driverUser?.name || null,
          timestamp: new Date().toISOString()
        };

        res.write(`data: ${JSON.stringify(data)}\n\n`);
      } catch (error) {
        console.error("[Tracking] SSE send error:", error);
      }
    };

    // Send initial update
    await sendTrackingUpdate();

    // Send updates every 3 seconds
    const interval = setInterval(async () => {
      await sendTrackingUpdate();
    }, 3000);

    // Cleanup on client disconnect
    req.on("close", () => {
      clearInterval(interval);
      res.end();
    });
  } catch (error) {
    console.error("[Tracking] SSE error:", error);
    res.status(500).json({ error: error.message || "Failed to establish tracking stream" });
  }
});

/**
 * GET /tracking/order/:orderId/history
 * Complete tracking event history
 * Customer can only see their own orders
 * 
 * Returns: Array of events with timestamps and locations
 */
router.get("/order/:orderId/history", requireCustomerOnly, async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.customerUserId;

    const order = await prisma.order.findFirst({
      where: { 
        id: parseInt(orderId),
        userId 
      },
      include: {
        driverUser: {
          select: { phone: true, name: true }
        }
      }
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Get all tracking events (hard events only, exclude pings and beacons for history)
    const events = await prisma.driverTrackingEvent.findMany({
      where: {
        orderId: parseInt(orderId),
        eventType: { in: ["picked_up", "reached", "delivered"] }
      },
      orderBy: { timestamp: "asc" },
      select: {
        eventType: true,
        latitude: true,
        longitude: true,
        timestamp: true,
        accuracy: true
      }
    });

    // If no order tracking yet, return empty history
    res.json({
      orderId: parseInt(orderId),
      status: order.trackingStatus,
      events: events.map(e => ({
        eventType: e.eventType,
        location: { lat: e.latitude, lng: e.longitude },
        timestamp: e.timestamp,
        accuracy: e.accuracy
      })),
      totalEvents: events.length
    });
  } catch (error) {
    console.error("[Tracking] History fetch error:", error);
    res.status(500).json({ error: error.message || "Failed to fetch tracking history" });
  }
});

/**
 * GET /tracking/order/:orderId/polling
 * Polling fallback endpoint (use instead of SSE if SSE not supported)
 * Returns current tracking status once
 * 
 * Query: includeHistory=true (optional, to include event history)
 */
router.get("/order/:orderId/polling", requireCustomerOnly, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { includeHistory } = req.query;
    const userId = req.customerUserId;

    const order = await prisma.order.findFirst({
      where: { 
        id: parseInt(orderId), 
        userId 
      },
      include: {
        driverUser: {
          select: { phone: true, name: true }
        }
      }
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (!order.customerCanTrack) {
      return res.status(403).json({ error: "Tracking not available yet" });
    }

    // Get last event
    const lastEvent = await prisma.driverTrackingEvent.findFirst({
      where: { orderId: parseInt(orderId) },
      orderBy: { timestamp: "desc" },
      take: 1
    });

    let events = [];
    if (includeHistory === "true") {
      events = await prisma.driverTrackingEvent.findMany({
        where: {
          orderId: parseInt(orderId),
          eventType: { in: ["picked_up", "reached", "delivered"] }
        },
        orderBy: { timestamp: "asc" },
        select: {
          eventType: true,
          latitude: true,
          longitude: true,
          timestamp: true
        }
      });
    }

    if (!lastEvent) {
      return res.json({
        orderId: parseInt(orderId),
        status: order.trackingStatus,
        tracking: null,
        history: events,
        pollNextIn: 5000 // Poll again in 5 seconds
      });
    }

    const now = Date.now();
    const eventTime = new Date(lastEvent.timestamp).getTime();
    const freshnessSeconds = Math.floor((now - eventTime) / 1000);

    let etaMinutes = 0;
    let predictedLocation = {
      lat: lastEvent.latitude,
      lng: lastEvent.longitude,
      isEstimated: false
    };
    let confidence = "high";
    let polyline = null;

    if (
      order.trackingStatus !== "delivered" &&
      order.addressLatitude &&
      order.addressLongitude
    ) {
      const distKm = haversineKm(
        lastEvent.latitude,
        lastEvent.longitude,
        order.addressLatitude,
        order.addressLongitude
      );
      
      // Use Google Maps duration if available
      if (order.routePolyline) {
        try {
          const routeData = JSON.parse(order.routePolyline);
          const originalDurationMinutes = routeData.durationSeconds / 60;
          const totalDistKm = routeData.distanceKm;
          
          // Calculate progress ratio and remaining time
          const progressRatio = (totalDistKm - distKm) / totalDistKm;
          etaMinutes = Math.ceil(originalDurationMinutes * (1 - progressRatio));
          etaMinutes = Math.max(1, etaMinutes); // At least 1 minute remaining
        } catch (err) {
          console.warn("[Tracking Polling] Error calculating ETA from route:", err);
          etaMinutes = 0;
        }
      } else {
        etaMinutes = 0;
      }

      // Confidence based on location freshness
      if (freshnessSeconds > 600) {
        confidence = "low";    // More than 10 minutes old
      } else if (freshnessSeconds > 180) {
        confidence = "medium"; // More than 3 minutes old
      }

      // Use ETA-aware positioning with polyline (smooth but with realistic GPS jitter)
      if (order.routePolyline) {
        try {
          const routeData = JSON.parse(order.routePolyline);
          polyline = routeData.polyline;
          const routeTotalDistKm = routeData.distanceKm;

          // Get position based on ETA progress (with GPS-like randomness)
          const pos = getETAawarePosition(routeTotalDistKm, distKm, routeData.polyline);
          if (pos) {
            // Check if driver is in final 10% of journey
            const finalSegmentThreshold = routeTotalDistKm * 0.1; // Last 10%
            if (distKm < finalSegmentThreshold) {
              // Apply aggressive slowdown to prevent premature arrival marker
              const slowdownFraction = 0.02; // Move only 2% per update
              predictedLocation = {
                lat: lastEvent.latitude + (pos.lat - lastEvent.latitude) * slowdownFraction,
                lng: lastEvent.longitude + (pos.lng - lastEvent.longitude) * slowdownFraction,
                isEstimated: true
              };
            } else {
              predictedLocation = pos;
            }
          } else {
            // Fallback to actual GPS position if calculation fails
            predictedLocation = {
              lat: lastEvent.latitude,
              lng: lastEvent.longitude,
              isEstimated: false
            };
          }
        } catch (err) {
          console.warn("[Tracking Polling] Parse routePolyline error:", err);
          // Fallback to actual position
          predictedLocation = {
            lat: lastEvent.latitude,
            lng: lastEvent.longitude,
            isEstimated: false
          };
        }
      }
    }

    res.json({
      orderId: parseInt(orderId),
      status: order.trackingStatus,
      orderStatus: order.status,           // ← actual order lifecycle status
      tracking: {
        etaMinutes: Math.max(0, etaMinutes),
        lastKnownLocation: { lat: lastEvent.latitude, lng: lastEvent.longitude },
        predictedLocation,
        confidence,
        timestamp: lastEvent.timestamp,
        freshnessSeconds,
        polyline, // ← Frontend renders this route
        driverPhone: order.driverUser?.phone || null,
        driverName: order.driverUser?.name || null
      },
      ...(includeHistory && { history: events }),
      pollNextIn: 5000 // Standard 5-second polling interval
    });
  } catch (error) {
    console.error("[Tracking] Polling fetch error:", error);
    res.status(500).json({ error: error.message || "Failed to fetch tracking" });
  }
});

export default router;
