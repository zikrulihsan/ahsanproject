"use client";

import { useId, useMemo, useRef, useState, type FocusEvent, type KeyboardEvent } from "react";

export type SearchableOption = {
  value: string;
  label: string;
  meta?: string;
};

export function SearchableFilter({
  action,
  name,
  value,
  label,
  placeholder,
  options,
  hidden,
}: {
  action: string;
  name: string;
  value: string;
  label: string;
  placeholder: string;
  options: SearchableOption[];
  hidden: Record<string, string>;
}) {
  const form = useRef<HTMLFormElement>(null);
  const listId = useId();
  const selected = options.find((option) => option.value === value);
  const [chosenValue, setChosenValue] = useState(value);
  const [query, setQuery] = useState(selected?.label ?? value);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const matches = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("id");
    if (!needle) return [];
    return options
      .filter((option) => option.label.toLocaleLowerCase("id").includes(needle))
      .slice(0, 8);
  }, [options, query]);

  const choose = (option: SearchableOption) => {
    setChosenValue(option.value);
    setQuery(option.label);
    setOpen(false);
    requestAnimationFrame(() => form.current?.requestSubmit());
  };

  const clear = () => {
    setChosenValue("");
    setQuery("");
    setOpen(false);
    requestAnimationFrame(() => form.current?.requestSubmit());
  };

  const handleKeys = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => Math.min(index + 1, Math.max(matches.length - 1, 0)));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter" && open && matches[activeIndex]) {
      event.preventDefault();
      choose(matches[activeIndex]);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  };

  const leave = (event: FocusEvent<HTMLFormElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
  };

  return (
    <form className="searchable-filter" method="get" action={action} ref={form} onBlur={leave}>
      {Object.entries(hidden).map(([key, entry]) =>
        entry ? <input key={key} type="hidden" name={key} value={entry} /> : null,
      )}
      <input type="hidden" name={name} value={chosenValue} readOnly />
      <SearchIcon />
      <input
        type="search"
        value={query}
        placeholder={placeholder}
        aria-label={label}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open && matches[activeIndex] ? `${listId}-${activeIndex}` : undefined}
        autoComplete="off"
        onFocus={() => setOpen(Boolean(query.trim()))}
        onChange={(event) => {
          setQuery(event.target.value);
          setChosenValue("");
          setActiveIndex(0);
          setOpen(true);
        }}
        onKeyDown={handleKeys}
      />
      {query ? <button className="searchable-filter-clear" type="button" onClick={clear} aria-label="Hapus filter kategori">×</button> : null}

      {open ? (
        <div className="searchable-filter-options" id={listId} role="listbox" aria-label="Hasil kategori">
          {matches.length > 0 ? matches.map((option, index) => (
            <button
              key={option.value}
              id={`${listId}-${index}`}
              type="button"
              role="option"
              aria-selected={index === activeIndex}
              className={index === activeIndex ? "is-active" : ""}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => choose(option)}
            >
              <span>{option.label}</span>
              {option.meta ? <small>{option.meta}</small> : null}
            </button>
          )) : <p>Kategori tidak ditemukan.</p>}
        </div>
      ) : null}
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
