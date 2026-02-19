/**
 * Displays driver name and contact (phone) when a driver is assigned.
 * Hide when driver is null/undefined. Uses design tokens only.
 */
export default function DriverInfo({ driver, compact = false }) {
  if (!driver?.name) return null;

  const phone = driver.phone?.trim();
  const telHref = phone ? `tel:${phone.replace(/\D/g, "").slice(-10)}` : null;

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-2 mt-2">
        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
          Driver
        </span>
        <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>{driver.name}</span>
        {telHref && (
          <a
            href={telHref}
            className="text-sm font-medium inline-flex items-center gap-1 transition-opacity hover:opacity-80"
            style={{ color: "var(--primary)" }}
          >
            Contact driver
          </a>
        )}
      </div>
    );
  }

  return (
    <div
      className="rounded-xl border p-6"
      style={{ borderColor: "var(--border)", background: "var(--background)", boxShadow: "var(--shadow-soft)" }}
    >
      <h2 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: "var(--text-muted)" }}>
        Driver assigned
      </h2>
      <p className="font-medium" style={{ color: "var(--foreground)" }}>{driver.name}</p>
      {telHref ? (
        <a
          href={telHref}
          className="inline-flex items-center gap-2 mt-2 px-4 py-2 rounded-lg font-medium transition-all"
          style={{
            background: "var(--primary)",
            color: "var(--primary-foreground)",
            borderRadius: "var(--radius-md)",
          }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
          Contact driver
        </a>
      ) : (
        phone && <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>{phone}</p>
      )}
    </div>
  );
}
