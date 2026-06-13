import { useEffect, useRef, useState } from "react";

const IMG = {
  heroBasket: "/images/store/IMG_9262.jpg",
  whoWeAre: "/images/store/IMG_9264.jpg",
  promiseBasket: "/images/store/IMG_9266.jpg",
};

const FEATURE_CARDS = [
  {
    title: "60 Minutes Delivery",
    text: "Speed you can count on when freshness matters most.",
    icon: (
      <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    title: "Free Delivery",
    text: "Premium fruit at your door with no extra delivery charge.",
    icon: (
      <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
      </svg>
    ),
  },
  {
    title: "Premium Quality",
    text: "Handpicked lots that meet our strict taste and ripeness standards.",
    icon: (
      <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
      </svg>
    ),
  },
  {
    title: "Fresh & Healthy",
    text: "Natural flavour and nutrition preserved from farm to doorstep.",
    icon: (
      <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
      </svg>
    ),
  },
];

const PROMISE_ITEMS = [
  {
    label: "Trust",
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  {
    label: "Freshness",
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
  {
    label: "Quality",
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
      </svg>
    ),
  },
  {
    label: "Satisfaction",
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    ),
  },
];

const WHY_CHOOSE = [
  { title: "35+ Years of Experience", accent: "green" },
  { title: "Handpicked Premium Fruits", accent: "orange" },
  { title: "60-Minute Delivery in Bhilwara", accent: "green" },
  { title: "Free Delivery", accent: "orange" },
  { title: "Trusted Local Brand", accent: "green" },
];

const FOOTER_TRUST = [
  {
    label: "Handpicked with Care",
    icon: (
      <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
      </svg>
    ),
  },
  {
    label: "Hygienically Packed",
    icon: (
      <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
  },
  {
    label: "On-Time Delivery",
    icon: (
      <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    label: "100% Customer Satisfaction",
    icon: (
      <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

function Reveal({ children, className = "", delayMs = 0 }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true);
      },
      { threshold: 0.08, rootMargin: "0px 0px -8% 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`about-reveal ${visible ? "about-reveal--visible" : ""} ${className}`}
      style={{ transitionDelay: visible ? `${delayMs}ms` : "0ms" }}
    >
      {children}
    </div>
  );
}

function DecorSlices() {
  return (
    <div className="about-decor-slices about-body flex flex-col items-center justify-between py-4" aria-hidden>
      <div className="h-14 w-14 rounded-full border-4 border-white shadow-md" style={{ background: "linear-gradient(135deg, #f58220 40%, #ffb347)" }} />
      <div className="h-12 w-12 rounded-full border-4 border-white shadow-md" style={{ background: "linear-gradient(135deg, #c8e6c9 30%, #2d5a27)" }} />
      <div className="h-10 w-10 rounded-full border-4 border-white shadow-md" style={{ background: "linear-gradient(135deg, #fff9c4, #f9a825)" }} />
      <div className="h-11 w-11 rounded-full border-4 border-white shadow-md opacity-90" style={{ background: "linear-gradient(135deg, #e8f5e9, #66bb6a)" }} />
    </div>
  );
}

export default function About() {
  return (
    <div className="about-page about-body min-h-screen overflow-x-hidden">
      {/* Hero */}
      <section className="relative">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${IMG.heroBasket})` }}
          role="img"
          aria-label="Fresh fruit basket"
        />
        <div
          className="absolute inset-0 bg-gradient-to-r from-[var(--ab-cream)] via-[rgba(247,245,240,0.92)] to-[rgba(247,245,240,0.65)] md:via-[rgba(247,245,240,0.88)] md:to-[rgba(247,245,240,0.35)]"
        />
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-24 sm:px-6 lg:grid-cols-2 lg:gap-12 lg:px-8 lg:py-28">
          <div className="max-w-xl">
            <p className="about-script about-hero-enter mb-2 text-3xl sm:text-4xl">About Us</p>
            <h1 className="about-display about-hero-enter-delay mb-4 text-3xl leading-tight sm:text-4xl md:text-[2.65rem]">
              OUR LEGACY OF FRESHNESS &amp; TRUST
            </h1>
            <p className="about-hero-enter-delay mb-6 text-lg sm:text-xl" style={{ color: "var(--ab-text)" }}>
              Serving Premium Quality Fruits Since{" "}
              <span style={{ color: "var(--ab-orange)", fontWeight: 600 }}>1949</span>
            </p>
            <p className="about-hero-enter-delay text-base leading-relaxed sm:text-lg" style={{ color: "var(--ab-muted)" }}>
              From a small wooden cabin to a multi-city presence, our journey is built on trust, tradition, and a
              commitment to delivering freshness every day—so your family enjoys fruit the way it was meant to taste.
            </p>
          </div>
          <div className="relative hidden justify-center lg:flex">
            <div className="relative w-full max-w-md">
              <img
                src={IMG.heroBasket}
                alt=""
                className="relative z-10 w-full rounded-3xl object-cover shadow-2xl"
                style={{ boxShadow: "0 24px 48px rgba(45, 90, 39, 0.2)" }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="flex items-center justify-center gap-3 py-6" style={{ background: "var(--ab-white)" }}>
        <span className="h-px w-12 sm:w-24" style={{ background: "var(--ab-line)" }} />
        <span className="text-lg" style={{ color: "var(--ab-green)" }} aria-hidden>
          🍃
        </span>
        <span className="h-px w-12 sm:w-24" style={{ background: "var(--ab-line)" }} />
      </div>

      {/* Who we are + features */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20" style={{ background: "var(--ab-white)" }}>
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-10">
          <Reveal className="lg:col-span-4">
            <div className="relative mx-auto max-w-sm lg:mx-0">
              <img src={IMG.whoWeAre} alt="Fresh fruit basket" className="aspect-square w-full rounded-2xl object-cover shadow-lg" />
              <div
                className="absolute -bottom-4 -right-4 flex h-28 w-28 flex-col items-center justify-center rounded-full border-4 border-white text-center shadow-lg sm:h-32 sm:w-32"
                style={{ background: "var(--ab-green)", color: "var(--ab-white)" }}
              >
                <span className="text-xl font-bold leading-none sm:text-2xl">35+</span>
                <span className="mt-1 px-2 text-[10px] font-semibold uppercase leading-tight tracking-wide sm:text-xs">
                  Years of Trust
                </span>
              </div>
            </div>
          </Reveal>
          <Reveal className="lg:col-span-5" delayMs={60}>
            <h2 className="about-display mb-6 text-2xl sm:text-3xl">WHO WE ARE</h2>
            <div className="space-y-4 text-base leading-relaxed sm:text-lg" style={{ color: "var(--ab-muted)" }}>
              <p>
                We are a trusted and established fruit business, proudly serving customers with the finest quality
                produce for over 35 years. Built on a strong foundation of trust, reliability, and commitment, we have
                earned the confidence of our customers through consistent service and premium offerings.
              </p>
              <p>
                We specialize in providing fresh, handpicked fruits that maintain their natural taste, quality, and
                nutritional value. Understanding the importance of timely service, we offer{" "}
                <strong style={{ color: "var(--ab-green)", fontWeight: 600 }}>same-day delivery</strong> to ensure that
                our customers always receive fresh stock without delay.
              </p>
              <p>
                To make the experience even more convenient, we also provide{" "}
                <strong style={{ color: "var(--ab-green)", fontWeight: 600 }}>free delivery</strong>, ensuring that
                quality fruits reach your doorstep without any extra cost.
              </p>
            </div>
          </Reveal>
          <div className="grid grid-cols-2 gap-4 lg:col-span-3">
            {FEATURE_CARDS.map((f, i) => (
              <Reveal key={f.title} delayMs={i * 80}>
                <div
                  className="flex h-full flex-col rounded-2xl border p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5"
                  style={{ borderColor: "var(--ab-line)", background: "var(--ab-cream)" }}
                >
                  <div className="mb-3" style={{ color: "var(--ab-green)" }}>
                    {f.icon}
                  </div>
                  <h3 className="mb-1 text-sm font-semibold sm:text-base" style={{ color: "var(--ab-green)" }}>
                    {f.title}
                  </h3>
                  <p className="text-xs leading-relaxed sm:text-sm" style={{ color: "var(--ab-muted)" }}>
                    {f.text}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Promise + Why choose */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20" style={{ background: "var(--ab-white)" }}>
        <div className="relative grid gap-8 lg:grid-cols-2 lg:gap-12">
          <DecorSlices />
          <Reveal>
            <div
              className="h-full rounded-3xl border p-8 shadow-sm sm:p-10"
              style={{ borderColor: "var(--ab-line)", background: "var(--ab-cream)" }}
            >
              <h2 className="about-display mb-8 text-2xl">OUR PROMISE</h2>
              <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
                {PROMISE_ITEMS.map((p) => (
                  <div key={p.label} className="flex flex-col items-center text-center">
                    <div
                      className="mb-2 flex h-12 w-12 items-center justify-center rounded-full"
                      style={{ background: "rgba(45, 90, 39, 0.12)", color: "var(--ab-green)" }}
                    >
                      {p.icon}
                    </div>
                    <span className="text-sm font-semibold" style={{ color: "var(--ab-green)" }}>
                      {p.label}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-10 overflow-hidden rounded-2xl shadow-md">
                <img src={IMG.promiseBasket} alt="Seasonal fruit arrangement" className="h-48 w-full object-cover sm:h-56" />
              </div>
            </div>
          </Reveal>
          <Reveal delayMs={80}>
            <div
              className="relative h-full overflow-hidden rounded-3xl border p-8 shadow-sm sm:p-10"
              style={{ borderColor: "var(--ab-line)", background: "var(--ab-white)" }}
            >
              <h2 className="about-display mb-8 text-2xl">WHY CHOOSE US?</h2>
              <ul className="space-y-0">
                {WHY_CHOOSE.map((row, idx) => (
                  <li key={row.title}>
                    <div className="flex items-start gap-4 py-4">
                      <span
                        className="mt-1 flex h-3 w-3 shrink-0 rounded-full"
                        style={{
                          background: row.accent === "green" ? "var(--ab-green)" : "var(--ab-orange)",
                        }}
                      />
                      <span className="text-base font-medium" style={{ color: "var(--ab-text)" }}>
                        {row.title}
                      </span>
                    </div>
                    {idx < WHY_CHOOSE.length - 1 ? (
                      <div className="h-px w-full" style={{ background: "var(--ab-line)" }} />
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Brand footer band */}
      <section className="about-body py-14 sm:py-16" style={{ background: "var(--ab-green)", color: "var(--ab-white)" }}>
        <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:items-center lg:gap-16 lg:px-8">
          <Reveal>
            <p className="about-script text-2xl leading-relaxed sm:text-3xl md:text-[1.85rem]">
              From our family to yours – we deliver not just fruits, but freshness, trust, and care.
            </p>
          </Reveal>
          <Reveal delayMs={80}>
            <div className="grid grid-cols-2 gap-8 sm:gap-10">
              {FOOTER_TRUST.map((t) => (
                <div key={t.label} className="flex flex-col items-center text-center">
                  <div className="mb-3 opacity-95">{t.icon}</div>
                  <span className="text-sm font-medium leading-snug text-white/95">{t.label}</span>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
