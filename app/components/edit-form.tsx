"use client";

import { useActionState, useRef, useState } from "react";
import { updateProject, type EditState } from "../actions";
import { MAXIMUM, MINIMUM } from "../lib/brief";
import { STAGES, stageMeta, type Stage } from "../lib/stages";
import { Field } from "./field";
import { TopicPicker } from "./topic-picker";
import { GitHubImport } from "./github-import";

export type EditableProject = {
  slug: string;
  title: string;
  tagline: string;
  problem: string;
  solution: string;
  audience: string;
  tags: string[];
  nowText: string;
  docUrl: string;
  repoUrl: string;
  liveUrl: string;
  logoUrl: string;
  stage: Stage;
};

export function EditForm({ project }: { project: EditableProject }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [stage, setStage] = useState<Stage>(project.stage);
  const initial: EditState = {
    errors: {},
    values: {
      ...project,
      tags: project.tags.join(", "),
      now: project.nowText,
      stage: project.stage,
    },
  };
  const [state, formAction, pending] = useActionState(updateProject, initial);
  const { errors, values } = state;

  return (
    <form className="create-form" action={formAction} ref={formRef}>
      {errors.form ? (
        <p className="form-error" role="alert">
          {errors.form}
        </p>
      ) : null}

      <input type="hidden" name="slug" value={project.slug} />

      <Field label="Nama project" name="title" error={errors.title} defaultValue={values.title} required />

      <Field
        label="Website project"
        name="liveUrl"
        hint="Favicon website dipakai jika URL logo tidak diisi. Kosongkan kalau projectmu belum punya website."
        error={errors.liveUrl}
        defaultValue={values.liveUrl}
        type="url"
        placeholder="https://"
      />

      <Field
        label="URL icon atau logo"
        name="logoUrl"
        hint="Opsional. Tautkan langsung ke PNG, SVG, WebP, atau ICO."
        error={errors.logoUrl}
        defaultValue={values.logoUrl}
        maxLength={MAXIMUM.logoUrl}
        type="url"
        placeholder="https://contoh.id/logo.png"
      />

      <Field
        label="Satu kalimat"
        name="tagline"
        hint="Jelaskan manfaat utamanya dengan bahasa sehari-hari."
        error={errors.tagline}
        defaultValue={values.tagline}
        minLength={MINIMUM.tagline}
        maxLength={MAXIMUM.tagline}
        required
      />

      <Field
        label="Masalah yang ingin diselesaikan"
        name="problem"
        hint="Satu–dua kalimat yang konkret sudah cukup."
        error={errors.problem}
        defaultValue={values.problem}
        rows={6}
        minLength={MINIMUM.problem}
        maxLength={MAXIMUM.problem}
        required
      />

      <Field
        label="Apa yang sedang dibuat"
        name="solution"
        hint="Jelaskan bentuk solusi dan arah yang ingin dicoba."
        error={errors.solution}
        defaultValue={values.solution}
        rows={6}
        minLength={MINIMUM.solution}
        maxLength={MAXIMUM.solution}
        required
      />

      <Field
        label="Untuk siapa"
        name="audience"
        hint="Sebut kelompok orang yang paling terbantu secara spesifik."
        error={errors.audience}
        defaultValue={values.audience}
        rows={3}
        minLength={MINIMUM.audience}
        maxLength={MAXIMUM.audience}
        required
      />

      <Field
        label="Sekarang sedang…"
        name="now"
        hint={`Satu kalimat tentang yang sedang dikerjakan. Maksimal ${MAXIMUM.now} karakter — bisa juga diganti langsung dari halaman project.`}
        defaultValue={values.now}
      />

      <fieldset>
        <legend>Status project</legend>
        <p className="hint">
          Pilih kondisi project saat ini. Status yang dipilih akan disimpan bersama perubahan lain.
        </p>
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
        {errors.stage ? (
          <p className="field-error" role="alert">
            {errors.stage}
          </p>
        ) : null}
      </fieldset>

      <TopicPicker defaultValue={values.tags} error={errors.tags} />

      <fieldset>
        <legend>Tautan</legend>
        <p className="hint">
          Tautan ini mendukung status project. Status “Sedang dibangun” perlu satu tautan kerja
          atau keterangan yang sedang dikerjakan; “Sudah berjalan” perlu website project.
        </p>
        <Field label="Dokumen" name="docUrl" error={errors.docUrl} defaultValue={values.docUrl} type="url" />
        <Field
          label="Repository GitHub atau repo lain"
          name="repoUrl"
          hint="Untuk repo GitHub publik, kamu bisa mengisi kolom yang masih kosong dari README."
          error={errors.repoUrl}
          defaultValue={values.repoUrl}
          type="url"
        />
        <GitHubImport formRef={formRef} />
      </fieldset>

      <button className="primary-button" type="submit" disabled={pending}>
        {pending ? "Menyimpan…" : "Simpan perubahan"}
      </button>
    </form>
  );
}
