import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

const ToastContext = createContext(null);

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef(new Map());

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const t = timersRef.current.get(id);
    if (t) {
      clearTimeout(t);
      timersRef.current.delete(id);
    }
  }, []);

  const push = useCallback(
    (type, message, opts = {}) => {
      const id = uid();
      const duration = typeof opts.duration === "number" ? opts.duration : 2600;
      setToasts((prev) => [...prev, { id, type, message }]);
      if (duration > 0) {
        const timer = setTimeout(() => remove(id), duration);
        timersRef.current.set(id, timer);
      }
      return id;
    },
    [remove]
  );

  const api = useMemo(
    () => ({
      toasts,
      remove,
      success: (msg, opts) => push("success", msg, opts),
      error: (msg, opts) => push("error", msg, opts),
      info: (msg, opts) => push("info", msg, opts),
      warning: (msg, opts) => push("warning", msg, opts),
    }),
    [toasts, remove, push]
  );

  return <ToastContext.Provider value={api}>{children}</ToastContext.Provider>;
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

