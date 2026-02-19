import { Navigate } from "react-router-dom";
import { useUserAuth } from "../context/UserAuthContext";
import GiftBoxLoader from "./GiftBoxLoader";
import { useProductLoader } from "../hooks/useProductLoader";

/**
 * Protects driver-only routes. Requires user to be logged in with role "driver".
 * Redirects to /login if not authenticated, or to / if authenticated but not a driver.
 */
export default function DriverProtectedRoute({ children }) {
  const { user, loading } = useUserAuth();
  const { showLoader: showAuthLoader } = useProductLoader(loading);

  if (loading) {
    return (
      <GiftBoxLoader
        isLoading={loading}
        showLoader={showAuthLoader}
      />
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
