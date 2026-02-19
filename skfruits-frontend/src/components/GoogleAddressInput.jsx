import { useRef, useEffect, useState } from "react";
import { useGoogleMaps } from "../hooks/useGoogleMaps";

/**
 * Extracts address parts from Google Place address_components (India-friendly).
 */
function parseAddressComponents(components) {
  let addressLine = "";
  let city = "";
  let state = "";
  let pincode = "";
  for (const c of components || []) {
    const type = c.types?.[0];
    const value = c.long_name || "";
    if (type === "street_number" || type === "route") addressLine = [addressLine, value].filter(Boolean).join(", ");
    if (type === "sublocality_level_1" || type === "sublocality") addressLine = [addressLine, value].filter(Boolean).join(", ");
    if (type === "locality") city = value;
    if (type === "administrative_area_level_1") state = value;
    if (type === "postal_code") pincode = value;
  }
  if (!city && components?.length) {
    const locality = components.find((c) => c.types?.includes("locality"));
    const admin2 = components.find((c) => c.types?.includes("administrative_area_level_2"));
    city = locality?.long_name || admin2?.long_name || "";
  }
  return { addressLine: addressLine.trim() || "", city, state, pincode };
}

/**
 * Google Places Autocomplete address input. On place select, calls onChange with
 * { addressLine, city, state, pincode, latitude, longitude }.
 * Requires VITE_GOOGLE_MAPS_API_KEY. If key is missing, renders a simple message.
 */
export default function GoogleAddressInput({
  value = "",
  onChange,
  onMapReady,
  placeholder = "Search address or drop a pin",
  className = "",
  style = {},
  disabled = false,
  showMap = true,
}) {
  const inputRef = useRef(null);
  const mapRef = useRef(null);
  const autocompleteRef = useRef(null);
  const markerRef = useRef(null);
  const { isLoaded, error } = useGoogleMaps();
  const [selectedCoords, setSelectedCoords] = useState(null);

  // When user selects a place, update coords so map is shown and initialized
  useEffect(() => {
    if (!isLoaded || !inputRef.current || !window.google?.maps?.places) return;
    const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
      componentRestrictions: { country: "in" },
      fields: ["place_id", "geometry", "address_components", "formatted_address"],
      types: ["address"],
    });
    autocompleteRef.current = autocomplete;

    const handlePlaceChange = () => {
      const place = autocomplete.getPlace();
      if (!place?.place_id) return;
      const lat = place.geometry?.location?.lat?.();
      const lng = place.geometry?.location?.lng?.();
      const { addressLine, city, state, pincode } = parseAddressComponents(place.address_components);
      const finalAddressLine = addressLine || (place.formatted_address || "").split(",")[0]?.trim() || "";
      onChange?.({
        addressLine: finalAddressLine,
        city,
        state,
        pincode,
        latitude: typeof lat === "number" ? lat : null,
        longitude: typeof lng === "number" ? lng : null,
      });
      if (showMap && typeof lat === "number" && typeof lng === "number") {
        setSelectedCoords({ lat, lng });
        onMapReady?.();
      }
    };

    autocomplete.addListener("place_changed", handlePlaceChange);
    return () => {
      if (autocompleteRef.current) window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
    };
  }, [isLoaded, showMap, onChange, onMapReady]);

  // Initialize map when container is visible and we have coords
  useEffect(() => {
    if (!isLoaded || !selectedCoords || !mapRef.current || !window.google?.maps) return;
    const { lat, lng } = selectedCoords;
    const map = new window.google.maps.Map(mapRef.current, {
      center: { lat, lng },
      zoom: 16,
      zoomControl: true,
    });
    if (markerRef.current) markerRef.current.setMap(null);
    markerRef.current = new window.google.maps.Marker({ position: { lat, lng }, map });
    return () => {
      if (markerRef.current) markerRef.current.setMap(null);
    };
  }, [isLoaded, selectedCoords]);

  if (error) {
    return (
      <div className="space-y-1">
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          Address search unavailable. Enter address manually below.
        </p>
        {error === "Google Maps API key not configured" && (
          <p className="text-xs" style={{ color: "var(--muted)" }}>
            Add <code className="px-1 rounded bg-[var(--muted)]">VITE_GOOGLE_MAPS_API_KEY</code> to your <code className="px-1 rounded bg-[var(--muted)]">.env</code> to enable map search.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => {}}
        placeholder={placeholder}
        disabled={disabled || !isLoaded}
        className={className}
        style={style}
        autoComplete="off"
      />
      {showMap && isLoaded && selectedCoords && (
        <div
          ref={mapRef}
          className="w-full h-48 rounded-lg overflow-hidden border bg-[var(--muted)]"
          style={{ borderColor: "var(--border)", minHeight: "192px" }}
          aria-hidden
        />
      )}
    </div>
  );
}
