import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading, connectionError, verifyToken } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--background)" }}>
        <div
          className="animate-spin rounded-full w-10 h-10 border-2 border-t-transparent"
          style={{ borderColor: "var(--primary)" }}
          aria-hidden="true"
        />
      </div>
    );
  }

  if (connectionError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center" style={{ backgroundColor: "var(--background)" }}>
        <div className="max-w-md w-full bg-[var(--secondary)] rounded-2xl border border-[var(--border)] p-8 shadow-lg">
          <div className="w-16 h-16 bg-[var(--accent)] text-[var(--foreground)] rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-2xl">
            !
          </div>
          <h2 className="text-xl font-bold font-display mb-2" style={{ color: "var(--foreground)" }}>
            Connection Error
          </h2>
          <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
            We could not verify your admin session because the server is unreachable or returned an error. Please try again.
          </p>
          <button
            onClick={verifyToken}
            className="w-full py-2.5 rounded-xl font-semibold text-sm transition-all shadow-md hover:shadow-lg cursor-pointer"
            style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
          >
            Retry Verification
          </button>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
}
