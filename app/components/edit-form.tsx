"use client";

import { useActionState } from "react";
import { updateProject, type EditState } from "../actions";
import { MAXIMUM, MINIMUM } from "../lib/brief";
import { Field } from "./field";

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
};

export function EditForm({ project }: { project: EditableProject }) {
  const initial: EditState = {
    errors: {},
    values: { ...project, tags: project.tags.join(", "), now: project.nowText },
  };
  const [state, formAction, pending] = useActionState(updateProject, initial);
  const { errors, values } = state;

  return (
    <form className="create-form" action={formAction}>
      {errors.form ? (
        <p className="form-error" role="alert">
          {errors.form}
        </p>
      ) : null}

      <input type="hidden" name="slug" value={project.slug} />

      <Field label="Nama project" name="title" error={errors.title} defaultValue={values.title} required />

      <Field
        label="Satu kalimat"
        name="tagline"
        hint={`Minimal ${MINIMUM.tagline} karakter.`}
        error={errors.tagline}
        defaultValue={values.tagline}
        required
      />

      <Field
        label="Masalah yang ingin diselesaikan"
        name="problem"
        hint={`Minimal ${MINIMUM.problem} karakter.`}
        error={errors.problem}
        defaultValue={values.problem}
        rows={6}
        required
      />

      <Field
        label="Apa yang sedang dibuat"
        name="solution"
        hint={`Minimal ${MINIMUM.solution} karakter.`}
        error={errors.solution}
        defaultValue={values.solution}
        rows={6}
        required
      />

      <Field
        label="Untuk siapa"
        name="audience"
        hint={`Minimal ${MINIMUM.audience} karakter.`}
        error={errors.audience}
        defaultValue={values.audience}
        rows={3}
        required
      />

      <Field
        label="Sekarang sedang…"
        name="now"
        hint={`Satu kalimat tentang yang sedang dikerjakan. Maksimal ${MAXIMUM.now} karakter — bisa juga diganti langsung dari halaman project.`}
        defaultValue={values.now}
      />

      <Field
        label="Topik"
        name="tags"
        hint="Pisahkan dengan koma, maksimal enam."
        error={errors.tags}
        defaultValue={values.tags}
        required
      />

      <fieldset>
        <legend>Tautan</legend>
        <p className="hint">
          Tautan ini ikut menentukan tahap project. Kalau salah satunya dihapus dan tahapnya jadi
          tidak terpenuhi, levelnya ikut turun sendiri.
        </p>
        <Field label="Dokumen" name="docUrl" error={errors.docUrl} defaultValue={values.docUrl} />
        <Field label="Repo" name="repoUrl" error={errors.repoUrl} defaultValue={values.repoUrl} />
        <Field
          label="Tautan produk"
          name="liveUrl"
          error={errors.liveUrl}
          defaultValue={values.liveUrl}
        />
      </fieldset>

      <button className="primary-button" type="submit" disabled={pending}>
        {pending ? "Menyimpan…" : "Simpan perubahan"}
      </button>
    </form>
  );
}
