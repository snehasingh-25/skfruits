export default function CarouselArrow({
  direction,
  onClick,
  ariaLabel,
  size = "md",
  className = "",
  disabled = false,
  hideOnMobile = false,
}) {
  const isLeft = direction === "left";

  const sizeClass =
    size === "sm"
      ? "h-9 w-9 sm:h-10 sm:w-10"
      : size === "lg"
        ? "h-11 w-11 sm:h-12 sm:w-12"
        : "h-10 w-10 sm:h-11 sm:w-11";

  const iconClass =
    size === "sm"
      ? "h-4 w-4 sm:h-5 sm:w-5"
      : size === "lg"
        ? "h-5 w-5 sm:h-6 sm:w-6"
        : "h-5 w-5";

  const mobileVisibility = hideOnMobile ? "hidden sm:grid" : "grid";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={[
        mobileVisibility,
        sizeClass,
        "place-items-center rounded-full shadow-lg ring-1 ring-black/5",
        "transition active:scale-95",
        disabled ? "opacity-40 pointer-events-none" : "bg-white/90 hover:bg-white",
        className,
      ].join(" ")}
    >
      <svg
        className={`${iconClass} text-slate-700`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden
      >
        {isLeft ? (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        )}
      </svg>
    </button>
  );
}
