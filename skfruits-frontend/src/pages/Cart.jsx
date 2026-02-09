import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useToast } from "../context/ToastContext";

export default function Cart() {
  const {
    cartItems,
    removeFromCart,
    updateQuantity,
    clearCart,
    getCartTotal,
  } = useCart();
  const navigate = useNavigate();
  const toast = useToast();

  const handleCheckout = () => {
    if (cartItems.length === 0) {
      toast.error("Your cart is empty");
      return;
    }

    // Build WhatsApp message
    let message = "Hi! I'd like to place an order:\n\n";
    
    cartItems.forEach((item, index) => {
      message += `${index + 1}. ${item.productName}\n`;
      message += `   Size: ${item.sizeLabel}\n`;
      message += `   Quantity: ${item.quantity}\n`;
      message += `   Price: ₹${item.price}\n`;
      message += `   Subtotal: ₹${item.subtotal.toFixed(2)}\n\n`;
    });

    message += `Total: ₹${getCartTotal().toFixed(2)}`;

    // Open WhatsApp
    window.open(
      `https://wa.me/917976948872?text=${encodeURIComponent(message)}`
    );

    // Optionally clear cart after checkout
    // clearCart();
  };

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <img src="/logo.png" alt="Gift Choice Logo" className="w-20 h-20 mx-auto mb-6 object-contain opacity-50" />
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Your cart is empty
            </h2>
            <p className="text-gray-600 mb-8">
              Looks like you haven't added anything to your cart yet.
            </p>
            <Link
              to="/"
              className="inline-block bg-gradient-to-r from-pink-500 to-pink-600 text-white px-8 py-3 rounded-xl font-semibold hover:from-pink-600 hover:to-pink-700 transition-all shadow-lg"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Shopping Cart</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {cartItems.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-xl shadow-md p-6 flex flex-col sm:flex-row gap-6 hover:shadow-lg transition-all duration-300 fade-in"
              >
                {/* Product Image */}
                <div className="w-full sm:w-32 h-32 bg-gradient-to-br from-pink-50 to-pink-100 rounded-lg overflow-hidden flex-shrink-0">
                  {item.productImage ? (
                    <img
                      src={item.productImage}
                      alt={item.productName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <img src="/logo.png" alt="Gift Choice Logo" className="w-16 h-16 object-contain opacity-50" />
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <div className="flex-1 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">
                        {item.productName}
                      </h3>
                      <p className="text-gray-600 mt-1">Size: {item.sizeLabel}</p>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="text-red-500 hover:text-red-700 transition-all duration-300 hover:scale-110 active:scale-95"
                      title="Remove item"
                    >
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    {/* Quantity Controls */}
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="w-8 h-8 rounded-lg border-2 border-gray-200 hover:border-pink-500 flex items-center justify-center font-bold text-gray-700 hover:text-pink-600 transition-all duration-300 hover:bg-pink-50 active:scale-95"
                      >
                        −
                      </button>
                      <span className="text-lg font-semibold text-gray-900 w-8 text-center transition-all duration-300">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="w-8 h-8 rounded-lg border-2 border-gray-200 hover:border-pink-500 flex items-center justify-center font-bold text-gray-700 hover:text-pink-600 transition-all duration-300 hover:bg-pink-50 active:scale-95"
                      >
                        +
                      </button>
                    </div>

                    {/* Price */}
                    <div className="text-right">
                      <div className="text-sm text-gray-600">
                        ₹{item.price} × {item.quantity}
                      </div>
                      <div className="text-xl font-bold text-pink-600">
                        ₹{item.subtotal.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6 sticky top-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Order Summary
              </h2>

              <div className="space-y-4 mb-6">
                <div className="flex justify-between text-gray-700">
                  <span>Subtotal ({cartItems.reduce((sum, item) => sum + item.quantity, 0)} items)</span>
                  <span className="font-semibold">₹{getCartTotal().toFixed(2)}</span>
                </div>
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xl font-bold text-gray-900">Total</span>
                    <span className="text-2xl font-bold text-pink-600">
                      ₹{getCartTotal().toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleCheckout}
                  className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-4 rounded-xl font-semibold text-lg hover:from-green-600 hover:to-green-700 transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:scale-95"
                >
                  Checkout via WhatsApp
                </button>
                <Link
                  to="/"
                  className="block w-full text-center bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-200 transition-all duration-300 hover:shadow-md active:scale-95"
                >
                  Continue Shopping
                </Link>
                <button
                  onClick={() => {
                    if (window.confirm("Are you sure you want to clear your cart?")) {
                      clearCart();
                    }
                  }}
                  className="w-full text-red-600 py-2 text-sm hover:text-red-700 transition-all duration-300 hover:bg-red-50 rounded-lg active:scale-95"
                >
                  Clear Cart
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
