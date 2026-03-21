import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { API } from "../api";
import { useUserAuth } from "../context/UserAuthContext";
import { useToast } from "../context/ToastContext";

function basketThumbUrl(b) {
  return b?.emptyImageUrl || b?.filledImageUrl || "/logo.png";
}

export default function FruitBasketLanding() {
  const navigate = useNavigate();
  const toast = useToast();
  const { isAuthenticated, user, loading: authLoading, getAuthHeaders } = useUserAuth();
  const [savedList, setSavedList] = useState([]);
  const [savedLoading, setSavedLoading] = useState(false);
  const [baskets, setBaskets] = useState([]);
  const [basketsLoading, setBasketsLoading] = useState(true);

  const isCustomer = isAuthenticated && user?.role === "customer";

  useEffect(() => {
    fetch(`${API}/baskets`)
      .then((res) => res.json())
      .then((data) => setBaskets(Array.isArray(data) ? data : []))
      .catch(() => setBaskets([]))
      .finally(() => setBasketsLoading(false));
  }, []);

  const fetchSaved = useCallback(async () => {
    if (!isCustomer) {
      setSavedList([]);
      return;
    }
    const auth = getAuthHeaders();
    if (!auth.Authorization) return;
    setSavedLoading(true);
    try {
      const res = await fetch(`${API}/saved-fruit-baskets`, { headers: auth });
      if (!res.ok) throw new Error("Failed to load saved baskets");
      const data = await res.json();
      setSavedList(Array.isArray(data) ? data : []);
    } catch {
      setSavedList([]);
      toast.error("Could not load your saved baskets");
    } finally {
      setSavedLoading(false);
    }
  }, [getAuthHeaders, isCustomer, toast]);

  useEffect(() => {
    if (authLoading) return;
    fetchSaved();
  }, [authLoading, fetchSaved]);

  const handleDeleteSaved = async (id, name) => {
    if (!window.confirm(`Remove “${name}” from your saved baskets?`)) return;
    const auth = getAuthHeaders();
    try {
      const res = await fetch(`${API}/saved-fruit-baskets/${id}`, {
        method: "DELETE",
        headers: auth,
      });
      if (!res.ok) throw new Error();
      setSavedList((prev) => prev.filter((s) => s.id !== id));
      toast.success("Saved basket removed");
    } catch {
      toast.error("Could not delete");
    }
  };

  const scrollRowClass =
    "flex gap-4 overflow-x-auto pb-4 pt-1 -mx-4 px-4 sm:mx-0 sm:px-0 snap-x snap-mandatory scrollbar-thin";
  const scrollStyle = { WebkitOverflowScrolling: "touch" };

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6" style={{ backgroundColor: "var(--background)" }}>
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="font-display text-4xl sm:text-5xl font-bold mb-4" style={{ color: "var(--foreground)" }}>
            Create Your Perfect Fruit Basket
          </h1>
          <p className="text-lg mb-8 max-w-2xl mx-auto" style={{ color: "var(--foreground-muted)" }}>
            Handpick your fruits, choose your basket, and we'll deliver freshness to your door
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-10">
            <Link
              to="/fruit-basket/create?fresh=1"
              className="btn-primary-brand inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-lg font-semibold transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.98]"
            >
              Create New Basket
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
            {!authLoading && !isCustomer && (
              <Link
                to="/login"
                state={{ from: "/fruit-basket" }}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-base font-semibold border-2 transition hover:shadow-md"
                style={{ borderColor: "var(--primary)", color: "var(--primary)" }}
              >
                Log in to save baskets
              </Link>
            )}
          </div>
        </div>

        {/* Basket styles — horizontal scroll (below hero / create CTA) */}
        <section className="mb-14 text-left" aria-label="Basket styles">
          <h2 className="font-display text-lg sm:text-xl font-bold mb-4" style={{ color: "var(--foreground)" }}>
            Basket styles
          </h2>
          {basketsLoading ? (
            <div className="flex justify-center py-10">
              <div
                className="animate-spin rounded-full w-10 h-10 border-2 border-t-transparent"
                style={{ borderColor: "var(--primary)" }}
              />
            </div>
          ) : baskets.length === 0 ? (
            <p className="text-sm py-6 px-4 rounded-2xl text-center" style={{ color: "var(--foreground-muted)", backgroundColor: "var(--card-white)", border: "1px solid var(--border)" }}>
              No basket styles available yet. Check back soon.
            </p>
          ) : (
            <div className={scrollRowClass} style={scrollStyle}>
              {baskets.map((b) => {
                const imgUrl = basketThumbUrl(b);
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => navigate(`/fruit-basket/create?basket=${b.id}`)}
                    className="flex-shrink-0 w-[42vw] max-w-[200px] sm:w-52 snap-start text-left rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--primary)]"
                    style={{
                      backgroundColor: "var(--card-white)",
                      border: "1px solid var(--border)",
                      boxShadow: "var(--shadow-card)",
                    }}
                  >
                    <div className="aspect-square flex items-center justify-center p-3" style={{ backgroundColor: "var(--secondary)" }}>
                      <img src={imgUrl} alt={b.title} className="w-full h-full object-contain" />
                    </div>
                    <div className="p-3">
                      <h3 className="font-semibold text-sm line-clamp-2" style={{ color: "var(--foreground)" }}>
                        {b.title}
                      </h3>
                      <p className="text-base font-bold mt-1" style={{ color: "var(--primary)" }}>
                        ₹{Number(b.price).toFixed(2)}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
          <p className="text-xs mt-2 text-center sm:text-left" style={{ color: "var(--foreground-muted)" }}>
            Swipe sideways to see all styles · Tap to start with that basket
          </p>
        </section>

        {isCustomer && (
          <section className="text-left mb-8" aria-label="Your saved baskets">
            <h2 className="font-display text-lg sm:text-xl font-bold mb-4" style={{ color: "var(--foreground)" }}>
              Your saved baskets
            </h2>
            {savedLoading ? (
              <div className="flex justify-center py-10">
                <div
                  className="animate-spin rounded-full w-8 h-8 border-2 border-t-transparent"
                  style={{ borderColor: "var(--primary)" }}
                />
              </div>
            ) : savedList.length === 0 ? (
              <p
                className="text-sm py-4 rounded-2xl px-4"
                style={{ color: "var(--foreground-muted)", backgroundColor: "var(--card-white)", border: "1px solid var(--border)" }}
              >
                No saved baskets yet. Build one and tap <strong>Save basket</strong> on the review step.
              </p>
            ) : (
              <>
                <div className={scrollRowClass} style={scrollStyle}>
                  {savedList.map((s) => {
                    const imgUrl = basketThumbUrl(s.fruitBasket);
                    return (
                      <div
                        key={s.id}
                        className="flex-shrink-0 w-[min(78vw,280px)] sm:w-72 snap-start rounded-2xl overflow-hidden flex flex-col"
                        style={{
                          backgroundColor: "var(--card-white)",
                          border: "1px solid var(--border)",
                          boxShadow: "var(--shadow-soft)",
                        }}
                      >
                        <div className="aspect-[4/3] flex items-center justify-center p-3" style={{ backgroundColor: "var(--secondary)" }}>
                          <img
                            src={imgUrl}
                            alt={s.fruitBasket?.title || s.name}
                            className="max-h-full max-w-full object-contain"
                          />
                        </div>
                        <div className="p-4 flex flex-col flex-1 gap-3">
                          <div className="min-w-0">
                            <div className="font-semibold line-clamp-2" style={{ color: "var(--foreground)" }}>
                              {s.name}
                            </div>
                            <div className="text-sm mt-1" style={{ color: "var(--foreground-muted)" }}>
                              {s.fruitBasket?.title || "Basket"} · {Array.isArray(s.fruits) ? s.fruits.length : 0} line(s)
                            </div>
                          </div>
                          <div className="flex gap-2 mt-auto">
                            <button
                              type="button"
                              onClick={() => navigate(`/fruit-basket/create?saved=${s.id}`)}
                              className="flex-1 btn-primary-brand py-2.5 rounded-xl text-sm font-semibold"
                            >
                              Load
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteSaved(s.id, s.name)}
                              className="flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition text-red-600 border-red-200 hover:bg-red-50"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs mt-2" style={{ color: "var(--foreground-muted)" }}>
                  Swipe sideways to browse saved baskets
                </p>
              </>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
