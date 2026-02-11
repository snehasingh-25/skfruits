import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { ToastProvider } from "./context/ToastContext";
import { UserAuthProvider } from "./context/UserAuthContext";
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
import Seasonal from "./pages/Seasonal";
import NewArrivals from "./pages/NewArrivals";
import CategoriesPage from "./pages/CategoriesPage";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import OrderSuccess from "./pages/OrderSuccess";
import Search from "./pages/Search";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ProfileAddresses from "./pages/ProfileAddresses";

function RedirectOccasionToExotic() {
  const { slug } = useParams();
  return <Navigate to={slug ? `/exotic/${slug}` : "/exotic"} replace />;
}

function PublicLayout() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/shop" element={<Home />} />
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="/category/:slug" element={<CategoriesPage />} />
        <Route path="/seasonal" element={<Seasonal />} />
        <Route path="/seasonal/:slug" element={<Seasonal />} />
        <Route path="/exotic" element={<Occasion />} />
        <Route path="/exotic/:slug" element={<Occasion />} />
        <Route path="/organic" element={<NewArrivals />} />
        <Route path="/gift-boxes" element={<About />} />
        <Route path="/blog" element={<Contact />} />
        <Route path="/product/:id" element={<ProductDetail />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/order-success" element={<OrderSuccess />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/profile/addresses" element={<ProfileAddresses />} />
        <Route path="/search" element={<Search />} />
        {/* Redirect old paths to new (name-matched) paths */}
        <Route path="/occasion" element={<Navigate to="/exotic" replace />} />
        <Route path="/occasion/:slug" element={<RedirectOccasionToExotic />} />
        <Route path="/new" element={<Navigate to="/organic" replace />} />
        <Route path="/about" element={<Navigate to="/gift-boxes" replace />} />
        <Route path="/contact" element={<Navigate to="/blog" replace />} />
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
        <UserAuthProvider>
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
        </UserAuthProvider>
      </ToastProvider>
    </AuthProvider>
  );
}
