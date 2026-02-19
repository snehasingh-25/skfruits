import { Link, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { useCart } from "../context/CartContext";
import { useUserAuth } from "../context/UserAuthContext";
import { API } from "../api";
import DriverInfo from "../components/DriverInfo";

export default function OrderSuccess() {
  const [searchParams] = useSearchParams();
  const { clearCart } = useCart();
  const { isAuthenticated, getAuthHeaders } = useUserAuth();
  const orderId = searchParams.get("orderId") || "";
  const [order, setOrder] = useState(null);

  useEffect(() => {
    if (orderId) clearCart();
  }, [orderId, clearCart]);

  useEffect(() => {
    if (!orderId || !isAuthenticated) return;
    const headers = getAuthHeaders();
    if (!headers?.Authorization) return;
    fetch(`${API}/orders/${orderId}`, { headers, credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setOrder(data))
      .catch(() => setOrder(null));
  }, [orderId, isAuthenticated, getAuthHeaders]);

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center" style={{ background: "var(--background)" }}>
      <div
        className="max-w-md w-full rounded-2xl shadow-lg p-8 sm:p-10 text-center border"
        style={{ background: "var(--background)", borderColor: "var(--border)", boxShadow: "var(--shadow-soft)" }}
      >
        <div className="w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center" style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}>
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold font-display mb-2" style={{ color: "var(--foreground)" }}>
          Order confirmed
        </h1>
        <p className="mb-4" style={{ color: "var(--text-muted)" }}>
          Thank you for your order. We&apos;ll get it to you soon.
        </p>
        {orderId && (
          <p className="text-sm mb-4 font-mono px-3 py-2 rounded-lg" style={{ background: "var(--muted)", color: "var(--foreground)" }}>
            Order ID: {orderId}
          </p>
        )}
        {order?.driver && (
          <div className="mb-6 text-left">
            <DriverInfo driver={order.driver} />
          </div>
        )}
        <Link
          to="/"
          className="btn-primary-brand inline-block w-full sm:w-auto px-8 py-3 rounded-xl font-semibold transition-all shadow-md hover:shadow-lg"
          style={{ borderRadius: "var(--radius-lg)" }}
        >
          Continue Shopping
        </Link>
      </div>
    </div>
  );
}
