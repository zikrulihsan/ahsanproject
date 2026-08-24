"use client";

import { useState } from "react";
import { MAXIMUM } from "../lib/brief";

const PRESETS = [
  "Sekali bantu, sekitar 1–2 jam",
  "1–2 jam per minggu selama 1 bulan",
  "3–5 jam per minggu selama 2–3 bulan",
  "Berkelanjutan, waktu fleksibel",
  "Belum tahu — diskusikan bersama",
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
      <label htmlFor={`${id}-preset`}>Perkiraan waktu</label>
      <select
        id={`${id}-preset`}
        name={`${name}Preset`}
        defaultValue={preset}
        required
        aria-invalid={error ? true : undefined}
        onChange={(event) => setChoice(event.target.value)}
      >
        <option value="" disabled>Pilih perkiraan…</option>
        {PRESETS.map((option) => <option key={option} value={option}>{option}</option>)}
        <option value="custom">Tulis perkiraan sendiri</option>
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
        placeholder="Contoh: sekitar 3 jam, selesai sebelum 10 September"
      />
      <p className="hint">Perkiraan kasar cukup—tidak perlu tanggal pasti kalau memang fleksibel.</p>
      {error ? <p className="field-error commitment-error" role="alert">{error}</p> : null}
    </div>
  );
}
