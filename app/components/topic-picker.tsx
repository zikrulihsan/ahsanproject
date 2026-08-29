"use client";

import { useState } from "react";
import { tagList } from "../lib/stages";
import { SUGGESTED_TOPICS } from "../lib/topics";

const MAX_TOPICS = 6;
const SUGGESTED = new Set<string>(SUGGESTED_TOPICS);

/** Suggested topic chips with a free-text escape hatch for unusual projects. */
export function TopicPicker({
  defaultValue = "",
  error,
}: {
  defaultValue?: string;
  error?: string;
}) {
  const initial = tagList(defaultValue);
  const [selected, setSelected] = useState(() => initial.filter((topic) => SUGGESTED.has(topic)));
  const custom = initial.filter((topic) => !SUGGESTED.has(topic)).join(", ");

  function toggle(topic: string) {
    setSelected((current) =>
      current.includes(topic)
        ? current.filter((item) => item !== topic)
        : current.length < MAX_TOPICS
          ? [...current, topic]
          : current,
    );
  }

  return (
    <div className={`field topic-picker ${error ? "has-error" : ""}`}>
      <label id="topics-label">
        Topik <span aria-hidden="true">*</span>
      </label>
      <p className="hint" id="topics-hint">
        Choose the closest matches, up to six. Nothing fits? Add your own below.
      </p>
      <div className="topic-options" role="group" aria-labelledby="topics-label" aria-describedby="topics-hint">
        {SUGGESTED_TOPICS.map((topic) => {
          const checked = selected.includes(topic);
          return (
            <label className={`topic-option ${checked ? "is-selected" : ""}`} key={topic}>
              <input
                type="checkbox"
                name="topics"
                value={topic}
                checked={checked}
                disabled={!checked && selected.length >= MAX_TOPICS}
                onChange={() => toggle(topic)}
              />
              <span>{topic}</span>
            </label>
          );
        })}
      </div>

      <label htmlFor="customTags">Other topics <span className="optional-label">optional</span></label>
      <input
        id="customTags"
        name="customTags"
        type="text"
        defaultValue={custom}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? "tags-error" : undefined}
        placeholder="Contoh: anak, transportasi"
      />
      {error ? (
        <p className="field-error" id="tags-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
