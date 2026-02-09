import { useEffect, useMemo, useRef, useState } from "react";
import { API } from "../../api";
import { useToast } from "../../context/ToastContext";

export default function OccasionForm({ occasion, onSave, onCancel }) {
  const toast = useToast();
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    isActive: true,
  });
  const [image, setImage] = useState(null);
  const [existingImageUrl, setExistingImageUrl] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);
  const formRef = useRef(null);
  const isSubmittingRef = useRef(false);
  const initialSnapshotRef = useRef("");

  const snapshot = useMemo(() => {
    return JSON.stringify({
      formData,
      existingImageUrl,
      imageSelected: !!image,
      imagePreview: !!imagePreview,
    });
  }, [formData, existingImageUrl, image, imagePreview]);

  const isDirty = initialSnapshotRef.current !== "" && snapshot !== initialSnapshotRef.current;

  useEffect(() => {
    if (occasion) {
      setFormData({
        name: occasion.name || "",
        slug: occasion.slug || "",
        description: occasion.description || "",
        isActive: occasion.isActive !== undefined ? occasion.isActive : true,
      });
      setExistingImageUrl(occasion.imageUrl || null);
      setImagePreview(occasion.imageUrl || null);
      setImage(null);
    } else {
      setFormData({ name: "", slug: "", description: "", isActive: true });
      setExistingImageUrl(null);
      setImagePreview(null);
      setImage(null);
    }

    setTimeout(() => {
      initialSnapshotRef.current = JSON.stringify({
        formData: occasion
          ? {
              name: occasion.name || "",
              slug: occasion.slug || "",
              description: occasion.description || "",
              isActive: occasion.isActive !== undefined ? occasion.isActive : true,
            }
          : { name: "", slug: "", description: "", isActive: true },
        existingImageUrl: occasion?.imageUrl || null,
        imageSelected: false,
        imagePreview: !!occasion?.imageUrl,
      });
    }, 0);
  }, [occasion]);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImage(null);
    setImagePreview(null);
    setExistingImageUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmittingRef.current) return;
    setLoading(true);
    isSubmittingRef.current = true;

    try {
      const token = localStorage.getItem("adminToken");
      const url = occasion ? `${API}/occasions/${occasion.id}` : `${API}/occasions`;
      const method = occasion ? "PUT" : "POST";

      const formDataToSend = new FormData();
      formDataToSend.append("name", formData.name);
      formDataToSend.append("slug", formData.slug);
      formDataToSend.append("description", formData.description);
      formDataToSend.append("isActive", formData.isActive);
      
      if (image) {
        formDataToSend.append("image", image);
      }
      
      if (existingImageUrl && !image) {
        formDataToSend.append("existingImage", existingImageUrl);
      }

      const res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formDataToSend,
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(occasion ? "Exotic updated" : "Exotic created");
        onSave();
        setFormData({ name: "", slug: "", description: "", isActive: true });
        setImage(null);
        setImagePreview(null);
        setExistingImageUrl(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        initialSnapshotRef.current = "";
      } else {
        toast.error(data.error || data.message || "Failed to save occasion");
      }
    } catch (error) {
      toast.error(error.message || "Failed to save occasion");
    } finally {
      setLoading(false);
      isSubmittingRef.current = false;
    }
  };

  const handleCancel = () => {
    if (loading) return;
    if (isDirty) {
      const ok = window.confirm("You have unsaved changes. Are you sure you want to cancel?");
      if (!ok) return;
    }
    setFormData({ name: "", slug: "", description: "", isActive: true });
    setImage(null);
    setImagePreview(null);
    setExistingImageUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    initialSnapshotRef.current = "";
    onCancel?.();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      handleCancel();
      return;
    }
    if (e.key === "Enter") {
      const tag = e.target?.tagName;
      if (tag === "TEXTAREA") return;
      if (loading) return;
      e.preventDefault();
      formRef.current?.requestSubmit?.();
    }
  };

  return (
    <div className="rounded-xl shadow-md p-6 mb-6 border" style={{ backgroundColor: "var(--background)", borderColor: "var(--border)" }}>
      <div className="flex items-start justify-between gap-4 mb-6">
        <h2 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>
          {occasion ? "Edit Exotic" : "Add New Exotic"}
        </h2>
        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            onClick={handleCancel}
            disabled={loading}
            className="px-4 py-2 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: "var(--secondary)", color: "var(--foreground)" }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => formRef.current?.requestSubmit?.()}
            disabled={loading}
            className="px-4 py-2 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: "var(--primary)", color: "var(--primary-foreground)" }}
          >
            {loading && (
              <span className="inline-block w-4 h-4 border-2 border-white/60 border-t-white rounded-full animate-spin" />
            )}
            {occasion ? "Update" : "Save"}
          </button>
        </div>
      </div>
      <form ref={formRef} onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold mb-2" style={{ color: "var(--foreground)" }}>Name *</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => {
              setFormData({
                ...formData,
                name: e.target.value,
                slug: formData.slug || e.target.value.toLowerCase().replace(/\s+/g, "-"),
              });
            }}
            className="w-full px-4 py-2.5 border-2 rounded-lg focus:outline-none transition"
            style={{ borderColor: "var(--border)", backgroundColor: "var(--input)", color: "var(--foreground)" }}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-2" style={{ color: "var(--foreground)" }}>Slug (URL-friendly)</label>
          <input
            type="text"
            value={formData.slug}
            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
            className="w-full px-4 py-2.5 border-2 rounded-lg focus:outline-none transition"
            style={{ borderColor: "var(--border)", backgroundColor: "var(--input)", color: "var(--foreground)" }}
            placeholder="auto-generated"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-2" style={{ color: "var(--foreground)" }}>Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-4 py-2.5 border-2 rounded-lg focus:outline-none transition"
            style={{ borderColor: "var(--border)", backgroundColor: "var(--input)", color: "var(--foreground)" }}
            rows="2"
            placeholder="Optional"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-2" style={{ color: "var(--foreground)" }}>Image</label>
          <div className="space-y-4">
            {(imagePreview || existingImageUrl) && (
              <div className="relative inline-block">
                <img
                  src={imagePreview || existingImageUrl}
                  alt="Exotic preview"
                  className="w-32 h-32 object-cover rounded-lg border-2"
                  style={{ borderColor: "var(--border)" }}
                />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute -top-2 -right-2 rounded-full w-6 h-6 flex items-center justify-center text-xs transition"
                  style={{ backgroundColor: "var(--destructive)", color: "var(--primary-foreground)" }}
                >
                  ×
                </button>
              </div>
            )}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2.5 border-2 border-dashed rounded-lg text-sm font-semibold transition w-full"
                style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
              >
                {imagePreview || existingImageUrl ? "Change Image" : "Upload Image"}
              </button>
            </div>
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
            <span className="text-sm" style={{ color: "var(--foreground)" }}>Active (visible on frontend)</span>
          </label>
        </div>
        <div className="sticky bottom-0 pt-4 pb-2 border-t flex gap-4" style={{ backgroundColor: "var(--background)", borderColor: "var(--border)" }}>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: "var(--primary)", color: "var(--primary-foreground)" }}
          >
            {loading && (
              <span className="inline-block w-4 h-4 border-2 border-white/60 border-t-white rounded-full animate-spin" />
            )}
            {occasion ? "Update" : "Save"}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            disabled={loading}
            className="px-6 py-3 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: "var(--secondary)", color: "var(--foreground)" }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
