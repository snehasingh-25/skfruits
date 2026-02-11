import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useToast } from "../context/ToastContext";
import { useUserAuth } from "../context/UserAuthContext";
import { API } from "../api";
import AddressForm from "../components/AddressForm";

const CART_SESSION_KEY = "skfruits_cart_session";

const initialForm = {
  name: "",
  phone: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
  email: "",
};

const initialErrors = { ...initialForm };

function getSessionId() {
  try {
    return localStorage.getItem(CART_SESSION_KEY) || "";
  } catch {
    return "";
  }
}

function validatePhone(value) {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 10;
}

function validatePincode(value) {
  return /^\d{6}$/.test(value.trim());
}

export default function Checkout() {
  const { cartItems, isLoaded, refreshCart } = useCart();
  const { isAuthenticated, getAuthHeaders } = useUserAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState(initialErrors);
  const [submitting, setSubmitting] = useState(false);
  const [addresses, setAddresses] = useState([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [addAddressModalOpen, setAddAddressModalOpen] = useState(false);
  const [savingNewAddress, setSavingNewAddress] = useState(false);

  useEffect(() => {
    refreshCart?.();
  }, [refreshCart]);

  useEffect(() => {
    if (!isAuthenticated) return;
    setLoadingAddresses(true);
    fetch(`${API}/addresses`, { headers: getAuthHeaders() })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setAddresses(list);
        const defaultAddr = list.find((a) => a.isDefault) || list[0];
        setSelectedAddressId(defaultAddr ? defaultAddr.id : null);
      })
      .catch(() => setAddresses([]))
      .finally(() => setLoadingAddresses(false));
  }, [isAuthenticated, getAuthHeaders]);

  useEffect(() => {
    if (isLoaded && cartItems.length === 0) {
      toast.error("Your cart is empty");
      navigate("/cart", { replace: true });
    }
  }, [isLoaded, cartItems.length, navigate, toast]);

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const validate = () => {
    const next = { ...initialErrors };
    if (!form.name.trim()) next.name = "Full name is required";
    if (!form.phone.trim()) next.phone = "Phone number is required";
    else if (!validatePhone(form.phone)) next.phone = "Enter a valid 10-digit phone number";
    if (!form.address.trim()) next.address = "Address is required";
    if (!form.city.trim()) next.city = "City is required";
    if (!form.state.trim()) next.state = "State is required";
    if (!form.pincode.trim()) next.pincode = "Pincode is required";
    else if (!validatePincode(form.pincode)) next.pincode = "Pincode must be 6 digits";
    setErrors(next);
    return !Object.values(next).some(Boolean);
  };

  const getCustomerDetails = () => {
    if (isAuthenticated && selectedAddressId && addresses.length) {
      const addr = addresses.find((a) => a.id === selectedAddressId);
      if (addr) {
        return {
          name: addr.fullName,
          phone: addr.phone,
          address: addr.addressLine,
          city: addr.city,
          state: addr.state,
          pincode: addr.pincode,
          email: form.email?.trim() || undefined,
        };
      }
    }
    return {
      name: form.name.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
      city: form.city.trim(),
      state: form.state.trim(),
      pincode: form.pincode.trim(),
      email: form.email?.trim() || undefined,
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (cartItems.length === 0) {
      toast.error("Your cart is empty");
      return;
    }
    const useManualForm = !isAuthenticated || !selectedAddressId || !addresses.find((a) => a.id === selectedAddressId);
    if (useManualForm && !validate()) return;
    const sessionId = getSessionId();
    if (!sessionId) {
      toast.error("Session expired. Please add items to cart again.");
      navigate("/cart");
      return;
    }

    setSubmitting(true);
    try {
      const customerDetails = getCustomerDetails();
      const res = await fetch(`${API}/orders/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          customerDetails,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Could not place order");
        return;
      }
      navigate(`/order-success?orderId=${data.orderId}`, { replace: true });
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddAddressFromCheckout = async (payload) => {
    setSavingNewAddress(true);
    try {
      const res = await fetch(`${API}/addresses/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Could not add address");
        return;
      }
      setAddresses((prev) => [...prev, data]);
      setSelectedAddressId(data.id);
      setAddAddressModalOpen(false);
      toast.success("Address added");
    } catch (e) {
      toast.error("Something went wrong");
    } finally {
      setSavingNewAddress(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8" style={{ background: "var(--background)" }}>
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="h-10 w-56 rounded-lg animate-pulse" style={{ background: "var(--muted)" }} />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              <div className="rounded-xl p-6 animate-pulse h-64" style={{ background: "var(--muted)", border: "1px solid var(--border)" }} />
              <div className="rounded-xl p-6 animate-pulse h-48" style={{ background: "var(--muted)", border: "1px solid var(--border)" }} />
            </div>
            <div className="rounded-xl p-6 animate-pulse h-80" style={{ background: "var(--muted)", border: "1px solid var(--border)" }} />
          </div>
        </div>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return null;
  }

  const total = cartItems.reduce((sum, item) => sum + Number(item.subtotal || 0), 0);
  const itemCount = cartItems.reduce((sum, item) => sum + (item.quantity || 0), 0);

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8" style={{ background: "var(--background)" }}>
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold font-display mb-8" style={{ color: "var(--foreground)" }}>
          Checkout
        </h1>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Delivery + Contact */}
          <div className="lg:col-span-2 space-y-6">
            {/* Section 1 — Delivery Information */}
            <div
              className="rounded-xl p-6 shadow-sm border"
              style={{ background: "var(--background)", borderColor: "var(--border)" }}
            >
              <h2 className="text-xl font-semibold font-display mb-4" style={{ color: "var(--foreground)" }}>
                Delivery Information
              </h2>

              {isAuthenticated && loadingAddresses ? (
                <div className="space-y-3">
                  <div className="h-20 rounded-lg animate-pulse" style={{ background: "var(--muted)" }} />
                  <div className="h-20 rounded-lg animate-pulse" style={{ background: "var(--muted)" }} />
                </div>
              ) : isAuthenticated && addresses.length > 0 ? (
                <>
                  <div className="space-y-3 mb-4">
                    {addresses.map((addr) => (
                      <button
                        key={addr.id}
                        type="button"
                        onClick={() => setSelectedAddressId(addr.id)}
                        className="w-full text-left rounded-xl p-4 border-2 transition"
                        style={{
                          background: selectedAddressId === addr.id ? "var(--secondary)" : "var(--background)",
                          borderColor: selectedAddressId === addr.id ? "var(--primary)" : "var(--border)",
                        }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            {addr.isDefault && (
                              <span
                                className="inline-block text-xs font-semibold px-2 py-0.5 rounded mb-1"
                                style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
                              >
                                Default
                              </span>
                            )}
                            <p className="font-semibold" style={{ color: "var(--foreground)" }}>{addr.fullName}</p>
                            <p className="text-sm" style={{ color: "var(--muted)" }}>{addr.phone}</p>
                            <p className="text-sm mt-0.5" style={{ color: "var(--foreground)" }}>
                              {addr.addressLine}, {addr.city}, {addr.state} – {addr.pincode}
                            </p>
                          </div>
                          {selectedAddressId === addr.id && (
                            <span className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}>
                              ✓
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setAddAddressModalOpen(true)}
                    className="w-full py-3 rounded-xl border-2 border-dashed font-medium"
                    style={{ borderColor: "var(--border)", color: "var(--muted)" }}
                  >
                    + Add new address
                  </button>
                </>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--foreground)" }}>
                      Full Name <span className="text-[var(--destructive)]">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => updateField("name", e.target.value)}
                      placeholder="Your full name"
                      className="w-full px-4 py-2.5 rounded-lg border text-[var(--foreground)] placeholder-[var(--muted)] focus:outline-none focus:ring-2 transition-all"
                      style={{ background: "var(--background)", borderColor: errors.name ? "var(--destructive)" : "var(--border)" }}
                      autoComplete="name"
                    />
                    {errors.name && <p className="mt-1 text-sm" style={{ color: "var(--destructive)" }}>{errors.name}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--foreground)" }}>
                      Phone Number <span className="text-[var(--destructive)]">*</span>
                    </label>
                    <input
                      type="tel"
                      inputMode="numeric"
                      value={form.phone}
                      onChange={(e) => updateField("phone", e.target.value)}
                      placeholder="10-digit mobile number"
                      className="w-full px-4 py-2.5 rounded-lg border text-[var(--foreground)] placeholder-[var(--muted)] focus:outline-none focus:ring-2 transition-all"
                      style={{ background: "var(--background)", borderColor: errors.phone ? "var(--destructive)" : "var(--border)" }}
                      autoComplete="tel"
                    />
                    {errors.phone && <p className="mt-1 text-sm" style={{ color: "var(--destructive)" }}>{errors.phone}</p>}
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--foreground)" }}>
                      Address Line <span className="text-[var(--destructive)]">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.address}
                      onChange={(e) => updateField("address", e.target.value)}
                      placeholder="Street, building, landmark"
                      className="w-full px-4 py-2.5 rounded-lg border text-[var(--foreground)] placeholder-[var(--muted)] focus:outline-none focus:ring-2 transition-all"
                      style={{ background: "var(--background)", borderColor: errors.address ? "var(--destructive)" : "var(--border)" }}
                      autoComplete="street-address"
                    />
                    {errors.address && <p className="mt-1 text-sm" style={{ color: "var(--destructive)" }}>{errors.address}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--foreground)" }}>
                      City <span className="text-[var(--destructive)]">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.city}
                      onChange={(e) => updateField("city", e.target.value)}
                      placeholder="City"
                      className="w-full px-4 py-2.5 rounded-lg border text-[var(--foreground)] placeholder-[var(--muted)] focus:outline-none focus:ring-2 transition-all"
                      style={{ background: "var(--background)", borderColor: errors.city ? "var(--destructive)" : "var(--border)" }}
                      autoComplete="address-level2"
                    />
                    {errors.city && <p className="mt-1 text-sm" style={{ color: "var(--destructive)" }}>{errors.city}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--foreground)" }}>
                      State <span className="text-[var(--destructive)]">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.state}
                      onChange={(e) => updateField("state", e.target.value)}
                      placeholder="State"
                      className="w-full px-4 py-2.5 rounded-lg border text-[var(--foreground)] placeholder-[var(--muted)] focus:outline-none focus:ring-2 transition-all"
                      style={{ background: "var(--background)", borderColor: errors.state ? "var(--destructive)" : "var(--border)" }}
                      autoComplete="address-level1"
                    />
                    {errors.state && <p className="mt-1 text-sm" style={{ color: "var(--destructive)" }}>{errors.state}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--foreground)" }}>
                      Pincode <span className="text-[var(--destructive)]">*</span>
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={form.pincode}
                      onChange={(e) => updateField("pincode", e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="6-digit pincode"
                      className="w-full px-4 py-2.5 rounded-lg border text-[var(--foreground)] placeholder-[var(--muted)] focus:outline-none focus:ring-2 transition-all"
                      style={{ background: "var(--background)", borderColor: errors.pincode ? "var(--destructive)" : "var(--border)" }}
                      autoComplete="postal-code"
                    />
                    {errors.pincode && <p className="mt-1 text-sm" style={{ color: "var(--destructive)" }}>{errors.pincode}</p>}
                  </div>
                </div>
              )}
            </div>

            {/* Add address modal (checkout) */}
            {addAddressModalOpen && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center p-4"
                style={{ background: "rgba(0,0,0,0.4)" }}
                onClick={() => !savingNewAddress && setAddAddressModalOpen(false)}
              >
                <div
                  className="rounded-2xl shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
                  style={{ background: "var(--background)", border: "1px solid var(--border)" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <h3 className="text-xl font-semibold font-display mb-4" style={{ color: "var(--foreground)" }}>
                    Add delivery address
                  </h3>
                  <AddressForm
                    onSubmit={handleAddAddressFromCheckout}
                    onCancel={() => !savingNewAddress && setAddAddressModalOpen(false)}
                    loading={savingNewAddress}
                    submitLabel="Add & use this address"
                  />
                </div>
              </div>
            )}

            {/* Section 2 — Contact Details */}
            <div
              className="rounded-xl p-6 shadow-sm border"
              style={{ background: "var(--background)", borderColor: "var(--border)" }}
            >
              <h2 className="text-xl font-semibold font-display mb-4" style={{ color: "var(--foreground)" }}>
                Contact Details
              </h2>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--foreground)" }}>
                  Email <span className="text-[var(--muted)]">(optional)</span>
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-4 py-2.5 rounded-lg border text-[var(--foreground)] placeholder-[var(--muted)] focus:outline-none focus:ring-2 transition-all"
                  style={{ background: "var(--background)", borderColor: "var(--border)" }}
                  autoComplete="email"
                />
              </div>
            </div>
          </div>

          {/* Right — Order Summary */}
          <div className="lg:col-span-1">
            <div
              className="rounded-xl p-6 shadow-sm border sticky top-24"
              style={{ background: "var(--background)", borderColor: "var(--border)" }}
            >
              <h2 className="text-xl font-semibold font-display mb-4" style={{ color: "var(--foreground)" }}>
                Order Summary
              </h2>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex gap-3 py-2 border-b last:border-b-0" style={{ borderColor: "var(--border)" }}>
                    <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center" style={{ background: "var(--muted)" }}>
                      {item.productImage ? (
                        <img src={item.productImage} alt={item.productName} className="w-full h-full object-cover" />
                      ) : (
                        <img src="/logo.png" alt="" className="w-8 h-8 opacity-50" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate text-sm" style={{ color: "var(--foreground)" }}>{item.productName}</p>
                      <p className="text-xs" style={{ color: "var(--muted)" }}>{item.sizeLabel} × {item.quantity}</p>
                      <p className="text-sm font-semibold mt-0.5" style={{ color: "var(--primary)" }}>₹{Number(item.subtotal || 0).toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t" style={{ borderColor: "var(--border)" }}>
                <div className="flex justify-between text-sm mb-1" style={{ color: "var(--foreground)" }}>
                  <span>Subtotal ({itemCount} items)</span>
                  <span>₹{total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg mt-2" style={{ color: "var(--foreground)" }}>
                  <span>Total</span>
                  <span style={{ color: "var(--primary)" }}>₹{total.toFixed(2)}</span>
                </div>
              </div>

              {/* Section 4 — Place Order CTA */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-6 py-4 rounded-xl font-semibold text-lg transition-all duration-300 shadow-md hover:shadow-lg active:scale-[0.99] disabled:opacity-60 disabled:pointer-events-none"
                style={{
                  background: "var(--btn-primary-bg)",
                  color: "var(--btn-primary-fg)",
                  borderRadius: "var(--radius-lg)",
                }}
              >
                {submitting ? "Placing order…" : "Place Order"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
