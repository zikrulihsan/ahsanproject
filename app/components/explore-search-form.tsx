"use client";

import { useId, useMemo, useRef, useState, type FocusEvent, type KeyboardEvent } from "react";
import type { OpenRoleSuggestion } from "../lib/data";

type SearchMode = "project" | "role";

export function ExploreSearchForm({
  mode,
  q,
  hidden,
  suggestions,
}: {
  mode: SearchMode;
  q: string;
  hidden: Record<string, string>;
  suggestions: OpenRoleSuggestion[];
}) {
  const form = useRef<HTMLFormElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();
  const labelId = useId();
  const [searchMode, setSearchMode] = useState<SearchMode>(mode);
  const [query, setQuery] = useState(q);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const matches = useMemo(() => {
    const needle = searchable(query);
    const filtered = needle
      ? suggestions.filter((suggestion) => searchable(suggestion.label).includes(needle))
      : suggestions;
    return filtered.slice(0, 7);
  }, [query, suggestions]);

  const showSuggestions = searchMode === "role" && open;

  const choose = (suggestion: OpenRoleSuggestion) => {
    setQuery(suggestion.value);
    setOpen(false);
    requestAnimationFrame(() => form.current?.requestSubmit());
  };

  const handleKeys = (event: KeyboardEvent<HTMLInputElement>) => {
    if (searchMode !== "role") return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => Math.min(index + 1, Math.max(matches.length - 1, 0)));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter" && showSuggestions && matches[activeIndex]) {
      event.preventDefault();
      choose(matches[activeIndex]);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  };

  const leaveSuggestions = (event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
  };

  return (
    <form
      className="discovery-search collaboration-search"
      method="get"
      action="/explore"
      role="search"
      ref={form}
    >
      {Object.entries(hidden).map(([name, value]) =>
        value ? <input key={name} type="hidden" name={name} value={value} /> : null,
      )}

      <div className="collaboration-search-mode" role="radiogroup" aria-labelledby={labelId}>
        <span id={labelId}>Search by</span>
        {([
          ["project", "Project"],
          ["role", "Open role"],
        ] as const).map(([value, label]) => (
          <label key={value}>
            <input
              type="radio"
              name="searchBy"
              value={value}
              checked={searchMode === value}
              onChange={() => {
                setSearchMode(value);
                setQuery("");
                setActiveIndex(0);
                setOpen(value === "role");
                requestAnimationFrame(() => {
                  input.current?.focus();
                  setOpen(value === "role");
                });
              }}
            />
            <span>{label}</span>
          </label>
        ))}
      </div>

      <div className="explore-query-wrap" onBlur={leaveSuggestions}>
        <div className="collaboration-search-field">
          <SearchIcon />
          <input
            ref={input}
            type="search"
            name="q"
            value={query}
            placeholder={searchMode === "role" ? "Enter a role name…" : "Enter a project name…"}
            aria-label={searchMode === "role" ? "Enter a role name" : "Enter a project name"}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={showSuggestions}
            aria-controls={showSuggestions ? listId : undefined}
            aria-activedescendant={showSuggestions && matches[activeIndex] ? `${listId}-${activeIndex}` : undefined}
            autoComplete="off"
            onFocus={() => setOpen(searchMode === "role")}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
              setOpen(searchMode === "role");
            }}
            onKeyDown={handleKeys}
          />
        </div>

        {showSuggestions ? (
          <div className="explore-role-suggestions" id={listId} role="listbox" aria-label="Open role suggestions">
            {matches.length > 0 ? (
              matches.map((suggestion, index) => (
                <button
                  key={suggestion.label}
                  id={`${listId}-${index}`}
                  type="button"
                  role="option"
                  aria-selected={index === activeIndex}
                  className={index === activeIndex ? "is-active" : ""}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => choose(suggestion)}
                >
                  <span>{suggestion.label}</span>
                  <small>{suggestion.count} open {suggestion.count === 1 ? "position" : "positions"}</small>
                </button>
              ))
            ) : (
              <p>That role is not open right now.</p>
            )}
          </div>
        ) : null}
      </div>

      <button type="submit">Search</button>
    </form>
  );
}

function SearchIcon() {
  return (
    <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </svg>
  );
}

function searchable(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("id")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
