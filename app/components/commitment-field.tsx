"use client";

import { useState } from "react";
import { MAXIMUM } from "../lib/brief";
import { useLanguage } from "./language-provider";

const PRESETS = [
  ["Bantuan satu kali, sekitar 1–2 jam", "One-off help, about 1–2 hours"],
  ["1–2 jam per minggu selama 1 bulan", "1–2 hours per week for 1 month"],
  ["3–5 jam per minggu selama 2–3 bulan", "3–5 hours per week for 2–3 months"],
  ["Berkelanjutan dengan jadwal fleksibel", "Ongoing, flexible schedule"],
  ["Belum yakin—diskusikan bersama", "Not sure yet — discuss together"],
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
  const { locale, tx } = useLanguage();
  const presetEntry = PRESETS.find(([id, en]) => defaultValue === id || defaultValue === en);
  const preset = presetEntry
    ? (locale === "id" ? presetEntry[0] : presetEntry[1])
    : defaultValue
      ? "custom"
      : "";
  const [choice, setChoice] = useState(preset);

  return (
    <div className={error ? "field commitment-field has-error" : "field commitment-field"}>
      <label htmlFor={`${id}-preset`}>{tx("Komitmen waktu", "Time commitment")}</label>
      <select
        id={`${id}-preset`}
        name={`${name}Preset`}
        defaultValue={preset}
        required
        aria-invalid={error ? true : undefined}
        onChange={(event) => setChoice(event.target.value)}
      >
        <option value="" disabled>{tx("Pilih perkiraan…", "Choose an estimate…")}</option>
        {PRESETS.map(([idCopy, enCopy]) => {
          const value = locale === "id" ? idCopy : enCopy;
          return <option key={enCopy} value={value}>{value}</option>;
        })}
        <option value="custom">{tx("Tulis perkiraan sendiri", "Write your own estimate")}</option>
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
        placeholder={tx("Contoh: sekitar 3 jam, selesai sebelum 10 September", "For example: about 3 hours, completed before September 10")}
      />
      <p className="hint">{tx("Perkiraan kasar sudah cukup—kamu tidak memerlukan tanggal pasti jika jadwalnya fleksibel.", "A rough estimate is enough—you do not need an exact date if the schedule is flexible.")}</p>
      {error ? <p className="field-error commitment-error" role="alert">{error}</p> : null}
    </div>
  );
}
