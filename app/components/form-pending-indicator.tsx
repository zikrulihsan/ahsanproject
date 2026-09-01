"use client";

import { useFormStatus } from "react-dom";
import { useLanguage } from "./language-provider";

/** Loading feedback for GET forms that submit themselves without a button. */
export function FormPendingIndicator() {
  const { pending } = useFormStatus();
  const { tx } = useLanguage();

  return (
    <span
      className={`form-pending-indicator ${pending ? "is-pending" : ""}`}
      aria-hidden={!pending}
    >
      <span className="form-pending-spinner" aria-hidden="true" />
      {pending ? (
        <span className="sr-only" role="status" aria-live="polite">
          {tx("Memuat hasil…", "Loading results…")}
        </span>
      ) : null}
    </span>
  );
}
