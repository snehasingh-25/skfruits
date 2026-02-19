import { useState } from "react";

const STAR = (
  <svg className="star-svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
);

/** Display-only or interactive star rating. value 0–5 (can be decimal for average). */
export default function StarRating({
  value = 0,
  onChange,
  readonly = false,
  size = "md",
  className = "",
}) {
  const [hoverValue, setHoverValue] = useState(null);
  const displayValue = hoverValue !== null ? hoverValue : value;
  const isInteractive = !!onChange && !readonly;

  const sizeClass = size === "sm" ? "w-4 h-4" : size === "lg" ? "w-7 h-7" : "w-5 h-5";

  return (
    <div
      className={`star-rating flex items-center gap-0.5 ${className}`}
      role={isInteractive ? "slider" : "img"}
      aria-label={readonly ? `Rating: ${value} out of 5` : "Rate 1 to 5 stars"}
      aria-valuenow={value}
      aria-valuemin={1}
      aria-valuemax={5}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = displayValue >= star;
        const half = !filled && displayValue >= star - 0.5 && displayValue < star;
        const color = filled || half ? "var(--btn-primary-bg)" : "var(--border)";
        return (
          <span
            key={star}
            className={`inline-flex relative transition-transform duration-200 ${sizeClass} ${
              isInteractive ? "cursor-pointer hover:scale-110" : ""
            } star-rating-star`}
            style={{ color }}
            onMouseEnter={() => isInteractive && setHoverValue(star)}
            onMouseLeave={() => isInteractive && setHoverValue(null)}
            onClick={() => isInteractive && onChange(star)}
          >
            {half ? (
              <>
                <span className="absolute inset-0 flex items-center justify-center" style={{ color: "var(--border)" }}>
                  {STAR}
                </span>
                <span className="star-half-mask flex items-center justify-center" style={{ color: "var(--btn-primary-bg)" }}>
                  {STAR}
                </span>
              </>
            ) : (
              STAR
            )}
          </span>
        );
      })}
    </div>
  );
}
