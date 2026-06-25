import { useState, useEffect, useRef } from "react";
import { useGoogleMaps } from "../hooks/useGoogleMaps";

function parseAddressComponents(components) {
  let addressLine = "";
  let city = "";
  let state = "";
  let pincode = "";
  for (const c of components || []) {
    const type = c.types?.[0];
    const value = c.long_name || "";
    if (type === "street_number" || type === "route" || type === "sublocality_level_1" || type === "sublocality") {
      addressLine = [addressLine, value].filter(Boolean).join(", ");
    }
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

export default function LocationPicker({
  onChange,
  initialLat = null,
  initialLng = null,
  placeholder = "Search address or tap map to drop pin",
  showMap = true,
  className = "",
  style = {},
}) {
  const { isLoaded, error } = useGoogleMaps();
  const inputRef = useRef(null);
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const autocompleteRef = useRef(null);

  const [query, setQuery] = useState("");
  const [locating, setLocating] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [selectedCoords, setSelectedCoords] = useState(() => {
    if (initialLat != null && initialLng != null) {
      return { lat: Number(initialLat), lng: Number(initialLng) };
    }
    return null;
  });

  // Reverse geocode via Google Geocoder
  const performReverseGeocoding = (lat, lng) => {
    if (!window.google?.maps) return;
    setGeocoding(true);
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      setGeocoding(false);
      if (status === "OK" && results?.[0]) {
        const place = results[0];
        const { addressLine, city, state, pincode } = parseAddressComponents(place.address_components);
        const finalAddressLine = addressLine || place.formatted_address?.split(",")[0]?.trim() || "";
        
        setQuery(place.formatted_address || "");
        onChange?.({
          addressLine: finalAddressLine,
          city,
          state,
          pincode,
          latitude: lat,
          longitude: lng,
        });
      }
    });
  };

  // Autocomplete setup
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
      if (!place?.geometry?.location) return;

      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();
      const { addressLine, city, state, pincode } = parseAddressComponents(place.address_components);
      const finalAddressLine = addressLine || (place.formatted_address || "").split(",")[0]?.trim() || "";

      setQuery(place.formatted_address || "");
      setSelectedCoords({ lat, lng });

      onChange?.({
        addressLine: finalAddressLine,
        city,
        state,
        pincode,
        latitude: lat,
        longitude: lng,
      });

      if (mapInstanceRef.current) {
        mapInstanceRef.current.setCenter({ lat, lng });
        mapInstanceRef.current.setZoom(16);
        updateMarker(lat, lng);
      }
    };

    autocomplete.addListener("place_changed", handlePlaceChange);
    return () => {
      if (autocompleteRef.current) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [isLoaded, onChange]);

  // Update map marker
  const updateMarker = (lat, lng) => {
    if (!mapInstanceRef.current) return;

    if (markerRef.current) {
      markerRef.current.setPosition({ lat, lng });
    } else {
      markerRef.current = new window.google.maps.Marker({
        position: { lat, lng },
        map: mapInstanceRef.current,
        draggable: true,
      });

      markerRef.current.addListener("dragend", () => {
        const position = markerRef.current.getPosition();
        const newLat = position.lat();
        const newLng = position.lng();
        setSelectedCoords({ lat: newLat, lng: newLng });
        performReverseGeocoding(newLat, newLng);
      });
    }
  };

  // Initialize Map
  useEffect(() => {
    if (!isLoaded || !showMap || !mapContainerRef.current || !window.google?.maps) return;

    const defaultCenter = selectedCoords || { lat: 13.0207, lng: 77.7097 }; // Default center (Bengaluru)
    
    const map = new window.google.maps.Map(mapContainerRef.current, {
      center: defaultCenter,
      zoom: selectedCoords ? 16 : 12,
      zoomControl: true,
      fullscreenControl: false,
      streetViewControl: false,
    });
    mapInstanceRef.current = map;

    if (selectedCoords) {
      updateMarker(selectedCoords.lat, selectedCoords.lng);
    }

    // Add map click listener
    map.addListener("click", (e) => {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      setSelectedCoords({ lat, lng });
      updateMarker(lat, lng);
      performReverseGeocoding(lat, lng);
    });

    return () => {
      if (markerRef.current) {
        markerRef.current.setMap(null);
        markerRef.current = null;
      }
      mapInstanceRef.current = null;
    };
  }, [isLoaded, showMap]);

  // Sync coords from parent props if they change
  useEffect(() => {
    if (initialLat != null && initialLng != null) {
      const lat = Number(initialLat);
      const lng = Number(initialLng);
      if (selectedCoords?.lat !== lat || selectedCoords?.lng !== lng) {
        setSelectedCoords({ lat, lng });
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setCenter({ lat, lng });
          updateMarker(lat, lng);
        }
      }
    }
  }, [initialLat, initialLng]);

  // "Use my location" Geolocation helper
  const handleUseMyLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setSelectedCoords({ lat, lng });
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setCenter({ lat, lng });
          mapInstanceRef.current.setZoom(16);
          updateMarker(lat, lng);
        }
        performReverseGeocoding(lat, lng);
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  if (error) {
    return (
      <div className="space-y-1">
        <p className="text-sm text-muted">
          Address search unavailable. Enter address manually below.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative flex gap-2">
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className={className}
            style={style}
            disabled={!isLoaded}
            autoComplete="off"
          />
          {geocoding && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--primary)", borderTopColor: "transparent" }} />
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={handleUseMyLocation}
          disabled={locating || !isLoaded}
          title="Use my current location"
          className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-lg border transition-all hover:shadow-md disabled:opacity-50"
          style={{
            background: "var(--background)",
            borderColor: "var(--border)",
            color: "var(--primary)",
          }}
        >
          {locating ? (
            <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--primary)", borderTopColor: "transparent" }} />
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 2a1 1 0 011 1v2.07A8.003 8.003 0 0118.93 11H21a1 1 0 110 2h-2.07A8.003 8.003 0 0113 18.93V21a1 1 0 11-2 0v-2.07A8.003 8.003 0 015.07 13H3a1 1 0 110-2h2.07A8.003 8.003 0 0111 5.07V3a1 1 0 011-1zm0 5a5 5 0 100 10 5 5 0 000-10zm0 2a3 3 0 110 6 3 3 0 010-6z" />
            </svg>
          )}
        </button>
      </div>

      {showMap && (
        <div className="rounded-lg overflow-hidden border" style={{ borderColor: "var(--border)", height: "220px" }}>
          {isLoaded ? (
            <div ref={mapContainerRef} style={{ width: "100%", height: "100%" }} />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-sm text-muted" style={{ background: "var(--muted)" }}>
              Loading map...
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-muted">
        Tap the map to drop a pin, drag the marker to adjust, or use the{" "}
        <button type="button" onClick={handleUseMyLocation} className="underline" style={{ color: "var(--primary)" }}>
          locate me
        </button>{" "}
        button for GPS accuracy
      </p>
    </div>
  );
}
