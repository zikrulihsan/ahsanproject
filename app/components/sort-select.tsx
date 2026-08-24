"use client";

import { useRef } from "react";

export type SortOption = { value: string; label: string };

/**
 * The board's "urutkan" control.
 *
 * A plain GET form underneath: the hidden fields carry whatever else the board
 * is filtered to, so picking an order keeps the tab, the topic, and the search
 * that were already on. With JavaScript the select submits itself; without it
 * the button beside it is still there to press, which is why the form is real
 * rather than a router push.
 */
export function SortSelect({
  name,
  value,
  options,
  label,
  action = "/",
  hidden = {},
}: {
  name: string;
  value: string;
  options: SortOption[];
  label: string;
  /** Route that owns this set of query controls. */
  action?: string;
  /** The rest of the board's query, kept across the change. */
  hidden?: Record<string, string>;
}) {
  const form = useRef<HTMLFormElement>(null);
  const controlId = `board-${name}`;

  return (
    <form className="sort-field" method="get" action={action} ref={form}>
      {Object.entries(hidden).map(([key, entry]) =>
        entry ? <input key={key} type="hidden" name={key} value={entry} /> : null,
      )}
      <label className="sr-only" htmlFor={controlId}>
        {label}
      </label>
      <select
        id={controlId}
        name={name}
        defaultValue={value}
        onChange={() => form.current?.requestSubmit()}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <noscript>
        <button type="submit">Urutkan</button>
      </noscript>
    </form>
  );
}
