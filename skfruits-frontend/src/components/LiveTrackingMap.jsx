import { useEffect, useRef, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { decodePolyline } from "../utils/polylineDecoder";

// Fix Leaflet's default icon path issue with bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Custom icon creators
function createIcon(color, emoji) {
  return L.divIcon({
    className: "custom-map-marker",
    html: `<div style="
      width: 32px; height: 32px;
      background: ${color};
      border: 2px solid white;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 16px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    ">${emoji}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -20],
  });
}

// Pulsing driver icon
function createDriverIcon() {
  return L.divIcon({
    className: "driver-marker",
    html: `<div style="position: relative; width: 36px; height: 36px;">
      <div style="
        position: absolute; inset: 0;
        background: rgba(59, 130, 246, 0.3);
        border-radius: 50%;
        animation: driverPulse 2s ease-in-out infinite;
      "></div>
      <div style="
        position: absolute; top: 6px; left: 6px;
        width: 24px; height: 24px;
        background: #3B82F6;
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex; align-items: center; justify-content: center;
        font-size: 14px;
      ">🛵</div>
    </div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -22],
  });
}

const shopIcon = createIcon("#16a34a", "🏪");
const customerIcon = createIcon("#dc2626", "📍");
const driverIcon = createDriverIcon();

// Component to auto-fit map bounds
function FitBounds({ points }) {
  const map = useMap();
  const prevBoundsRef = useRef(null);

  useEffect(() => {
    if (!points || points.length === 0) return;
    const bounds = L.latLngBounds(points.map(([lat, lng]) => [lat, lng]));
    const boundsStr = bounds.toBBoxString();

    // Only fit once (or on significant change)
    if (prevBoundsRef.current !== boundsStr) {
      prevBoundsRef.current = boundsStr;
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
    }
  }, [map, points]);

  return null;
}

/**
 * Live tracking map component using Leaflet + OpenStreetMap tiles.
 *
 * @param {Object} props
 * @param {Object} props.trackingData - Data from useOrderTracking hook
 * @param {Object} props.destination - { lat, lng } customer delivery address
 * @param {Object} props.shopLocation - { lat, lng } shop/origin location
 * @param {string} props.className - Additional CSS classes
 */
export default function LiveTrackingMap({
  trackingData,
  destination,
  shopLocation,
  className = "",
}) {
  const tracking = trackingData?.tracking;
  const driverPos = tracking?.predictedLocation || tracking?.lastKnownLocation;

  // Decode polyline for route display
  const routePoints = useMemo(() => {
    if (!tracking?.polyline) return [];
    return decodePolyline(tracking.polyline);
  }, [tracking?.polyline]);

  // Collect all points for auto-fit
  const allPoints = useMemo(() => {
    const pts = [];
    if (driverPos?.lat && driverPos?.lng) pts.push([driverPos.lat, driverPos.lng]);
    if (destination?.lat && destination?.lng) pts.push([destination.lat, destination.lng]);
    if (shopLocation?.lat && shopLocation?.lng) pts.push([shopLocation.lat, shopLocation.lng]);
    return pts.length > 0 ? pts : [[25.3478, 74.6370]]; // Fallback: Bhilwara
  }, [driverPos, destination, shopLocation]);

  const center = allPoints[0] || [25.3478, 74.6370];

  return (
    <div className={`relative ${className}`}>
      {/* Driver pulse animation */}
      <style>{`
        @keyframes driverPulse {
          0%, 100% { transform: scale(1); opacity: 0.4; }
          50% { transform: scale(1.8); opacity: 0; }
        }
      `}</style>

      <MapContainer
        center={center}
        zoom={14}
        style={{ width: "100%", height: "100%", borderRadius: "var(--radius-lg)" }}
        zoomControl={true}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
        />

        <FitBounds points={allPoints} />

        {/* Route polyline */}
        {routePoints.length > 1 && (
          <Polyline
            positions={routePoints}
            pathOptions={{
              color: "#6B3E26",
              weight: 4,
              opacity: 0.7,
              dashArray: null,
            }}
          />
        )}

        {/* Shop marker */}
        {shopLocation?.lat && shopLocation?.lng && (
          <Marker position={[shopLocation.lat, shopLocation.lng]} icon={shopIcon}>
            <Popup>
              <strong>SK Fruits</strong><br />
              Order pickup location
            </Popup>
          </Marker>
        )}

        {/* Customer destination */}
        {destination?.lat && destination?.lng && (
          <Marker position={[destination.lat, destination.lng]} icon={customerIcon}>
            <Popup>
              <strong>Delivery address</strong>
            </Popup>
          </Marker>
        )}

        {/* Driver position */}
        {driverPos?.lat && driverPos?.lng && (
          <Marker position={[driverPos.lat, driverPos.lng]} icon={driverIcon}>
            <Popup>
              <strong>🛵 {tracking?.driverName || "Driver"}</strong>
              {tracking?.etaMinutes > 0 && <><br />ETA: ~{tracking.etaMinutes} mins</>}
            </Popup>
          </Marker>
        )}
      </MapContainer>

      {/* OSM Attribution (compact) */}
      <div
        className="absolute bottom-1 right-1 text-[10px] px-1.5 py-0.5 rounded"
        style={{ background: "rgba(255,255,255,0.8)", color: "#666" }}
      >
        © OpenStreetMap
      </div>
    </div>
  );
}
