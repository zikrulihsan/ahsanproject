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

  return (
    <form className="create-form" action={formAction}>
      {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}
      {errors.form ? (
        <p className="form-error" role="alert">
          {errors.form}
        </p>
      ) : null}

      <fieldset className="step">
        <legend>
          <span className="step-number">1</span> About you
        </legend>

        <Field
          label="Name"
          name="name"
          error={errors.name}
          defaultValue={values.name}
          maxLength={PROFILE_MAXIMUM.name}
          required
        />

        <Field
          label="Profession or primary role"
          name="profession"
          hint="The title you use for yourself. This is what people most often search for in the People directory."
          error={errors.profession}
          defaultValue={values.profession}
          maxLength={PROFILE_MAXIMUM.profession}
          placeholder="For example: Frontend Developer"
        />

        <Field
          label="Your one-line introduction"
          name="headline"
          hint="It appears directly beneath your name and is used when your profile is shared."
          error={errors.headline}
          defaultValue={values.headline}
          maxLength={PROFILE_MAXIMUM.headline}
        />

        <Field
          label="Short bio"
          name="bio"
          hint="What you usually work on and what you are exploring now."
          error={errors.bio}
          defaultValue={values.bio}
          rows={5}
          maxLength={PROFILE_MAXIMUM.bio}
        />
      </fieldset>

      <fieldset className="step">
        <legend>
          <span className="step-number">2</span> Be discoverable in the talent pool
        </legend>
        <p className="step-intro">
          These details power the filters in the <strong>People</strong> directory. Your projects
          remain the proof of your work—this just helps people find them.
        </p>

        <Field
          label="Skills"
          name="skills"
          hint={`Separate with commas, up to ${PROFILE_LIMITS.skills}. Use suggested terms when they fit so people can find you using the same words.`}
          error={errors.skills}
          defaultValue={values.skills}
          list="skill-suggestions"
          placeholder="Next.js, Figma, User Research"
        />

        <Field
          label="Years of experience"
          name="yearsExperience"
          hint="Optional."
          error={errors.yearsExperience}
          defaultValue={values.yearsExperience}
          type="number"
          min={0}
          max={PROFILE_LIMITS.yearsExperience}
        />

        <Field
          label="Fields of expertise"
          name="fields"
          hint={`Separate with commas, up to ${PROFILE_LIMITS.fields}.`}
          error={errors.fields}
          defaultValue={values.fields}
          list="field-suggestions"
          placeholder="Fintech, Education, Civic Tech"
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

      <fieldset className="step" id="contact">
        <legend>
          <span className="step-number">3</span> How people can reach you
        </legend>
        <p className="step-intro">
          All links below are public and only appear when filled in. The email address you use to
          sign in is never shown—add a <strong>Public email</strong> if you want to be contacted by email.
        </p>

        <Field
          label="Public email"
          name="publicEmail"
          error={errors.publicEmail}
          defaultValue={values.publicEmail}
          type="email"
          maxLength={PROFILE_MAXIMUM.publicEmail}
          placeholder="name@example.com"
        />
        <Field
          label="Website"
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
          label="Résumé link"
          name="resume"
          hint="A link to a résumé file that anyone can open."
          error={errors.resume}
          defaultValue={values.resume}
          type="url"
          maxLength={PROFILE_MAXIMUM.link}
          placeholder="https://"
        />
      </fieldset>

      <button className="primary-button create-submit" type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}
