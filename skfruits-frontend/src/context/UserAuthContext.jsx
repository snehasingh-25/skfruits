import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { API } from "../api";

const USER_TOKEN_KEY = "skfruits_user_token";
const AuthContext = createContext();

function getStoredToken() {
  try {
    return localStorage.getItem(USER_TOKEN_KEY) || null;
  } catch {
    return null;
  }
}

function setStoredToken(token) {
  try {
    if (token) localStorage.setItem(USER_TOKEN_KEY, token);
    else localStorage.removeItem(USER_TOKEN_KEY);
  } catch (e) {
    console.warn("Could not persist auth token:", e);
  }
}

export function UserAuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async (authToken) => {
    if (!authToken) return null;
    try {
      const res = await fetch(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.user || null;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    const stored = getStoredToken();
    if (!stored) {
      setLoading(false);
      return;
    }
    setToken(stored);
    fetchUser(stored)
      .then((u) => {
        setUser(u);
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, [fetchUser]);

  const login = useCallback(
    async (email, password) => {
      try {
        const res = await fetch(`${API}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();

        if (!res.ok) {
          return { success: false, error: data.error || data.message || "Login failed" };
        }

        const isAdmin = data.user?.role === "admin" || data.user?.isAdmin;
        if (isAdmin) {
          try {
            localStorage.setItem("adminToken", data.token);
          } catch (_) {}
          return { success: true, redirectToAdmin: true };
        }

        const t = data.token;
        const u = data.user;
        setToken(t);
        setUser(u);
        setStoredToken(t);
        const isDriver = u?.role === "driver";
        return { success: true, ...(isDriver && { redirectToDriver: true }) };
      } catch (err) {
        console.error("Login error:", err);
        return { success: false, error: "Network error. Please try again." };
      }
    },
    []
  );

  const signup = useCallback(
    async (name, email, password) => {
      try {
        const res = await fetch(`${API}/auth/signup`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password }),
        });
        const data = await res.json();

        if (!res.ok) {
          return { success: false, error: data.error || "Signup failed" };
        }

        const t = data.token;
        const u = data.user;
        setToken(t);
        setUser(u);
        setStoredToken(t);
        return { success: true };
      } catch (err) {
        console.error("Signup error:", err);
        return { success: false, error: "Network error. Please try again." };
      }
    },
    []
  );

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setStoredToken(null);
  }, []);

  const getAuthHeaders = useCallback(() => {
    const t = getStoredToken();
    if (!t) return {};
    return { Authorization: `Bearer ${t}` };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!user,
        login,
        logout,
        signup,
        getAuthHeaders,
        refreshUser: () => fetchUser(getStoredToken()).then(setUser),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useUserAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useUserAuth must be used within UserAuthProvider");
  return ctx;
}
