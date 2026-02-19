import { useRef, useEffect, useState } from "react";
import { useGoogleMaps } from "../hooks/useGoogleMaps";

/** Haversine distance in km between two lat/lng points */
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Shows a small map with delivery pin and optional distance from driver's current location.
 * address: display string; addressLatitude, addressLongitude: for map pin and "Open in Maps" link.
 */
export default function DeliveryMapCard({
  address,
  addressLatitude,
  addressLongitude,
  className = "",
}) {
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const { isLoaded, error } = useGoogleMaps();
  const [distanceKm, setDistanceKm] = useState(null);
  const [locationError, setLocationError] = useState(null);

  const hasCoords =
    typeof addressLatitude === "number" &&
    Number.isFinite(addressLatitude) &&
    typeof addressLongitude === "number" &&
    Number.isFinite(addressLongitude);

  // Get driver's current position for distance
  useEffect(() => {
    if (!hasCoords) return;
    let cancelled = false;
    if (!navigator.geolocation) {
      setLocationError("Location not supported");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (cancelled) return;
        const km = haversineKm(
          pos.coords.latitude,
          pos.coords.longitude,
          addressLatitude,
          addressLongitude
        );
        setDistanceKm(km);
        setLocationError(null);
      },
      () => {
        if (!cancelled) setLocationError("Location denied");
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    );
    return () => { cancelled = true; };
  }, [hasCoords, addressLatitude, addressLongitude]);

  // Init map when we have coords and script is loaded
  useEffect(() => {
    if (!isLoaded || !hasCoords || !mapRef.current || !window.google?.maps) return;
    const map = new window.google.maps.Map(mapRef.current, {
      center: { lat: addressLatitude, lng: addressLongitude },
      zoom: 14,
      zoomControl: true,
      fullscreenControl: true,
    });
    markerRef.current = new window.google.maps.Marker({
      position: { lat: addressLatitude, lng: addressLongitude },
      map,
    });
    return () => {
      if (markerRef.current) markerRef.current.setMap(null);
    };
  }, [isLoaded, hasCoords, addressLatitude, addressLongitude]);

  const mapsUrl = hasCoords
    ? `https://www.google.com/maps?q=${addressLatitude},${addressLongitude}`
    : address
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
      : null;

  if (error || !isLoaded) {
    return (
      <div className={className}>
        {address && <p className="text-sm mb-1" style={{ color: "var(--foreground)" }}>{address}</p>}
        {mapsUrl && (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium underline"
            style={{ color: "var(--primary)" }}
          >
            Open in Google Maps
          </a>
        )}
      </div>
    );
  }

  if (!hasCoords) {
    return (
      <div className={className}>
        {address && <p className="text-sm mb-1" style={{ color: "var(--foreground)" }}>{address}</p>}
        {mapsUrl && (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium underline"
            style={{ color: "var(--primary)" }}
          >
            Open in Google Maps
          </a>
        )}
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
          Delivery location
        </span>
        {distanceKm != null && (
          <span className="text-sm" style={{ color: "var(--primary)" }}>
            ~{distanceKm.toFixed(1)} km away
          </span>
        )}
        {locationError && (
          <span className="text-xs" style={{ color: "var(--muted)" }}>
            Allow location for distance
          </span>
        )}
      </div>
      <div
        ref={mapRef}
        className="w-full h-40 rounded-lg overflow-hidden border bg-[var(--muted)]"
        style={{ borderColor: "var(--border)" }}
        aria-hidden
      />
      {address && (
        <p className="text-xs mt-1.5" style={{ color: "var(--text-muted)" }}>{address}</p>
      )}
      {mapsUrl && (
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mt-1.5 text-sm font-medium underline"
          style={{ color: "var(--primary)" }}
        >
          Open in Google Maps
        </a>
      )}
    </div>
  );
}
