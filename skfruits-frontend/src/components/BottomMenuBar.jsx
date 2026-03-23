import { Link, useLocation } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useUserAuth } from "../context/UserAuthContext";

const items = [
  {
    key: "home",
    label: "Home",
    to: "/",
    isActive: (pathname) => pathname === "/" || pathname === "/shop",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.9} d="M3 11.5L12 4l9 7.5" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.9} d="M5.5 10.5V20h13V10.5" />
      </svg>
    ),
  },
  {
    key: "categories",
    label: "Categories",
    to: "/categories",
    isActive: (pathname) => pathname === "/categories" || pathname.startsWith("/category/"),
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <rect x="4" y="4" width="6" height="6" rx="1.2" strokeWidth={1.8} />
        <rect x="14" y="4" width="6" height="6" rx="1.2" strokeWidth={1.8} />
        <rect x="4" y="14" width="6" height="6" rx="1.2" strokeWidth={1.8} />
        <rect x="14" y="14" width="6" height="6" rx="1.2" strokeWidth={1.8} />
      </svg>
    ),
  },
  {
    key: "basket",
    label: "Basket",
    to: "/fruit-basket",
    isActive: (pathname) => pathname.startsWith("/fruit-basket"),
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.9} d="M3 3h18v2H3V3zm2 2h14l-1.5 10.5c-.2 1.2-1.3 2.1-2.6 2.1H7.1c-1.3 0-2.4-.9-2.6-2.1L5 5z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.9} d="M9 11v5m6-5v5" />
      </svg>
    ),
  },
  {
    key: "profile",
    label: "Profile",
    toAuth: "/profile/orders",
    toGuest: "/login",
    isActive: (pathname) => pathname.startsWith("/profile") || pathname === "/login" || pathname === "/signup",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <circle cx="12" cy="8" r="3.2" strokeWidth={1.9} />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.9} d="M5 20c1.8-3.4 4.2-5.2 7-5.2S17.2 16.6 19 20" />
      </svg>
    ),
  },
  {
    key: "cart",
    label: "Cart",
    to: "/cart",
    isActive: (pathname) => pathname === "/cart" || pathname === "/checkout",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.9} d="M3.5 5h2.2l1.7 9.2h10.3l1.8-6.2H7.2" />
        <circle cx="10" cy="19" r="1.4" strokeWidth={1.9} />
        <circle cx="17" cy="19" r="1.4" strokeWidth={1.9} />
      </svg>
    ),
  },
];

export default function BottomMenuBar() {
  const location = useLocation();
  const { getCartCount } = useCart();
  const { isAuthenticated } = useUserAuth();
  const cartCount = getCartCount();

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t backdrop-blur-md"
      style={{
        borderColor: "rgba(133, 92, 61, 0.18)",
        background: "linear-gradient(180deg, rgba(255, 252, 246, 0.95) 0%, rgba(245, 230, 211, 0.94) 100%)",
        boxShadow: "0 -8px 26px rgba(74, 55, 40, 0.12)",
      }}
      aria-label="Bottom menu"
    >
      <div className="grid grid-cols-5 h-[68px] px-2">
        {items.map((item) => {
          const active = item.isActive(location.pathname);
          const to = item.key === "profile" ? (isAuthenticated ? item.toAuth : item.toGuest) : item.to;

          return (
            <Link
              key={item.key}
              to={to}
              className="relative flex flex-col items-center justify-center gap-1 rounded-xl transition-all"
              style={{ color: active ? "var(--primary)" : "var(--foreground-muted)" }}
              aria-current={active ? "page" : undefined}
            >
              <div className="relative">
                {item.icon}
                {item.key === "cart" && cartCount > 0 && (
                  <span
                    className="absolute -top-2 -right-3 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-semibold flex items-center justify-center"
                    style={{
                      backgroundColor: "var(--primary)",
                      color: "var(--primary-foreground)",
                    }}
                  >
                    {cartCount > 99 ? "99+" : cartCount}
                  </span>
                )}
              </div>
              <span className="text-[11px] font-semibold leading-none">{item.label}</span>
              {active && (
                <span
                  className="absolute bottom-1 h-1 w-10 rounded-full"
                  style={{ backgroundColor: "var(--primary)" }}
                  aria-hidden
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
