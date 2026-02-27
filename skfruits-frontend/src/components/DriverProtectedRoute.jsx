import { Navigate } from "react-router-dom";
import { useUserAuth } from "../context/UserAuthContext";

/**
 * Protects driver-only routes. Requires user to be logged in with role "driver".
 * Redirects to /login if not authenticated, or to / if authenticated but not a driver.
 */
export default function DriverProtectedRoute({ children }) {
  const { user, loading } = useUserAuth();

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

  if (!user) {
    return <Navigate to="/login" replace state={{ from: "/driver" }} />;
  }

  if (user.role !== "driver") {
    return <Navigate to="/" replace />;
  }

  return children;
}
