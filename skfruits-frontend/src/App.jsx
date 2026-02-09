import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { ToastProvider } from "./context/ToastContext";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import ProtectedRoute from "./components/ProtectedRoute";
import ChatBot from "./components/ChatBot";
import ScrollToTop from "./components/ScrollToTop";
import ToastViewport from "./components/ToastViewport";

import Home from "./pages/Home";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Occasion from "./pages/Occasion";
import NewArrivals from "./pages/NewArrivals";
import CategoriesPage from "./pages/CategoriesPage";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import Search from "./pages/Search";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";

function PublicLayout() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/shop" element={<Home />} />
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="/category/:slug" element={<CategoriesPage />} />
        <Route path="/product/:id" element={<ProductDetail />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/occasion" element={<Occasion />} />
        <Route path="/occasion/:slug" element={<Occasion />} />
        <Route path="/new" element={<NewArrivals />} />
        <Route path="/search" element={<Search />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
      </Routes>
      <Footer />
      <ChatBot />
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <CartProvider>
          <BrowserRouter>
            <ScrollToTop />
            <ToastViewport />
            <Routes>
              {/* Admin Routes (no navbar/footer) */}
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route
                path="/admin/dashboard"
                element={
                  <ProtectedRoute>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route path="/admin" element={<Navigate to="/admin/login" replace />} />

              {/* Public Routes */}
              <Route path="/*" element={<PublicLayout />} />
            </Routes>
          </BrowserRouter>
        </CartProvider>
      </ToastProvider>
    </AuthProvider>
  );
}
