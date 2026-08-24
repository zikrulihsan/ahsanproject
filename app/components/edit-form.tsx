"use client";

import { useActionState } from "react";
import { updateProject, type EditState } from "../actions";
import { MAXIMUM, MINIMUM } from "../lib/brief";
import { Field } from "./field";
import { TopicPicker } from "./topic-picker";

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

      <TopicPicker defaultValue={values.tags} error={errors.tags} />

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
