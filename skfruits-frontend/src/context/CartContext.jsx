import { createContext, useContext, useEffect, useState } from "react";
import { useToast } from "./ToastContext";

const CartContext = createContext();
const CART_STORAGE_KEY = "giftchoice_cart";

// Helper functions for localStorage with error handling
const getCartFromStorage = () => {
  try {
    const savedCart = localStorage.getItem(CART_STORAGE_KEY);
    if (savedCart) {
      return JSON.parse(savedCart);
    }
  } catch (error) {
    console.error("Error loading cart from localStorage:", error);
    // Clear corrupted data
    try {
      localStorage.removeItem(CART_STORAGE_KEY);
    } catch (e) {
      console.error("Error clearing corrupted cart data:", e);
    }
  }
  return [];
};

const saveCartToStorage = (cartItems) => {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
  } catch (error) {
    console.error("Error saving cart to localStorage:", error);
    // Handle quota exceeded error
    if (error.name === "QuotaExceededError") {
      // We can't toast here (outside provider render), so just log.
      console.warn("Cart storage is full. Please clear some items.");
    }
  }
};

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const toast = useToast();

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = getCartFromStorage();
    setCartItems(savedCart);
    setIsLoaded(true);
  }, []);

  // Save cart to localStorage whenever it changes (only after initial load)
  useEffect(() => {
    if (isLoaded) {
      saveCartToStorage(cartItems);
    }
  }, [cartItems, isLoaded]);

  const addToCart = (product, selectedSize, quantity = 1) => {
    if (!selectedSize) {
      toast.error("Please select a size");
      return;
    }

    const cartItem = {
      id: `${product.id}-${selectedSize.id}`,
      productId: product.id,
      productName: product.name,
      productImage: product.images ? (Array.isArray(product.images) ? product.images[0] : JSON.parse(product.images)[0]) : null,
      sizeId: selectedSize.id,
      sizeLabel: selectedSize.label,
      price: parseFloat(selectedSize.price),
      quantity: quantity,
      subtotal: parseFloat(selectedSize.price) * quantity,
    };

    setCartItems((prevItems) => {
      const existingItem = prevItems.find(
        (item) => item.id === cartItem.id
      );

      if (existingItem) {
        // Update quantity if item already exists
        return prevItems.map((item) =>
          item.id === cartItem.id
            ? {
                ...item,
                quantity: item.quantity + quantity,
                subtotal: item.price * (item.quantity + quantity),
              }
            : item
        );
      } else {
        // Add new item
        return [...prevItems, cartItem];
      }
    });

    toast.success("Added to cart");
    return true;
  };

  const removeFromCart = (itemId) => {
    setCartItems((prevItems) => prevItems.filter((item) => item.id !== itemId));
  };

  const updateQuantity = (itemId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(itemId);
      return;
    }

    setCartItems((prevItems) =>
      prevItems.map((item) =>
        item.id === itemId
          ? {
              ...item,
              quantity: newQuantity,
              subtotal: item.price * newQuantity,
            }
          : item
      )
    );
  };

  const clearCart = () => {
    setCartItems([]);
    try {
      localStorage.removeItem(CART_STORAGE_KEY);
    } catch (error) {
      console.error("Error clearing cart from localStorage:", error);
    }
  };

  const getCartTotal = () => {
    return cartItems.reduce((sum, item) => sum + item.subtotal, 0);
  };

  const getCartCount = () => {
    return cartItems.reduce((sum, item) => sum + item.quantity, 0);
  };

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        getCartTotal,
        getCartCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }
  return context;
}
