"use client";

import { useActionState, useRef, useState } from "react";
import { createProject, type CreateState } from "../actions";
import { MAXIMUM, MINIMUM } from "../lib/brief";
import { STAGES, stageMeta, type Stage } from "../lib/stages";
import { CommitmentField } from "./commitment-field";
import { Field } from "./field";
import { ProjectTypePicker } from "./project-type-picker";
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
        Start with what you know now. You can update every detail after the project is published.
      </p>

      <section className="github-start" aria-labelledby="github-start-heading">
        <p className="eyebrow">
          <span /> Quick start
        </p>
        <h2 id="github-start-heading">Open contributions through GitHub</h2>
        <p>
          Select this only if you welcome community issues and pull requests. We will show a
          dedicated project badge and help prefill the draft from your public repository.
        </p>
        <label className={`help-toggle ${openForGitHubContributions ? "is-on" : ""}`}>
          <input
            type="checkbox"
            checked={openForGitHubContributions}
            onChange={(event) => setOpenForGitHubContributions(event.target.checked)}
          />
          <span>
            <strong>Open to GitHub contributions</strong>
            <small>People can see that GitHub contributions are open for this project.</small>
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
              label="GitHub repository URL"
              name="repoUrl"
              hint="Must be a public GitHub repository, for example https://github.com/organization/project."
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
          <span className="step-number">1</span> Introduce your project
        </legend>

        <Field
          label="Project website"
          name="liveUrl"
          hint={
            stage === "live"
              ? "Required for a live project. The website favicon is used when no logo URL is provided."
              : "When provided, the website favicon is used if no logo URL is given. Do not have one yet? Skip it for now."
          }
          error={errors.liveUrl}
          defaultValue={values.liveUrl}
          type="url"
          placeholder="https://"
          required={stage === "live"}
        />

        <Field
          label="Icon or logo URL"
          name="logoUrl"
          hint="Optional. Use a direct link to a PNG, SVG, WebP, or ICO file."
          error={errors.logoUrl}
          defaultValue={values.logoUrl}
          maxLength={MAXIMUM.logoUrl}
          type="url"
          placeholder="https://example.com/logo.png"
        />

        <Field
          label="Project name"
          name="title"
          hint="Use its real name. You can change it later."
          error={errors.title}
          defaultValue={values.title}
          minLength={MINIMUM.title}
          maxLength={MAXIMUM.title}
          placeholder="For example: Stay Safe"
          required
        />

        <Field
          label="One-line summary"
          name="tagline"
          hint="Explain its main benefit in plain language."
          error={errors.tagline}
          defaultValue={values.tagline}
          minLength={MINIMUM.tagline}
          maxLength={MAXIMUM.tagline}
          placeholder="For example: Digital safety materials for parents and children."
          required
        />

        <TopicPicker defaultValue={values.tags} error={errors.tags} />
      </fieldset>

      <fieldset className="step">
        <legend>
          <span className="step-number">2</span> Short brief
        </legend>
        <p className="step-intro">
          This does not need to read like a proposal. One or two concrete sentences per question are enough.
        </p>

        <Field
          label="What problem are you solving?"
          name="problem"
          hint="Who is struggling, in what situation, and why is the current approach not enough?"
          error={errors.problem}
          defaultValue={values.problem}
          rows={4}
          minLength={MINIMUM.problem}
          maxLength={MAXIMUM.problem}
          required
        />

        <Field
          label="What are you making?"
          name="solution"
          hint="It does not need to be detailed yet—describe the form of the solution and the direction you want to explore."
          error={errors.solution}
          defaultValue={values.solution}
          rows={4}
          minLength={MINIMUM.solution}
          maxLength={MAXIMUM.solution}
          required
        />

        <Field
          label="Who is it for?"
          name="audience"
          hint="Name the group of people it will help most specifically."
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
          <span className="step-number">3</span> Kind and current status
        </legend>

        <ProjectTypePicker defaultValue={values.projectType} error={errors.projectType} />

        <p className="type-picker-divider" id="stage-label">
          Project status <span aria-hidden="true">*</span>
        </p>
        <ul className="stage-choice" role="radiogroup" aria-labelledby="stage-label">
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
            label="What are you working on now?"
            name="now"
            hint="One sentence is enough. You can update it any time from the project page."
            error={errors.now}
            defaultValue={values.now}
            maxLength={MAXIMUM.now}
            placeholder="For example: Drafting the first safety materials."
          />
        ) : null}

        <details
          className="optional-fields"
          open={Boolean(errors.docUrl)}
        >
          <summary>
            Add supporting links <span>optional</span>
          </summary>
          <div className="optional-fields-body">
            <Field
              label="Document or research"
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
          <span className="step-number">4</span> Looking for help?
        </legend>
        <p className="hint">
          This is entirely optional. You can open a role later from the project page.
        </p>

        <label className={`help-toggle ${wantsHelp ? "is-on" : ""}`}>
          <input
            type="checkbox"
            checked={wantsHelp}
            onChange={(event) => setWantsHelp(event.target.checked)}
          />
          <span>
            <strong>Yes, I am looking for help</strong>
            <small>Show the role, the work involved, and the estimated time.</small>
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
              <label htmlFor="seatBrief">What needs help</label>
              <textarea
                id="seatBrief"
                name="seatBrief"
                rows={3}
                maxLength={MAXIMUM.seatBrief}
                defaultValue={values.seatBrief}
                required
                aria-invalid={errors.seatBrief ? true : undefined}
                placeholder="For example: Interview five potential users and summarize what you learn."
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
        {pending ? "Saving…" : "Publish project"}
      </button>
    </form>
  );
}
