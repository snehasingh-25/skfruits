import { createContext, useContext, useState, useEffect } from "react";
import { API } from "../api";

const ADMIN_TOKEN_KEY = "adminToken";
const ADMIN_USER_KEY = "adminUser";
const AuthContext = createContext();

function getStored(key) {
  try { return localStorage.getItem(key) || null; } catch { return null; }
}

function setStored(key, value) {
  try {
    if (value) localStorage.setItem(key, typeof value === "string" ? value : JSON.stringify(value));
    else localStorage.removeItem(key);
  } catch { /* ignore */ }
}

function getStoredUser() {
  try {
    const raw = localStorage.getItem(ADMIN_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function AuthProvider({ children }) {
  // Restore cached admin data immediately so isAuthenticated is true before API check
  const [user, setUser] = useState(() => getStoredUser());
  const [token, setToken] = useState(() => getStored(ADMIN_TOKEN_KEY));
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
        setStored(ADMIN_USER_KEY, JSON.stringify(data.user));
      } else if (res.status === 401) {
        // Token is genuinely invalid — clear everything
        logout();
      } else {
        // Server error (500, etc.) — don't log out, show connection error
        setConnectionError(true);
      }
    } catch (error) {
      // Network error — don't log out, show connection error
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
          setStored(ADMIN_TOKEN_KEY, data.token);
          setStored(ADMIN_USER_KEY, JSON.stringify(data.user));
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
    setStored(ADMIN_TOKEN_KEY, null);
    setStored(ADMIN_USER_KEY, null);
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
