import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useUserAuth } from "../context/UserAuthContext";
import { useToast } from "../context/ToastContext";
import { API } from "../api";
import DeliveryMapCard from "../components/DeliveryMapCard";
import { useDriverGPS } from "../hooks/useDriverGPS";

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function DriverDashboard() {
  const navigate = useNavigate();
  const toast = useToast();
  const { user, getAuthHeaders, logout } = useUserAuth();
  const [driver, setDriver] = useState(null);
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingOrderId, setUpdatingOrderId] = useState(null);

  // GPS Tracking
  const { isTracking, currentLocation, error: gpsError, startTracking, stopTracking, sendEvent } = useDriverGPS(getAuthHeaders);
  const [trackingOrderId, setTrackingOrderId] = useState(null);

  const fetchOrders = useCallback(() => {
    const headers = getAuthHeaders();
    if (!headers.Authorization) return;
    setOrdersLoading(true);
    fetch(`${API}/driver/orders`, { headers })
      .then((res) => {
        if (res.status === 401) return [];
        if (!res.ok) throw new Error("Failed to load orders");
        return res.json();
      })
      .then((data) => setOrders(Array.isArray(data) ? data : []))
      .catch(() => setOrders([]))
      .finally(() => setOrdersLoading(false));
  }, [getAuthHeaders]);

  useEffect(() => {
    fetch(`${API}/driver/me`, { headers: getAuthHeaders() })
      .then((res) => {
        if (res.status === 401) {
          navigate("/", { replace: true });
          return null;
        }
        if (!res.ok) throw new Error("Failed to load driver");
        return res.json();
      })
      .then((data) => {
        if (data) setDriver(data);
      })
      .catch((err) => setError(err.message || "Something went wrong"))
      .finally(() => setLoading(false));
  }, [navigate, getAuthHeaders]);

  useEffect(() => {
    if (!getAuthHeaders().Authorization) return;
    fetchOrders();
  }, [getAuthHeaders, fetchOrders]);

  // Pickup: calls backend + starts GPS tracking
  const handlePickup = async (orderId) => {
    setUpdatingOrderId(orderId);
    try {
      const res = await fetch(`${API}/driver/orders/${orderId}/pickup`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to pick up order");
        return;
      }
      toast.success("Order picked up — tracking started");
      startTracking(orderId);
      setTrackingOrderId(orderId);
      // Send picked_up event after GPS gets first fix (small delay)
      setTimeout(() => sendEvent(orderId, "picked_up"), 2000);
      fetchOrders();
    } catch {
      toast.error("Could not pick up order");
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // Reached: sends tracking event + updates status
  const handleReached = async (orderId) => {
    setUpdatingOrderId(orderId);
    try {
      await sendEvent(orderId, "reached");
      const res = await fetch(`${API}/driver/orders/${orderId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ status: "out_for_delivery" }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to update status");
        return;
      }
      toast.success("Marked as reached destination");
      fetchOrders();
    } catch {
      toast.error("Could not update status");
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // Delivered: sends tracking event + updates status + stops GPS
  const handleDelivered = async (orderId) => {
    setUpdatingOrderId(orderId);
    try {
      await sendEvent(orderId, "delivered");
      const res = await fetch(`${API}/driver/orders/${orderId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ status: "delivered" }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to mark delivered");
        return;
      }
      toast.success("Order delivered!");
      stopTracking();
      setTrackingOrderId(null);
      fetchOrders();
    } catch {
      toast.error("Could not mark as delivered");
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/", { replace: true });
  };

  const handleReleaseOrder = async (orderId) => {
    if (
      !window.confirm(
        "Remove yourself from this order? You will be available for other assignments; admin may assign another driver."
      )
    ) {
      return;
    }
    setUpdatingOrderId(orderId);
    try {
      const res = await fetch(`${API}/driver/orders/${orderId}/release`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Could not remove assignment");
        return;
      }
      toast.success(data.message || "You are no longer assigned to this order");
      if (trackingOrderId === orderId) {
        stopTracking();
        setTrackingOrderId(null);
      }
      fetchOrders();
    } catch {
      toast.error("Could not remove assignment");
    } finally {
      setUpdatingOrderId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div
          className="h-10 w-10 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: "var(--primary)" }}
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <p className="text-sm mb-4" style={{ color: "var(--destructive)" }}>
          {error}
        </p>
        <button
          type="button"
          onClick={() => navigate("/")}
          className="px-4 py-2 rounded-lg font-medium"
          style={{
            background: "var(--primary)",
            color: "var(--primary-foreground)",
          }}
        >
          Back to store
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header: title + logout */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1
            className="text-xl font-display font-bold"
            style={{ color: "var(--foreground)" }}
          >
            Driver dashboard
          </h1>
          <p
            className="text-sm mt-1"
            style={{ color: "var(--text-muted)" }}
          >
            Welcome, {user?.name ?? driver?.email ?? "Driver"}.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="text-sm font-medium underline hover:no-underline"
            style={{ color: "var(--muted-foreground)" }}
          >
            Back to store
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="px-4 py-2 rounded-lg text-sm font-medium border"
            style={{
              borderColor: "var(--border)",
              color: "var(--foreground)",
              background: "var(--card)",
            }}
          >
            Log out
          </button>
        </div>
      </div>

      {/* Profile card */}
      <div
        className="rounded-2xl border p-6 mb-8"
        style={{
          borderColor: "var(--border)",
          background: "var(--card)",
          boxShadow: "var(--shadow-soft)",
        }}
      >
        <h2
          className="font-semibold mb-3"
          style={{ color: "var(--foreground)" }}
        >
          Your profile
        </h2>
        <dl className="space-y-2 text-sm">
          <div>
            <dt
              className="font-medium"
              style={{ color: "var(--text-muted)" }}
            >
              Name
            </dt>
            <dd style={{ color: "var(--foreground)" }}>
              {user?.name ?? driver?.userId ?? "—"}
            </dd>
          </div>
          <div>
            <dt
              className="font-medium"
              style={{ color: "var(--text-muted)" }}
            >
              Email
            </dt>
            <dd style={{ color: "var(--foreground)" }}>
              {driver?.email ?? user?.email ?? "—"}
            </dd>
          </div>
          <div>
            <dt
              className="font-medium"
              style={{ color: "var(--text-muted)" }}
            >
              Role
            </dt>
            <dd style={{ color: "var(--foreground)" }}>
              {driver?.role ?? "driver"}
            </dd>
          </div>
        </dl>
      </div>

      {/* Orders */}
      <section>
        <h2
          className="text-lg font-display font-bold mb-4"
          style={{ color: "var(--foreground)" }}
        >
          Orders assigned to you
        </h2>
        {ordersLoading ? (
          <div className="flex justify-center py-8">
            <div
              className="h-8 w-8 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: "var(--primary)" }}
            />
          </div>
        ) : orders.length === 0 ? (
          <div
            className="rounded-2xl border p-8 text-center"
            style={{
              borderColor: "var(--border)",
              background: "var(--card)",
            }}
          >
            <p
              className="text-sm"
              style={{ color: "var(--text-muted)" }}
            >
              No orders assigned yet. Admin will assign orders from the order
              detail page.
            </p>
          </div>
        ) : (
          <ul className="space-y-4">
            {orders.map((order) => (
              <li
                key={order.id}
                className="rounded-2xl border p-4"
                style={{
                  borderColor: "var(--border)",
                  background: "var(--card)",
                  boxShadow: "var(--shadow-soft)",
                }}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <span
                    className="font-semibold"
                    style={{ color: "var(--foreground)" }}
                  >
                    Order #{order.id}
                  </span>
                  <span
                    className="text-xs font-medium px-2.5 py-1 rounded-full"
                    style={{
                      background: "var(--muted)",
                      color: "var(--foreground)",
                    }}
                  >
                    {order.orderStatus}
                  </span>
                </div>
                <p
                  className="text-sm"
                  style={{ color: "var(--foreground)" }}
                >
                  {order.customer}
                  {order.phone && ` · ${order.phone}`}
                </p>
                {order.address && (
                  <p
                    className="text-sm mt-1"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {order.address}
                  </p>
                )}
                {order.estimatedDeliveryDate && (
                  <p
                    className="text-xs mt-1"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Est. delivery: {formatDate(order.estimatedDeliveryDate)}
                  </p>
                )}
                {order.notes && (
                  <p
                    className="text-xs mt-1 italic"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Note: {order.notes}
                  </p>
                )}
                <div className="mt-3">
                  <DeliveryMapCard
                    address={order.address}
                    addressLatitude={order.addressLatitude}
                    addressLongitude={order.addressLongitude}
                  />
                </div>
                <p
                  className="text-sm mt-2 font-medium"
                  style={{ color: "var(--primary)" }}
                >
                  ₹{Number(order.total).toFixed(2)}
                </p>
                <p
                  className="text-xs mt-1"
                  style={{ color: "var(--text-muted)" }}
                >
                  Placed {formatDate(order.createdAt)}
                </p>
                {order.items?.length > 0 && (
                  <p
                    className="text-xs mt-2"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {order.items.length} item(s):{" "}
                    {order.items
                      .map((i) => `${i.productName} × ${i.quantity}`)
                      .join(", ")}
                  </p>
                )}

                {/* GPS tracking indicator */}
                {isTracking && trackingOrderId === order.id && (
                  <div
                    className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
                    style={{ background: "var(--green-bg-soft)", color: "var(--green-accent)" }}
                  >
                    <span className="relative flex h-2.5 w-2.5">
                      <span
                        className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping"
                        style={{ background: "var(--green-accent)" }}
                      />
                      <span
                        className="relative inline-flex rounded-full h-2.5 w-2.5"
                        style={{ background: "var(--green-accent)" }}
                      />
                    </span>
                    <span className="font-medium">📍 Sharing location…</span>
                    {currentLocation && (
                      <span className="text-xs opacity-70">
                        ({currentLocation.lat.toFixed(4)}, {currentLocation.lng.toFixed(4)})
                      </span>
                    )}
                  </div>
                )}
                {gpsError && trackingOrderId === order.id && (
                  <p className="text-xs mt-2" style={{ color: "var(--destructive)" }}>
                    ⚠ {gpsError}
                  </p>
                )}

                {/* Status actions with GPS tracking */}
                <div className="mt-4 flex flex-wrap gap-2">
                  {order.canReleaseAssignment && (
                    <button
                      type="button"
                      disabled={updatingOrderId === order.id}
                      onClick={() => handleReleaseOrder(order.id)}
                      className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-60 border"
                      style={{
                        borderColor: "var(--border)",
                        color: "var(--foreground)",
                        background: "var(--card-white)",
                      }}
                    >
                      {updatingOrderId === order.id ? "Updating…" : "Remove from order"}
                    </button>
                  )}
                  {/* Pickup: before customer tracking — then status becomes shipped and tracking starts */}
                  {(() => {
                    const s = String(order.status ?? "")
                      .toLowerCase()
                      .replace(/\s+/g, "_");
                    const canPickUp =
                      !order.customerCanTrack &&
                      !["out_for_delivery", "delivered", "cancelled"].includes(s);
                    return canPickUp ? (
                    <button
                      type="button"
                      disabled={updatingOrderId === order.id}
                      onClick={() => handlePickup(order.id)}
                      className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-60 flex items-center gap-2"
                      style={{
                        background: "var(--primary)",
                        color: "var(--primary-foreground)",
                      }}
                    >
                      {updatingOrderId === order.id
                        ? "Picking up…"
                        : "🚀 Pick Up & Start Tracking"}
                    </button>
                    ) : null;
                  })()}
                  {/* Reached: out_for_delivery */}
                  {order.status === "out_for_delivery" && (
                    <>
                      <button
                        type="button"
                        disabled={updatingOrderId === order.id}
                        onClick={() => handleDelivered(order.id)}
                        className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-60"
                        style={{
                          background: "var(--primary)",
                          color: "var(--primary-foreground)",
                        }}
                      >
                        {updatingOrderId === order.id
                          ? "Updating…"
                          : "✅ Mark Delivered"}
                      </button>
                      {/* Navigate button */}
                      {order.addressLatitude && order.addressLongitude && (
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${order.addressLatitude},${order.addressLongitude}&travelmode=driving`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 rounded-lg text-sm font-medium border flex items-center gap-1.5"
                          style={{
                            borderColor: "var(--border)",
                            color: "var(--foreground)",
                            background: "var(--card-white)",
                          }}
                        >
                          🗺️ Navigate
                        </a>
                      )}
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
