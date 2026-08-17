/**
 * Ahsan Project mark: the mosque dome from the brand logo.
 *
 * Stroked with currentColor so the header and footer can recolour it with a
 * plain `color` rule. Keep the path in sync with public/favicon.svg.
 */
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
      <path
        d="M6.8 32C7.6 28 8 24.6 9.4 21.2 11 17 17.2 14.6 20 7.6 22.8 14.6 29 17 30.6 21.2 32 24.6 32.4 28 33.2 32"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
