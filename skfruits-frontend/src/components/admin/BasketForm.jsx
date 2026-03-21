import { useEffect, useMemo, useRef, useState } from "react";
import { API } from "../../api";
import { useToast } from "../../context/ToastContext";

export default function BasketForm({ basket, onSave, onCancel }) {
  const toast = useToast();
  const [formData, setFormData] = useState({
    title: "",
    price: "",
    isActive: true,
    sortOrder: 0,
  });
  const [emptyImage, setEmptyImage] = useState(null);
  const [filledImage, setFilledImage] = useState(null);
  const [existingEmptyUrl, setExistingEmptyUrl] = useState(null);
  const [existingFilledUrl, setExistingFilledUrl] = useState(null);
  const [emptyPreview, setEmptyPreview] = useState(null);
  const [filledPreview, setFilledPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const emptyInputRef = useRef(null);
  const filledInputRef = useRef(null);
  const formRef = useRef(null);
  const isSubmittingRef = useRef(false);
  const initialSnapshotRef = useRef("");

  const snapshot = useMemo(
    () =>
      JSON.stringify({
        formData,
        existingEmptyUrl,
        existingFilledUrl,
        emptySelected: !!emptyImage,
        filledSelected: !!filledImage,
      }),
    [formData, existingEmptyUrl, existingFilledUrl, emptyImage, filledImage]
  );

  const isDirty = initialSnapshotRef.current !== "" && snapshot !== initialSnapshotRef.current;

  useEffect(() => {
    if (basket) {
      setFormData({
        title: basket.title || "",
        price: String(basket.price ?? ""),
        isActive: basket.isActive !== undefined ? basket.isActive : true,
        sortOrder: basket.sortOrder ?? 0,
      });
      setExistingEmptyUrl(basket.emptyImageUrl || null);
      setExistingFilledUrl(basket.filledImageUrl || null);
      setEmptyPreview(basket.emptyImageUrl || null);
      setFilledPreview(basket.filledImageUrl || null);
      setEmptyImage(null);
      setFilledImage(null);
    } else {
      setFormData({ title: "", price: "", isActive: true, sortOrder: 0 });
      setExistingEmptyUrl(null);
      setExistingFilledUrl(null);
      setEmptyPreview(null);
      setFilledPreview(null);
      setEmptyImage(null);
      setFilledImage(null);
    }

    setTimeout(() => {
      initialSnapshotRef.current = JSON.stringify({
        formData: basket
          ? {
              title: basket.title || "",
              price: String(basket.price ?? ""),
              isActive: basket.isActive !== undefined ? basket.isActive : true,
              sortOrder: basket.sortOrder ?? 0,
            }
          : { title: "", price: "", isActive: true, sortOrder: 0 },
        existingEmptyUrl: basket?.emptyImageUrl || null,
        existingFilledUrl: basket?.filledImageUrl || null,
        emptySelected: false,
        filledSelected: false,
      });
    }, 0);
  }, [basket]);

  const handleEmptyImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setEmptyImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setEmptyPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleFilledImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setFilledImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setFilledPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const removeEmptyImage = () => {
    setEmptyImage(null);
    setEmptyPreview(null);
    setExistingEmptyUrl(null);
    emptyInputRef.current && (emptyInputRef.current.value = "");
  };

  const removeFilledImage = () => {
    setFilledImage(null);
    setFilledPreview(null);
    setExistingFilledUrl(null);
    filledInputRef.current && (filledInputRef.current.value = "");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmittingRef.current) return;

    if (!formData.title?.trim()) {
      toast.error("Title is required");
      return;
    }
    const priceNum = parseFloat(formData.price);
    if (isNaN(priceNum) || priceNum < 0) {
      toast.error("Valid price is required");
      return;
    }

    if (!basket && !emptyImage && !existingEmptyUrl) {
      toast.error("Empty basket image is required");
      return;
    }

    setLoading(true);
    isSubmittingRef.current = true;

    try {
      const token = localStorage.getItem("adminToken");
      const url = basket ? `${API}/baskets/${basket.id}` : `${API}/baskets`;
      const method = basket ? "PUT" : "POST";

      const fd = new FormData();
      fd.append("title", formData.title.trim());
      fd.append("price", formData.price);
      fd.append("isActive", formData.isActive);
      fd.append("sortOrder", formData.sortOrder);

      if (emptyImage) fd.append("emptyImage", emptyImage);
      else if (existingEmptyUrl) fd.append("existingEmptyImageUrl", existingEmptyUrl);

      if (filledImage) fd.append("filledImage", filledImage);
      else if (existingFilledUrl) fd.append("existingFilledImageUrl", existingFilledUrl);

      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(basket ? "Basket updated" : "Basket created");
        onSave();
        setFormData({ title: "", price: "", isActive: true, sortOrder: 0 });
        removeEmptyImage();
        removeFilledImage();
        initialSnapshotRef.current = "";
      } else {
        toast.error(data.error || data.message || "Failed to save basket");
      }
    } catch (error) {
      toast.error(error.message || "Failed to save basket");
    } finally {
      setLoading(false);
      isSubmittingRef.current = false;
    }
  };

  const handleCancel = () => {
    if (loading) return;
    if (isDirty && !window.confirm("You have unsaved changes. Are you sure you want to cancel?")) return;
    setFormData({ title: "", price: "", isActive: true, sortOrder: 0 });
    removeEmptyImage();
    removeFilledImage();
    initialSnapshotRef.current = "";
    onCancel?.();
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6 mb-6 border border-gray-200">
      <div className="flex items-start justify-between gap-4 mb-6">
        <h2 className="text-xl font-bold text-gray-900">
          {basket ? "Edit Fruit Basket" : "Add New Fruit Basket"}
        </h2>
        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            onClick={handleCancel}
            disabled={loading}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => formRef.current?.requestSubmit?.()}
            disabled={loading}
            className="btn-primary-brand px-4 py-2 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading && (
              <span className="inline-block w-4 h-4 border-2 border-white/60 border-t-white rounded-full animate-spin" />
            )}
            {basket ? "Update" : "Save"}
          </button>
        </div>
      </div>

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Title *</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-4 py-2.5 border-2 border-design rounded-lg focus:outline-none focus:border-[var(--primary)] transition bg-[var(--input)] text-design-foreground"
            placeholder="e.g., Wooden Basket, Premium Gift Box"
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Price (₹) *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              className="w-full px-4 py-2.5 border-2 border-design rounded-lg focus:outline-none focus:border-[var(--primary)] transition bg-[var(--input)] text-design-foreground"
              placeholder="0.00"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Display Order</label>
            <input
              type="number"
              min="0"
              value={formData.sortOrder}
              onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
              className="w-full px-4 py-2.5 border-2 border-design rounded-lg focus:outline-none focus:border-[var(--primary)] transition bg-[var(--input)] text-design-foreground"
            />
          </div>
        </div>

        <div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="w-4 h-4 rounded"
              style={{ accentColor: "var(--primary)" }}
            />
            <span className="text-sm font-semibold text-gray-700">Active (visible to customers)</span>
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Empty Basket Image *</label>
            <p className="text-xs text-gray-500 mb-2">Shown when user is selecting basket</p>
            <div className="space-y-3">
              {(emptyPreview || existingEmptyUrl) && (
                <div className="relative inline-block">
                  <img
                    src={emptyPreview || existingEmptyUrl}
                    alt="Empty basket"
                    className="w-full max-w-xs h-40 object-cover rounded-lg border-2 border-design"
                  />
                  <button
                    type="button"
                    onClick={removeEmptyImage}
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs transition"
                    style={{ backgroundColor: "var(--destructive)", color: "var(--primary-foreground)" }}
                  >
                    ×
                  </button>
                </div>
              )}
              <input
                ref={emptyInputRef}
                type="file"
                accept="image/*"
                onChange={handleEmptyImageChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => emptyInputRef.current?.click()}
                className="px-4 py-2.5 border-2 border-dashed border-design rounded-lg text-sm font-semibold transition w-full hover:border-[var(--primary)]"
                style={{ color: "var(--foreground)" }}
              >
                {emptyPreview || existingEmptyUrl ? "Change Image" : "Upload Empty Basket Image"}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Filled Basket Image</label>
            <p className="text-xs text-gray-500 mb-2">Shown after user adds fruits (representative preview)</p>
            <div className="space-y-3">
              {(filledPreview || existingFilledUrl) && (
                <div className="relative inline-block">
                  <img
                    src={filledPreview || existingFilledUrl}
                    alt="Filled basket"
                    className="w-full max-w-xs h-40 object-cover rounded-lg border-2 border-design"
                  />
                  <button
                    type="button"
                    onClick={removeFilledImage}
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs transition"
                    style={{ backgroundColor: "var(--destructive)", color: "var(--primary-foreground)" }}
                  >
                    ×
                  </button>
                </div>
              )}
              <input
                ref={filledInputRef}
                type="file"
                accept="image/*"
                onChange={handleFilledImageChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => filledInputRef.current?.click()}
                className="px-4 py-2.5 border-2 border-dashed border-design rounded-lg text-sm font-semibold transition w-full hover:border-[var(--primary)]"
                style={{ color: "var(--foreground)" }}
              >
                {filledPreview || existingFilledUrl ? "Change Image" : "Upload Filled Basket Image"}
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="btn-primary-brand flex-1 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading && (
              <span className="inline-block w-4 h-4 border-2 border-white/60 border-t-white rounded-full animate-spin" />
            )}
            {basket ? "Update" : "Save"}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            disabled={loading}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
