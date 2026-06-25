import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useUserAuth } from "../context/UserAuthContext";
import { useToast } from "../context/ToastContext";
import { API } from "../api";
import { useOrderTracking } from "../hooks/useOrderTracking";
import LiveTrackingMap from "../components/LiveTrackingMap";

// Shop location is fetched dynamically from the backend (no hardcoded coords).

const STATUS_STEPS = [
  { key: "picked_up", label: "Picked Up", emoji: "📦" },
  { key: "in_transit", label: "On the Way", emoji: "🛵" },
  { key: "reached", label: "Nearby", emoji: "📍" },
  { key: "delivered", label: "Delivered", emoji: "✅" },
];

function getStepIndex(status) {
  if (!status) return -1;
  const s = status.toLowerCase();
  if (s === "picked_up") return 0;
  if (s === "in_transit") return 1;
  if (s === "reached") return 2;
  if (s === "delivered") return 3;
  return -1;
}

export default function OrderTracking() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { isAuthenticated, loading: authLoading, getAuthHeaders } = useUserAuth();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [shopLocation, setShopLocation] = useState(null);
  const [mapEta, setMapEta] = useState(null);

  // Fetch order details and then resolve the shop's real coordinates
  useEffect(() => {
    if (!isAuthenticated || !id) return;
    const headers = getAuthHeaders();
    if (!headers?.Authorization) return;

    fetch(`${API}/orders/${id}`, { headers, credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then(async (data) => {
        setOrder(data);
        // Fetch real shop locations and match by nearestShopName
        try {
          const shopRes = await fetch(`${API}/delivery/shop-locations`);
          if (shopRes.ok) {
            const shops = await shopRes.json();
            if (shops?.length) {
              const matched = data?.nearestShopName
                ? shops.find((s) => s.name === data.nearestShopName) || shops[0]
                : shops[0];
              if (matched?.latitude && matched?.longitude) {
                setShopLocation({ lat: Number(matched.latitude), lng: Number(matched.longitude) });
              }
            }
          }
        } catch (_) {
          // silently ignore — shop marker simply won't show
        }
      })
      .catch(() => toast.error("Could not load order"))
      .finally(() => setLoading(false));
  }, [id, isAuthenticated, getAuthHeaders, toast]);

  // Live tracking via polling
  const {
    trackingData,
    isConnected,
    error: trackingError,
    isDelivered,
    refetch,
  } = useOrderTracking(id, getAuthHeaders, {
    enabled: isAuthenticated && !loading && !!order,
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/login", { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--background)" }}>
        <div
          className="h-10 w-10 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: "var(--primary)" }}
        />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--background)" }}>
        <div className="text-center">
          <p className="font-medium mb-4" style={{ color: "var(--foreground)" }}>Order not found</p>
          <Link to="/profile/orders" className="underline" style={{ color: "var(--primary)" }}>
            Back to My Orders
          </Link>
        </div>
      </div>
    );
  }

  const tracking = trackingData?.tracking;
  const currentStep = getStepIndex(trackingData?.status);
  const destination = {
    lat: order.addressLatitude || null,
    lng: order.addressLongitude || null,
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      {/* Header */}
      <header
        className="sticky top-0 z-40 border-b backdrop-blur-sm"
        style={{ background: "var(--background)", borderColor: "var(--border)", opacity: 0.97 }}
      >
        <div className="max-w-3xl mx-auto px-4 flex items-center justify-between h-14">
          <Link
            to={`/orders/${id}`}
            className="flex items-center gap-2 text-sm font-medium"
            style={{ color: "var(--primary)" }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Order #{id}
          </Link>
          <div className="flex items-center gap-2">
            {isConnected && (
              <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: "var(--green-accent)" }}>
                <span className="relative flex h-2 w-2">
                  <span
                    className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping"
                    style={{ background: "var(--green-accent)" }}
                  />
                  <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: "var(--green-accent)" }} />
                </span>
                Live
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto">
        {/* Map */}
        <div className="w-full" style={{ height: "50vh", minHeight: "280px" }}>
          <LiveTrackingMap
            trackingData={trackingData}
            destination={destination}
            shopLocation={shopLocation}
            onEtaChange={setMapEta}
            className="w-full h-full"
          />
        </div>

        {/* Tracking info panel */}
        <div className="px-4 py-6 space-y-6">
          {/* Error / reconnecting */}
          {trackingError && (
            <div
              className="rounded-xl px-4 py-3 flex items-center justify-between"
              style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}
            >
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>{trackingError}</p>
              <button
                onClick={refetch}
                className="text-sm font-medium underline"
                style={{ color: "var(--primary)" }}
              >
                Retry
              </button>
            </div>
          )}

          {/* Delivered celebration */}
          {isDelivered && (
            <div
              className="rounded-2xl p-6 text-center"
              style={{ background: "linear-gradient(135deg, #16a34a 0%, #059669 100%)" }}
            >
              <div className="text-4xl mb-3">🎉</div>
              <h2 className="text-xl font-bold text-white mb-1">Order Delivered!</h2>
              <p className="text-sm text-white/80">
                Your order has been delivered successfully.
              </p>
            </div>
          )}

          {/* ETA card */}
          {!isDelivered && tracking && (
            <div
              className="rounded-2xl p-5"
              style={{ background: "linear-gradient(135deg, var(--primary) 0%, #8A5A3A 100%)" }}
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(255,255,255,0.15)" }}
                >
                  <span className="text-2xl">🛵</span>
                </div>
                <div className="flex-1 min-w-0">
                  {(() => {
                    const displayEta = tracking.etaMinutes || mapEta;
                    if (displayEta > 0) {
                      return (
                        <>
                          <p className="text-2xl font-bold text-white">
                            ~{displayEta} min{displayEta !== 1 ? "s" : ""}
                          </p>
                          <p className="text-sm text-white/70">Estimated arrival</p>
                        </>
                      );
                    }
                    return (
                      <>
                        <p className="text-lg font-bold text-white">On the way</p>
                        <p className="text-sm text-white/70">Your driver is heading to you</p>
                      </>
                    );
                  })()}
                </div>

              </div>
            </div>
          )}

          {/* Status steps */}
          {!isDelivered && (
            <div
              className="rounded-xl border p-5"
              style={{ borderColor: "var(--border)", background: "var(--background)" }}
            >
              <h3
                className="text-xs font-semibold uppercase tracking-wide mb-4"
                style={{ color: "var(--text-muted)" }}
              >
                Delivery progress
              </h3>
              <div className="space-y-3">
                {STATUS_STEPS.map((step, idx) => {
                  const done = currentStep >= idx;
                  const active = currentStep === idx;
                  return (
                    <div key={step.key} className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 transition-all"
                        style={{
                          background: done ? "var(--primary)" : "var(--muted)",
                          color: done ? "var(--primary-foreground)" : "var(--text-muted)",
                          boxShadow: active ? "0 0 0 3px var(--secondary)" : "none",
                        }}
                      >
                        {step.emoji}
                      </div>
                      <span
                        className="text-sm font-medium"
                        style={{ color: done ? "var(--foreground)" : "var(--text-muted)" }}
                      >
                        {step.label}
                      </span>
                      {active && (
                        <span
                          className="ml-auto text-xs font-medium px-2 py-0.5 rounded-full"
                          style={{ background: "var(--green-bg-soft)", color: "var(--green-accent)" }}
                        >
                          Now
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Driver info */}
          {tracking?.driverName && (
            <div
              className="rounded-xl border p-5"
              style={{ borderColor: "var(--border)", background: "var(--background)" }}
            >
              <h3
                className="text-xs font-semibold uppercase tracking-wide mb-3"
                style={{ color: "var(--text-muted)" }}
              >
                Your delivery partner
              </h3>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm"
                    style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
                  >
                    {tracking.driverName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium" style={{ color: "var(--foreground)" }}>
                      {tracking.driverName}
                    </p>
                    {tracking.driverPhone && (
                      <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                        {tracking.driverPhone}
                      </p>
                    )}
                  </div>
                </div>
                {tracking.driverPhone && (
                  <a
                    href={`tel:${tracking.driverPhone.replace(/\D/g, "").slice(-10)}`}
                    className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
                    style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                      />
                    </svg>
                    Call
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Back to order details */}
          <div className="text-center pt-2 pb-4">
            <Link
              to={`/orders/${id}`}
              className="text-sm font-medium underline"
              style={{ color: "var(--primary)" }}
            >
              View order details
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
