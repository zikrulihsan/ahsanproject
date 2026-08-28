"use client";

import { useActionState } from "react";
import { updateProfile, type ProfileState } from "../actions";
import { PROFILE_LIMITS, PROFILE_MAXIMUM } from "../lib/profile";
import { Field } from "./field";

export type EditableProfile = ProfileState["values"];

/**
 * The profile editor, on its own page at last.
 *
 * It used to be thirteen bare inputs inside a collapsed `<details>` on the
 * public portfolio — a form somebody had to find on the page they were meant
 * to be showing other people. Same fields, grouped by what they are for, with
 * the errors the action now returns.
 */
export function ProfileForm({
  profile,
  skillSuggestions,
  fieldSuggestions,
}: {
  profile: EditableProfile;
  skillSuggestions: string[];
  fieldSuggestions: string[];
}) {
  const [state, formAction, pending] = useActionState(updateProfile, {
    errors: {},
    values: profile,
  } satisfies ProfileState);
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
          <span className="step-number">1</span> Siapa kamu
        </legend>

        <Field
          label="Nama"
          name="name"
          error={errors.name}
          defaultValue={values.name}
          maxLength={PROFILE_MAXIMUM.name}
          required
        />

        <Field
          label="Profesi atau role utama"
          name="profession"
          hint="Sebutan yang kamu pakai sendiri. Ini yang paling sering dicari orang di halaman Orang."
          error={errors.profession}
          defaultValue={values.profession}
          maxLength={PROFILE_MAXIMUM.profession}
          placeholder="Contoh: Frontend Developer"
        />

        <Field
          label="Satu baris tentang kamu"
          name="headline"
          hint="Muncul tepat di bawah namamu, dan jadi deskripsi saat profilmu dibagikan."
          error={errors.headline}
          defaultValue={values.headline}
          maxLength={PROFILE_MAXIMUM.headline}
        />

        <Field
          label="Cerita singkat"
          name="bio"
          hint="Apa yang biasa kamu kerjakan, dan yang sedang kamu dalami sekarang."
          error={errors.bio}
          defaultValue={values.bio}
          rows={5}
          maxLength={PROFILE_MAXIMUM.bio}
        />
      </fieldset>

      <fieldset className="step">
        <legend>
          <span className="step-number">2</span> Supaya ditemukan di talent pool
        </legend>
        <p className="step-intro">
          Yang diisi di sini jadi saringan di halaman <strong>Orang</strong>. Project yang kamu
          bangun tetap jadi buktinya — ini cuma supaya orang sampai ke sana.
        </p>

        <Field
          label="Skill"
          name="skills"
          hint={`Pisahkan dengan koma, maksimal ${PROFILE_LIMITS.skills}. Pakai istilah yang disarankan kalau cocok, supaya orang menemukanmu dengan kata yang sama.`}
          error={errors.skills}
          defaultValue={values.skills}
          list="skill-suggestions"
          placeholder="Next.js, Figma, User Research"
        />

        <Field
          label="Lama pengalaman (tahun)"
          name="yearsExperience"
          hint="Boleh dikosongkan."
          error={errors.yearsExperience}
          defaultValue={values.yearsExperience}
          type="number"
          min={0}
          max={PROFILE_LIMITS.yearsExperience}
        />

        <Field
          label="Bidang yang dikuasai"
          name="fields"
          hint={`Pisahkan dengan koma, maksimal ${PROFILE_LIMITS.fields}.`}
          error={errors.fields}
          defaultValue={values.fields}
          list="field-suggestions"
          placeholder="Fintech, Edukasi, Civic Tech"
        />

        <datalist id="skill-suggestions">
          {skillSuggestions.map((skill) => (
            <option key={skill} value={skill} />
          ))}
        </datalist>
        <datalist id="field-suggestions">
          {fieldSuggestions.map((field) => (
            <option key={field} value={field} />
          ))}
        </datalist>
      </fieldset>

      <fieldset className="step" id="kontak">
        <legend>
          <span className="step-number">3</span> Cara menghubungimu
        </legend>
        <p className="step-intro">
          Semua tautan di bawah bersifat publik dan hanya tampil kalau diisi. Email yang kamu pakai
          untuk masuk tidak pernah ditampilkan — isi <strong>Email publik</strong> kalau memang mau
          dihubungi lewat email.
        </p>

        <Field
          label="Email publik"
          name="publicEmail"
          error={errors.publicEmail}
          defaultValue={values.publicEmail}
          type="email"
          maxLength={PROFILE_MAXIMUM.publicEmail}
          placeholder="nama@contoh.id"
        />
        <Field
          label="Situs"
          name="website"
          error={errors.website}
          defaultValue={values.website}
          type="url"
          maxLength={PROFILE_MAXIMUM.link}
          placeholder="https://"
        />
        <Field
          label="GitHub"
          name="github"
          error={errors.github}
          defaultValue={values.github}
          type="url"
          maxLength={PROFILE_MAXIMUM.link}
          placeholder="https://github.com/"
        />
        <Field
          label="LinkedIn"
          name="linkedin"
          error={errors.linkedin}
          defaultValue={values.linkedin}
          type="url"
          maxLength={PROFILE_MAXIMUM.link}
          placeholder="https://www.linkedin.com/in/"
        />
        <Field
          label="X / Twitter"
          name="x"
          error={errors.x}
          defaultValue={values.x}
          type="url"
          maxLength={PROFILE_MAXIMUM.link}
          placeholder="https://x.com/"
        />
        <Field
          label="Tautan résumé"
          name="resume"
          hint="Tautan ke berkas résumé yang bisa dibuka siapa saja."
          error={errors.resume}
          defaultValue={values.resume}
          type="url"
          maxLength={PROFILE_MAXIMUM.link}
          placeholder="https://"
        />
      </fieldset>

      <button className="primary-button create-submit" type="submit" disabled={pending}>
        {pending ? "Menyimpan…" : "Simpan profil"}
      </button>
    </form>
  );
}
