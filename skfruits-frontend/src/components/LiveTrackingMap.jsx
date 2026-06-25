import { useEffect, useRef, useMemo } from "react";
import { useGoogleMaps } from "../hooks/useGoogleMaps";

// ─────────────────────────────────────────────────────────────────────────────
// Marker HTML helpers
// ─────────────────────────────────────────────────────────────────────────────
function circleMarkerHtml(bg, emoji, size = 36) {
  return `<div style="
    width:${size}px;height:${size}px;
    background:${bg};border:3px solid white;border-radius:50%;
    display:flex;align-items:center;justify-content:center;
    font-size:${Math.round(size * 0.5)}px;
    box-shadow:0 3px 12px rgba(0,0,0,0.3);cursor:default;
  ">${emoji}</div>`;
}

function driverMarkerHtml() {
  return `<div style="position:relative;width:48px;height:48px;">
    <div style="
      position:absolute;inset:0;background:rgba(59,130,246,0.25);
      border-radius:50%;animation:livePulse 2s ease-in-out infinite;
    "></div>
    <div style="
      position:absolute;top:6px;left:6px;width:36px;height:36px;
      background:#3B82F6;border:3px solid white;border-radius:50%;
      display:flex;align-items:center;justify-content:center;
      font-size:18px;box-shadow:0 3px 12px rgba(0,0,0,0.4);
    ">🛵</div>
  </div>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Custom OverlayView marker
// ─────────────────────────────────────────────────────────────────────────────
function createCustomMarker(map, position, html, anchor = { x: 18, y: 18 }) {
  if (!window.google?.maps) return null;

  class CM extends window.google.maps.OverlayView {
    constructor(pos, h, a) { super(); this._pos = pos; this._html = h; this._anchor = a; this._div = null; }
    onAdd() {
      const d = document.createElement("div");
      d.style.position = "absolute";
      d.innerHTML = this._html;
      this._div = d;
      this.getPanes().overlayMouseTarget.appendChild(d);
    }
    draw() {
      if (!this._div) return;
      const p = this.getProjection().fromLatLngToDivPixel(this._pos);
      if (p) { this._div.style.left = `${p.x - this._anchor.x}px`; this._div.style.top = `${p.y - this._anchor.y}px`; }
    }
    setPosition(pos) { this._pos = pos; this.draw(); }
    onRemove() { if (this._div?.parentNode) { this._div.parentNode.removeChild(this._div); this._div = null; } }
  }

  const m = new CM(new window.google.maps.LatLng(position.lat, position.lng), html, anchor);
  m.setMap(map);
  return m;
}

// ─────────────────────────────────────────────────────────────────────────────
// Autonomous Animation Math Helpers
// ─────────────────────────────────────────────────────────────────────────────
function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function findClosestSegment(lat, lng, pathArray) {
  let minDistance = Infinity;
  let bestIndex = 0;
  for (let i = 0; i < pathArray.length - 1; i++) {
    const pt = pathArray[i];
    const d = haversineMeters(lat, lng, pt.lat(), pt.lng());
    if (d < minDistance) {
      minDistance = d;
      bestIndex = i;
    }
  }
  return bestIndex;
}

// ─────────────────────────────────────────────────────────────────────────────
// Map style
// ─────────────────────────────────────────────────────────────────────────────
const MAP_STYLES = [
  { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "transit", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
];

/**
 * LiveTrackingMap
 *
 * Shows a live driving route from the driver's current position → customer.
 * Route re-requests automatically whenever the driver's lat/lng changes.
 */
export default function LiveTrackingMap({
  trackingData,
  destination,
  shopLocation,
  className = "",
  onEtaChange,
}) {
  const { isLoaded } = useGoogleMaps();

  const mapRef       = useRef(null);
  const mapInstance  = useRef(null);
  const shopMarker   = useRef(null);
  const custMarker   = useRef(null);
  const driverMarker = useRef(null);
  const routeLine    = useRef(null);   // active Directions route renderer
  const routeDataRef = useRef(null);   // autonomous tracking path data
  const lastRouteKey = useRef(null);   // "lat,lng→lat,lng" — avoids duplicate requests
  const pulseDone    = useRef(false);

  const tracking  = trackingData?.tracking;
  const driverPos = tracking?.predictedLocation || tracking?.lastKnownLocation;

  // ── Pulse CSS ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (pulseDone.current) return;
    pulseDone.current = true;
    const s = document.createElement("style");
    s.textContent = `@keyframes livePulse{0%,100%{transform:scale(1);opacity:.35}50%{transform:scale(2);opacity:0}}`;
    document.head.appendChild(s);
  }, []);

  // ── Initial map center ──────────────────────────────────────────────────────
  const center = useMemo(() => {
    if (driverPos?.lat && driverPos?.lng) return { lat: driverPos.lat, lng: driverPos.lng };
    if (shopLocation?.lat && shopLocation?.lng) return shopLocation;
    if (destination?.lat && destination?.lng) return destination;
    return null;
  }, []); // only on mount — map handles its own center after init

  // ── Init map (once) ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isLoaded || !mapRef.current || mapInstance.current || !center) return;
    mapInstance.current = new window.google.maps.Map(mapRef.current, {
      center,
      zoom: 14,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      zoomControl: false,
      keyboardShortcuts: false,
      disableDefaultUI: true,
      gestureHandling: "cooperative",
      styles: MAP_STYLES,
    });
  }, [isLoaded, center]);

  // ── Route: re-request whenever driver position changes ─────────────────────
  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !isLoaded || !window.google?.maps) return;

    // Origin = driver pos if available, else shop
    const origin = (driverPos?.lat && driverPos?.lng)
      ? { lat: driverPos.lat, lng: driverPos.lng }
      : (shopLocation?.lat && shopLocation?.lng ? shopLocation : null);
    const dest = (destination?.lat && destination?.lng) ? destination : null;

    if (!origin || !dest) return;

    // Skip if same origin/dest as last request (avoid hammering the API)
    const key = `${origin.lat.toFixed(5)},${origin.lng.toFixed(5)}→${dest.lat.toFixed(5)},${dest.lng.toFixed(5)}`;
    if (key === lastRouteKey.current) return;
    lastRouteKey.current = key;

    const svc = new window.google.maps.DirectionsService();

    // Remove old route renderer
    if (routeLine.current) {
      routeLine.current.setMap(null);
      routeLine.current = null;
    }

    svc.route(
      {
        origin: new window.google.maps.LatLng(origin.lat, origin.lng),
        destination: new window.google.maps.LatLng(dest.lat, dest.lng),
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status !== window.google.maps.DirectionsStatus.OK) return;

        if (onEtaChange && result.routes?.[0]?.legs?.[0]?.duration?.value) {
          const seconds = result.routes[0].legs[0].duration.value;
          onEtaChange(Math.ceil(seconds / 60));
        }

        const route = result.routes?.[0];
        if (route && route.overview_path && route.legs?.[0]) {
          routeDataRef.current = {
            path: route.overview_path,
            duration: route.legs[0].duration.value,
            distance: route.legs[0].distance.value,
          };
        }

        // Use DirectionsRenderer so Google draws it natively (proper road alignment)
        const renderer = new window.google.maps.DirectionsRenderer({
          map: mapInstance.current,
          directions: result,
          suppressMarkers: true, // we draw our own markers
          polylineOptions: {
            strokeColor: "#6B3E26",
            strokeOpacity: 0.85,
            strokeWeight: 5,
          },
        });
        routeLine.current = renderer;

        // Fit bounds to show the full route
        const bounds = result.routes?.[0]?.bounds;
        if (bounds) mapInstance.current?.fitBounds(bounds, 60);
      }
    );
  // Re-run whenever driver lat/lng changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isLoaded,
    driverPos?.lat, driverPos?.lng,
    shopLocation?.lat, shopLocation?.lng,
    destination?.lat, destination?.lng,
  ]);

  // ── Shop marker ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !shopLocation?.lat || !shopLocation?.lng) return;
    const pos = new window.google.maps.LatLng(shopLocation.lat, shopLocation.lng);
    if (shopMarker.current) shopMarker.current.setPosition(pos);
    else shopMarker.current = createCustomMarker(map, shopLocation, circleMarkerHtml("#16a34a", "🏪", 38), { x: 19, y: 19 });
  }, [shopLocation, isLoaded]);

  // ── Customer marker ─────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !destination?.lat || !destination?.lng) return;
    const pos = new window.google.maps.LatLng(destination.lat, destination.lng);
    if (custMarker.current) custMarker.current.setPosition(pos);
    else custMarker.current = createCustomMarker(map, destination, circleMarkerHtml("#dc2626", "📍", 38), { x: 19, y: 19 });
  }, [destination, isLoaded]);

  // ── Driver marker with Autonomous Continuous Animation ─────────────────────
  const animationFrameId = useRef(null);
  const currentVisualPos = useRef(null);
  const currentPathIdx = useRef(0);
  const lastTimeRef = useRef(null);
  const lastRealGpsRef = useRef(null);
  const hasFastForwardedRef = useRef(false);

  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !isLoaded) return;

    const isDelivered = trackingData?.status === "delivered" || trackingData?.orderStatus === "delivered";

    if (isDelivered) {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
      if (driverMarker.current) {
        driverMarker.current.setMap(null);
        driverMarker.current = null;
      }
      return;
    }

    if (driverPos?.lat && driverPos?.lng) {
      const targetPos = { lat: driverPos.lat, lng: driverPos.lng };

      // Did we just get a completely new GPS coordinate from the backend?
      const isNewGps =
        !lastRealGpsRef.current ||
        targetPos.lat !== lastRealGpsRef.current.lat ||
        targetPos.lng !== lastRealGpsRef.current.lng;

      if (isNewGps) {
        lastRealGpsRef.current = { ...targetPos };
        currentVisualPos.current = { ...targetPos };
        hasFastForwardedRef.current = false; // Reset fast forward on new ping

        // Snap progress to the nearest segment on the route
        if (routeDataRef.current?.path) {
          currentPathIdx.current = findClosestSegment(targetPos.lat, targetPos.lng, routeDataRef.current.path);
        }
      }

      if (!driverMarker.current) {
        driverMarker.current = createCustomMarker(map, targetPos, driverMarkerHtml(), { x: 24, y: 24 });
      }

      // Start autonomous traversal
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
      lastTimeRef.current = performance.now();

      const animate = (time) => {
        const dtSeconds = (time - lastTimeRef.current) / 1000;
        lastTimeRef.current = time;

        const rd = routeDataRef.current;
        if (rd && rd.path && rd.path.length > 0 && driverMarker.current) {
          // Average speed in meters/second
          let speed = rd.distance / rd.duration;
          if (speed > 25) speed = 25; // Cap at ~90 km/h
          if (speed < 2) speed = 5;   // Min ~18 km/h if duration is wildly wrong

          let distToMove = speed * dtSeconds;
          
          // Fast-forward simulated progress if the last real GPS ping is old
          if (!hasFastForwardedRef.current) {
            const freshness = tracking?.freshnessSeconds || tracking?.locationFreshnessSeconds || 0;
            if (freshness > 0) {
              distToMove += speed * freshness;
            }
            hasFastForwardedRef.current = true;
          }

          let curLat = currentVisualPos.current.lat;
          let curLng = currentVisualPos.current.lng;

          // Follow segments
          while (distToMove > 0 && currentPathIdx.current < rd.path.length - 1) {
            const nextPt = rd.path[currentPathIdx.current + 1];
            const segDist = haversineMeters(curLat, curLng, nextPt.lat(), nextPt.lng());

            if (distToMove >= segDist) {
              distToMove -= segDist;
              currentPathIdx.current++;
              curLat = nextPt.lat();
              curLng = nextPt.lng();
            } else {
              const ratio = distToMove / segDist;
              curLat = curLat + (nextPt.lat() - curLat) * ratio;
              curLng = curLng + (nextPt.lng() - curLng) * ratio;
              distToMove = 0;
            }
          }

          // Anti-overshoot: If we reach 95% of the route, pause autonomous driving 
          // until actual GPS confirms driver arrived
          if (currentPathIdx.current >= rd.path.length * 0.95) {
            // Stop moving
          } else {
            currentVisualPos.current = { lat: curLat, lng: curLng };
            const pos = new window.google.maps.LatLng(curLat, curLng);
            driverMarker.current.setPosition(pos);
          }
        }

        animationFrameId.current = requestAnimationFrame(animate);
      };

      animationFrameId.current = requestAnimationFrame(animate);
    } else if (driverMarker.current) {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
      driverMarker.current.setMap(null);
      driverMarker.current = null;
    }
  }, [driverPos?.lat, driverPos?.lng, isLoaded]);

  // ── Cleanup on unmount ──────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      [shopMarker, custMarker, driverMarker].forEach((r) => { if (r.current) { r.current.setMap(null); r.current = null; } });
      if (routeLine.current) { routeLine.current.setMap(null); routeLine.current = null; }
    };
  }, []);

  // ── No data yet ─────────────────────────────────────────────────────────────
  if (!center) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ background: "var(--secondary)", borderRadius: "var(--radius-lg)" }}>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>Loading map…</p>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} style={{ borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
      <div ref={mapRef} style={{ width: "100%", height: "100%" }} />

      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ background: "var(--secondary)" }}>
          <div className="h-8 w-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--primary)" }} />
        </div>
      )}
    </div>
  );
}
