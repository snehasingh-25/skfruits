import { useState, useEffect, useRef } from "react";
import { useToast } from "../../context/ToastContext";
import { useGoogleMaps } from "../../hooks/useGoogleMaps";

export default function ShopLocationForm({ location, onSave, onCancel }) {
  const toast = useToast();
  const { isLoaded, error: mapsError } = useGoogleMaps();
  const mapRef = useRef(null);
  const autocompleteRef = useRef(null);
  const markerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [formData, setFormData] = useState({
    name: "",
    latitude: "",
    longitude: "",
    serviceRadiusKm: 10,
    processingTimeMinutes: 10,
  });
  const [saving, setSaving] = useState(false);
  const [selectedCoords, setSelectedCoords] = useState(null);

  useEffect(() => {
    if (location) {
      setFormData({
        name: location.name,
        latitude: location.latitude,
        longitude: location.longitude,
        serviceRadiusKm: location.serviceRadiusKm || 10,
        processingTimeMinutes: location.processingTimeMinutes || 10,
      });
      setSelectedCoords({ lat: location.latitude, lng: location.longitude });
    } else {
      setFormData({
        name: "",
        latitude: "",
        longitude: "",
        serviceRadiusKm: 10,
        processingTimeMinutes: 10,
      });
      setSelectedCoords(null);

      // Auto-fetch correct location on mount for new locations
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            setFormData((prev) => ({
              ...prev,
              latitude: lat,
              longitude: lng,
            }));
            setSelectedCoords({ lat, lng });
          },
          () => {
            // Default to Bengaluru coordinates if geolocation fails
            const lat = 13.0207;
            const lng = 77.7097;
            setFormData((prev) => ({
              ...prev,
              latitude: lat,
              longitude: lng,
            }));
            setSelectedCoords({ lat, lng });
          }
        );
      } else {
        // Default to Bengaluru coordinates if geolocation not supported
        const lat = 13.0207;
        const lng = 77.7097;
        setFormData((prev) => ({
          ...prev,
          latitude: lat,
          longitude: lng,
        }));
        setSelectedCoords({ lat, lng });
      }
    }
  }, [location]);

  // Handle current location
  const handleCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        setFormData((prev) => ({
          ...prev,
          latitude: lat,
          longitude: lng,
        }));
        setSelectedCoords({ lat, lng });

        if (mapInstanceRef.current) {
          mapInstanceRef.current.setCenter({ lat, lng });
          mapInstanceRef.current.setZoom(16);
          updateMarker(lat, lng);
        }

        toast.success("Current location set");
      },
      (error) => {
        toast.error("Unable to get your location: " + error.message);
      }
    );
  };

  // Initialize Map
  useEffect(() => {
    if (!isLoaded || !mapRef.current || !window.google?.maps) return;

    const defaultCenter = selectedCoords || { lat: 13.0207, lng: 77.7097 }; // Default to SK Fruits location (Bengaluru)

    const map = new window.google.maps.Map(mapRef.current, {
      center: defaultCenter,
      zoom: 15,
      zoomControl: true,
      zoomControlOptions: {
        position: window.google.maps.ControlPosition.RIGHT_CENTER,
      },
      mapTypeControl: true,
      mapTypeControlOptions: {
        position: window.google.maps.ControlPosition.TOP_RIGHT,
      },
      streetViewControl: true,
      streetViewControlOptions: {
        position: window.google.maps.ControlPosition.TOP_RIGHT,
      },
      fullscreenControl: false,
    });

    mapInstanceRef.current = map;

    // Add click listener to map
    map.addListener("click", (e) => {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();

      setFormData((prev) => ({
        ...prev,
        latitude: lat,
        longitude: lng,
      }));
      setSelectedCoords({ lat, lng });
      updateMarker(lat, lng);
    });

    // Add initial marker if coordinates exist
    if (selectedCoords) {
      updateMarker(selectedCoords.lat, selectedCoords.lng);
    }

    return () => {
      window.google.maps.event.clearInstanceListeners(map);
    };
  }, [isLoaded, selectedCoords]);

  const updateMarker = (lat, lng) => {
    if (!mapInstanceRef.current || !window.google?.maps) return;

    if (markerRef.current) {
      markerRef.current.setMap(null);
    }

    markerRef.current = new window.google.maps.Marker({
      position: { lat, lng },
      map: mapInstanceRef.current,
      title: "Shop Location",
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const newValue = name.includes("Km") || name.includes("Minutes") ? parseFloat(value) || 0 : value;
    
    setFormData((prev) => ({
      ...prev,
      [name]: newValue,
    }));

    // Update map marker if latitude or longitude changes manually
    if ((name === "latitude" || name === "longitude") && mapInstanceRef.current) {
      const lat = name === "latitude" ? parseFloat(newValue) : parseFloat(formData.latitude);
      const lng = name === "longitude" ? parseFloat(newValue) : parseFloat(formData.longitude);

      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        mapInstanceRef.current.setCenter({ lat, lng });
        updateMarker(lat, lng);
        setSelectedCoords({ lat, lng });
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Shop name is required");
      return;
    }

    if (formData.latitude === "" || formData.longitude === "") {
      toast.error("Latitude and longitude are required");
      return;
    }

    const lat = parseFloat(formData.latitude);
    const lng = parseFloat(formData.longitude);

    if (isNaN(lat) || isNaN(lng)) {
      toast.error("Latitude and longitude must be valid numbers");
      return;
    }

    if (lat < -90 || lat > 90) {
      toast.error("Latitude must be between -90 and 90");
      return;
    }

    if (lng < -180 || lng > 180) {
      toast.error("Longitude must be between -180 and 180");
      return;
    }

    setSaving(true);
    try {
      await onSave({
        name: formData.name.trim(),
        latitude: lat,
        longitude: lng,
        serviceRadiusKm: formData.serviceRadiusKm,
        processingTimeMinutes: formData.processingTimeMinutes,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="rounded-xl border p-6"
      style={{ borderColor: "var(--border)", backgroundColor: "var(--card-white)" }}
    >
      <h2 className="text-lg font-semibold mb-6" style={{ color: "var(--foreground)" }}>
        {location ? "Edit Shop Location" : "Add New Shop Location"}
      </h2>

      {mapsError && (
        <div
          className="mb-4 p-3 rounded-lg text-sm"
          style={{ backgroundColor: "var(--destructive)", color: "var(--primary-foreground)" }}
        >
          {mapsError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Shop Name */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: "var(--foreground)" }}>
            Shop Name *
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="e.g., Main Store, Sector 23"
            className="w-full px-4 py-2.5 rounded-lg border text-sm"
            style={{ borderColor: "var(--border)", backgroundColor: "var(--background)" }}
          />
        </div>

        {/* Location Search */}
        {isLoaded && (
          <div>
            <button
              type="button"
              onClick={handleCurrentLocation}
              className="w-full px-4 py-2.5 rounded-lg text-sm font-medium bg-blue-500 text-white hover:bg-blue-600 transition"
            >
              📍 Use My Current Location
            </button>
            <p className="text-xs mt-2" style={{ color: "var(--muted)" }}>
              Click on the map or use the button above to set your correct location
            </p>
          </div>
        )}

        {/* Map */}
        {isLoaded ? (
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: "var(--foreground)" }}>
              Map
            </label>
            <div
              ref={mapRef}
              style={{
                width: "100%",
                height: "300px",
                borderRadius: "0.5rem",
                border: "1px solid var(--border)",
              }}
            />
            <p className="text-xs mt-2" style={{ color: "var(--muted)" }}>
              Click on the map to pin the location
            </p>
          </div>
        ) : (
          <div
            className="p-4 rounded-lg border text-center text-sm"
            style={{ borderColor: "var(--border)", color: "var(--muted)" }}
          >
            Loading map...
          </div>
        )}

        {/* Latitude */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: "var(--foreground)" }}>
            Latitude *
          </label>
          <input
            type="number"
            name="latitude"
            value={formData.latitude}
            onChange={handleChange}
            placeholder="e.g., 28.6139"
            step="0.0001"
            className="w-full px-4 py-2.5 rounded-lg border text-sm"
            style={{ borderColor: "var(--border)", backgroundColor: "var(--background)" }}
          />
          <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
            Range: -90 to 90
          </p>
        </div>

        {/* Longitude */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: "var(--foreground)" }}>
            Longitude *
          </label>
          <input
            type="number"
            name="longitude"
            value={formData.longitude}
            onChange={handleChange}
            placeholder="e.g., 77.2090"
            step="0.0001"
            className="w-full px-4 py-2.5 rounded-lg border text-sm"
            style={{ borderColor: "var(--border)", backgroundColor: "var(--background)" }}
          />
          <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
            Range: -180 to 180
          </p>
        </div>

        {/* Service Radius */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: "var(--foreground)" }}>
            Service Radius (km)
          </label>
          <input
            type="number"
            name="serviceRadiusKm"
            value={formData.serviceRadiusKm}
            onChange={handleChange}
            min="0"
            step="0.1"
            className="w-full px-4 py-2.5 rounded-lg border text-sm"
            style={{ borderColor: "var(--border)", backgroundColor: "var(--background)" }}
          />
          <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
            Delivery area radius from this location
          </p>
        </div>

        {/* Processing Time */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: "var(--foreground)" }}>
            Processing Time (minutes)
          </label>
          <input
            type="number"
            name="processingTimeMinutes"
            value={formData.processingTimeMinutes}
            onChange={handleChange}
            min="0"
            step="1"
            className="w-full px-4 py-2.5 rounded-lg border text-sm"
            style={{ borderColor: "var(--border)", backgroundColor: "var(--background)" }}
          />
          <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
            Time to prepare order before pickup
          </p>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 px-4 py-2.5 rounded-lg font-semibold transition"
            style={{ backgroundColor: "var(--primary)", color: "var(--primary-foreground)" }}
          >
            {saving ? "Saving..." : location ? "Update" : "Create"}
          </button>
          {location && (
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2.5 rounded-lg font-semibold transition"
              style={{ backgroundColor: "var(--secondary)", color: "var(--foreground)" }}
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
