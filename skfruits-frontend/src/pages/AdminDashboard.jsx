import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { API } from "../api";
import { useToast } from "../context/ToastContext";
import ProductForm from "../components/admin/ProductForm";
import CategoryForm from "../components/admin/CategoryForm";
import ProductList from "../components/admin/ProductList";
import CategoryList from "../components/admin/CategoryList";
import OrderList from "../components/admin/OrderList";
import MessageList from "../components/admin/MessageList";
import ReelForm from "../components/admin/ReelForm";
import ReelList from "../components/admin/ReelList";
import OccasionForm from "../components/admin/OccasionForm";
import OccasionList from "../components/admin/OccasionList";
import SeasonalForm from "../components/admin/SeasonalForm";
import SeasonalList from "../components/admin/SeasonalList";
import BannerForm from "../components/admin/BannerForm";
import BannerList from "../components/admin/BannerList";

export default function AdminDashboard() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState("products");
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [occasions, setOccasions] = useState([]);
  const [orders, setOrders] = useState([]);
  const [messages, setMessages] = useState([]);
  const [reels, setReels] = useState([]);
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingOccasion, setEditingOccasion] = useState(null);
  const [editingReel, setEditingReel] = useState(null);
  const [editingBanner, setEditingBanner] = useState(null);
  const [seasonals, setSeasonals] = useState([]);
  const [editingSeasonal, setEditingSeasonal] = useState(null);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("adminToken");
      
      if (!token) {
        toast.error("Please login to continue");
        navigate("/admin/login");
        return;
      }
      
      const headers = { Authorization: `Bearer ${token}` };

      if (activeTab === "products") {
        const [productsRes, occasionsRes, categoriesRes] = await Promise.all([
          fetch(`${API}/products`), // Public endpoint, no auth needed
          fetch(`${API}/occasions/all`, { headers }),
          fetch(`${API}/categories`), // Public endpoint, no auth needed
        ]);
        
        if (!productsRes.ok) {
          const errorData = await productsRes.json();
          console.error("Error fetching products:", errorData);
          toast.error(`Error loading products: ${errorData.error || productsRes.statusText}`);
          setProducts([]);
        } else {
          const productsData = await productsRes.json();
          setProducts(Array.isArray(productsData) ? productsData : []);
        }
        
        if (occasionsRes.ok) {
          const occasionsData = await occasionsRes.json();
          setOccasions(Array.isArray(occasionsData) ? occasionsData : []);
        } else if (occasionsRes.status === 401) {
          toast.error("Session expired. Please login again.");
          logout();
        }

        if (categoriesRes.ok) {
          const categoriesData = await categoriesRes.json();
          setCategories(Array.isArray(categoriesData) ? categoriesData : []);
        }
      } else if (activeTab === "categories") {
        const res = await fetch(`${API}/categories`); // Public endpoint
        if (res.ok) {
          const data = await res.json();
          setCategories(data);
        }
      } else if (activeTab === "seasonal") {
        const res = await fetch(`${API}/seasonal/all`, { headers });
        if (res.ok) {
          const data = await res.json();
          setSeasonals(Array.isArray(data) ? data : []);
        } else if (res.status === 401) {
          toast.error("Session expired. Please login again.");
          logout();
        }
      } else if (activeTab === "occasions") {
        const res = await fetch(`${API}/occasions/all`, { headers });
        if (res.ok) {
          const data = await res.json();
          setOccasions(data);
        } else if (res.status === 401) {
          toast.error("Session expired. Please login again.");
          logout();
        }
      } else if (activeTab === "orders") {
        const res = await fetch(`${API}/orders`, { headers });
        if (res.ok) {
          const data = await res.json();
          setOrders(data);
        } else if (res.status === 401) {
          toast.error("Session expired. Please login again.");
          logout();
        }
      } else if (activeTab === "messages") {
        const res = await fetch(`${API}/contact`, { headers });
        if (res.ok) {
          const data = await res.json();
          setMessages(data);
        } else if (res.status === 401) {
          toast.error("Session expired. Please login again.");
          logout();
        }
      } else if (activeTab === "reels") {
        const res = await fetch(`${API}/reels/all`, { headers });
        if (res.ok) {
          const data = await res.json();
          setReels(data);
        } else if (res.status === 401) {
          toast.error("Session expired. Please login again.");
          logout();
        }
      } else if (activeTab === "banners") {
        const res = await fetch(`${API}/banners/all`, { headers });
        if (res.ok) {
          const data = await res.json();
          setBanners(data);
        } else if (res.status === 401) {
          toast.error("Session expired. Please login again.");
          logout();
        }
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Error loading data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleProductSave = () => {
    setEditingProduct(null);
    loadData();
  };

  const handleCategorySave = () => {
    setEditingCategory(null);
    loadData();
  };

  const handleOccasionSave = () => {
    setEditingOccasion(null);
    loadData();
  };

  const handleSeasonalSave = () => {
    setEditingSeasonal(null);
    loadData();
  };

  const handleReelSave = () => {
    setEditingReel(null);
    loadData();
  };

  const handleBannerSave = () => {
    setEditingBanner(null);
    loadData();
  };

  const tabs = [
    { id: "products", label: "All Fruits", icon: null },
    { id: "categories", label: "Categories", icon: null },
    { id: "seasonal", label: "Seasonal", icon: null },
    { id: "occasions", label: "Exotic", icon: null },
    { id: "banners", label: "Banners", icon: null },
    { id: "reels", label: "Reels", icon: null },
    { id: "orders", label: "Orders", icon: null },
    { id: "messages", label: "Messages", icon: null },
  ];

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: "var(--background)" }}>
      {/* Sidebar (desktop) */}
      <aside className="hidden lg:flex lg:flex-col w-72 border-r" style={{ backgroundColor: "var(--background)", borderColor: "var(--border)" }}>
        <div className="px-6 py-5 border-b" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm"
              style={{ backgroundColor: "var(--primary)", color: "var(--primary-foreground)" }}
            >
              SK
            </div>
            <div className="min-w-0">
              <div className="font-display text-sm font-semibold truncate" style={{ color: "var(--foreground)" }}>SK Fruits</div>
              <div className="text-xs truncate max-w-[14rem]" style={{ color: "var(--muted)" }}>{user?.email}</div>
            </div>
          </div>
        </div>

        <nav className="p-3 flex-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setEditingProduct(null);
                setEditingCategory(null);
                setEditingSeasonal(null);
                setEditingOccasion(null);
                setEditingReel(null);
                setEditingBanner(null);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all text-left"
              style={{
                backgroundColor: activeTab === tab.id ? "var(--primary)" : "transparent",
                color: activeTab === tab.id ? "var(--primary-foreground)" : "var(--foreground)",
              }}
              onMouseEnter={(e) => {
                if (activeTab !== tab.id) {
                  e.currentTarget.style.backgroundColor = "var(--secondary)";
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== tab.id) {
                  e.currentTarget.style.backgroundColor = "transparent";
                }
              }}
            >
              
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t flex flex-col gap-2" style={{ borderColor: "var(--border)" }}>
          <button
            onClick={() => navigate("/")}
            className="w-full px-4 py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 transition-all"
            style={{ backgroundColor: "var(--primary)", color: "var(--primary-foreground)" }}
            onMouseEnter={(e) => { e.currentTarget.style.filter = "brightness(1.05)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.filter = "none"; }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            View Shop
          </button>
          <button
            onClick={logout}
            className="w-full px-4 py-2.5 rounded-lg transition font-medium"
            style={{ backgroundColor: "var(--secondary)", color: "var(--foreground)" }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--border)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "var(--secondary)"; }}
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0">
        {/* Top bar (mobile + page header) — same height, blur, border as main header */}
        <div
          className="sticky top-0 z-40 bg-[var(--background)]/95 backdrop-blur-sm border-b"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between gap-4 h-16 md:h-20">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm"
                  style={{ backgroundColor: "var(--primary)", color: "var(--primary-foreground)" }}
                >
                  SK
                </div>
                <div className="min-w-0">
                  <h1 className="font-display text-xl md:text-2xl font-bold" style={{ color: "var(--foreground)" }}>
                    Admin <span style={{ color: "var(--primary)" }}>Dashboard</span>
                  </h1>
                  <p className="text-sm mt-0.5 truncate" style={{ color: "var(--muted)" }}>Welcome, {user?.email}</p>
                </div>
              </div>

              <div className="hidden sm:flex items-center gap-3">
                <button
                  onClick={() => navigate("/")}
                  className="px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-all"
                  style={{ backgroundColor: "var(--primary)", color: "var(--primary-foreground)" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.filter = "brightness(1.05)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.filter = "none";
                  }}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                  View Shop
                </button>
                <button
                  onClick={logout}
                  className="px-4 py-2 rounded-lg transition font-medium bg-[var(--secondary)]"
                  style={{ color: "var(--foreground)" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "var(--border)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "var(--secondary)";
                  }}
                >
                  Logout
                </button>
              </div>
            </div>

            {/* Top menu (mobile) */}
            <div className="lg:hidden mt-4">
              <div className="flex gap-2 overflow-x-auto pb-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setEditingProduct(null);
                    setEditingCategory(null);
                    setEditingSeasonal(null);
                    setEditingOccasion(null);
                    setEditingReel(null);
                    setEditingBanner(null);
                  }}
                    className="shrink-0 px-4 py-2.5 rounded-full font-semibold transition-all"
                    style={{
                      backgroundColor: activeTab === tab.id ? "var(--primary)" : "var(--secondary)",
                      color: activeTab === tab.id ? "var(--primary-foreground)" : "var(--foreground)",
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 sm:hidden mt-2">
                <button
                  onClick={() => navigate("/")}
                  className="flex-1 px-4 py-2.5 rounded-lg transition font-medium"
                  style={{ backgroundColor: "var(--primary)", color: "var(--primary-foreground)" }}
                >
                  View Shop
                </button>
                <button
                  onClick={logout}
                  className="px-4 py-2.5 rounded-lg transition font-medium"
                  style={{ backgroundColor: "var(--secondary)", color: "var(--foreground)" }}
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 ">
          {/* Content */}
          {loading ? (
            <div className="rounded-lg shadow p-12 text-center" style={{ backgroundColor: "var(--background)", border: "1px solid var(--border)" }}>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: "var(--primary)" }}></div>
              <p style={{ color: "var(--muted)" }}>Loading...</p>
            </div>
          ) : (
            <>
            {activeTab === "products" && (
              <div>
                <ProductForm
                  product={editingProduct}
                  categories={categories}
                  occasions={occasions}
                  onSave={handleProductSave}
                  onCancel={() => setEditingProduct(null)}
                />
                <ProductList
                  products={products}
                  onEdit={setEditingProduct}
                  onDelete={loadData}
                />
              </div>
            )}

            {activeTab === "categories" && (
              <div>
                <CategoryForm
                  category={editingCategory}
                  onSave={handleCategorySave}
                  onCancel={() => setEditingCategory(null)}
                />
                <CategoryList
                  categories={categories}
                  onEdit={setEditingCategory}
                  onDelete={loadData}
                />
              </div>
            )}

            {activeTab === "seasonal" && (
              <div>
                <SeasonalForm
                  seasonal={editingSeasonal}
                  onSave={handleSeasonalSave}
                  onCancel={() => setEditingSeasonal(null)}
                />
                <SeasonalList
                  seasonals={seasonals}
                  onEdit={setEditingSeasonal}
                  onDelete={loadData}
                />
              </div>
            )}

            {activeTab === "occasions" && (
              <div>
                <OccasionForm
                  occasion={editingOccasion}
                  onSave={handleOccasionSave}
                  onCancel={() => setEditingOccasion(null)}
                />
                <OccasionList
                  occasions={occasions}
                  onEdit={setEditingOccasion}
                  onDelete={loadData}
                />
              </div>
            )}

            {activeTab === "banners" && (
              <div>
                <BannerForm
                  banner={editingBanner}
                  onSave={handleBannerSave}
                  onCancel={() => setEditingBanner(null)}
                />
                <BannerList
                  banners={banners}
                  onEdit={setEditingBanner}
                  onDelete={loadData}
                />
              </div>
            )}

            {activeTab === "orders" && (
              <OrderList orders={orders} onUpdate={loadData} />
            )}

            {activeTab === "reels" && (
              <div>
                <ReelForm
                  reel={editingReel}
                  onSave={handleReelSave}
                  onCancel={() => setEditingReel(null)}
                />
                <ReelList
                  reels={reels}
                  onEdit={setEditingReel}
                  onDelete={loadData}
                />
              </div>
            )}

            {activeTab === "messages" && (
              <MessageList messages={messages} onUpdate={loadData} />
            )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
