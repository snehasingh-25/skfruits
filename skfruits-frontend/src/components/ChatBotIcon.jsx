export default function ChatBotIcon({ className = "h-6 w-6", ...props }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      {...props}
    >
      <path
        d="M9.5 7.5h5M9.5 11h3.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M6.5 18.5 5 21l2.6-1.3"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 3.5c4.42 0 8 3.13 8 7 0 2.35-1.22 4.43-3.1 5.7L18.5 20l-3.9-1.95A8.2 8.2 0 0 1 12 17.5c-4.42 0-8-3.13-8-7s3.58-7 8-7Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        d="M17.25 5.75 18.5 4.5M18.5 4.5 19.75 5.75M18.5 4.5V7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
