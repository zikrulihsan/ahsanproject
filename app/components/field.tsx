"use client";

/** One labelled input with its hint and error, shared by the create and edit forms. */
export function Field({
  label,
  name,
  hint,
  error,
  defaultValue = "",
  rows,
  required = false,
  placeholder,
  minLength,
  maxLength,
  type = "text",
}: {
  label: string;
  name: string;
  hint?: string;
  error?: string;
  defaultValue?: string;
  rows?: number;
  required?: boolean;
  placeholder?: string;
  minLength?: number;
  maxLength?: number;
  type?: "text" | "url";
}) {
  const hintId = hint ? `${name}-hint` : undefined;
  const errorId = error ? `${name}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={`field ${error ? "has-error" : ""}`}>
      <label htmlFor={name}>
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>
      {hint ? (
        <p className="hint" id={hintId}>
          {hint}
        </p>
      ) : null}
      {rows ? (
        <textarea
          id={name}
          name={name}
          rows={rows}
          defaultValue={defaultValue}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          required={required}
          placeholder={placeholder}
          minLength={minLength}
          maxLength={maxLength}
        />
      ) : (
        <input
          id={name}
          name={name}
          type={type}
          defaultValue={defaultValue}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          required={required}
          placeholder={placeholder}
          minLength={minLength}
          maxLength={maxLength}
        />
      )}
      {error ? (
        <p className="field-error" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
