/**
 * Ahsan Project mark: a sun rising over the horizon.
 *
 * The disc colour comes from --logo-face so the same mark works on the paper
 * header and the ink footer. Keep this in sync with public/favicon.svg.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 40 40"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="20" cy="20" r="20" fill="var(--logo-face, #173d32)" />
      <path d="M11.06 26.5a12 12 0 1 1 17.88 0z" fill="#f2bd3a" />
      <rect x="4.5" y="25" width="31" height="3.4" rx="1.7" fill="#ee6a3b" />
    </svg>
  );
}
