"use client";

import { useActionState } from "react";
import { createProject, type CreateState } from "../actions";
import { MINIMUM } from "../lib/brief";
import { ROLES, roleMeta } from "../lib/roles";

const EMPTY: CreateState = { errors: {}, values: {} };

export function CreateForm() {
  const [state, formAction, pending] = useActionState(createProject, EMPTY);
  const { errors, values } = state;

  return (
    <form className="create-form" action={formAction}>
      {errors.form ? (
        <p className="form-error" role="alert">
          {errors.form}
        </p>
      ) : null}

      <Field
        label="Nama proyek"
        name="title"
        hint="Sebut apa adanya. Nama bisa diubah nanti."
        error={errors.title}
        defaultValue={values.title}
        required
      />

      <Field
        label="Satu kalimat ringkas"
        name="tagline"
        hint={`Kalimat yang muncul di kartu. Minimal ${MINIMUM.tagline} karakter.`}
        error={errors.tagline}
        defaultValue={values.tagline}
        required
      />

      <Field
        label="Masalah yang mau dibereskan"
        name="problem"
        hint={`Siapa yang kesulitan, dalam situasi apa, dan kenapa cara sekarang belum cukup. Minimal ${MINIMUM.problem} karakter.`}
        error={errors.problem}
        defaultValue={values.problem}
        rows={6}
        required
      />

      <Field
        label="Gambaran solusinya"
        name="solution"
        hint={`Belum harus detail — cukup jelas mau dibawa ke arah mana. Minimal ${MINIMUM.solution} karakter.`}
        error={errors.solution}
        defaultValue={values.solution}
        rows={6}
        required
      />

      <Field
        label="Untuk siapa"
        name="audience"
        hint={`Orang seperti apa yang paling terbantu. Minimal ${MINIMUM.audience} karakter.`}
        error={errors.audience}
        defaultValue={values.audience}
        rows={3}
        required
      />

      <Field
        label="Tag"
        name="tags"
        hint="Pisahkan dengan koma, maksimal enam. Contoh: umkm, keuangan, tools"
        error={errors.tags}
        defaultValue={values.tags}
        required
      />

      <fieldset>
        <legend>Bantuan yang kamu cari</legend>
        <p className="hint">
          Boleh dikosongkan dulu, tapi proyek yang membuka peran jauh lebih mungkin dapat teman
          mengerjakan.
        </p>
        <label htmlFor="seatRole">Peran</label>
        <select id="seatRole" name="seatRole" defaultValue={values.seatRole ?? "pm"}>
          {ROLES.map((role) => (
            <option key={role} value={role}>
              {roleMeta[role].label} — {roleMeta[role].blurb}
            </option>
          ))}
        </select>
        <label htmlFor="seatBrief">Yang perlu dibantu</label>
        <textarea
          id="seatBrief"
          name="seatBrief"
          rows={3}
          defaultValue={values.seatBrief}
          placeholder="Contoh: bantu ngobrol dengan lima calon pengguna dan rangkum temuannya."
        />
      </fieldset>

      <fieldset>
        <legend>Tautan (opsional)</legend>
        <Field
          label="Dokumen"
          name="docUrl"
          hint="Riset, catatan, atau dokumen produk."
          error={errors.docUrl}
          defaultValue={values.docUrl}
        />
        <Field
          label="Repo"
          name="repoUrl"
          error={errors.repoUrl}
          defaultValue={values.repoUrl}
        />
        <Field
          label="Tautan produk"
          name="liveUrl"
          hint="Isi kalau sudah ada yang bisa dibuka orang lain."
          error={errors.liveUrl}
          defaultValue={values.liveUrl}
        />
      </fieldset>

      <button className="primary-button" type="submit" disabled={pending}>
        {pending ? "Menyimpan…" : "Taruh di papan"}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  hint,
  error,
  defaultValue = "",
  rows,
  required = false,
}: {
  label: string;
  name: string;
  hint?: string;
  error?: string;
  defaultValue?: string;
  rows?: number;
  required?: boolean;
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
        />
      ) : (
        <input
          id={name}
          name={name}
          type="text"
          defaultValue={defaultValue}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          required={required}
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
