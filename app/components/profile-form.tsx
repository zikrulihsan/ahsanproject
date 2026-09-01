"use client";

import { useActionState } from "react";
import { updateProfile, type ProfileState } from "../actions";
import { PROFILE_LIMITS, PROFILE_MAXIMUM } from "../lib/profile";
import { Field } from "./field";
import { useLanguage } from "./language-provider";

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
  returnTo,
}: {
  profile: EditableProfile;
  skillSuggestions: string[];
  fieldSuggestions: string[];
  /** Project detail to return to after a blocked proposal is made ready. */
  returnTo?: string;
}) {
  const [state, formAction, pending] = useActionState(updateProfile, {
    errors: {},
    values: profile,
  } satisfies ProfileState);
  const { errors, values } = state;
  const { tx } = useLanguage();
  const availabilityChoices = [
    { value: "open_to_both", label: tx("Terbuka untuk kerja & kolaborasi", "Open to work & collaboration") },
    { value: "open_to_work", label: tx("Terbuka untuk peluang kerja", "Open to work") },
    { value: "open_to_collaboration", label: tx("Terbuka untuk kolaborasi", "Open to collaboration") },
    { value: "not_open", label: tx("Belum terbuka untuk peluang", "Not open to opportunities") },
  ];

  return (
    <form className="create-form" action={formAction}>
      {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}
      {errors.form ? (
        <p className="form-error" role="alert">
          {errors.form}
        </p>
      ) : null}

      <p className="form-notice" role="status">
        {tx(
          "Wajib diisi: profesi, minimal satu keahlian, dan perkenalan singkat atau bio. Tanpa ketiganya, profilmu tidak akan muncul di talent pool dan kamu belum bisa mengajukan proposal ke proyek orang lain.",
          "Required: a profession, at least one skill, and a headline or bio. Without all three your profile won't appear in the talent pool, and you won't be able to submit proposals to other people's projects.",
        )}
      </p>

      <fieldset className="step">
        <legend>
          <span className="step-number">1</span> {tx("Tentang dirimu", "About you")}
        </legend>

        <Field
          label={tx("Nama", "Name")}
          name="name"
          error={errors.name}
          defaultValue={values.name}
          maxLength={PROFILE_MAXIMUM.name}
          required
        />

        <Field
          label={tx("Profesi atau peran utama", "Profession or primary role")}
          name="profession"
          hint={tx("Sebutan yang kamu gunakan untuk dirimu. Ini yang paling sering dicari orang di Talent Pool.", "The title you use for yourself. This is what people most often search for in the Talent Pool.")}
          error={errors.profession}
          defaultValue={values.profession}
          maxLength={PROFILE_MAXIMUM.profession}
          placeholder={tx("Contoh: Pengembang Frontend", "For example: Frontend Developer")}
        />

        <Field
          label={tx("Perkenalan satu kalimat", "Your one-line introduction")}
          name="headline"
          hint={tx("Tampil tepat di bawah namamu dan digunakan saat profilmu dibagikan.", "It appears directly beneath your name and is used when your profile is shared.")}
          error={errors.headline}
          defaultValue={values.headline}
          maxLength={PROFILE_MAXIMUM.headline}
        />

        <Field
          label={tx("Bio singkat", "Short bio")}
          name="bio"
          hint={tx("Apa yang biasanya kamu kerjakan dan sedang kamu pelajari sekarang.", "What you usually work on and what you are exploring now.")}
          error={errors.bio}
          defaultValue={values.bio}
          rows={5}
          maxLength={PROFILE_MAXIMUM.bio}
        />
      </fieldset>

      <fieldset className="step">
        <legend>
          <span className="step-number">2</span> {tx("Tampil di talent pool", "Be discoverable in the talent pool")}
        </legend>
        <p className="step-intro">
          {tx("Detail ini membantu recruiter, hiring manager, dan orang yang sedang membangun tim menemukanmu di ", "These details help recruiters, hiring managers, and team builders find you in the ")}<strong>Talent Pool</strong>{tx(". Proyekmu tetap menjadi bukti pengalamanmu—bagian ini membantu orang yang tepat menemukannya.", ". Your projects remain the proof of your experience—this helps the right people find it.")}
        </p>

        <Field
          label={tx("Keahlian", "Skills")}
          name="skills"
          hint={tx(`Pisahkan dengan koma, maksimal ${PROFILE_LIMITS.skills}. Gunakan istilah yang disarankan jika sesuai agar orang dapat menemukanmu dengan kata yang sama.`, `Separate with commas, up to ${PROFILE_LIMITS.skills}. Use suggested terms when they fit so people can find you using the same words.`)}
          error={errors.skills}
          defaultValue={values.skills}
          list="skill-suggestions"
          placeholder={tx("Next.js, Figma, Riset Pengguna", "Next.js, Figma, User Research")}
        />

        <Field
          label={tx("Lama pengalaman", "Years of experience")}
          name="yearsExperience"
          hint={tx("Opsional.", "Optional.")}
          error={errors.yearsExperience}
          defaultValue={values.yearsExperience}
          type="number"
          min={0}
          max={PROFILE_LIMITS.yearsExperience}
        />

        <Field
          label={tx("Bidang keahlian", "Fields of expertise")}
          name="fields"
          hint={tx(`Pisahkan dengan koma, maksimal ${PROFILE_LIMITS.fields}.`, `Separate with commas, up to ${PROFILE_LIMITS.fields}.`)}
          error={errors.fields}
          defaultValue={values.fields}
          list="field-suggestions"
          placeholder={tx("Fintech, Pendidikan, Teknologi Sipil", "Fintech, Education, Civic Tech")}
        />

        <div className={`field ${errors.availability ? "has-error" : ""}`}>
          <label htmlFor="availability">{tx("Status peluang", "Opportunity status")}</label>
          <p className="hint" id="availability-hint">
            {tx("Tampilkan peluang kerja atau kolaborasi yang boleh ditawarkan kepadamu di talent pool.", "Show which work or collaboration opportunities people may approach you about in the talent pool.")}
          </p>
          <select
            id="availability"
            name="availability"
            defaultValue={values.availability}
            aria-describedby={`availability-hint${errors.availability ? " availability-error" : ""}`}
            aria-invalid={errors.availability ? true : undefined}
          >
            {availabilityChoices.map((choice) => (
              <option key={choice.value} value={choice.value}>{choice.label}</option>
            ))}
          </select>
          {errors.availability ? (
            <p className="field-error" id="availability-error" role="alert">{errors.availability}</p>
          ) : null}
        </div>

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

      <fieldset className="step" id="contact">
        <legend>
          <span className="step-number">3</span> {tx("Cara orang dapat menghubungimu", "How people can reach you")}
        </legend>
        <p className="step-intro">
          {tx("Semua tautan di bawah bersifat publik dan hanya tampil jika diisi. Alamat email yang kamu gunakan untuk masuk tidak pernah ditampilkan—tambahkan ", "All links below are public and only appear when filled in. The email address you use to sign in is never shown—add a ")}<strong>{tx("Email publik", "Public email")}</strong>{tx(" jika kamu ingin dihubungi melalui email.", " if you want to be contacted by email.")}
        </p>

        <Field
          label={tx("Email publik", "Public email")}
          name="publicEmail"
          error={errors.publicEmail}
          defaultValue={values.publicEmail}
          type="email"
          maxLength={PROFILE_MAXIMUM.publicEmail}
          placeholder="name@example.com"
        />
        <Field
          label={tx("Situs web", "Website")}
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
          label={tx("Tautan résumé", "Résumé link")}
          name="resume"
          hint={tx("Tautan ke berkas résumé yang dapat dibuka siapa saja.", "A link to a résumé file that anyone can open.")}
          error={errors.resume}
          defaultValue={values.resume}
          type="url"
          maxLength={PROFILE_MAXIMUM.link}
          placeholder="https://"
        />
      </fieldset>

      <button className="primary-button create-submit" type="submit" disabled={pending} aria-busy={pending || undefined}>
        {pending ? tx("Menyimpan…", "Saving…") : tx("Simpan profil", "Save profile")}
      </button>
    </form>
  );
}
