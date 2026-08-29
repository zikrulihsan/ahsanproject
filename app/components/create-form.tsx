"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { createProject, previewProjectLink, type CreateState, type LinkPreview } from "../actions";
import { MAXIMUM } from "../lib/brief";
import { STAGES, stageMeta, type Stage } from "../lib/stages";
import { CommitmentField } from "./commitment-field";
import { Field } from "./field";
import { ProjectTypePicker } from "./project-type-picker";
import { RoleFields } from "./role-fields";
import { TopicPicker } from "./topic-picker";
import { GitHubImport } from "./github-import";

const EMPTY: CreateState = { errors: {}, values: {} };

/** How long after the last keystroke we go and read the link. */
const PREVIEW_DELAY_MS = 700;

/** Errors that can only have come from the collapsed half of the form. */
const DETAIL_FIELDS = [
  "title",
  "tagline",
  "problem",
  "solution",
  "audience",
  "tags",
  "projectType",
  "now",
  "docUrl",
  "repoUrl",
  "logoUrl",
  "seatRole",
  "seatRoleTitle",
  "seatBrief",
  "seatCommitment",
] as const;

/**
 * Adding a project is one field.
 *
 * Everything visible before the fold is a link box and a button, because the
 * submissions this board was losing were not lost to a missing feature — they
 * were lost to a form that asked for six paragraphs before it would take
 * anything at all. The page behind the link can answer most of what that form
 * was asking, so it does, and the rest waits.
 *
 * Under it, two things and no more:
 *
 *   - one optional question, already open: what is interesting about this. It
 *     is the only thing a machine cannot read off the page, and it is what
 *     makes the entry worth reading rather than worth indexing.
 *   - everything the old form asked, behind a toggle, all of it optional. Every
 *     field still exists and still saves; none of it stands between a person
 *     and a published project.
 *
 * Short, but not styled apart: the labelled fields and the pill disclosure
 * are the ones every other form here uses. What was cut is the explaining —
 * a form with one required field is quicker to fill in than to read about.
 */
export function CreateForm() {
  const [state, formAction, pending] = useActionState(createProject, EMPTY);
  const formRef = useRef<HTMLFormElement>(null);
  const { errors, values } = state;

  const [link, setLink] = useState(values.link ?? "");
  const [preview, setPreview] = useState<LinkPreview | null>(null);
  const [previewError, setPreviewError] = useState("");
  const [reading, startReading] = useTransition();

  const initialStage = STAGES.includes(values.stage as Stage) ? (values.stage as Stage) : null;
  const [stage, setStage] = useState<Stage | null>(initialStage);
  const [wantsHelp, setWantsHelp] = useState(values.openSeat === "yes");
  const [openForGitHubContributions, setOpenForGitHubContributions] = useState(
    values.openForGitHubContributions === "yes",
  );
  const detailsHaveErrors = DETAIL_FIELDS.some((field) => errors[field]);

  /*
   * Read the link while they are still looking at it.
   *
   * The preview is a courtesy, not a gate: `createProject` reads the same page
   * itself when this has not finished, so submitting mid-read costs nothing.
   * Clearing a stale preview happens on the keystroke that made it stale
   * rather than in the effect, which would be a second render for nothing.
   */
  function changeLink(value: string) {
    setLink(value);
    if (preview && preview.requested !== value.trim()) setPreview(null);
    if (previewError) setPreviewError("");
  }

  useEffect(() => {
    const typed = link.trim();
    if (!looksLikeLink(typed) || preview?.requested === typed) return;

    const timer = setTimeout(() => {
      startReading(async () => {
        const result = await previewProjectLink(typed);
        if (!result.ok) {
          setPreviewError(result.error);
          return;
        }
        setPreviewError("");
        setPreview(result.preview);
      });
    }, PREVIEW_DELAY_MS);

    return () => clearTimeout(timer);
  }, [link, preview?.requested]);

  // Remounts the detail inputs when a new page has been read, so opening the
  // details afterwards shows what was found instead of an empty form. Anything
  // typed there stays typed: their value is what gets posted either way.
  const prefillKey = preview?.url ?? "no-preview";

  return (
    <form className="create-form link-form" action={formAction} ref={formRef}>
      {errors.form ? (
        <p className="form-error" role="alert">
          {errors.form}
        </p>
      ) : null}

      <section className="link-start">
        <div className={`field ${errors.link ? "has-error" : ""}`}>
          <label htmlFor="link">Project link</label>
          <input
            id="link"
            name="link"
            type="text"
            inputMode="url"
            autoComplete="url"
            autoFocus
            spellCheck={false}
            placeholder="https://"
            value={link}
            onChange={(event) => changeLink(event.target.value)}
            aria-invalid={errors.link ? true : undefined}
            required
          />
          {errors.link ? (
            <p className="field-error" role="alert">
              {errors.link}
            </p>
          ) : null}
        </div>

        <LinkReading reading={reading} preview={preview} error={previewError} />

        <Field
          label="What is interesting about this project?"
          name="highlight"
          hint="Optional."
          error={errors.highlight}
          defaultValue={values.highlight}
          rows={3}
          maxLength={MAXIMUM.highlight}
        />
      </section>

      <details className="optional-fields project-details" open={detailsHaveErrors}>
        <summary>
          Add project details<span>optional</span>
        </summary>

        <div className="project-details-body">
          <fieldset className="step">
            <legend>The project</legend>

            <Field
              key={`title-${prefillKey}`}
              label="Project name"
              name="title"
              hint="Taken from the page when you leave it blank."
              error={errors.title}
              defaultValue={values.title || preview?.title || ""}
              maxLength={MAXIMUM.title}
              placeholder="For example: Stay Safe"
            />

            <Field
              key={`tagline-${prefillKey}`}
              label="One-line summary"
              name="tagline"
              hint="Its main benefit in plain language. Taken from the page when you leave it blank."
              error={errors.tagline}
              defaultValue={values.tagline || preview?.tagline || ""}
              maxLength={MAXIMUM.tagline}
              placeholder="For example: Digital safety materials for parents and children."
            />

            <Field
              key={`logo-${prefillKey}`}
              label="Icon or logo URL"
              name="logoUrl"
              hint="A direct link to a PNG, SVG, WebP, or ICO file. Taken from the page when you leave it blank."
              error={errors.logoUrl}
              defaultValue={values.logoUrl || preview?.logoUrl || ""}
              maxLength={MAXIMUM.logoUrl}
              type="url"
              placeholder="https://example.com/logo.png"
            />

            <TopicPicker defaultValue={values.tags} error={errors.tags} />
            <ProjectTypePicker defaultValue={values.projectType} error={errors.projectType} />
          </fieldset>

          <fieldset className="step">
            <legend>Short brief</legend>
            <p className="step-intro">
              This does not need to read like a proposal, and no part of it is required. One or two
              concrete sentences per question are enough.
            </p>

            <Field
              label="What problem are you solving?"
              name="problem"
              hint="Who is struggling, in what situation, and why is the current approach not enough?"
              error={errors.problem}
              defaultValue={values.problem}
              rows={4}
              maxLength={MAXIMUM.problem}
            />

            <Field
              label="What are you making?"
              name="solution"
              hint="Describe the form of the solution and the direction you want to explore."
              error={errors.solution}
              defaultValue={values.solution}
              rows={4}
              maxLength={MAXIMUM.solution}
            />

            <Field
              label="Who is it for?"
              name="audience"
              hint="Name the group of people it will help most specifically."
              error={errors.audience}
              defaultValue={values.audience}
              rows={2}
              maxLength={MAXIMUM.audience}
            />
          </fieldset>

          <fieldset className="step">
            <legend>Status and links</legend>
            <p className="step-intro">
              Left alone, the status follows the link: something people can open is live, a
              repository is being built.
            </p>

            <p className="type-picker-divider" id="stage-label">
              Project status
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

            <Field
              label="What are you working on now?"
              name="now"
              hint="One sentence is enough. You can update it any time from the project page."
              error={errors.now}
              defaultValue={values.now}
              maxLength={MAXIMUM.now}
              placeholder="For example: Drafting the first safety materials."
            />

            <Field
              label="Document or research"
              name="docUrl"
              error={errors.docUrl}
              defaultValue={values.docUrl}
              type="url"
              placeholder="https://"
            />

            <Field
              label="Another link"
              name="liveUrl"
              hint="Only if the link at the top is not the project's own website."
              error={errors.liveUrl}
              defaultValue={values.liveUrl}
              type="url"
              placeholder="https://"
            />
          </fieldset>

          <fieldset className="step">
            <legend>Open contributions through GitHub</legend>
            <p className="step-intro">
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
                  hint="Must be a public GitHub repository, for example https://github.com/organization/project. Leave blank if you already pasted it above."
                  error={errors.repoUrl}
                  defaultValue={values.repoUrl}
                  type="url"
                  placeholder="https://github.com/"
                />
                <GitHubImport formRef={formRef} />
              </div>
            ) : (
              <input type="hidden" name="repoUrl" value={values.repoUrl ?? ""} />
            )}
          </fieldset>

          <fieldset className="step">
            <legend>Looking for help?</legend>
            <p className="step-intro">You can also open a role later, from the project page.</p>

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
        </div>
      </details>

      <button className="primary-button create-submit" type="submit" disabled={pending}>
        {pending ? "Adding…" : "Add project"}
      </button>
    </form>
  );
}

/** What we found behind the link, or an honest note that we found nothing. */
function LinkReading({
  reading,
  preview,
  error,
}: {
  reading: boolean;
  preview: LinkPreview | null;
  error: string;
}) {
  if (reading) {
    return (
      <p className="link-reading" aria-live="polite">
        Reading the page…
      </p>
    );
  }

  if (error) {
    return (
      <p className="link-reading is-quiet" aria-live="polite">
        {error}
      </p>
    );
  }

  if (!preview) return null;

  return (
    <div className="link-preview" aria-live="polite">
      <span className="link-preview-mark" aria-hidden="true">
        {preview.logoUrl ? (
          // A runtime URL from somebody else's domain, which is exactly what
          // next/image's configured host list cannot cover.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview.logoUrl} alt="" />
        ) : (
          <span>{preview.title.slice(0, 1).toUpperCase() || "?"}</span>
        )}
      </span>
      <div className="link-preview-copy">
        <strong>{preview.title}</strong>
        {preview.tagline ? <p>{preview.tagline}</p> : null}
        <small>{preview.domain}</small>
      </div>
      {/* When the read worked, the card is the message. Only the case that
          needs explaining gets a sentence. */}
      {preview.fetched ? null : (
        <p className="link-preview-note">That page would not let us read it, so we used its address.</p>
      )}
    </div>
  );
}

/**
 * Whether it is worth spending a request on what has been typed so far.
 *
 * Deliberately looser than the parser the server runs: somebody halfway
 * through "pamerin.lol" should not see an error, they should see nothing.
 */
function looksLikeLink(value: string): boolean {
  if (!value || /\s/.test(value)) return false;
  const withoutScheme = value.replace(/^[a-z][a-z0-9+.-]*:\/\//i, "");
  const host = withoutScheme.split(/[/?#]/)[0];
  return /^[^.]+\.[a-z]{2,}$/i.test(host) || /^[^.]+(\.[^.]+)+\.[a-z]{2,}$/i.test(host);
}
