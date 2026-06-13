import { useState } from "react";
import { API } from "../api";
import { useToast } from "../context/ToastContext";
import { useContactSettings } from "../hooks/useContactSettings";
import { getMailtoHref, getTelHref } from "../config/contactSettings";

const IMG = {
  orchard: "/images/store/IMG_9267.jpg",
  basket: "/images/store/IMG_9268.jpg",
  heroCard: "/images/store/IMG_9271.jpg",
  bannerFruit: "/images/store/IMG_9266.jpg",
};


function StylizedMap() {
  return (
    <div
      className="relative aspect-[16/11] w-full overflow-hidden rounded-2xl border shadow-inner"
      style={{ borderColor: "var(--cf-line)", background: "linear-gradient(165deg, #e8f5e9 0%, #f1f8e9 45%, #fffde7 100%)" }}
    >
      <svg className="h-full w-full" viewBox="0 0 400 260" preserveAspectRatio="xMidYMid slice" aria-hidden>
        <path d="M40 180 Q120 140 200 160 T360 140" fill="none" stroke="rgba(45,90,39,0.2)" strokeWidth="3" />
        <path d="M60 80 L340 100 M80 200 L320 60" fill="none" stroke="rgba(45,90,39,0.12)" strokeWidth="2" />
        <text x="200" y="38" textAnchor="middle" fill="#2d5a27" fontSize="20" fontWeight="700">
          Bhilwara
        </text>
        <circle cx="130" cy="150" r="22" fill="#2d5a27" />
        <text x="130" y="158" textAnchor="middle" fill="#fff" fontSize="16" fontWeight="700">
          1
        </text>
        <circle cx="268" cy="168" r="22" fill="#2d5a27" />
        <text x="268" y="176" textAnchor="middle" fill="#fff" fontSize="16" fontWeight="700">
          2
        </text>
      </svg>
    </div>
  );
}

function ScooterIllustration() {
  return (
    <svg className="h-24 w-28 shrink-0 sm:h-28 sm:w-32" viewBox="0 0 120 100" fill="none" aria-hidden>
      <ellipse cx="60" cy="88" rx="40" ry="6" fill="rgba(45,90,39,0.12)" />
      <path d="M25 70 Q20 55 35 48 L55 45 L70 35 Q78 28 88 32 L95 45 L100 55 Q102 68 88 72 L35 72 Q22 72 25 70Z" fill="#2d5a27" />
      <circle cx="38" cy="72" r="12" fill="#1a1a1a" stroke="#fff" strokeWidth="2" />
      <circle cx="88" cy="72" r="12" fill="#1a1a1a" stroke="#fff" strokeWidth="2" />
      <rect x="48" y="22" width="28" height="22" rx="4" fill="#f58220" opacity="0.95" />
      <circle cx="62" cy="33" r="6" fill="#fff5" />
    </svg>
  );
}

function FieldIconWrap({ icon, children, align = "center" }) {
  return (
    <div className={`cf-field flex transition-shadow ${align === "start" ? "items-start" : "items-center"}`}>
      <span
        className={`flex shrink-0 pl-4 text-[var(--cf-green)] opacity-90 ${align === "start" ? "items-start pt-3.5" : "items-center"}`}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export default function Contact() {
  const toast = useToast();
  const {
    phoneDisplay: PHONE_DISPLAY,
    phoneE164: PHONE_E164,
    email: EMAIL,
    mapUrl: MAPS_SEARCH,
    stores: STORES,
  } = useContactSettings();
  const MAILTO = getMailtoHref(EMAIL);
  const [form, setForm] = useState({ name: "", phone: "", email: "", message: "" });
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const response = await fetch(`${API}/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          message: form.message,
        }),
      });
      if (response.ok) {
        toast.success("Message sent");
        setForm({ name: "", phone: "", email: "", message: "" });
      } else {
        toast.error("Failed to send message. Please try again.");
      }
    } catch {
      toast.error("Error sending message. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const inp =
    "w-full border-0 bg-transparent py-3.5 pr-4 text-[var(--cf-text)] outline-none placeholder:text-[var(--cf-muted)] placeholder:opacity-75";

  return (
    <div className="contact-mockup min-h-screen pb-0">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 scale-105 bg-cover bg-center blur-[2px]" style={{ backgroundImage: `url(${IMG.orchard})` }} />
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(105deg, rgba(255,255,255,0.94) 0%, rgba(247,245,240,0.9) 42%, rgba(255,255,255,0.55) 100%)",
          }}
        />
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:gap-12 lg:px-8 lg:py-20">
          <div>
            <p className="cf-script text-4xl sm:text-5xl">Contact Us</p>
            <h1 className="cf-display mt-2 text-2xl leading-tight sm:text-3xl md:text-[1.85rem]">
              WE&apos;RE HERE TO DELIVER FRESHNESS TO YOU
            </h1>
            <div className="my-6 flex items-center gap-3">
              <span className="h-px flex-1 max-w-[100px]" style={{ background: "var(--cf-green)" }} />
              <span className="text-lg" style={{ color: "var(--cf-orange)" }} aria-hidden>
                ♥
              </span>
              <span className="h-px flex-1 max-w-[100px]" style={{ background: "var(--cf-green)" }} />
            </div>
            <p className="max-w-md text-base leading-relaxed sm:text-lg" style={{ color: "var(--cf-muted)" }}>
              Have a question, suggestion, or need help with your order? We&apos;d love to hear from you!
            </p>
          </div>
          <div className="relative mx-auto flex max-w-lg justify-center gap-3 lg:mx-0 lg:max-w-none">
            <img
              src={IMG.basket}
              alt="Fresh fruits in a basket"
              className="w-[52%] rounded-2xl object-cover shadow-xl ring-2 ring-white/80"
            />
            <div className="w-[44%] self-end rounded-2xl bg-[#c8a882] p-2 shadow-lg ring-2 ring-white/60">
              <div className="flex aspect-[3/4] flex-col justify-between overflow-hidden rounded-xl bg-[#fdf6e3] p-3 text-[10px] font-bold uppercase leading-tight text-[#2d5a27] shadow-inner">
                <span>Dil Se</span>
                <img
                  src={IMG.heroCard}
                  alt="Dil Se SK Fruits store"
                  className="my-2 min-h-0 w-full flex-1 rounded-lg object-cover"
                />
                <div>
                  <span className="block text-[var(--cf-orange)]">SK Fruits</span>
                  <span className="text-[9px] font-normal normal-case text-[var(--cf-muted)]">Fresh • Local • Fast</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick contact cards */}
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-4 md:grid-cols-3">
          <a
            href={getTelHref(PHONE_E164)}
            className="flex gap-4 rounded-[var(--radius-lg)] border bg-[var(--cf-white)] p-5 shadow-sm transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-md"
            style={{ borderColor: "var(--cf-line)" }}
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[rgba(45,90,39,0.1)] text-[var(--cf-green)]">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-[var(--cf-green)]">Call Us</p>
              <p className="mt-1 font-semibold text-[var(--cf-text)]">{PHONE_DISPLAY}</p>
              <p className="mt-1 text-sm text-[var(--cf-muted)]">We&apos;re just a call away!</p>
            </div>
          </a>
          <a
            href={`https://wa.me/${PHONE_E164}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex gap-4 rounded-[var(--radius-lg)] border bg-[var(--cf-white)] p-5 shadow-sm transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-md"
            style={{ borderColor: "var(--cf-line)" }}
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[rgba(45,90,39,0.1)] text-[var(--cf-green)]">
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.718 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-[var(--cf-green)]">WhatsApp</p>
              <p className="mt-1 font-semibold text-[var(--cf-text)]">{PHONE_DISPLAY}</p>
              <p className="mt-1 text-sm text-[var(--cf-muted)]">Chat with us on WhatsApp</p>
            </div>
          </a>
          <a
            href={MAILTO}
            className="flex gap-4 rounded-[var(--radius-lg)] border bg-[var(--cf-white)] p-5 shadow-sm transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-md"
            style={{ borderColor: "var(--cf-line)" }}
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[rgba(245,130,32,0.15)] text-[var(--cf-orange)]">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-[var(--cf-green)]">Email Us</p>
              <p className="mt-1 break-words font-semibold text-[var(--cf-text)]">{EMAIL}</p>
              <p className="mt-1 text-sm text-[var(--cf-muted)]">We reply to every email</p>
            </div>
          </a>
        </div>
      </section>

      {/* Locations + Form */}
      <section className="border-t border-[var(--cf-line)] bg-[var(--cf-white)] py-12 sm:py-16">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8">
          {/* Left: stores */}
          <div>
            <div className="mb-8 flex items-center gap-2">
              <svg className="h-7 w-7 text-[var(--cf-green)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <h2 className="cf-display text-xl sm:text-2xl">OUR STORE LOCATIONS</h2>
            </div>
            <ul className="space-y-6">
              {STORES.map((s) => (
                <li key={s.n} className="flex gap-4">
                  <span
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-lg font-bold text-white"
                    style={{ background: "var(--cf-green)" }}
                  >
                    {s.n}
                  </span>
                  <img src={s.thumb} alt="" className="h-20 w-24 shrink-0 rounded-lg object-cover shadow-sm" loading="lazy" />
                  <address className="not-italic text-sm leading-relaxed text-[var(--cf-muted)] sm:text-base">
                    {s.lines.map((line) => (
                      <span key={line} className="block">
                        {line}
                      </span>
                    ))}
                  </address>
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <StylizedMap />
            </div>
            <a
              href={MAPS_SEARCH}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-[var(--radius-md)] border-2 border-[var(--cf-green)] px-5 py-3 text-center text-sm font-bold uppercase tracking-wide text-[var(--cf-green)] transition-colors hover:bg-[var(--cf-green)] hover:text-white sm:w-auto"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              View on Map
            </a>
          </div>

          {/* Right: form */}
          <div>
            <div className="mb-8 flex items-center gap-2">
              <svg className="h-7 w-7 text-[var(--cf-green)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
              </svg>
              <h2 className="cf-display text-xl sm:text-2xl">SEND US A MESSAGE</h2>
            </div>
            <form onSubmit={submit} className="space-y-4">
              <FieldIconWrap
                icon={
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                }
              >
                <input
                  name="name"
                  required
                  autoComplete="name"
                  placeholder="Your Name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={inp}
                />
              </FieldIconWrap>
              <FieldIconWrap
                icon={
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                }
              >
                <input
                  name="phone"
                  type="tel"
                  required
                  autoComplete="tel"
                  placeholder="Phone Number"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className={inp}
                />
              </FieldIconWrap>
              <FieldIconWrap
                icon={
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                }
              >
                <input
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="Email Address"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className={inp}
                />
              </FieldIconWrap>
              <FieldIconWrap
                align="start"
                icon={
                  <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                }
              >
                <textarea
                  name="message"
                  required
                  rows={5}
                  maxLength={2000}
                  placeholder="Your Message"
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  className={`${inp} min-h-[120px] resize-y py-3.5`}
                />
              </FieldIconWrap>
              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-md)] py-4 text-sm font-bold uppercase tracking-wide text-white shadow-md transition-[transform,background-color] hover:bg-[var(--cf-green-hover)] active:scale-[0.99] disabled:opacity-50"
                style={{ background: "var(--cf-green)" }}
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                </svg>
                {submitting ? "Sending…" : "Send Message"}
              </button>
              <p className="flex items-center justify-center gap-2 text-xs text-[var(--cf-muted)]">
                <svg className="h-4 w-4 text-[var(--cf-green)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Your information is safe with us.
              </p>
            </form>
          </div>
        </div>
      </section>

      {/* Service banner */}
      <section className="border-y border-[rgba(245,130,32,0.25)] py-8 sm:py-10" style={{ background: "var(--cf-banner)" }}>
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 px-4 sm:flex-row sm:justify-between sm:px-6 lg:px-8">
          <ScooterIllustration />
          <div className="max-w-xl flex-1 text-center sm:text-left">
            <p className="cf-display text-lg sm:text-xl" style={{ color: "var(--cf-green)" }}>
              60-MINUTE DELIVERY
              <span className="text-[var(--cf-orange)]"> AVAILABLE IN BHILWARA</span>
            </p>
            <p className="mt-2 text-sm font-medium text-[var(--cf-muted)] sm:text-base">
              Free Delivery <span className="text-[var(--cf-orange)]">•</span> Fresh Fruits{" "}
              <span className="text-[var(--cf-orange)]">•</span> Same Day Delivery
            </p>
          </div>
          <img
            src={IMG.bannerFruit}
            alt=""
            className="hidden h-32 w-44 rounded-2xl object-cover shadow-lg ring-2 ring-white/80 sm:block lg:h-36 lg:w-48"
            loading="lazy"
          />
        </div>
      </section>

      {/* Quick Contact Options */}
      <div className="py-16" style={{ backgroundColor: "var(--background)" }}>
        <div className="   px-2 sm:px-4 lg:px-6">
          <div className="text-center mb-12">
            <h2 className="text-xl font-bold mb-4" style={{ color: "var(--foreground)" }}>
              Quick Contact Options
            </h2>
            <p className="text-lg" style={{ color: "var(--foreground-muted)" }}>
              Choose the most convenient way to reach us for immediate assistance
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <a
              href={getTelHref(PHONE_E164)}
              className="rounded-xl shadow-lg p-8 text-center hover:shadow-xl transition-all duration-300 group"
              style={{ backgroundColor: "var(--card-white)" }}
            >
              <div className="text-5xl mb-4">📞</div>
              <h3 className="text-xl font-bold mb-3" style={{ color: "var(--foreground)" }}>
                Call Us Now
              </h3>
              <p className="text-sm mb-4" style={{ color: "var(--foreground-muted)" }}>
                Speak directly with our sales team for immediate assistance
              </p>
              <button
                className="px-6 py-2 rounded-lg font-semibold transition-all duration-300"
                style={{ 
                  backgroundColor: "var(--secondary)",
                  color: "var(--foreground)"
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = "var(--muted)"}
                onMouseLeave={(e) => e.target.style.backgroundColor = "var(--secondary)"}
              >
                Call Now
              </button>
            </a>

            <a
              href={MAILTO}
              className="rounded-xl shadow-lg p-8 text-center hover:shadow-xl transition-all duration-300 group"
              style={{ backgroundColor: "var(--card-white)" }}
            >
              <div className="text-5xl mb-4">📧</div>
              <h3 className="text-xl font-bold mb-3" style={{ color: "var(--foreground)" }}>
                Email Us
              </h3>
              <p className="text-sm mb-4" style={{ color: "var(--foreground-muted)" }}>
                Send detailed inquiries and get comprehensive responses
              </p>
              <button
                className="px-6 py-2 rounded-lg font-semibold transition-all duration-300"
                style={{ 
                  backgroundColor: "var(--secondary)",
                  color: "var(--foreground)"
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = "var(--muted)"}
                onMouseLeave={(e) => e.target.style.backgroundColor = "var(--secondary)"}
              >
                Send Email
              </button>
            </a>

            <a
              href={MAPS_SEARCH}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl shadow-lg p-8 text-center hover:shadow-xl transition-all duration-300 group"
              style={{ backgroundColor: "var(--card-white)" }}
            >
              <div className="text-5xl mb-4">📍</div>
              <h3 className="text-xl font-bold mb-3" style={{ color: "var(--foreground)" }}>
                Visit Our Location
              </h3>
              <p className="text-sm mb-4" style={{ color: "var(--foreground-muted)" }}>
                Get directions and find our store location on Google Maps
              </p>
              <button
                className="px-6 py-2 rounded-lg font-semibold transition-all duration-300"
                style={{
                  backgroundColor: "var(--secondary)",
                  color: "var(--foreground)",
                }}
                onMouseEnter={(e) => (e.target.style.backgroundColor = "var(--muted)")}
                onMouseLeave={(e) => (e.target.style.backgroundColor = "var(--secondary)")}
              >
                Get Directions
              </button>
            </a>
        </div>
      </div>
    </div>
    </div>
  );
}
