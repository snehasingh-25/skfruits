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

function OrderCard({
  order,
  isActive,
  expandedOrderId,
  setExpandedOrderId,
  trackingOrderId,
  isTracking,
  gpsError,
  updatingOrderId,
  handleReleaseOrder,
  handlePickup,
  handleReached,
  handleDelivered,
}) {
  const isExpanded = expandedOrderId === order.id;
  const statusStr = String(order.status ?? "").toLowerCase().replace(/\s+/g, "_");
  const canPickUp = !order.customerCanTrack && !["shipped", "out_for_delivery", "delivered", "cancelled"].includes(statusStr);

  return (
    <li
      className={`rounded-2xl border p-5 transition-shadow ${isActive ? "shadow-md" : ""}`}
      style={{
        borderColor: isActive ? "var(--primary)" : "var(--border)",
        background: "var(--card)",
        boxShadow: isActive ? "0 4px 14px 0 rgba(22, 163, 74, 0.15)" : "var(--shadow-soft)",
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <span className="font-bold text-lg" style={{ color: "var(--foreground)" }}>
          Order #{order.id}
        </span>
        <span
          className="text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider"
          style={{
            background: isActive ? "var(--primary)" : "var(--muted)",
            color: isActive ? "var(--primary-foreground)" : "var(--foreground)",
          }}
        >
          {order.orderStatus}
        </span>
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xl font-display font-semibold" style={{ color: "var(--foreground)" }}>
            {order.customer}
          </p>
          {order.phone && (
            <a
              href={`tel:${order.phone}`}
              className="p-2 rounded-full flex-shrink-0"
              style={{ background: "var(--green-bg-soft)", color: "var(--green-accent)" }}
              aria-label="Call customer"
            >
              📞
            </a>
          )}
        </div>
        {order.address && (
          <p className="text-sm font-medium leading-relaxed" style={{ color: "var(--text-muted)" }}>
            📍 {order.address}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm mb-4">
        <div className="p-3 rounded-xl border" style={{ borderColor: "var(--border)", background: "var(--background)" }}>
          <p className="text-xs text-muted mb-0.5">Payment</p>
          <p className="font-semibold" style={{ color: "var(--foreground)" }}>{order.paymentMethod === "cod" ? "Cash on Delivery" : "Prepaid"}</p>
        </div>
        <div className="p-3 rounded-xl border" style={{ borderColor: "var(--border)", background: "var(--background)" }}>
          <p className="text-xs text-muted mb-0.5">Total to collect</p>
          <p className="font-bold" style={{ color: "var(--primary)" }}>₹{Number(order.total).toFixed(2)}</p>
        </div>
      </div>

      {order.notes && (
        <div className="mb-4 p-3 rounded-xl text-sm" style={{ background: "var(--secondary)", color: "var(--foreground)" }}>
          <strong className="text-xs uppercase tracking-wide opacity-80 block mb-1">Notes</strong>
          {order.notes}
        </div>
      )}

      {/* Map */}
      <div className="mb-4 rounded-xl overflow-hidden border" style={{ borderColor: "var(--border)" }}>
        <DeliveryMapCard
          address={order.address}
          addressLatitude={order.addressLatitude}
          addressLongitude={order.addressLongitude}
        />
      </div>

      {/* Expandable Items List */}
      {order.items?.length > 0 && (
        <div className="mb-4 rounded-xl border" style={{ borderColor: "var(--border)", background: "var(--background)" }}>
          <button
            onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
            className="w-full flex items-center justify-between p-4 text-sm font-semibold"
            style={{ color: "var(--foreground)" }}
          >
            <span>📦 {order.items.length} item(s) to deliver</span>
            <span style={{ color: "var(--primary)" }}>{isExpanded ? "▲ Hide details" : "▼ View details"}</span>
          </button>

          {isExpanded && (
            <ul className="px-4 pb-4 space-y-3 border-t pt-3" style={{ borderColor: "var(--border)" }}>
              {order.items.map((item, idx) => (
                <li key={idx} className="flex gap-3">
                  <div className="w-12 h-12 rounded-lg flex-shrink-0 overflow-hidden bg-white/10 flex items-center justify-center border" style={{ borderColor: "var(--border)" }}>
                    {item.image ? (
                      <img src={item.image} alt={item.productName} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[10px] text-muted">No img</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate" style={{ color: "var(--foreground)" }}>{item.productName}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{item.sizeLabel} × {item.quantity}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* GPS tracking indicator */}
      {isTracking && trackingOrderId === order.id && (
        <div
          className="mb-4 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold"
          style={{ background: "var(--green-bg-soft)", color: "var(--green-accent)" }}
        >
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping" style={{ background: "var(--green-accent)" }} />
            <span className="relative inline-flex rounded-full h-3 w-3" style={{ background: "var(--green-accent)" }} />
          </span>
          📍 Live tracking active
        </div>
      )}
      {gpsError && trackingOrderId === order.id && (
        <p className="text-xs mb-4 text-center font-medium" style={{ color: "var(--destructive)" }}>
          ⚠ GPS Error: {gpsError}
        </p>
      )}

      {/* Status actions */}
      <div className="flex flex-col gap-2.5">
        {canPickUp && (
          <button
            type="button"
            disabled={updatingOrderId === order.id}
            onClick={() => handlePickup(order.id)}
            className="w-full py-3.5 rounded-xl font-bold text-base transition-transform active:scale-[0.98] disabled:opacity-60"
            style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
          >
            {updatingOrderId === order.id ? "Picking up..." : "🚀 Pick Up Order"}
          </button>
        )}

        {statusStr === "shipped" && (
          <button
            type="button"
            disabled={updatingOrderId === order.id}
            onClick={() => handleReached(order.id)}
            className="w-full py-3.5 rounded-xl font-bold text-base transition-transform active:scale-[0.98] disabled:opacity-60"
            style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
          >
            {updatingOrderId === order.id ? "Updating..." : "🛵 Mark Out for Delivery"}
          </button>
        )}

        {statusStr === "out_for_delivery" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              disabled={updatingOrderId === order.id}
              onClick={() => handleDelivered(order.id)}
              className="py-3.5 rounded-xl font-bold text-base transition-transform active:scale-[0.98] disabled:opacity-60"
              style={{ background: "var(--success)", color: "white" }}
            >
              {updatingOrderId === order.id ? "Updating..." : "✅ Mark Delivered"}
            </button>
            {order.addressLatitude && order.addressLongitude && (
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${order.addressLatitude},${order.addressLongitude}&travelmode=driving`}
                target="_blank"
                rel="noopener noreferrer"
                className="py-3.5 rounded-xl font-bold text-base border-2 flex items-center justify-center gap-2 transition-transform active:scale-[0.98]"
                style={{ borderColor: "var(--primary)", color: "var(--primary)", background: "var(--background)" }}
              >
                🗺️ Navigate
              </a>
            )}
          </div>
        )}

        {order.canReleaseAssignment && (
          <button
            type="button"
            disabled={updatingOrderId === order.id}
            onClick={() => handleReleaseOrder(order.id)}
            className="w-full py-3 rounded-xl text-sm font-semibold mt-2 disabled:opacity-60 transition-colors"
            style={{ color: "var(--destructive)", background: "var(--secondary)" }}
          >
            {updatingOrderId === order.id ? "Removing..." : "Remove from my queue"}
          </button>
        )}
      </div>
    </li>
  );
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
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [activeTab, setActiveTab] = useState("active"); // "active", "pending", "delivered"

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
      setTimeout(() => sendEvent(orderId, "picked_up"), 2000);
      fetchOrders();
    } catch {
      toast.error("Could not pick up order");
    } finally {
      setUpdatingOrderId(null);
    }
  };

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
      toast.success("Marked as out for delivery");
      fetchOrders();
    } catch {
      toast.error("Could not update status");
    } finally {
      setUpdatingOrderId(null);
    }
  };

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
    if (!window.confirm("Remove yourself from this order? You will be available for other assignments.")) return;
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
      toast.success(data.message || "Removed from assignment");
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
        <div className="h-10 w-10 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--primary)" }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto px-4 py-12 text-center">
        <p className="text-sm mb-4" style={{ color: "var(--destructive)" }}>{error}</p>
        <button onClick={() => navigate("/")} className="px-6 py-3 rounded-xl font-bold" style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}>
          Back to store
        </button>
      </div>
    );
  }

  const activeOrders = orders.filter(o => ["shipped", "out_for_delivery"].includes(String(o.status).toLowerCase()));
  const pendingOrders = orders.filter(o => !["shipped", "out_for_delivery", "delivered", "cancelled"].includes(String(o.status).toLowerCase()));
  const deliveredOrders = orders.filter(o => String(o.status).toLowerCase() === "delivered");

  const displayOrders = activeTab === "active" ? activeOrders : activeTab === "pending" ? pendingOrders : deliveredOrders;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 sm:py-10">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-display font-black tracking-tight" style={{ color: "var(--foreground)" }}>
            Driver Dashboard
          </h1>
          <p className="text-sm font-medium mt-1" style={{ color: "var(--text-muted)" }}>
            Welcome, {user?.name ?? driver?.email ?? "Driver"}
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="px-4 py-2 rounded-xl text-sm font-bold border-2 transition-colors active:bg-black/5"
          style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
        >
          Logout
        </button>
      </div>

      {ordersLoading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--primary)" }} />
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
            <button
              onClick={() => setActiveTab("active")}
              className={`flex-1 min-w-[100px] py-2.5 px-3 rounded-xl text-sm font-bold border-2 transition-colors ${
                activeTab === "active" ? "bg-[var(--primary)] text-white border-[var(--primary)]" : "bg-transparent text-[var(--foreground)] border-[var(--border)]"
              }`}
            >
              Active ({activeOrders.length})
            </button>
            <button
              onClick={() => setActiveTab("pending")}
              className={`flex-1 min-w-[100px] py-2.5 px-3 rounded-xl text-sm font-bold border-2 transition-colors ${
                activeTab === "pending" ? "bg-[var(--primary)] text-white border-[var(--primary)]" : "bg-transparent text-[var(--foreground)] border-[var(--border)]"
              }`}
            >
              Pending ({pendingOrders.length})
            </button>
            <button
              onClick={() => setActiveTab("delivered")}
              className={`flex-1 min-w-[100px] py-2.5 px-3 rounded-xl text-sm font-bold border-2 transition-colors ${
                activeTab === "delivered" ? "bg-[var(--primary)] text-white border-[var(--primary)]" : "bg-transparent text-[var(--foreground)] border-[var(--border)]"
              }`}
            >
              Delivered ({deliveredOrders.length})
            </button>
          </div>

          {displayOrders.length === 0 ? (
            <div className="rounded-3xl border-2 border-dashed p-10 text-center mt-4" style={{ borderColor: "var(--border)" }}>
              <div className="text-4xl mb-4">💤</div>
              <h3 className="font-display font-bold text-lg mb-1" style={{ color: "var(--foreground)" }}>
                No {activeTab} orders
              </h3>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                You're all caught up in this section.
              </p>
            </div>
          ) : (
            <ul className="space-y-5">
              {displayOrders.map(order => (
                <OrderCard
                  key={order.id}
                  order={order}
                  isActive={activeTab === "active"}
                  expandedOrderId={expandedOrderId}
                  setExpandedOrderId={setExpandedOrderId}
                  trackingOrderId={trackingOrderId}
                  isTracking={isTracking}
                  gpsError={gpsError}
                  updatingOrderId={updatingOrderId}
                  handleReleaseOrder={handleReleaseOrder}
                  handlePickup={handlePickup}
                  handleReached={handleReached}
                  handleDelivered={handleDelivered}
                />
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
