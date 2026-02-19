import { useState, useEffect } from "react";
import GoogleAddressInput from "./GoogleAddressInput";

const initialForm = {
  fullName: "",
  phone: "",
  addressLine: "",
  city: "",
  state: "",
  pincode: "",
  latitude: null,
  longitude: null,
  isDefault: false,
};

const initialErrors = { ...initialForm, isDefault: "" };

function validatePhone(v) {
  return (v || "").replace(/\D/g, "").length >= 10;
}
function validatePincode(v) {
  return /^\d{6}$/.test((v || "").trim());
}

export default function AddressForm({
  initialValues = null,
  onSubmit,
  onCancel,
  loading = false,
  submitLabel = "Save",
}) {
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState(initialErrors);

  useEffect(() => {
    if (initialValues) {
      setForm({
        fullName: initialValues.fullName ?? "",
        phone: initialValues.phone ?? "",
        addressLine: initialValues.addressLine ?? "",
        city: initialValues.city ?? "",
        state: initialValues.state ?? "",
        pincode: initialValues.pincode ?? "",
        latitude: initialValues.latitude ?? null,
        longitude: initialValues.longitude ?? null,
        isDefault: !!initialValues.isDefault,
      });
    }
  }, [initialValues]);

  const update = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const validate = () => {
    const next = { ...initialErrors };
    if (!form.fullName.trim()) next.fullName = "Full name is required";
    if (!form.phone.trim()) next.phone = "Phone is required";
    else if (!validatePhone(form.phone)) next.phone = "Enter a valid 10-digit phone";
    if (!form.addressLine.trim()) next.addressLine = "Address line is required";
    if (!form.city.trim()) next.city = "City is required";
    if (!form.state.trim()) next.state = "State is required";
    if (!form.pincode.trim()) next.pincode = "Pincode is required";
    else if (!validatePincode(form.pincode)) next.pincode = "Pincode must be 6 digits";
    setErrors(next);
    return !Object.values(next).some(Boolean);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({
      fullName: form.fullName.trim(),
      phone: form.phone.trim(),
      addressLine: form.addressLine.trim(),
      city: form.city.trim(),
      state: form.state.trim(),
      pincode: form.pincode.replace(/\D/g, "").slice(0, 6),
      latitude: form.latitude,
      longitude: form.longitude,
      isDefault: form.isDefault,
    });
  };

  const handlePlaceSelect = (data) => {
    setForm((prev) => ({
      ...prev,
      addressLine: data.addressLine || prev.addressLine,
      city: data.city || prev.city,
      state: data.state || prev.state,
      pincode: data.pincode || prev.pincode,
      latitude: data.latitude ?? prev.latitude,
      longitude: data.longitude ?? prev.longitude,
    }));
    setErrors((prev) => ({
      ...prev,
      addressLine: "",
      city: "",
      state: "",
      pincode: "",
    }));
  };

  const inputClass = (field) =>
    `w-full px-4 py-2.5 rounded-lg border focus:outline-none focus:ring-2 transition-all text-[var(--foreground)] placeholder-[var(--muted)] ${errors[field] ? "border-[var(--destructive)]" : ""}`;
  const inputStyle = (field) => ({
    background: "var(--background)",
    borderColor: errors[field] ? "var(--destructive)" : "var(--border)",
  });

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--foreground)" }}>
          Full Name <span style={{ color: "var(--destructive)" }}>*</span>
        </label>
        <input
          type="text"
          value={form.fullName}
          onChange={(e) => update("fullName", e.target.value)}
          placeholder="Your full name"
          className={inputClass("fullName")}
          style={inputStyle("fullName")}
        />
        {errors.fullName && <p className="mt-1 text-sm" style={{ color: "var(--destructive)" }}>{errors.fullName}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--foreground)" }}>
          Phone <span style={{ color: "var(--destructive)" }}>*</span>
        </label>
        <input
          type="tel"
          inputMode="numeric"
          value={form.phone}
          onChange={(e) => update("phone", e.target.value)}
          placeholder="10-digit mobile"
          className={inputClass("phone")}
          style={inputStyle("phone")}
        />
        {errors.phone && <p className="mt-1 text-sm" style={{ color: "var(--destructive)" }}>{errors.phone}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--foreground)" }}>
          Search address (optional)
        </label>
        <GoogleAddressInput
          value={form.addressLine}
          onChange={handlePlaceSelect}
          placeholder="Search address on map to fill below"
          className={inputClass("addressLine")}
          style={inputStyle("addressLine")}
          showMap={true}
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--foreground)" }}>
          Address Line <span style={{ color: "var(--destructive)" }}>*</span>
        </label>
        <input
          type="text"
          value={form.addressLine}
          onChange={(e) => update("addressLine", e.target.value)}
          placeholder="Street, building, landmark"
          className={inputClass("addressLine")}
          style={inputStyle("addressLine")}
        />
        {errors.addressLine && <p className="mt-1 text-sm" style={{ color: "var(--destructive)" }}>{errors.addressLine}</p>}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--foreground)" }}>City *</label>
          <input
            type="text"
            value={form.city}
            onChange={(e) => update("city", e.target.value)}
            placeholder="City"
            className={inputClass("city")}
            style={inputStyle("city")}
          />
          {errors.city && <p className="mt-1 text-sm" style={{ color: "var(--destructive)" }}>{errors.city}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--foreground)" }}>State *</label>
          <input
            type="text"
            value={form.state}
            onChange={(e) => update("state", e.target.value)}
            placeholder="State"
            className={inputClass("state")}
            style={inputStyle("state")}
          />
          {errors.state && <p className="mt-1 text-sm" style={{ color: "var(--destructive)" }}>{errors.state}</p>}
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--foreground)" }}>Pincode *</label>
        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={form.pincode}
          onChange={(e) => update("pincode", e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="6-digit pincode"
          className={inputClass("pincode")}
          style={inputStyle("pincode")}
        />
        {errors.pincode && <p className="mt-1 text-sm" style={{ color: "var(--destructive)" }}>{errors.pincode}</p>}
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={form.isDefault}
          onChange={(e) => update("isDefault", e.target.checked)}
          className="rounded border-2 w-4 h-4"
          style={{ borderColor: "var(--border)", accentColor: "var(--primary)" }}
        />
        <span className="text-sm" style={{ color: "var(--foreground)" }}>Set as default address</span>
      </label>
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="btn-primary-brand px-6 py-2.5 rounded-xl font-semibold disabled:opacity-60"
          style={{ borderRadius: "var(--radius-lg)" }}
        >
          {loading ? "Saving…" : submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2.5 rounded-xl font-semibold border transition"
          style={{ borderColor: "var(--border)", color: "var(--foreground)", background: "var(--background)" }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
