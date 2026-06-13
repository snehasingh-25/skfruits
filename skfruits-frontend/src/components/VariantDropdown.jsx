import { useState, useEffect } from "react";

/**
 * Custom Variant Dropdown Selector styled using brand colors
 */
export default function VariantDropdown({ variants, selectedIdx, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const activeVariant = variants[selectedIdx];

  useEffect(() => {
    if (!isOpen) return;
    const closeDropdown = () => setIsOpen(false);
    document.addEventListener("click", closeDropdown);
    return () => document.removeEventListener("click", closeDropdown);
  }, [isOpen]);

  if (!activeVariant) return null;

  return (
    <div className="relative mb-2 w-full text-left" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-none cursor-pointer shadow-sm text-left"
        style={{
          backgroundColor: "var(--peach-bg)",
          color: "var(--foreground-muted)",
          border: "1px solid var(--separator)",
          borderRadius: "var(--radius-md)",
        }}
      >
        <span>{activeVariant.label} - ₹{activeVariant.price}</span>
        <svg
          className={`w-4 h-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          style={{ color: "var(--foreground-muted)" }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <ul
          className="absolute left-0 right-0 mt-1 max-h-60 overflow-y-auto rounded-lg shadow-lg z-[40] py-1 text-xs"
          style={{
            backgroundColor: "var(--peach-bg)",
            border: "1px solid var(--separator)",
            color: "var(--foreground)",
            animation: "fadeIn 0.2s ease-out",
          }}
        >
          {variants.map((v, idx) => (
            <li
              key={v.id}
              onClick={() => {
                onChange(idx);
                setIsOpen(false);
              }}
              className={`px-3 py-2 cursor-pointer transition-colors duration-150 flex items-center justify-between`}
              style={{
                backgroundColor: selectedIdx === idx ? "var(--peach-soft)" : "transparent",
                fontWeight: selectedIdx === idx ? "bold" : "normal",
                color: selectedIdx === idx ? "var(--primary)" : "var(--foreground)",
              }}
              onMouseEnter={(e) => {
                if (selectedIdx !== idx) {
                  e.currentTarget.style.backgroundColor = "var(--background)";
                }
              }}
              onMouseLeave={(e) => {
                if (selectedIdx !== idx) {
                  e.currentTarget.style.backgroundColor = "transparent";
                }
              }}
            >
              <span>{v.label}</span>
              <span style={{ color: "var(--foreground-muted)", fontWeight: "500" }}>
                ₹{v.price}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
