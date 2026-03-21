import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { API } from "../api";
import { useFruitBasket } from "../context/FruitBasketContext";
import { useUserAuth } from "../context/UserAuthContext";
import { useToast } from "../context/ToastContext";

export default function FruitBasketCreate() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToast();
  const { getAuthHeaders } = useUserAuth();
  const { selectedBasket, setSelectedBasket, startFreshBasket, hydrateFromSaved } = useFruitBasket();
  const [baskets, setBaskets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingSaved, setLoadingSaved] = useState(false);

  useEffect(() => {
    fetch(`${API}/baskets`)
      .then((res) => res.json())
      .then((data) => setBaskets(Array.isArray(data) ? data : []))
      .catch(() => setBaskets([]))
      .finally(() => setLoading(false));
  }, []);

  // Preselect basket from landing: /fruit-basket/create?basket=ID
  useEffect(() => {
    if (loading || !baskets.length) return;
    if (searchParams.get("fresh") === "1" || searchParams.get("saved")) return;
    const bid = Number(searchParams.get("basket"));
    if (!Number.isFinite(bid) || bid <= 0) return;
    const b = baskets.find((x) => x.id === bid);
    if (b) setSelectedBasket(b);
    setSearchParams(
      (prev) => {
        const n = new URLSearchParams(prev);
        n.delete("basket");
        return n;
      },
      { replace: true }
    );
  }, [loading, baskets, searchParams, setSelectedBasket, setSearchParams]);

  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    let next = new URLSearchParams(searchParams);
    let replaced = false;

    if (params.get("fresh") === "1") {
      startFreshBasket();
      next.delete("fresh");
      next.delete("basket");
      replaced = true;
    }

    const savedRaw = params.get("saved");
    if (!savedRaw) {
      if (replaced) setSearchParams(next, { replace: true });
      return;
    }

    const savedId = Number(savedRaw);
    if (!Number.isFinite(savedId) || savedId <= 0) {
      next.delete("saved");
      setSearchParams(next, { replace: true });
      return;
    }

    const auth = getAuthHeaders();
    if (!auth.Authorization) {
      toast.error("Log in to load a saved basket");
      navigate("/login", { replace: true, state: { from: `/fruit-basket/create?saved=${savedId}` } });
      return;
    }

    let cancelled = false;
    setLoadingSaved(true);

    (async () => {
      try {
        const res = await fetch(`${API}/saved-fruit-baskets/${savedId}`, { headers: auth });
        if (res.status === 401 || res.status === 403) {
          toast.error("Please log in with a customer account");
          navigate("/login", { replace: true, state: { from: `/fruit-basket/create?saved=${savedId}` } });
          return;
        }
        if (!res.ok) {
          toast.error("Saved basket not found");
          setSearchParams((prev) => {
            const n = new URLSearchParams(prev);
            n.delete("saved");
            return n;
          }, { replace: true });
          return;
        }
        const saved = await res.json();
        const ids = [...new Set((saved.fruits || []).map((f) => f.productId).filter(Boolean))];
        let products = [];
        if (ids.length > 0) {
          const pr = await fetch(`${API}/products?ids=${ids.join(",")}`);
          products = await pr.json();
          if (!Array.isArray(products)) products = [];
        }
        if (cancelled) return;
        const { missingProducts } = hydrateFromSaved(saved, products);
        if (missingProducts > 0) {
          toast.error(
            missingProducts === 1
              ? "One product in this basket is no longer available"
              : `${missingProducts} products are no longer available`
          );
        }
        next.delete("saved");
        setSearchParams(next, { replace: true });
        navigate("/fruit-basket/create/review", { replace: true });
      } catch {
        if (!cancelled) {
          toast.error("Could not load saved basket");
          setSearchParams((prev) => {
            const n = new URLSearchParams(prev);
            n.delete("saved");
            return n;
          }, { replace: true });
        }
      } finally {
        if (!cancelled) setLoadingSaved(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    searchParams,
    setSearchParams,
    getAuthHeaders,
    hydrateFromSaved,
    navigate,
    startFreshBasket,
    toast,
  ]);

  const handleChooseFruits = () => {
    if (selectedBasket) {
      navigate("/fruit-basket/create/fruits");
    }
  };

  if (loading || loadingSaved) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3" style={{ backgroundColor: "var(--background)" }}>
        <div
          className="animate-spin rounded-full w-10 h-10 border-2 border-t-transparent"
          style={{ borderColor: "var(--primary)" }}
        />
        {loadingSaved && (
          <p className="text-sm" style={{ color: "var(--foreground-muted)" }}>
            Loading your basket…
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4" style={{ backgroundColor: "var(--background)" }}>
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="font-display text-xl sm:text-4xl font-bold mb-3" style={{ color: "var(--foreground)" }}>
            Choose Your Basket
          </h1>
          <p className="text-lg" style={{ color: "var(--foreground-muted)" }}>
            Select a basket style, then add your favorite fruits
          </p>
        </div>

        {baskets.length === 0 ? (
          <div className="text-center py-16 rounded-2xl" style={{ backgroundColor: "var(--card-white)", border: "1px solid var(--border)" }}>
            <span className="text-5xl mb-4 block">🧺</span>
            <p className="text-lg font-medium mb-4" style={{ color: "var(--foreground-muted)" }}>
              No baskets available yet
            </p>
            <Link
              to="/fruit-basket"
              className="text-[var(--primary)] font-semibold hover:underline"
            >
              ← Back
            </Link>
          </div>
        ) : (
          <>
            <p className="text-sm text-center mb-4" style={{ color: "var(--foreground-muted)" }}>
              Swipe sideways to browse all basket styles
            </p>
            <div
              className="flex gap-4 overflow-x-auto pb-4 pt-1 -mx-4 px-4 sm:mx-0 sm:px-0 snap-x snap-mandatory scrollbar-thin mb-2"
              style={{ WebkitOverflowScrolling: "touch" }}
            >
              {baskets.map((basket) => {
                const isSelected = selectedBasket?.id === basket.id;
                const imgUrl = basket.emptyImageUrl || basket.filledImageUrl || "/logo.png";
                return (
                  <button
                    key={basket.id}
                    type="button"
                    onClick={() => setSelectedBasket(basket)}
                    className="relative flex-shrink-0 w-[42vw] max-w-[200px] sm:w-52 snap-start text-left rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--primary)]"
                    style={{
                      backgroundColor: "var(--card-white)",
                      border: isSelected ? "3px solid var(--primary)" : "1px solid var(--border)",
                      boxShadow: isSelected ? "0 0 0 2px var(--primary), var(--shadow-soft)" : "var(--shadow-card)",
                    }}
                  >
                    <div className="aspect-square flex items-center justify-center p-4" style={{ backgroundColor: "var(--secondary)" }}>
                      <img
                        src={imgUrl}
                        alt={basket.title}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-base line-clamp-2" style={{ color: "var(--foreground)" }}>
                        {basket.title}
                      </h3>
                      <p className="text-lg font-bold mt-1" style={{ color: "var(--primary)" }}>
                        ₹{Number(basket.price).toFixed(2)}
                      </p>
                    </div>
                    {isSelected && (
                      <div
                        className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: "var(--primary)", color: "var(--primary-foreground)" }}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                to="/fruit-basket"
                className="px-6 py-3 rounded-xl font-semibold transition"
                style={{ backgroundColor: "var(--secondary)", color: "var(--foreground)" }}
              >
                ← Back
              </Link>
              <button
                type="button"
                onClick={handleChooseFruits}
                disabled={!selectedBasket}
                className="btn-primary-brand px-8 py-4 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:-translate-y-0.5"
              >
                Choose Fruits →
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
