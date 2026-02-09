import { API } from "../../api";
import { useToast } from "../../context/ToastContext";
import OrderableList from "./OrderableList";

export default function OccasionList({ occasions, onEdit, onDelete }) {
  const toast = useToast();
  
  const handleDelete = async (occasionId) => {
    if (!confirm("Are you sure you want to delete this occasion?")) return;

    try {
      const token = localStorage.getItem("adminToken");
      const res = await fetch(`${API}/occasions/${occasionId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        toast.success("Occasion deleted");
        onDelete();
      } else {
        const data = await res.json();
        toast.error(data.error || data.message || "Failed to delete occasion");
      }
    } catch (error) {
      toast.error(error.message || "Failed to delete occasion");
    }
  };

  // Sort occasions by order
  const sortedOccasions = [...occasions].sort((a, b) => (a.order || 0) - (b.order || 0));

  const renderRow = (occasion, order, dragHandle, orderInput, isDragging) => (
    <div
      className={`flex items-center gap-4 p-4 transition-all ${
        isDragging ? "opacity-50" : "hover:bg-gray-50"
      }`}
    >
      {/* Drag Handle */}
      <div className="flex-shrink-0">{dragHandle}</div>

      {/* Order Input */}
      <div className="flex-shrink-0 w-20">
        {orderInput || (
          <div className="text-center">
            <div className="text-sm font-bold" style={{ color: 'oklch(20% .02 340)' }}>
              {order}
            </div>
          </div>
        )}
      </div>

      {/* Image */}
      <div className="flex-shrink-0">
        {occasion.imageUrl ? (
          <img
            src={occasion.imageUrl}
            alt={occasion.name}
            className="w-14 h-14 object-cover rounded-lg"
          />
        ) : (
          <div className="w-14 h-14 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'oklch(92% .04 340)' }}>
            <img src="/logo.png" alt="Gift Choice Logo" className="w-10 h-10 object-contain opacity-50" />
          </div>
        )}
      </div>

      {/* Name & Details */}
      <div className="flex-1 min-w-0">
        <div className="font-semibold" style={{ color: 'oklch(20% .02 340)' }}>
          {occasion.name}
        </div>
        <div className="text-xs" style={{ color: 'oklch(50% .02 340)' }}>
          Slug: {occasion.slug}
        </div>
      </div>

      {/* Badges */}
      <div className="flex-shrink-0">
        <div className="flex flex-wrap gap-1">
          {!occasion.isActive && (
            <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full font-semibold">
              Inactive
            </span>
          )}
          <span className="px-2 py-0.5 bg-pink-100 text-pink-700 text-xs rounded-full font-semibold">
            {occasion._count?.products || 0} products
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex-shrink-0 flex gap-2">
        <button
          onClick={() => onEdit(occasion)}
          className="px-3 py-1.5 rounded-lg text-sm font-semibold transition"
          style={{ backgroundColor: 'oklch(92% .04 340)', color: 'oklch(20% .02 340)' }}
          onMouseEnter={(e) => !isDragging && (e.target.style.backgroundColor = 'oklch(88% .06 340)')}
          onMouseLeave={(e) => (e.target.style.backgroundColor = 'oklch(92% .04 340)')}
        >
          Edit
        </button>
        <button
          onClick={() => handleDelete(occasion.id)}
          className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-sm font-semibold hover:bg-red-600 transition"
        >
          Delete
        </button>
      </div>
    </div>
  );

  const renderOrderInput = (occasion, currentOrder, inputValue, onChange, onBlur) => (
    <input
      type="number"
      min="1"
      max={sortedOccasions.length}
      value={inputValue}
      onChange={(e) => onChange(e.target.value)}
      onBlur={(e) => onBlur(e.target.value)}
      className="w-16 px-2 py-1 text-center text-sm font-bold border-2 rounded-lg focus:outline-none focus:ring-2 transition"
      style={{
        borderColor: 'oklch(92% .04 340)',
        color: 'oklch(20% .02 340)'
      }}
      onClick={(e) => e.stopPropagation()}
    />
  );

  return (
    <OrderableList
      items={sortedOccasions}
      onReorder={() => {
        // Refresh list after reorder
        if (onDelete) onDelete();
      }}
      reorderEndpoint="/occasions/reorder"
      getItemId={(o) => o.id}
      renderRow={renderRow}
      renderOrderInput={renderOrderInput}
      title="All Occasions"
      emptyState={
        <>
          <img src="/logo.png" alt="Gift Choice Logo" className="w-20 h-20 mx-auto mb-4 object-contain opacity-50" />
          <p className="text-gray-600 font-medium">No occasions yet. Add your first occasion above!</p>
        </>
      }
    />
  );
}
