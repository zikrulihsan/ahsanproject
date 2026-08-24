/** Compact wordmark used in the navigation. */
export function Logo({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <text
        x="20"
        y="27"
        fill="currentColor"
        fontFamily="Arial, sans-serif"
        fontSize="22"
        fontWeight="800"
        textAnchor="middle"
      >
        a.
      </text>
    </svg>
  );
}
