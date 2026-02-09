import { useToast } from "../context/ToastContext";

function typeStyles(type) {
  switch (type) {
    case "success":
      return {
        border: "border-emerald-200",
        bg: "bg-white",
        dot: "bg-emerald-500",
        text: "text-gray-900",
      };
    case "error":
      return {
        border: "border-red-200",
        bg: "bg-white",
        dot: "bg-red-500",
        text: "text-gray-900",
      };
    case "warning":
      return {
        border: "border-amber-200",
        bg: "bg-white",
        dot: "bg-amber-500",
        text: "text-gray-900",
      };
    default:
      return {
        border: "border-gray-200",
        bg: "bg-white",
        dot: "bg-gray-500",
        text: "text-gray-900",
      };
  }
}

export default function ToastViewport() {
  const { toasts, remove } = useToast();
  if (!toasts.length) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] w-[92vw] max-w-sm space-y-3">
      {toasts.map((t) => {
        const s = typeStyles(t.type);
        return (
          <div
            key={t.id}
            role="status"
            aria-live="polite"
            className={[
              "rounded-2xl border shadow-lg px-4 py-3 backdrop-blur",
              s.border,
              s.bg,
            ].join(" ")}
          >
            <div className="flex items-start gap-3">
              <div className={["mt-1 h-2.5 w-2.5 rounded-full", s.dot].join(" ")} />
              <div className={["text-sm font-semibold leading-snug", s.text].join(" ")}>
                {t.message}
              </div>
              <button
                type="button"
                onClick={() => remove(t.id)}
                className="ml-auto text-gray-500 hover:text-gray-900 font-bold px-2 focus:outline-none focus:ring-2 focus:ring-pink-500/40 rounded-lg"
                aria-label="Dismiss notification"
              >
                ×
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

