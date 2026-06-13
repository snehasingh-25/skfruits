import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { API } from "../api";

const USER_TOKEN_KEY = "skfruits_user_token";
const USER_DATA_KEY = "skfruits_user_data";
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

function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_DATA_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setStoredUser(user) {
  try {
    if (user) localStorage.setItem(USER_DATA_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_DATA_KEY);
  } catch { /* ignore */ }
}

export function UserAuthProvider({ children }) {
  // Restore cached user immediately so isAuthenticated is true before API check
  const [user, setUser] = useState(() => getStoredUser());
  const [token, setToken] = useState(() => getStoredToken());
  const [loading, setLoading] = useState(true);

  // Returns { user, authFailed } — authFailed is true only on 401 (token is invalid)
  const fetchUser = useCallback(async (authToken) => {
    if (!authToken) return { user: null, authFailed: true };
    try {
      const res = await fetch(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.status === 401) return { user: null, authFailed: true };
      if (!res.ok) return { user: null, authFailed: false }; // server error — don't log out
      const data = await res.json();
      return { user: data.user || null, authFailed: !data.user };
    } catch {
      // Network error — don't log out
      return { user: null, authFailed: false };
    }
  }, []);

  useEffect(() => {
    const stored = getStoredToken();
    if (!stored) {
      setUser(null);
      setStoredUser(null);
      setLoading(false);
      return;
    }
    // Token exists — verify it in the background
    fetchUser(stored)
      .then((result) => {
        if (result.authFailed) {
          // Token is genuinely invalid (401) — clear everything
          setUser(null);
          setToken(null);
          setStoredToken(null);
          setStoredUser(null);
        } else if (result.user) {
          // Successful verification — update user with fresh data
          setUser(result.user);
          setStoredUser(result.user);
        }
        // else: network/server error — keep cached user from localStorage
      })
      .catch(() => {
        // Unexpected error — keep cached user
      })
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
        setStoredUser(u);
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
        setStoredUser(u);
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
    setStoredUser(null);
  }, []);

  const loginWithToken = useCallback(async (authToken, userData) => {
    try {
      // If userData is provided (e.g., from OAuth), use it directly
      if (userData && userData.id) {
        setToken(authToken);
        setUser(userData);
        setStoredToken(authToken);
        setStoredUser(userData);
        return true;
      }

      // Otherwise, validate the token by fetching user data
      const result = await fetchUser(authToken);
      if (result.authFailed || !result.user) {
        return false;
      }

      setToken(authToken);
      setUser(result.user);
      setStoredToken(authToken);
      setStoredUser(result.user);
      return true;
    } catch (error) {
      console.error("Login with token error:", error);
      return false;
    }
  }, [fetchUser]);

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
        loginWithToken,
        logout,
        signup,
        getAuthHeaders,
        refreshUser: () =>
          fetchUser(getStoredToken()).then((result) => {
            if (result.authFailed) {
              setUser(null);
              setToken(null);
              setStoredToken(null);
            } else if (result.user) {
              setUser(result.user);
            }
          }),
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
