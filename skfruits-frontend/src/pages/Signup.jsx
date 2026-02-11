import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useUserAuth } from "../context/UserAuthContext";
import { useCart } from "../context/CartContext";

const initialForm = { name: "", email: "", password: "", confirmPassword: "" };

export default function Signup() {
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signup } = useUserAuth();
  const { mergeCart } = useCart();
  const navigate = useNavigate();

  const update = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (error) setError("");
  };

  const validate = () => {
    if (!form.name.trim()) {
      setError("Name is required");
      return false;
    }
    if (!form.email.trim()) {
      setError("Email is required");
      return false;
    }
    if (!form.password) {
      setError("Password is required");
      return false;
    }
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters");
      return false;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!validate()) return;

    setLoading(true);
    const result = await signup(form.name.trim(), form.email.trim(), form.password);

    if (result.success) {
      await mergeCart();
      navigate("/", { replace: true });
    } else {
      setError(result.error || "Signup failed");
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
            Create account
          </h1>
          <p style={{ color: "var(--muted)" }}>Join SK Fruits for a fresher experience</p>
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
              Name
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="Your full name"
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
              Email
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
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
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              placeholder="At least 6 characters"
              required
              minLength={6}
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
              Confirm Password
            </label>
            <input
              type="password"
              value={form.confirmPassword}
              onChange={(e) => update("confirmPassword", e.target.value)}
              placeholder="Repeat password"
              required
              className="w-full px-4 py-3 rounded-lg border-2 focus:outline-none focus:ring-2 transition"
              style={{
                background: "var(--input)",
                borderColor: "var(--border)",
                color: "var(--foreground)",
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary-brand w-full py-3 rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ borderRadius: "var(--radius-lg)" }}
          >
            {loading ? "Creating account…" : "Sign up"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm" style={{ color: "var(--muted)" }}>
          Already have an account?{" "}
          <Link to="/login" className="font-semibold" style={{ color: "var(--primary)" }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
