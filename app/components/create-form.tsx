"use client";

import { useActionState } from "react";
import { createProject, type CreateState } from "../actions";
import { MAXIMUM, MINIMUM } from "../lib/brief";
import { ROLES, roleMeta } from "../lib/roles";
import { STAGES, stageMeta } from "../lib/stages";
import { Field } from "./field";

const EMPTY: CreateState = { errors: {}, values: {} };

/**
 * Four steps, all on one page.
 *
 * Numbered so it reads as a short conversation rather than a form to survive,
 * but not split across screens: a wizard loses what somebody typed the moment
 * anything goes wrong, and this one still works with no JavaScript at all.
 *
 * The order matters. What it is, then why, then where it stands, then what
 * help it needs — the same order somebody reading the project will meet it in.
 */
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

      <fieldset className="step">
        <legend>
          <span className="step-number">1</span> Apa yang sedang kamu buat?
        </legend>

        <Field
          label="Nama project"
          name="title"
          hint="Sebut apa adanya. Nama bisa diubah nanti."
          error={errors.title}
          defaultValue={values.title}
          required
        />

        <Field
          label="Satu kalimat"
          name="tagline"
          hint={`Kalimat yang muncul di kartu. Minimal ${MINIMUM.tagline} karakter.`}
          error={errors.tagline}
          defaultValue={values.tagline}
          required
        />

        <Field
          label="Topik"
          name="tags"
          hint="Pisahkan dengan koma, maksimal enam. Contoh: pendidikan, anak, komunitas"
          error={errors.tags}
          defaultValue={values.tags}
          required
        />
      </fieldset>

      <fieldset className="step">
        <legend>
          <span className="step-number">2</span> Ceritakan sedikit
        </legend>

        <Field
          label="Masalah apa yang ingin diselesaikan"
          name="problem"
          hint={`Siapa yang kesulitan, dalam situasi apa, dan kenapa cara sekarang belum cukup. Minimal ${MINIMUM.problem} karakter.`}
          error={errors.problem}
          defaultValue={values.problem}
          rows={6}
          required
        />

        <Field
          label="Apa yang sedang kamu buat"
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
      </fieldset>

      <fieldset className="step">
        <legend>
          <span className="step-number">3</span> Sekarang ada di tahap mana?
        </legend>

        <ul className="stage-choice">
          {STAGES.map((stage, index) => (
            <li key={stage}>
              <label htmlFor={`stage-${stage}`}>
                <input
                  id={`stage-${stage}`}
                  type="radio"
                  name="stage"
                  value={stage}
                  defaultChecked={values.stage ? values.stage === stage : index === 0}
                />
                <span>
                  <strong>{stageMeta[stage].label}</strong>
                  <small>{stageMeta[stage].blurb}</small>
                </span>
              </label>
            </li>
          ))}
        </ul>
        <p className="hint">
          Tahap yang syaratnya belum terpenuhi akan turun sendiri — badge di sini tidak boleh
          menjanjikan yang belum ada.
        </p>

        <label htmlFor="now">Sekarang sedang…</label>
        <input
          id="now"
          name="now"
          type="text"
          maxLength={MAXIMUM.now}
          defaultValue={values.now}
          placeholder="Menyusun materi keselamatan pertama."
        />
        <p className="hint">
          Satu kalimat tentang yang sedang dikerjakan minggu ini. Inilah yang bikin projectmu
          terlihat hidup di papan — dan bisa diganti kapan saja.
        </p>

        <div className="link-row">
          <Field
            label="Dokumen"
            name="docUrl"
            hint="Riset, catatan, atau dokumen produk. Opsional."
            error={errors.docUrl}
            defaultValue={values.docUrl}
          />
          <Field
            label="Repo"
            name="repoUrl"
            hint="Opsional."
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
        </div>
      </fieldset>

      <fieldset className="step">
        <legend>
          <span className="step-number">4</span> Ada yang bisa dibantu?
        </legend>
        <p className="hint">
          Boleh dikosongkan dulu. Tapi project yang menyebut bantuannya jauh lebih mungkin dapat
          teman mengerjakan.
        </p>

        <label htmlFor="seatRole">Bantu sebagai</label>
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

        <label htmlFor="seatCommitment">Kira-kira berapa waktunya</label>
        <input
          id="seatCommitment"
          name="seatCommitment"
          type="text"
          maxLength={MAXIMUM.commitment}
          defaultValue={values.seatCommitment}
          placeholder="± 2 jam per minggu"
        />
      </fieldset>

      <button className="primary-button" type="submit" disabled={pending}>
        {pending ? "Menyimpan…" : "Tunjukkan project"}
      </button>
    </form>
  );
}
