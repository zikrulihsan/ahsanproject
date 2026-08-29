"use client";

import { useState } from "react";
import { MAXIMUM } from "../lib/brief";

const PRESETS = [
  "One-off help, about 1–2 hours",
  "1–2 hours per week for 1 month",
  "3–5 hours per week for 2–3 months",
  "Ongoing, flexible schedule",
  "Not sure yet — discuss together",
] as const;

export function CommitmentField({
  id,
  name = "commitment",
  defaultValue = "",
  error,
}: {
  id: string;
  name?: string;
  defaultValue?: string;
  error?: string;
}) {
  const preset = PRESETS.includes(defaultValue as (typeof PRESETS)[number])
    ? defaultValue
    : defaultValue
      ? "custom"
      : "";
  const [choice, setChoice] = useState(preset);

  return (
    <div className={error ? "field commitment-field has-error" : "field commitment-field"}>
      <label htmlFor={`${id}-preset`}>Time commitment</label>
      <select
        id={`${id}-preset`}
        name={`${name}Preset`}
        defaultValue={preset}
        required
        aria-invalid={error ? true : undefined}
        onChange={(event) => setChoice(event.target.value)}
      >
        <option value="" disabled>Choose an estimate…</option>
        {PRESETS.map((option) => <option key={option} value={option}>{option}</option>)}
        <option value="custom">Write your own estimate</option>
      </select>

      <input
        id={id}
        name={name}
        type="text"
        defaultValue={preset === "custom" ? defaultValue : ""}
        maxLength={MAXIMUM.commitment}
        required={choice === "custom"}
        disabled={choice !== "custom"}
        hidden={choice !== "custom"}
        aria-invalid={error ? true : undefined}
        placeholder="For example: about 3 hours, completed before September 10"
      />
      <p className="hint">A rough estimate is enough—you do not need an exact date if the schedule is flexible.</p>
      {error ? <p className="field-error commitment-error" role="alert">{error}</p> : null}
    </div>
  );
}
