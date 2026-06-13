import { createContext, useContext, useState, useEffect } from "react";
import { API } from "../api";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("adminToken"));
  const [loading, setLoading] = useState(true);
  const [connectionError, setConnectionError] = useState(false);

  useEffect(() => {
    if (token) {
      verifyToken();
    } else {
      setLoading(false);
    }
  }, []);

  const verifyToken = async () => {
    try {
      setConnectionError(false);
      const res = await fetch(`${API}/auth/verify`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else if (res.status === 401) {
        logout();
      } else {
        setConnectionError(true);
      }
    } catch (error) {
      console.error("Token verification error:", error);
      setConnectionError(true);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        if (data.user?.isAdmin) {
          setToken(data.token);
          setUser(data.user);
          localStorage.setItem("adminToken", data.token);
          setConnectionError(false);
          return { success: true };
        }
        return { success: false, message: "This account is not an administrator. Use the storefront login for customers and drivers." };
      }
      return { success: false, message: data.message || data.error || "Login failed" };
    } catch (error) {
      return { success: false, message: "Network error. Please try again." };
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("adminToken");
    setConnectionError(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        logout,
        isAuthenticated: !!user,
        connectionError,
        verifyToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
