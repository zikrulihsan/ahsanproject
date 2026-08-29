"use client";

import { useActionState, useRef, useState } from "react";
import { createProject, type CreateState } from "../actions";
import { MAXIMUM, MINIMUM } from "../lib/brief";
import { STAGES, stageMeta, type Stage } from "../lib/stages";
import { CommitmentField } from "./commitment-field";
import { Field } from "./field";
import { RoleFields } from "./role-fields";
import { TopicPicker } from "./topic-picker";
import { GitHubImport } from "./github-import";

const EMPTY: CreateState = { errors: {}, values: {} };

/**
 * One page, with optional questions revealed only when they become relevant.
 * The core brief stays structured, while links and collaboration details no
 * longer make a new idea look like a proposal that must be finished at once.
 */
export function CreateForm() {
  const [state, formAction, pending] = useActionState(createProject, EMPTY);
  const formRef = useRef<HTMLFormElement>(null);
  const { errors, values } = state;
  const initialStage = STAGES.includes(values.stage as Stage) ? (values.stage as Stage) : "idea";
  const [stage, setStage] = useState<Stage>(initialStage);
  const [wantsHelp, setWantsHelp] = useState(values.openSeat === "yes");
  const [openForGitHubContributions, setOpenForGitHubContributions] = useState(
    values.openForGitHubContributions === "yes",
  );

  return (
    <form className="create-form" action={formAction} ref={formRef}>
      <p className="form-start-note">
        Mulai dari yang kamu tahu sekarang. Semua isi bisa diubah lagi setelah project terbit.
      </p>

      <section className="github-start" aria-labelledby="github-start-heading">
        <p className="eyebrow">
          <span /> Pilihan cepat
        </p>
        <h2 id="github-start-heading">Buka kontribusi lewat GitHub</h2>
        <p>
          Tandai hanya jika issue dan pull request dari komunitas memang kamu sambut. Kami akan
          menampilkan badge khusus di project, lalu membantu mengisi draft dari repository publikmu.
        </p>
        <label className={`help-toggle ${openForGitHubContributions ? "is-on" : ""}`}>
          <input
            type="checkbox"
            checked={openForGitHubContributions}
            onChange={(event) => setOpenForGitHubContributions(event.target.checked)}
          />
          <span>
            <strong>Open for Contribute on GitHub</strong>
            <small>Orang bisa melihat bahwa kontribusi GitHub untuk project ini terbuka.</small>
          </span>
        </label>
        <input
          type="hidden"
          name="openForGitHubContributions"
          value={openForGitHubContributions ? "yes" : "no"}
        />
        {openForGitHubContributions ? (
          <div className="progressive-panel">
            <Field
              label="URL repository GitHub"
              name="repoUrl"
              hint="Wajib berupa repository GitHub publik, misalnya https://github.com/organisasi/project."
              error={errors.repoUrl}
              defaultValue={values.repoUrl}
              type="url"
              placeholder="https://github.com/"
              required
            />
            <GitHubImport formRef={formRef} />
          </div>
        ) : (
          <input type="hidden" name="repoUrl" value={values.repoUrl ?? ""} />
        )}
      </section>

      {errors.form ? (
        <p className="form-error" role="alert">
          {errors.form}
        </p>
      ) : null}

      <fieldset className="step">
        <legend>
          <span className="step-number">1</span> Kenalkan projectmu
        </legend>

        <Field
          label="Website project"
          name="liveUrl"
          hint={
            stage === "live"
              ? "Wajib untuk project yang sudah berjalan. Favicon website dipakai jika URL logo tidak diisi."
              : "Kalau diisi, favicon website dipakai jika URL logo tidak diisi. Belum punya? Lewati dulu."
          }
          error={errors.liveUrl}
          defaultValue={values.liveUrl}
          type="url"
          placeholder="https://"
          required={stage === "live"}
        />

        <Field
          label="URL icon atau logo"
          name="logoUrl"
          hint="Opsional. Gunakan tautan langsung ke PNG, SVG, WebP, atau ICO."
          error={errors.logoUrl}
          defaultValue={values.logoUrl}
          maxLength={MAXIMUM.logoUrl}
          type="url"
          placeholder="https://contoh.id/logo.png"
        />

        <Field
          label="Nama project"
          name="title"
          hint="Sebut apa adanya. Nama bisa diubah nanti."
          error={errors.title}
          defaultValue={values.title}
          minLength={MINIMUM.title}
          maxLength={MAXIMUM.title}
          placeholder="Contoh: Main Aman"
          required
        />

        <Field
          label="Ringkasan satu kalimat"
          name="tagline"
          hint="Jelaskan manfaat utamanya dengan bahasa sehari-hari."
          error={errors.tagline}
          defaultValue={values.tagline}
          minLength={MINIMUM.tagline}
          maxLength={MAXIMUM.tagline}
          placeholder="Contoh: Materi keselamatan digital yang bisa dipakai orang tua dan anak."
          required
        />

        <TopicPicker defaultValue={values.tags} error={errors.tags} />
      </fieldset>

      <fieldset className="step">
        <legend>
          <span className="step-number">2</span> Brief singkat
        </legend>
        <p className="step-intro">
          Tidak perlu seperti proposal. Satu–dua kalimat yang konkret untuk setiap pertanyaan sudah
          cukup.
        </p>

        <Field
          label="Masalah apa yang ingin diselesaikan?"
          name="problem"
          hint="Siapa yang kesulitan, dalam situasi apa, dan kenapa cara sekarang belum cukup."
          error={errors.problem}
          defaultValue={values.problem}
          rows={4}
          minLength={MINIMUM.problem}
          maxLength={MAXIMUM.problem}
          required
        />

        <Field
          label="Apa yang sedang kamu buat?"
          name="solution"
          hint="Belum harus detail—cukup jelaskan bentuk solusi dan arah yang ingin dicoba."
          error={errors.solution}
          defaultValue={values.solution}
          rows={4}
          minLength={MINIMUM.solution}
          maxLength={MAXIMUM.solution}
          required
        />

        <Field
          label="Untuk siapa?"
          name="audience"
          hint="Sebut kelompok orang yang paling terbantu secara spesifik."
          error={errors.audience}
          defaultValue={values.audience}
          rows={2}
          minLength={MINIMUM.audience}
          maxLength={MAXIMUM.audience}
          required
        />
      </fieldset>

      <fieldset className="step">
        <legend>
          <span className="step-number">3</span> Kondisinya sekarang
        </legend>

        <ul className="stage-choice">
          {STAGES.map((item) => (
            <li key={item}>
              <label htmlFor={`stage-${item}`}>
                <input
                  id={`stage-${item}`}
                  type="radio"
                  name="stage"
                  value={item}
                  checked={stage === item}
                  onChange={() => setStage(item)}
                />
                <span>
                  <strong>{stageMeta[item].label}</strong>
                  <small>{stageMeta[item].blurb}</small>
                </span>
              </label>
            </li>
          ))}
        </ul>

        {stage === "building" || stage === "live" ? (
          <Field
            label="Sekarang sedang mengerjakan apa?"
            name="now"
            hint="Satu kalimat saja. Bisa diganti kapan pun dari halaman project."
            error={errors.now}
            defaultValue={values.now}
            maxLength={MAXIMUM.now}
            placeholder="Contoh: Menyusun materi keselamatan pertama."
          />
        ) : null}

        <details
          className="optional-fields"
          open={Boolean(errors.docUrl)}
        >
          <summary>
            Tambahkan tautan pendukung <span>opsional</span>
          </summary>
          <div className="optional-fields-body">
            <Field
              label="Dokumen atau riset"
              name="docUrl"
              error={errors.docUrl}
              defaultValue={values.docUrl}
              type="url"
              placeholder="https://"
            />
          </div>
        </details>
      </fieldset>

      <fieldset className="step">
        <legend>
          <span className="step-number">4</span> Mencari bantuan?
        </legend>
        <p className="hint">
          Bagian ini benar-benar opsional. Kamu bisa membuka role nanti dari halaman project.
        </p>

        <label className={`help-toggle ${wantsHelp ? "is-on" : ""}`}>
          <input
            type="checkbox"
            checked={wantsHelp}
            onChange={(event) => setWantsHelp(event.target.checked)}
          />
          <span>
            <strong>Ya, saya sedang mencari bantuan</strong>
            <small>Tampilkan role, pekerjaan yang dibantu, dan perkiraan waktunya.</small>
          </span>
        </label>

        {wantsHelp ? (
          <div className="progressive-panel">
            <input type="hidden" name="openSeat" value="yes" />
            <RoleFields
              id="seatRole"
              roleName="seatRole"
              roleTitleName="seatRoleTitle"
              defaultRole={values.seatRole}
              defaultRoleTitle={values.seatRoleTitle}
              roleError={errors.seatRole}
              roleTitleError={errors.seatRoleTitle}
            />

            <div className={errors.seatBrief ? "field has-error" : "field"}>
              <label htmlFor="seatBrief">Yang perlu dibantu</label>
              <textarea
                id="seatBrief"
                name="seatBrief"
                rows={3}
                maxLength={MAXIMUM.seatBrief}
                defaultValue={values.seatBrief}
                required
                aria-invalid={errors.seatBrief ? true : undefined}
                placeholder="Contoh: ngobrol dengan lima calon pengguna dan rangkum temuannya."
              />
              {errors.seatBrief ? (
                <p className="field-error" role="alert">
                  {errors.seatBrief}
                </p>
              ) : null}
            </div>

            <CommitmentField
              id="seatCommitment"
              name="seatCommitment"
              defaultValue={values.seatCommitment}
              error={errors.seatCommitment}
            />
          </div>
        ) : null}
      </fieldset>

      <button className="primary-button create-submit" type="submit" disabled={pending}>
        {pending ? "Menyimpan…" : "Tunjukkan project"}
      </button>
    </form>
  );
}
