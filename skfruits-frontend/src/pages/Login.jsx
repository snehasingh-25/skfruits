import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useUserAuth } from "../context/UserAuthContext";
import { useCart } from "../context/CartContext";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useUserAuth();
  const { mergeCart } = useCart();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await login(email.trim(), password);

    if (result.success) {
      await mergeCart();
      navigate("/", { replace: true });
    } else {
      setError(result.error || "Login failed");
    }

    setLoading(false);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "var(--page-auth-bg)" }}
    >
      <div
        className="w-full max-w-md rounded-2xl shadow-xl p-8 md:p-10 border"
        style={{ background: "var(--background)", borderColor: "var(--border)" }}
      >
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img src="/logo.png" alt="SK Fruits" className="h-14 w-auto" />
          </div>
          <h1 className="font-display text-2xl md:text-3xl font-bold mb-2" style={{ color: "var(--foreground)" }}>
            Welcome back
          </h1>
          <p style={{ color: "var(--muted)" }}>Sign in to your account</p>
        </div>

        {error && (
          <div
            className="mb-6 p-4 rounded-lg border"
            style={{ borderColor: "var(--destructive)", backgroundColor: "var(--secondary)" }}
          >
            <p className="text-sm" style={{ color: "var(--destructive)" }}>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold mb-1.5" style={{ color: "var(--foreground)" }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full px-4 py-3 rounded-lg border-2 focus:outline-none focus:ring-2 transition"
              style={{
                background: "var(--input)",
                borderColor: "var(--border)",
                color: "var(--foreground)",
              }}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1.5" style={{ color: "var(--foreground)" }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full px-4 py-3 rounded-lg border-2 focus:outline-none focus:ring-2 transition"
              style={{
                background: "var(--input)",
                borderColor: "var(--border)",
                color: "var(--foreground)",
              }}
            />
            <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
              <Link to="/login" className="underline hover:no-underline">Forgot password?</Link>
              <span className="ml-1">(Coming soon)</span>
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary-brand w-full py-3 rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ borderRadius: "var(--radius-lg)" }}
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm" style={{ color: "var(--muted)" }}>
          Don&apos;t have an account?{" "}
          <Link to="/signup" className="font-semibold" style={{ color: "var(--primary)" }}>
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
