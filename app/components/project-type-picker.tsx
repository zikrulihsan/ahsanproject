import { PROJECT_TYPES, projectTypeMeta } from "../lib/project-types";

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
 * project, which is a claim nobody made.
 */
export function ProjectTypePicker({
  defaultValue = "",
  error,
}: {
  defaultValue?: string;
  error?: string;
}) {
  return (
    <div className={`type-picker ${error ? "has-error" : ""}`}>
      <p className="type-picker-label" id="project-type-label">
        Project kind <span aria-hidden="true">*</span>
      </p>
      <p className="hint" id="project-type-hint">
        This is what people use to pick the kind of collaboration they are after. Separate from the
        status: a pet project can be live too.
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
                <strong>{projectTypeMeta[type].label}</strong>
                <small>{projectTypeMeta[type].blurb}</small>
                <small className="type-choice-note" id={`projectType-${type}-note`}>
                  If you join: {projectTypeMeta[type].contribution}
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
