import { API } from "../../api";
import { useToast } from "../../context/ToastContext";
import OrderableList from "./OrderableList";

export default function BasketList({ baskets, onEdit, onDelete }) {
  const toast = useToast();

  const handleDelete = async (basketId) => {
    if (!confirm("Are you sure you want to delete this basket?")) return;

    try {
      const token = localStorage.getItem("adminToken");
      const res = await fetch(`${API}/baskets/${basketId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        toast.success("Basket deleted");
        onDelete();
      } else {
        const data = await res.json();
        toast.error(data.error || data.message || "Failed to delete basket");
      }
    } catch (error) {
      toast.error(error.message || "Failed to delete basket");
    }
  };

  const sortedBaskets = [...(baskets || [])]
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((b) => ({ ...b, order: b.sortOrder ?? 0 }));

  const renderRow = (basket, order, dragHandle, orderInput, isDragging) => (
    <div
      className={`flex items-center gap-4 p-4 transition-all ${
        isDragging ? "opacity-50" : "hover:bg-gray-50"
      }`}
    >
      <div className="flex-shrink-0">{dragHandle}</div>
      <div className="flex-shrink-0 w-16">{orderInput}</div>

      <div className="flex gap-3 flex-shrink-0">
        {basket.emptyImageUrl ? (
          <img
            src={basket.emptyImageUrl}
            alt={`${basket.title} empty`}
            className="w-16 h-16 object-cover rounded-lg border border-design"
          />
        ) : (
          <div
            className="w-16 h-16 rounded-lg flex items-center justify-center border border-design"
            style={{ backgroundColor: "var(--muted)" }}
          >
            <span className="text-xs text-muted">Empty</span>
          </div>
        )}
        {basket.filledImageUrl ? (
          <img
            src={basket.filledImageUrl}
            alt={`${basket.title} filled`}
            className="w-16 h-16 object-cover rounded-lg border border-design"
          />
        ) : (
          <div
            className="w-16 h-16 rounded-lg flex items-center justify-center border border-design"
            style={{ backgroundColor: "var(--muted)" }}
          >
            <span className="text-xs text-muted">Filled</span>
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="font-semibold" style={{ color: "var(--foreground)" }}>
          {basket.title}
        </div>
        <div className="text-sm mt-0.5" style={{ color: "var(--foreground-muted)" }}>
          ₹{Number(basket.price).toFixed(2)}
        </div>
      </div>

      <div className="flex-shrink-0">
        <span
          className={`inline-block px-2 py-1 text-xs rounded-full font-semibold ${
            basket.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
          }`}
        >
          {basket.isActive ? "Active" : "Inactive"}
        </span>
      </div>

      <div className="flex-shrink-0 flex gap-2">
        <button
          onClick={() => onEdit(basket)}
          className="px-3 py-1.5 rounded-lg text-sm font-semibold transition"
          style={{ backgroundColor: "var(--secondary)", color: "var(--foreground)" }}
        >
          Edit
        </button>
        <button
          onClick={() => handleDelete(basket.id)}
          className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-sm font-semibold hover:bg-red-600 transition"
        >
          Delete
        </button>
      </div>
    </div>
  );

  const renderOrderInput = (basket, currentOrder, inputValue, onChange, onBlur) => (
    <input
      type="number"
      min="1"
      max={sortedBaskets.length}
      value={inputValue}
      onChange={(e) => onChange(e.target.value)}
      onBlur={(e) => onBlur(e.target.value)}
      className="w-14 px-2 py-1 text-center text-sm font-semibold border-2 rounded-lg focus:outline-none focus:ring-2 transition"
      style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
      onClick={(e) => e.stopPropagation()}
    />
  );

  return (
    <OrderableList
      items={sortedBaskets}
      onReorder={() => onDelete?.()}
      reorderEndpoint="/baskets/reorder"
      getItemId={(b) => b.id}
      renderRow={renderRow}
      renderOrderInput={renderOrderInput}
      title="Fruit Baskets"
      emptyState={
        <>
          <span className="text-4xl mb-4">🧺</span>
          <p className="font-medium" style={{ color: "var(--foreground-muted)" }}>
            No fruit baskets yet. Add your first basket above!
          </p>
        </>
      }
    />
  );
}
