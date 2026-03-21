import { createContext, useContext, useCallback, useMemo, useState } from "react";

const FruitBasketContext = createContext(null);

/**
 * Resolve unit price from product (weight, size, or single price)
 */
function resolveProductPrice(product, selectedWeight = null, selectedSize = null) {
  if (selectedWeight && product?.weightOptions) {
    try {
      const opts = Array.isArray(product.weightOptions)
        ? product.weightOptions
        : JSON.parse(product.weightOptions || "[]");
      const found = opts.find((w) => (w.weight || w.weightValue) === selectedWeight);
      if (found) return parseFloat(found.price);
    } catch {}
  }
  if (selectedSize && selectedSize.price != null) {
    return parseFloat(selectedSize.price);
  }
  if (product?.hasSinglePrice && product.singlePrice != null) {
    return parseFloat(product.singlePrice);
  }
  if (product?.weightOptions) {
    try {
      const opts = Array.isArray(product.weightOptions)
        ? product.weightOptions
        : JSON.parse(product.weightOptions || "[]");
      if (opts.length > 0) {
        const min = opts.reduce((prev, curr) =>
          parseFloat(curr.price) < parseFloat(prev.price) ? curr : prev
        );
        return parseFloat(min.price);
      }
    } catch {}
  }
  if (product?.sizes?.length) {
    const min = product.sizes.reduce((prev, curr) =>
      parseFloat(curr.price) < parseFloat(prev.price) ? curr : prev
    );
    return parseFloat(min.price);
  }
  return 0;
}

/**
 * Pick default weight/size for quick add
 */
function pickDefaultVariant(product) {
  if (product?.weightOptions) {
    try {
      const opts = Array.isArray(product.weightOptions)
        ? product.weightOptions
        : JSON.parse(product.weightOptions || "[]");
      if (opts.length === 1) {
        return { selectedWeight: opts[0].weight || opts[0].weightValue, selectedSize: null };
      }
      if (opts.length > 1) {
        const chosen = opts.reduce((min, w) =>
          parseFloat(w.price) < parseFloat(min.price) ? w : min
        );
        return { selectedWeight: chosen.weight || chosen.weightValue, selectedSize: null };
      }
    } catch {}
  }
  if (product?.hasSinglePrice && product.singlePrice) {
    return {
      selectedWeight: null,
      selectedSize: { id: 0, label: "Standard", price: parseFloat(product.singlePrice) },
    };
  }
  if (product?.sizes?.length) {
    const chosen = product.sizes.reduce((min, s) =>
      parseFloat(s.price) < parseFloat(min.price) ? s : min
    );
    return { selectedWeight: null, selectedSize: chosen };
  }
  return { selectedWeight: null, selectedSize: null };
}

/** Build one context line from API saved row + hydrated product (for Phase 4). */
function lineFromSavedProduct(product, line) {
  if (!product) return null;
  const qty = Math.max(1, Number(line.quantity) || 1);
  let selectedWeight =
    line.selectedWeight != null && String(line.selectedWeight).trim() !== ""
      ? String(line.selectedWeight).trim()
      : null;
  let selectedSize = null;
  const rawPsid = line.productSizeId;
  const psid =
    rawPsid === undefined || rawPsid === null || rawPsid === "" ? null : Number(rawPsid);

  if (psid != null && !Number.isNaN(psid) && product.sizes?.length) {
    selectedSize = product.sizes.find((s) => Number(s.id) === Number(psid)) || null;
  }
  if (
    !selectedSize &&
    product.hasSinglePrice &&
    product.singlePrice != null &&
    (psid === null || psid === 0)
  ) {
    selectedSize = { id: 0, label: "Standard", price: parseFloat(product.singlePrice) };
  }
  if (!selectedWeight && !selectedSize && product.weightOptions?.length) {
    const opts = Array.isArray(product.weightOptions)
      ? product.weightOptions
      : (() => {
          try {
            return JSON.parse(product.weightOptions || "[]");
          } catch {
            return [];
          }
        })();
    if (opts.length === 1) {
      selectedWeight = opts[0].weight || opts[0].weightValue;
    } else if (opts.length > 1 && line.selectedWeight) {
      selectedWeight = String(line.selectedWeight).trim();
    } else if (opts.length > 1) {
      const chosen = opts.reduce((min, w) =>
        parseFloat(w.price) < parseFloat(min.price) ? w : min
      );
      selectedWeight = chosen.weight || chosen.weightValue;
    }
  }
  if (!selectedWeight && !selectedSize && product.sizes?.length) {
    selectedSize = product.sizes.reduce((min, s) =>
      parseFloat(s.price) < parseFloat(min.price) ? s : min
    );
  }

  const unitPrice = resolveProductPrice(product, selectedWeight, selectedSize);
  if (unitPrice <= 0) return null;

  const key = `${product.id}-${selectedWeight || ""}-${selectedSize?.id ?? ""}`;
  return {
    key,
    productId: product.id,
    product,
    quantity: qty,
    selectedWeight,
    selectedSize,
    price: unitPrice,
    subtotal: unitPrice * qty,
  };
}

export function FruitBasketProvider({ children }) {
  const [selectedBasket, setSelectedBasketState] = useState(null);
  const [selectedFruits, setSelectedFruits] = useState([]);
  const [editingSavedId, setEditingSavedId] = useState(null);
  const [editingSavedName, setEditingSavedName] = useState(null);

  const setSelectedBasket = useCallback((basket) => {
    setSelectedBasketState(basket);
    if (!basket) {
      setSelectedFruits([]);
      setEditingSavedId(null);
      setEditingSavedName(null);
    }
  }, []);

  const addFruit = useCallback((product, quantity = 1, selectedWeight = null, selectedSize = null) => {
    const { selectedWeight: dw, selectedSize: ds } = pickDefaultVariant(product);
    const weight = selectedWeight ?? dw;
    const size = selectedSize ?? ds;

    const unitPrice = resolveProductPrice(product, weight, size);
    if (unitPrice <= 0) return false;

    const key = `${product.id}-${weight || ""}-${size?.id ?? ""}`;

    setSelectedFruits((prev) => {
      const idx = prev.findIndex(
        (f) =>
          f.productId === product.id &&
          (f.selectedWeight || "") === (weight || "") &&
          (f.selectedSize?.id ?? "") === (size?.id ?? "")
      );
      const newList = [...prev];
      if (idx >= 0) {
        const q = newList[idx].quantity + quantity;
        newList[idx] = {
          ...newList[idx],
          quantity: q,
          subtotal: unitPrice * q,
        };
      } else {
        newList.push({
          key,
          productId: product.id,
          product,
          quantity,
          selectedWeight: weight,
          selectedSize: size,
          price: unitPrice,
          subtotal: unitPrice * quantity,
        });
      }
      return newList;
    });
    return true;
  }, []);

  const removeFruit = useCallback((productId, selectedWeight = null, selectedSizeId = null) => {
    setSelectedFruits((prev) =>
      prev.filter(
        (f) =>
          !(f.productId === productId &&
            (f.selectedWeight || "") === (selectedWeight || "") &&
            (String(f.selectedSize?.id ?? "") === String(selectedSizeId ?? "")))
      )
    );
  }, []);

  const updateFruitQuantity = useCallback((productId, newQuantity, selectedWeight = null, selectedSizeId = null) => {
    if (newQuantity <= 0) {
      removeFruit(productId, selectedWeight, selectedSizeId);
      return;
    }
    setSelectedFruits((prev) =>
      prev.map((f) => {
        if (
          f.productId !== productId ||
          (f.selectedWeight || "") !== (selectedWeight || "") ||
          (String(f.selectedSize?.id ?? "") !== String(selectedSizeId ?? ""))
        ) {
          return f;
        }
        return {
          ...f,
          quantity: newQuantity,
          subtotal: f.price * newQuantity,
        };
      })
    );
  }, [removeFruit]);

  const clearBasket = useCallback(() => {
    setSelectedBasketState(null);
    setSelectedFruits([]);
    setEditingSavedId(null);
    setEditingSavedName(null);
  }, []);

  const startFreshBasket = useCallback(() => {
    setSelectedBasketState(null);
    setSelectedFruits([]);
    setEditingSavedId(null);
    setEditingSavedName(null);
  }, []);

  /**
   * @param {object} saved - GET /saved-fruit-baskets/:id shape (includes fruitBasket, fruits[])
   * @param {object[]} products - from GET /products?ids=
   * @returns {{ ok: boolean, missingProducts: number }}
   */
  const hydrateFromSaved = useCallback((saved, products) => {
    if (!saved?.fruitBasket) return { ok: false, missingProducts: 0 };
    const map = new Map((products || []).map((p) => [p.id, p]));
    const lines = [];
    let missing = 0;
    for (const line of saved.fruits || []) {
      const p = map.get(line.productId);
      if (!p) {
        missing += 1;
        continue;
      }
      const row = lineFromSavedProduct(p, line);
      if (row) lines.push(row);
      else missing += 1;
    }
    setSelectedBasketState(saved.fruitBasket);
    setSelectedFruits(lines);
    setEditingSavedId(saved.id ?? null);
    setEditingSavedName(typeof saved.name === "string" ? saved.name : null);
    return { ok: true, missingProducts: missing };
  }, []);

  const serializeFruitsForSave = useCallback(() => {
    return selectedFruits.map((f) => ({
      productId: f.productId,
      quantity: f.quantity,
      selectedWeight: f.selectedWeight || null,
      productSizeId:
        f.selectedSize?.id != null && f.selectedSize.id !== 0 ? f.selectedSize.id : null,
    }));
  }, [selectedFruits]);

  const hasFruits = selectedFruits.length > 0;
  const fruitsCount = selectedFruits.reduce((sum, f) => sum + f.quantity, 0);

  const getBasketPrice = useCallback(() => {
    return selectedBasket ? Number(selectedBasket.price) || 0 : 0;
  }, [selectedBasket]);

  const getFruitsTotal = useCallback(() => {
    return selectedFruits.reduce((sum, f) => sum + (f.subtotal || 0), 0);
  }, [selectedFruits]);

  const getBasketTotal = useCallback(() => {
    return getBasketPrice() + getFruitsTotal();
  }, [getBasketPrice, getFruitsTotal]);

  const isInBasket = useCallback(
    (productId, selectedWeight = null, selectedSizeId = null) => {
      return selectedFruits.some(
        (f) =>
          f.productId === productId &&
          (f.selectedWeight || "") === (selectedWeight || "") &&
          (String(f.selectedSize?.id ?? "") === String(selectedSizeId ?? ""))
      );
    },
    [selectedFruits]
  );

  const getFruitQuantity = useCallback(
    (productId, selectedWeight = null, selectedSizeId = null) => {
      const f = selectedFruits.find(
        (x) =>
          x.productId === productId &&
          (x.selectedWeight || "") === (selectedWeight || "") &&
          (String(x.selectedSize?.id ?? "") === String(selectedSizeId ?? ""))
      );
      return f ? f.quantity : 0;
    },
    [selectedFruits]
  );

  const value = useMemo(
    () => ({
      selectedBasket,
      selectedFruits,
      setSelectedBasket,
      addFruit,
      removeFruit,
      updateFruitQuantity,
      clearBasket,
      startFreshBasket,
      hydrateFromSaved,
      serializeFruitsForSave,
      editingSavedId,
      editingSavedName,
      setEditingSavedId,
      setEditingSavedName,
      hasFruits,
      fruitsCount,
      getBasketPrice,
      getFruitsTotal,
      getBasketTotal,
      isInBasket,
      getFruitQuantity,
    }),
    [
      selectedBasket,
      selectedFruits,
      setSelectedBasket,
      addFruit,
      removeFruit,
      updateFruitQuantity,
      clearBasket,
      startFreshBasket,
      hydrateFromSaved,
      serializeFruitsForSave,
      editingSavedId,
      editingSavedName,
      hasFruits,
      fruitsCount,
      getBasketPrice,
      getFruitsTotal,
      getBasketTotal,
      isInBasket,
      getFruitQuantity,
    ]
  );

  return (
    <FruitBasketContext.Provider value={value}>
      {children}
    </FruitBasketContext.Provider>
  );
}

export function useFruitBasket() {
  const ctx = useContext(FruitBasketContext);
  if (!ctx) {
    throw new Error("useFruitBasket must be used within FruitBasketProvider");
  }
  return ctx;
}
