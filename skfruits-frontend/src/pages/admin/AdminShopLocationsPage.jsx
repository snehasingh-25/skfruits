import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { API } from "../../api";
import ShopLocationForm from "../../components/admin/ShopLocationForm";
import ShopLocationList from "../../components/admin/ShopLocationList";

export default function AdminShopLocationsPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingLocation, setEditingLocation] = useState(null);

  const fetchLocations = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem("adminToken");
      if (!token) {
        navigate("/admin/login", { replace: true });
        return;
      }

      const res = await fetch(`${API}/admin/delivery/shop-locations`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to fetch shop locations");
      const data = await res.json();
      setLocations(Array.isArray(data.locations) ? data.locations : []);
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (!token) {
      navigate("/admin/login", { replace: true });
      return;
    }
    fetchLocations();
  }, [navigate]);

  const handleSave = async (formData) => {
    try {
      const token = localStorage.getItem("adminToken");
      const method = editingLocation ? "PUT" : "POST";
      const url = editingLocation
        ? `${API}/admin/delivery/shop-locations/${editingLocation.id}`
        : `${API}/admin/delivery/shop-locations`;

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to save location");
      }

      toast.success(editingLocation ? "Location updated successfully" : "Location created successfully");
      setEditingLocation(null);
      fetchLocations();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this shop location?")) return;

    try {
      const token = localStorage.getItem("adminToken");
      const res = await fetch(`${API}/admin/delivery/shop-locations/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to delete location");
      toast.success("Location deleted successfully");
      fetchLocations();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="px-2 sm:px-4 lg:px-6 py-6">
      {error && (
        <div
          className="rounded-xl border p-4 mb-6 flex items-center justify-between"
          style={{ borderColor: "var(--destructive)", background: "var(--secondary)" }}
        >
          <p style={{ color: "var(--destructive)" }}>{error}</p>
          <button
            type="button"
            onClick={fetchLocations}
            className="px-3 py-1.5 rounded-lg text-sm font-medium"
            style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
          >
            Retry
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Section */}
        <div className="lg:col-span-1">
          <ShopLocationForm
            location={editingLocation}
            onSave={handleSave}
            onCancel={() => setEditingLocation(null)}
          />
        </div>

        {/* List Section */}
        <div className="lg:col-span-2">
          {loading ? (
            <div
              className="rounded-xl border p-8 text-center"
              style={{ borderColor: "var(--border)", backgroundColor: "var(--card-white)" }}
            >
              <p style={{ color: "var(--muted)" }}>Loading shop locations...</p>
            </div>
          ) : locations.length === 0 ? (
            <div
              className="rounded-xl border p-8 text-center"
              style={{ borderColor: "var(--border)", backgroundColor: "var(--card-white)" }}
            >
              <p style={{ color: "var(--muted)" }}>No shop locations yet. Create one to get started!</p>
            </div>
          ) : (
            <ShopLocationList
              locations={locations}
              onEdit={setEditingLocation}
              onDelete={handleDelete}
            />
          )}
        </div>
      </div>
    </div>
  );
}
