import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { API } from "../api";
import { useFruitBasket } from "../context/FruitBasketContext";
import { useCart } from "../context/CartContext";
import { useToast } from "../context/ToastContext";
import { useUserAuth } from "../context/UserAuthContext";
import { setPendingOrderNotes, clearPendingOrderNotes } from "../utils/orderNotesStorage";

export default function FruitBasketReview() {
  const navigate = useNavigate();
  const toast = useToast();
  const { addFruitBasketBundleToCart } = useCart();
  const {
    selectedBasket,
    selectedFruits,
    hasFruits,
    getBasketTotal,
    removeFruit,
    updateFruitQuantity,
    clearBasket,
    serializeFruitsForSave,
    editingSavedId,
    editingSavedName,
    setEditingSavedId,
    setEditingSavedName,
  } = useFruitBasket();

  const { isAuthenticated, user, getAuthHeaders } = useUserAuth();
  const isCustomer = isAuthenticated && user?.role === "customer";

  const [adding, setAdding] = useState(false);
  const [giftOpen, setGiftOpen] = useState(false);
  const [giftMessage, setGiftMessage] = useState("");
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (saveOpen) {
      setSaveName(
        editingSavedName?.trim() ||
          `My basket — ${new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date())}`
      );
    }
  }, [saveOpen, editingSavedName]);

  if (!selectedBasket) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ backgroundColor: "var(--background)" }}>
        <p className="text-lg mb-4" style={{ color: "var(--foreground-muted)" }}>
          No basket selected
        </p>
        <Link to="/fruit-basket/create" className="btn-primary-brand px-6 py-3 rounded-xl font-semibold">
          Choose Basket
        </Link>
      </div>
    );
  }

  const total = getBasketTotal();
  const basketImg = hasFruits
    ? selectedBasket.filledImageUrl || selectedBasket.emptyImageUrl
    : selectedBasket.emptyImageUrl;

  const buildPayload = () => ({
    fruitBasketId: selectedBasket.id,
    items: selectedFruits.map((f) => ({
      productId: f.productId,
      quantity: f.quantity,
      selectedWeight: f.selectedWeight || null,
      productSizeId:
        f.selectedSize?.id != null && f.selectedSize.id !== 0 ? f.selectedSize.id : null,
    })),
  });

  const handleAddToCart = async () => {
    if (!hasFruits) {
      toast.error("Add at least one fruit to your basket");
      return;
    }
    clearPendingOrderNotes();
    setAdding(true);
    const ok = await addFruitBasketBundleToCart(buildPayload());
    setAdding(false);
    if (ok) {
      clearBasket();
      navigate("/cart");
    }
  };

  const handleSaveBasket = async () => {
    if (!hasFruits) {
      toast.error("Add at least one fruit to save");
      return;
    }
    const name = saveName.trim();
    if (!name) {
      toast.error("Enter a name for this basket");
      return;
    }
    const auth = getAuthHeaders();
    if (!auth.Authorization) {
      toast.error("Log in to save your basket");
      return;
    }
    setSaving(true);
    try {
      const fruits = serializeFruitsForSave();
      const payload = {
        name,
        fruitBasketId: selectedBasket.id,
        fruits,
      };
      const url =
        editingSavedId != null
          ? `${API}/saved-fruit-baskets/${editingSavedId}`
          : `${API}/saved-fruit-baskets`;
      const res = await fetch(url, {
        method: editingSavedId != null ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json", ...auth },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || data.message || "Could not save");
        return;
      }
      if (data.id != null) {
        setEditingSavedId(data.id);
        setEditingSavedName(typeof data.name === "string" ? data.name : name);
      }
      toast.success(editingSavedId != null ? "Basket updated" : "Basket saved");
      setSaveOpen(false);
    } catch {
      toast.error("Could not save");
    } finally {
      setSaving(false);
    }
  };

  const handleSendAsGift = async () => {
    if (!hasFruits) {
      toast.error("Add at least one fruit to your basket");
      return;
    }
    const note = giftMessage.trim()
      ? `🎁 Gift order\n${giftMessage.trim()}`
      : "🎁 Gift order (customer requested gift packaging / delivery as gift)";
    setPendingOrderNotes(note);
    setGiftOpen(false);
    setAdding(true);
    const ok = await addFruitBasketBundleToCart(buildPayload());
    setAdding(false);
    if (ok) {
      setGiftMessage("");
      clearBasket();
      navigate("/cart");
    } else {
      clearPendingOrderNotes();
    }
  };

  return (
    <div className="min-h-screen py-8 px-4 pb-28" style={{ backgroundColor: "var(--background)" }}>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link
            to="/fruit-basket/create/fruits"
            className="p-2 rounded-full hover:bg-[var(--secondary)] transition"
            aria-label="Back"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="font-display text-xl font-bold" style={{ color: "var(--foreground)" }}>
            Your Fruit Basket
          </h1>
        </div>

        <div
          className="rounded-2xl overflow-hidden mb-8"
          style={{ backgroundColor: "var(--card-white)", border: "1px solid var(--border)", boxShadow: "var(--shadow-soft)" }}
        >
          <div className="aspect-[4/3] sm:aspect-[16/9] flex items-center justify-center p-8" style={{ backgroundColor: "var(--secondary)" }}>
            {basketImg ? (
              <img src={basketImg} alt={selectedBasket.title} className="max-h-full max-w-full object-contain" />
            ) : (
              <span className="text-6xl">🧺</span>
            )}
          </div>
          <div className="p-6">
            <h2 className="font-display text-xl font-bold" style={{ color: "var(--foreground)" }}>
              {selectedBasket.title}
            </h2>
            <p className="text-lg font-semibold mt-1" style={{ color: "var(--primary)" }}>
              Basket: ₹{Number(selectedBasket.price).toFixed(2)}
            </p>
          </div>
        </div>

        <div className="mb-8">
          <h3 className="font-display text-lg font-bold mb-3" style={{ color: "var(--foreground)" }}>
            Fruits in your basket
          </h3>
          {selectedFruits.length === 0 ? (
            <div className="rounded-2xl p-8 text-center" style={{ backgroundColor: "var(--card-white)", border: "1px solid var(--border)" }}>
              <p className="mb-4" style={{ color: "var(--foreground-muted)" }}>
                No fruits added yet
              </p>
              <Link
                to="/fruit-basket/create/fruits"
                className="btn-primary-brand inline-block px-6 py-3 rounded-xl font-semibold"
              >
                Add Fruits
              </Link>
            </div>
          ) : (
            <>
              {/* Horizontal scroll (mobile-first) */}
              <div
                className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-thin sm:hidden"
                style={{ WebkitOverflowScrolling: "touch" }}
              >
                {selectedFruits.map((item) => {
                  const images = Array.isArray(item.product?.images)
                    ? item.product.images
                    : (() => {
                        try {
                          return JSON.parse(item.product?.images || "[]");
                        } catch {
                          return [];
                        }
                      })();
                  return (
                    <div
                      key={item.key}
                      className="flex-shrink-0 w-36 rounded-2xl p-3 border"
                      style={{ backgroundColor: "var(--card-white)", borderColor: "var(--border)" }}
                    >
                      <div className="aspect-square rounded-xl overflow-hidden mb-2" style={{ backgroundColor: "var(--secondary)" }}>
                        {images[0] ? (
                          <img src={images[0]} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <img src="/logo.png" alt="" className="w-10 h-10 opacity-50" />
                          </div>
                        )}
                      </div>
                      <p className="text-xs font-semibold line-clamp-2" style={{ color: "var(--foreground)" }}>
                        {item.product?.name}
                      </p>
                      <p className="text-xs mt-1" style={{ color: "var(--foreground-muted)" }}>
                        ×{item.quantity}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="hidden sm:block rounded-2xl overflow-hidden" style={{ backgroundColor: "var(--card-white)", border: "1px solid var(--border)" }}>
                <ul className="divide-y" style={{ borderColor: "var(--border)" }}>
                  {selectedFruits.map((item) => {
                    const images = Array.isArray(item.product?.images)
                      ? item.product.images
                      : (() => {
                          try {
                            return JSON.parse(item.product?.images || "[]");
                          } catch {
                            return [];
                          }
                        })();
                    return (
                      <li key={item.key} className="flex items-center gap-4 p-4">
                        <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0" style={{ backgroundColor: "var(--secondary)" }}>
                          {images[0] ? (
                            <img src={images[0]} alt={item.product?.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <img src="/logo.png" alt="" className="w-8 h-8 opacity-50" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold truncate" style={{ color: "var(--foreground)" }}>
                            {item.product?.name}
                          </div>
                          <div className="text-sm" style={{ color: "var(--foreground-muted)" }}>
                            {item.selectedWeight || item.selectedSize?.label || "Standard"} × {item.quantity}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              updateFruitQuantity(
                                item.productId,
                                item.quantity - 1,
                                item.selectedWeight,
                                item.selectedSize?.id
                              )
                            }
                            className="w-8 h-8 rounded-full flex items-center justify-center border-2"
                            style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
                          >
                            −
                          </button>
                          <span className="w-8 text-center font-semibold">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() =>
                              updateFruitQuantity(
                                item.productId,
                                item.quantity + 1,
                                item.selectedWeight,
                                item.selectedSize?.id
                              )
                            }
                            className="w-8 h-8 rounded-full flex items-center justify-center border-2"
                            style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
                          >
                            +
                          </button>
                          <button
                            type="button"
                            onClick={() => removeFruit(item.productId, item.selectedWeight, item.selectedSize?.id)}
                            className="ml-2 p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition"
                            aria-label="Remove"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </div>
                        <div className="font-semibold" style={{ color: "var(--primary)" }}>
                          ₹{Number(item.subtotal).toFixed(2)}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </>
          )}
        </div>

        <div className="mb-6">
          <Link
            to="/fruit-basket/create/fruits"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition"
            style={{ backgroundColor: "var(--secondary)", color: "var(--foreground)" }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v14M5 12h14" />
            </svg>
            Add more fruits
          </Link>
        </div>

        <div
          className="rounded-2xl p-6 mb-8 bottom-4 sm:static"
          style={{ backgroundColor: "var(--card-white)", border: "1px solid var(--border)", boxShadow: "var(--shadow-soft)" }}
        >
          <div className="flex items-center justify-between text-xl font-bold mb-6" style={{ color: "var(--foreground)" }}>
            <span>Total</span>
            <span style={{ color: "var(--primary)" }}>₹{total.toFixed(2)}</span>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
            <button
              type="button"
              disabled={adding || !hasFruits}
              onClick={handleAddToCart}
              className="flex-1 min-w-[140px] btn-primary-brand py-4 rounded-xl font-semibold text-lg transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            >
              {adding ? "Adding…" : "Add to Cart 🛒"}
            </button>
            {isCustomer ? (
              <button
                type="button"
                disabled={adding || !hasFruits}
                onClick={() => setSaveOpen(true)}
                className="flex-1 min-w-[140px] py-4 rounded-xl font-semibold text-lg border-2 transition-all duration-300 hover:shadow-md active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ borderColor: "var(--border)", color: "var(--foreground)", backgroundColor: "var(--secondary)" }}
              >
                {editingSavedId != null ? "Update saved basket" : "Save basket 💾"}
              </button>
            ) : (
              <Link
                to="/login"
                state={{ from: "/fruit-basket/create/review" }}
                className="flex-1 min-w-[140px] py-4 rounded-xl font-semibold text-lg border-2 transition-all duration-300 hover:shadow-md text-center"
                style={{ borderColor: "var(--border)", color: "var(--foreground)", backgroundColor: "var(--secondary)" }}
              >
                Log in to save
              </Link>
            )}
            <button
              type="button"
              disabled={adding || !hasFruits}
              onClick={() => setGiftOpen(true)}
              className="flex-1 min-w-[140px] py-4 rounded-xl font-semibold text-lg border-2 transition-all duration-300 hover:shadow-md active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ borderColor: "var(--primary)", color: "var(--primary)", backgroundColor: "transparent" }}
            >
              Send as Gift 🎁
            </button>
          </div>
        </div>
      </div>

      {saveOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40" role="dialog" aria-modal="true">
          <div
            className="w-full max-w-md rounded-2xl p-6 shadow-xl"
            style={{ backgroundColor: "var(--card-white)", border: "1px solid var(--border)" }}
          >
            <h3 className="font-display text-lg font-bold mb-2" style={{ color: "var(--foreground)" }}>
              {editingSavedId != null ? "Update saved basket" : "Save basket"}
            </h3>
            <p className="text-sm mb-4" style={{ color: "var(--foreground-muted)" }}>
              Name this configuration so you can load it again from the Fruit Basket home page.
            </p>
            <input
              type="text"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="e.g. Weekend family basket"
              className="w-full px-4 py-3 rounded-xl border-2 text-sm mb-4 focus:outline-none focus:border-[var(--primary)]"
              style={{ borderColor: "var(--border)", backgroundColor: "var(--input)", color: "var(--foreground)" }}
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setSaveOpen(false)}
                className="flex-1 py-3 rounded-xl font-semibold"
                style={{ backgroundColor: "var(--secondary)", color: "var(--foreground)" }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleSaveBasket}
                className="flex-1 btn-primary-brand py-3 rounded-xl font-semibold disabled:opacity-50"
              >
                {saving ? "Saving…" : editingSavedId != null ? "Update" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {giftOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40" role="dialog" aria-modal="true">
          <div
            className="w-full max-w-md rounded-2xl p-6 shadow-xl"
            style={{ backgroundColor: "var(--card-white)", border: "1px solid var(--border)" }}
          >
            <h3 className="font-display text-lg font-bold mb-2" style={{ color: "var(--foreground)" }}>
              Send as gift
            </h3>
            <p className="text-sm mb-4" style={{ color: "var(--foreground-muted)" }}>
              Optional message for the team (printed on packing slip / delivery notes).
            </p>
            <textarea
              value={giftMessage}
              onChange={(e) => setGiftMessage(e.target.value)}
              rows={4}
              placeholder="e.g. Happy Birthday Mom! — Please deliver before 6pm."
              className="w-full px-4 py-3 rounded-xl border-2 text-sm mb-4 focus:outline-none focus:border-[var(--primary)]"
              style={{ borderColor: "var(--border)", backgroundColor: "var(--input)", color: "var(--foreground)" }}
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setGiftOpen(false)}
                className="flex-1 py-3 rounded-xl font-semibold"
                style={{ backgroundColor: "var(--secondary)", color: "var(--foreground)" }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={adding}
                onClick={handleSendAsGift}
                className="flex-1 btn-primary-brand py-3 rounded-xl font-semibold disabled:opacity-50"
              >
                {adding ? "Adding…" : "Add gift to cart"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
