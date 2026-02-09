import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import GiftBoxLoader from "./GiftBoxLoader";
import { useProductLoader } from "../hooks/useProductLoader";

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const { showLoader: showAuthLoader } = useProductLoader(loading);

  if (loading) {
    return (
      <>
        <GiftBoxLoader 
          isLoading={loading} 
          showLoader={showAuthLoader}
        />
      </>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
}
