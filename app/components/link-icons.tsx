export type LinkIconKind = "email" | "github" | "linkedin" | "resume" | "website" | "x";

/** Small, dependency-free marks shared by profile contacts and project actions. */
export function LinkIcon({ kind, className = "link-icon" }: { kind: LinkIconKind; className?: string }) {
  if (kind === "github") {
    return (
      <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.87c-2.78.6-3.37-1.18-3.37-1.18-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.9 1.53 2.35 1.09 2.92.83.09-.65.35-1.09.64-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02A9.6 9.6 0 0 1 12 6.82a9.6 9.6 0 0 1 2.5.34c1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.69-4.57 4.94.36.31.68.92.68 1.86v2.75c0 .27.18.58.69.48A10 10 0 0 0 12 2Z"
        />
      </svg>
    );
  }

  if (kind === "linkedin") {
    return (
      <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
        <path fill="currentColor" d="M5.3 7.65H2.12V21H5.3V7.65ZM3.7 2A1.85 1.85 0 1 0 3.7 5.7 1.85 1.85 0 0 0 3.7 2ZM21.88 13.35c0-4.02-2.15-5.89-5.02-5.89-2.31 0-3.35 1.27-3.93 2.17V7.65H9.75V21h3.18v-6.61c0-1.74.33-3.43 2.49-3.43 2.13 0 2.15 1.99 2.15 3.54V21h3.18l1.13-7.65Z" />
      </svg>
    );
  }

  if (kind === "x") {
    return (
      <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
        <path fill="currentColor" d="M18.9 2H22l-6.77 7.74L23.2 22h-6.24l-4.89-6.39L6.48 22H3.36l7.26-8.3L2.97 2H9.36l4.42 5.84L18.9 2Zm-1.1 17.84h1.73L8.42 4.05H6.57L17.8 19.84Z" />
      </svg>
    );
  }

  if (kind === "email") {
    return (
      <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="m4 7 8 6 8-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (kind === "resume") {
    return (
      <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 3h8l4 4v14H6V3Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M14 3v5h4M9 12h6M9 16h6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3.5 12h17M12 3c2.3 2.45 3.5 5.45 3.5 9S14.3 18.55 12 21M12 3c-2.3 2.45-3.5 5.45-3.5 9S9.7 18.55 12 21" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
