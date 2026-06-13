import { createPortal } from "react-dom";

// Calculates a human-friendly "per unit" price string from the label
function getUnitPrice(label, price) {
  if (!label || typeof label !== "string") return "";

  const match = label.toLowerCase().match(/^([\d.]+)\s*(g|kg|ml|l|pcs|pieces)?$/);
  if (!match) return "";

  const num = parseFloat(match[1]);
  const unit = match[2] || "g";
  if (isNaN(num) || num <= 0) return "";

  const conversions = {
    g:   { factor: 100 / num,          suffix: "100g" },
    kg:  { factor: 100 / (num * 1000), suffix: "100g" },
    ml:  { factor: 100 / num,          suffix: "100ml" },
    l:   { factor: 100 / (num * 1000), suffix: "100ml" },
    pcs: { factor: 1 / num,            suffix: "unit" },
    pieces: { factor: 1 / num,         suffix: "unit" },
  };

  const conv = conversions[unit];
  if (!conv) return "";

  return `₹${(price * conv.factor).toFixed(1)} / ${conv.suffix}`;
}

export default function VariantBottomSheet({
  isOpen,
  onClose,
  product,
  variantsList,
  selectedIdx,
  setSelectedIdx,
  isAdding,
  handleAddToCart,
}) {
  if (!isOpen) return null;

  const activeVariant = variantsList[selectedIdx] || null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex flex-col justify-end"
      style={{ backgroundColor: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="w-full rounded-t-[24px] p-6 max-h-[80vh] overflow-y-auto relative variant-modal-content flex flex-col gap-1"
        style={{
          backgroundColor: "var(--card-white)",
          boxShadow: "0 -8px 30px rgba(0,0,0,0.15)",
          color: "var(--foreground)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button floating above the sheet */}
        <button
          onClick={onClose}
          type="button"
          className="absolute -top-12 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full flex items-center justify-center shadow-lg text-lg font-bold focus:outline-none"
          style={{
            backgroundColor: "var(--card-white)",
            color: "var(--foreground)",
            border: "1px solid var(--separator)",
          }}
        >
          ×
        </button>

        {/* Header */}
        <h3 className="text-lg font-bold mb-1" style={{ color: "var(--foreground)" }}>
          {product.name}
        </h3>
        <p className="text-xs mb-4" style={{ color: "var(--foreground-muted)" }}>
          Select an option to add to cart
        </p>

        {/* Variant grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {variantsList.map((v, idx) => {
            const isSelected = selectedIdx === idx;
            const mrp = v.originalPrice > v.price ? v.originalPrice : null;
            const discount = mrp ? Math.round(((mrp - v.price) / mrp) * 100) : null;
            const unitPrice = getUnitPrice(v.label, v.price);

            return (
              <div
                key={v.id}
                onClick={() => setSelectedIdx(idx)}
                className="p-3.5 rounded-xl border-2 flex flex-col gap-1.5 cursor-pointer transition-all duration-200 relative"
                style={{
                  borderColor: isSelected ? "var(--accent)" : "var(--separator)",
                  backgroundColor: isSelected ? "var(--peach-bg)" : "var(--card-white)",
                  boxShadow: isSelected ? "var(--shadow-soft)" : "none",
                }}
              >
                {discount > 0 && (
                  <span
                    className="absolute top-2 right-2 px-1.5 py-0.5 text-[9px] font-bold rounded-md"
                    style={{ backgroundColor: "rgba(76,175,80,0.12)", color: "var(--success)" }}
                  >
                    {discount}% OFF
                  </span>
                )}

                <div className="font-semibold text-sm" style={{ color: "var(--foreground)" }}>
                  {v.label}
                </div>

                <div className="flex items-baseline gap-1.5 mt-auto">
                  <span className="font-bold text-sm" style={{ color: "var(--foreground)" }}>
                    ₹{v.price}
                  </span>
                  {mrp && (
                    <span className="text-xs line-through" style={{ color: "var(--foreground-muted)" }}>
                      ₹{mrp}
                    </span>
                  )}
                </div>

                {unitPrice && (
                  <div className="text-[10px] font-medium" style={{ color: "var(--foreground-muted)" }}>
                    {unitPrice}
                  </div>
                )}


              </div>
            );
          })}
        </div>

        {/* Footer — selected variant summary + ADD button */}
        <div
          className="mt-2 flex flex-col gap-3 pt-3"
          style={{ borderTop: "1px solid var(--separator)" }}
        >
          <div className="flex justify-between items-center">
            <div>
              <div className="text-xs font-medium" style={{ color: "var(--foreground-muted)" }}>
                Selected
              </div>
              <div className="font-semibold text-sm" style={{ color: "var(--foreground)" }}>
                {activeVariant?.label}
              </div>
            </div>
            <div className="text-right">
              <div className="font-extrabold text-lg" style={{ color: "var(--foreground)" }}>
                ₹{activeVariant?.price}
              </div>
              {activeVariant?.originalPrice > activeVariant?.price && (
                <div className="text-xs line-through" style={{ color: "var(--foreground-muted)" }}>
                  ₹{activeVariant.originalPrice}
                </div>
              )}
            </div>
          </div>

          <button
            disabled={isAdding}
            onClick={(e) => handleAddToCart(e)}
            className="w-full py-3 rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-2"
            style={{
              backgroundColor: "var(--accent)",
              color: "white",
              boxShadow: "var(--shadow-soft)",
            }}
          >
            {isAdding ? (
              <span className="inline-block w-4 h-4 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />
            ) : (
              "ADD"
            )}
          </button>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .variant-modal-content {
          animation: slideUp 0.3s ease-out forwards;
        }
      `}} />
    </div>,
    document.body
  );
}
