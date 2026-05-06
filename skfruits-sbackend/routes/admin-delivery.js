import express from "express";
import prisma from "../prisma.js";
import { requireRole } from "../utils/auth.js";

const router = express.Router();

// ============================================================================
// SHOP LOCATIONS MANAGEMENT
// ============================================================================

/**
 * GET /admin/delivery/shop-locations
 * Fetch all shop locations (active and inactive)
 */
router.get("/shop-locations", requireRole("admin"), async (req, res) => {
  try {
    const locations = await prisma.shopLocation.findMany({
      orderBy: { isActive: "desc" }
    });

    res.json({
      locations,
      total: locations.length
    });
  } catch (error) {
    console.error("Fetch shop locations error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /admin/delivery/shop-locations/:id
 * Fetch single shop location
 */
router.get("/shop-locations/:id", requireRole("admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const location = await prisma.shopLocation.findUnique({
      where: { id: parseInt(id) }
    });

    if (!location) {
      return res.status(404).json({ error: "Shop location not found" });
    }

    res.json({ location });
  } catch (error) {
    console.error("Fetch shop location error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /admin/delivery/shop-locations
 * Create new shop location
 * 
 * Body:
 * {
 *   name: string,
 *   latitude: number,
 *   longitude: number,
 *   serviceRadiusKm?: number (default: 10),
 *   processingTimeMinutes?: number (default: 10)
 * }
 */
router.post("/shop-locations", requireRole("admin"), async (req, res) => {
  try {
    const { name, latitude, longitude, serviceRadiusKm, processingTimeMinutes } = req.body;

    // Validate required fields
    if (!name || latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        error: "name, latitude, and longitude are required"
      });
    }

    // Validate coordinates
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ error: "Invalid latitude or longitude" });
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({ error: "Coordinates out of valid range" });
    }

    const location = await prisma.shopLocation.create({
      data: {
        name: name.trim(),
        latitude: lat,
        longitude: lng,
        serviceRadiusKm: serviceRadiusKm ? parseFloat(serviceRadiusKm) : 10,
        processingTimeMinutes: processingTimeMinutes ? parseInt(processingTimeMinutes) : 10,
        isActive: true
      }
    });

    res.status(201).json({
      message: "Shop location created successfully",
      location
    });
  } catch (error) {
    console.error("Create shop location error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /admin/delivery/shop-locations/:id
 * Update shop location
 * 
 * Body: Any combination of { name, latitude, longitude, serviceRadiusKm, processingTimeMinutes, isActive }
 */
router.put("/shop-locations/:id", requireRole("admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, latitude, longitude, serviceRadiusKm, processingTimeMinutes, isActive } = req.body;

    const locationId = parseInt(id);
    if (isNaN(locationId)) {
      return res.status(400).json({ error: "Invalid location ID" });
    }

    // Check if location exists
    const existingLocation = await prisma.shopLocation.findUnique({
      where: { id: locationId }
    });

    if (!existingLocation) {
      return res.status(404).json({ error: "Shop location not found" });
    }

    // Validate coordinates if provided
    let updateData = {};

    if (name !== undefined) updateData.name = name.trim();
    
    if (latitude !== undefined || longitude !== undefined) {
      const lat = latitude !== undefined ? parseFloat(latitude) : existingLocation.latitude;
      const lng = longitude !== undefined ? parseFloat(longitude) : existingLocation.longitude;

      if (isNaN(lat) || isNaN(lng)) {
        return res.status(400).json({ error: "Invalid latitude or longitude" });
      }

      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return res.status(400).json({ error: "Coordinates out of valid range" });
      }

      updateData.latitude = lat;
      updateData.longitude = lng;
    }

    if (serviceRadiusKm !== undefined) {
      const radius = parseFloat(serviceRadiusKm);
      if (isNaN(radius) || radius <= 0) {
        return res.status(400).json({ error: "Service radius must be a positive number" });
      }
      updateData.serviceRadiusKm = radius;
    }

    if (processingTimeMinutes !== undefined) {
      const time = parseInt(processingTimeMinutes);
      if (isNaN(time) || time < 0) {
        return res.status(400).json({ error: "Processing time must be a non-negative number" });
      }
      updateData.processingTimeMinutes = time;
    }

    if (isActive !== undefined) {
      updateData.isActive = Boolean(isActive);
    }

    const updatedLocation = await prisma.shopLocation.update({
      where: { id: locationId },
      data: updateData
    });

    res.json({
      message: "Shop location updated successfully",
      location: updatedLocation
    });
  } catch (error) {
    console.error("Update shop location error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /admin/delivery/shop-locations/:id
 * Delete shop location (soft delete - just set isActive to false)
 */
router.delete("/shop-locations/:id", requireRole("admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const locationId = parseInt(id);

    if (isNaN(locationId)) {
      return res.status(400).json({ error: "Invalid location ID" });
    }

    const location = await prisma.shopLocation.findUnique({
      where: { id: locationId }
    });

    if (!location) {
      return res.status(404).json({ error: "Shop location not found" });
    }

    // Soft delete
    const deletedLocation = await prisma.shopLocation.update({
      where: { id: locationId },
      data: { isActive: false }
    });

    res.json({
      message: "Shop location deleted (deactivated) successfully",
      location: deletedLocation
    });
  } catch (error) {
    console.error("Delete shop location error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// DELIVERY CONFIG MANAGEMENT
// ============================================================================

/**
 * GET /admin/delivery/config
 * Fetch delivery configuration
 */
router.get("/config", requireRole("admin"), async (req, res) => {
  try {
    let config = await prisma.deliveryTimeConfig.findFirst();

    // Create default if doesn't exist
    if (!config) {
      config = await prisma.deliveryTimeConfig.create({
        data: {}
      });
    }

    res.json({
      config,
      description: {
        averageSpeedKmph: "Average delivery speed in km/h",
        baseProcessingMinutes: "Order preparation time in minutes",
        bufferMinutes: "Safety buffer in minutes",
        maxDeliverableKm: "Maximum service radius in km",
        noDriverExtraMinutes: "Extra wait when no driver available",
        deliveryWindowStart: "Delivery window start hour (e.g., 8 = 8 AM)",
        deliveryWindowEnd: "Delivery window end hour (e.g., 9 = 9 AM)",
        orderCutoffHour: "Cutoff hour for same-day delivery (e.g., 19 = 7 PM)",
        minDeliveryHour: "Minimum delivery hour (e.g., 8 = 8 AM)"
      }
    });
  } catch (error) {
    console.error("Fetch delivery config error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /admin/delivery/config
 * Update delivery configuration
 * 
 * Body: Any combination of config fields
 * {
 *   averageSpeedKmph?: number,
 *   baseProcessingMinutes?: number,
 *   bufferMinutes?: number,
 *   maxDeliverableKm?: number,
 *   noDriverExtraMinutes?: number,
 *   deliveryWindowStart?: number (0-23),
 *   deliveryWindowEnd?: number (0-23),
 *   orderCutoffHour?: number (0-23),
 *   minDeliveryHour?: number (0-23)
 * }
 */
router.put("/config", requireRole("admin"), async (req, res) => {
  try {
    const {
      averageSpeedKmph,
      baseProcessingMinutes,
      bufferMinutes,
      maxDeliverableKm,
      noDriverExtraMinutes,
      deliveryWindowStart,
      deliveryWindowEnd,
      orderCutoffHour,
      minDeliveryHour
    } = req.body;

    let config = await prisma.deliveryTimeConfig.findFirst();

    // Create if doesn't exist
    if (!config) {
      config = await prisma.deliveryTimeConfig.create({
        data: {}
      });
    }

    // Validate and prepare update data
    const updateData = {};

    if (averageSpeedKmph !== undefined) {
      const speed = parseFloat(averageSpeedKmph);
      if (isNaN(speed) || speed <= 0) {
        return res.status(400).json({ error: "averageSpeedKmph must be a positive number" });
      }
      updateData.averageSpeedKmph = speed;
    }

    if (baseProcessingMinutes !== undefined) {
      const time = parseInt(baseProcessingMinutes);
      if (isNaN(time) || time < 0) {
        return res.status(400).json({ error: "baseProcessingMinutes must be non-negative" });
      }
      updateData.baseProcessingMinutes = time;
    }

    if (bufferMinutes !== undefined) {
      const buffer = parseInt(bufferMinutes);
      if (isNaN(buffer) || buffer < 0) {
        return res.status(400).json({ error: "bufferMinutes must be non-negative" });
      }
      updateData.bufferMinutes = buffer;
    }

    if (maxDeliverableKm !== undefined) {
      const km = parseFloat(maxDeliverableKm);
      if (isNaN(km) || km <= 0) {
        return res.status(400).json({ error: "maxDeliverableKm must be a positive number" });
      }
      updateData.maxDeliverableKm = km;
    }

    if (noDriverExtraMinutes !== undefined) {
      const extra = parseInt(noDriverExtraMinutes);
      if (isNaN(extra) || extra < 0) {
        return res.status(400).json({ error: "noDriverExtraMinutes must be non-negative" });
      }
      updateData.noDriverExtraMinutes = extra;
    }

    // Validate hour fields (0-23)
    if (deliveryWindowStart !== undefined) {
      const hour = parseInt(deliveryWindowStart);
      if (isNaN(hour) || hour < 0 || hour > 23) {
        return res.status(400).json({ error: "deliveryWindowStart must be between 0-23" });
      }
      updateData.deliveryWindowStart = hour;
    }

    if (deliveryWindowEnd !== undefined) {
      const hour = parseInt(deliveryWindowEnd);
      if (isNaN(hour) || hour < 0 || hour > 23) {
        return res.status(400).json({ error: "deliveryWindowEnd must be between 0-23" });
      }
      updateData.deliveryWindowEnd = hour;
    }

    if (orderCutoffHour !== undefined) {
      const hour = parseInt(orderCutoffHour);
      if (isNaN(hour) || hour < 0 || hour > 23) {
        return res.status(400).json({ error: "orderCutoffHour must be between 0-23" });
      }
      updateData.orderCutoffHour = hour;
    }

    if (minDeliveryHour !== undefined) {
      const hour = parseInt(minDeliveryHour);
      if (isNaN(hour) || hour < 0 || hour > 23) {
        return res.status(400).json({ error: "minDeliveryHour must be between 0-23" });
      }
      updateData.minDeliveryHour = hour;
    }

    const updatedConfig = await prisma.deliveryTimeConfig.update({
      where: { id: config.id },
      data: updateData
    });

    res.json({
      message: "Delivery configuration updated successfully",
      config: updatedConfig
    });
  } catch (error) {
    console.error("Update delivery config error:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
