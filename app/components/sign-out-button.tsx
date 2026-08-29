"use client";

import { useFormStatus } from "react-dom";

function SignOutIcon() {
  return (
    <svg className="menu-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M10 5H5v14h5M14 8l4 4-4 4M9 12h9" />
    </svg>
  );
}

/**
 * Keeps the account menu present while the server clears the session, so
 * signing out reads as a deliberate transition instead of an abrupt jump.
 */
export function SignOutButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      data-keep-menu-open
      aria-busy={pending || undefined}
      aria-live="polite"
    >
      {pending ? (
        <>
          <span className="signout-spinner" aria-hidden="true" />
          <span>Signing out…</span>
        </>
      ) : (
        <>
          <SignOutIcon />
          <span>Sign out</span>
        </>
      )}
    </button>
  );
}
