"use client";

import { PROJECT_TYPES, projectTypeBlurb, projectTypeContribution, projectTypeLabel } from "../lib/project-types";
import { useLanguage } from "./language-provider";

/**
 * The project kind as a list of four, on the create form and the edit form.
 *
 * Radios rather than a select: what separates the four is the sentence under
 * each one, and a dropdown hides exactly that. Somebody deciding between a pet
 * project and a commercial one is deciding what they are asking of whoever
 * turns up, and that should be readable without opening anything.
 *
 * Nothing is preselected, on purpose — see `createProject`. A default here
 * would let every project that never thought about the question ship as a pet
 * project, which is a claim nobody made. Leaving it unanswered is allowed for
 * the same reason: an empty kind reads as "not stated", and a guessed one
 * reads as a claim.
 */
export function ProjectTypePicker({
  defaultValue = "",
  error,
}: {
  defaultValue?: string;
  error?: string;
}) {
  const { locale, tx } = useLanguage();
  return (
    <div className={`type-picker ${error ? "has-error" : ""}`}>
      <p className="type-picker-label" id="project-type-label">
        {tx("Jenis proyek", "Project kind")} <span className="optional-label">{tx("opsional", "optional")}</span>
      </p>
      <p className="hint" id="project-type-hint">
        {tx("Ini membantu orang memilih bentuk kolaborasi yang mereka cari. Berbeda dari status: proyek pribadi juga bisa sudah berjalan.", "This is what people use to pick the kind of collaboration they are after. Separate from the status: a pet project can be live too.")}
      </p>

      <ul
        className="type-choice"
        role="radiogroup"
        aria-labelledby="project-type-label"
        aria-describedby="project-type-hint"
      >
        {PROJECT_TYPES.map((type) => (
          <li key={type}>
            <label htmlFor={`projectType-${type}`}>
              <input
                id={`projectType-${type}`}
                type="radio"
                name="projectType"
                value={type}
                defaultChecked={defaultValue === type}
                aria-describedby={`projectType-${type}-note`}
              />
              <span>
                <strong>{projectTypeLabel(type, locale)}</strong>
                <small>{projectTypeBlurb(type, locale)}</small>
                <small className="type-choice-note" id={`projectType-${type}-note`}>
                  {tx("Jika kamu bergabung:", "If you join:")} {projectTypeContribution(type, locale)}
                </small>
              </span>
            </label>
          </li>
        ))}
      </ul>

      {error ? (
        <p className="field-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
