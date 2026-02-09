import { API } from "../../api";
import { useToast } from "../../context/ToastContext";
import OrderableList from "./OrderableList";

export default function SeasonalList({ seasonals, onEdit, onDelete }) {
  const toast = useToast();

  const handleDelete = async (seasonalId) => {
    if (!confirm("Are you sure you want to delete this seasonal item?")) return;
    try {
      const token = localStorage.getItem("adminToken");
      const res = await fetch(`${API}/seasonal/${seasonalId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast.success("Seasonal deleted");
        onDelete();
      } else {
        const data = await res.json();
        toast.error(data.error || data.message || "Failed to delete seasonal");
      }
    } catch (error) {
      toast.error(error.message || "Failed to delete seasonal");
    }
  };

  const sortedSeasonals = [...seasonals].sort((a, b) => (a.order || 0) - (b.order || 0));

  const renderRow = (seasonal, order, dragHandle, orderInput, isDragging) => (
    <div
      className={`flex items-center gap-4 p-4 transition-all ${isDragging ? "opacity-50" : ""}`}
      style={{ backgroundColor: "transparent" }}
      onMouseEnter={(e) => { if (!isDragging) e.currentTarget.style.backgroundColor = "var(--secondary)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
    >
      <div className="flex-shrink-0">{dragHandle}</div>
      <div className="flex-shrink-0 w-20">
        {orderInput || (
          <div className="text-center">
            <div className="text-sm font-bold" style={{ color: "var(--foreground)" }}>{order}</div>
          </div>
        )}
      </div>
      <div className="flex-shrink-0">
        {seasonal.imageUrl ? (
          <img src={seasonal.imageUrl} alt={seasonal.name} className="w-14 h-14 object-cover rounded-lg" />
        ) : (
          <div className="w-14 h-14 rounded-lg flex items-center justify-center" style={{ backgroundColor: "var(--secondary)" }}>
            <img src="/logo.png" alt="SK Fruits" className="w-10 h-10 object-contain opacity-50" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold" style={{ color: "var(--foreground)" }}>{seasonal.name}</div>
        <div className="text-xs" style={{ color: "var(--muted)" }}>Slug: {seasonal.slug}</div>
      </div>
      <div className="flex-shrink-0">
        {!seasonal.isActive && (
          <span className="px-2 py-0.5 text-xs rounded-full font-semibold" style={{ backgroundColor: "var(--secondary)", color: "var(--muted)" }}>Inactive</span>
        )}
      </div>
      <div className="flex-shrink-0 flex gap-2">
        <button
          onClick={() => onEdit(seasonal)}
          className="px-3 py-1.5 rounded-lg text-sm font-semibold transition"
          style={{ backgroundColor: "var(--secondary)", color: "var(--foreground)" }}
        >
          Edit
        </button>
        <button
          onClick={() => handleDelete(seasonal.id)}
          className="px-3 py-1.5 rounded-lg text-sm font-semibold transition"
          style={{ backgroundColor: "var(--destructive)", color: "var(--primary-foreground)" }}
        >
          Delete
        </button>
      </div>
    </div>
  );

  const renderOrderInput = (seasonal, currentOrder, inputValue, onChange, onBlur) => (
    <input
      type="number"
      min="1"
      max={sortedSeasonals.length}
      value={inputValue}
      onChange={(e) => onChange(e.target.value)}
      onBlur={(e) => onBlur(e.target.value)}
      className="w-16 px-2 py-1 text-center text-sm font-bold border-2 rounded-lg focus:outline-none transition"
      style={{ borderColor: "var(--border)", color: "var(--foreground)", backgroundColor: "var(--input)" }}
      onClick={(e) => e.stopPropagation()}
    />
  );

  return (
    <OrderableList
      items={sortedSeasonals}
      onReorder={() => onDelete?.()}
      reorderEndpoint="/seasonal/reorder"
      getItemId={(s) => s.id}
      renderRow={renderRow}
      renderOrderInput={renderOrderInput}
      title="All Seasonal"
      emptyState={
        <>
          <img src="/logo.png" alt="SK Fruits" className="w-20 h-20 mx-auto mb-4 object-contain opacity-50" />
          <p className="font-medium" style={{ color: "var(--muted)" }}>No seasonal items yet. Add your first seasonal above!</p>
        </>
      }
    />
  );
}
