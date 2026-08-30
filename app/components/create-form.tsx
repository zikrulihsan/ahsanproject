"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { createProject, previewProjectLink, type CreateState, type LinkPreview } from "../actions";
import { MAXIMUM, MINIMUM } from "../lib/brief";
import { STAGES, stageBlurb, stageLabel, type Stage } from "../lib/stages";
import { CommitmentField } from "./commitment-field";
import { Field } from "./field";
import { ProjectTypePicker } from "./project-type-picker";
import { RoleFields } from "./role-fields";
import { TopicPicker } from "./topic-picker";
import { GitHubImport } from "./github-import";
import { useLanguage } from "./language-provider";

const EMPTY: CreateState = { errors: {}, values: {} };

/** How long after the last keystroke we go and read the link. */
const PREVIEW_DELAY_MS = 700;

type EntryMethod = "link" | "description";

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
 * Adding a project starts from whichever evidence already exists.
 *
 * A project with a public page needs only its link; the page supplies the name,
 * summary and icon. An idea without a page needs its owner's name and short
 * description instead. Both routes meet at the same optional brief, so choosing
 * the easier starting point never removes the richer fields or the chance to
 * open a role.
 */
export function CreateForm() {
  const [state, formAction, pending] = useActionState(createProject, EMPTY);
  const formRef = useRef<HTMLFormElement>(null);
  const { errors, values } = state;

  const [entryMethod, setEntryMethod] = useState<EntryMethod>(
    values.entryMethod === "description" ? "description" : "link",
  );
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
  const detailsHaveErrors = DETAIL_FIELDS.some(
    (field) => errors[field] && !(entryMethod === "description" && field === "title"),
  );
  const { locale, tx } = useLanguage();

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
    if (entryMethod !== "link" || !looksLikeLink(typed) || preview?.requested === typed) return;

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
  }, [entryMethod, link, preview?.requested]);

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
        <fieldset className="entry-method">
          <legend>{tx("Mau mulai dari mana?", "How would you like to start?")}</legend>
          <div className="entry-method-options">
            <label className={entryMethod === "link" ? "is-selected" : ""}>
              <input
                type="radio"
                name="entryMethod"
                value="link"
                checked={entryMethod === "link"}
                onChange={() => setEntryMethod("link")}
              />
              <span>
                <strong>{tx("Pakai tautan", "Use a link")}</strong>
                <small>{tx("Baca nama dan deskripsi dari halaman yang sudah ada.", "Read the name and description from an existing page.")}</small>
              </span>
            </label>
            <label className={entryMethod === "description" ? "is-selected" : ""}>
              <input
                type="radio"
                name="entryMethod"
                value="description"
                checked={entryMethod === "description"}
                onChange={() => setEntryMethod("description")}
              />
              <span>
                <strong>{tx("Tulis deskripsi", "Write a description")}</strong>
                <small>{tx("Cocok untuk ide atau proyek yang belum punya tautan.", "Best for an idea or a project without a link yet.")}</small>
              </span>
            </label>
          </div>
        </fieldset>

        {entryMethod === "link" ? (
          <>
            <div className={`field ${errors.link ? "has-error" : ""}`}>
              <label htmlFor="link">{tx("Tautan proyek", "Project link")}</label>
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
          </>
        ) : (
          <>
            <Field
              label={tx("Nama proyek atau ide", "Project or idea name")}
              name="title"
              error={errors.title}
              defaultValue={values.title}
              required
              minLength={MINIMUM.title}
              maxLength={MAXIMUM.title}
              placeholder={tx("Contoh: Teman Belajar", "For example: Study Buddy")}
            />
            <p className="idea-entry-note">
              <strong>{tx("Status awal: Ide", "Starting stage: Idea")}</strong>
              <span>{tx("Tautan dapat ditambahkan kapan saja saat proyek mulai dibangun.", "You can add a link any time once the project starts taking shape.")}</span>
            </p>
          </>
        )}

        <Field
          label={entryMethod === "description"
            ? tx("Deskripsikan ide atau proyekmu", "Describe your idea or project")
            : tx("Apa yang menarik dari proyek ini?", "What is interesting about this project?")}
          name="highlight"
          hint={entryMethod === "description"
            ? tx("Ceritakan apa yang ingin dibuat, masalah yang ingin dijawab, atau siapa yang akan terbantu. Satu sampai tiga kalimat sudah cukup.", "Tell people what you want to make, the problem it addresses, or who it could help. One to three sentences is enough.")
            : tx("Opsional.", "Optional.")}
          error={errors.highlight}
          defaultValue={values.highlight}
          rows={3}
          required={entryMethod === "description"}
          maxLength={MAXIMUM.highlight}
        />
      </section>

      <details className="optional-fields project-details" open={detailsHaveErrors}>
        <summary>
          {tx("Tambahkan detail proyek", "Add project details")}<span>{tx("opsional", "optional")}</span>
        </summary>

        <div className="project-details-body">
          <fieldset className="step">
            <legend>{tx("Proyek", "The project")}</legend>

            {entryMethod === "link" ? (
              <Field
                key={`title-${prefillKey}`}
                label={tx("Nama proyek", "Project name")}
                name="title"
                hint={tx("Diambil dari halaman jika dikosongkan.", "Taken from the page when you leave it blank.")}
                error={errors.title}
                defaultValue={values.title || preview?.title || ""}
                maxLength={MAXIMUM.title}
                placeholder={tx("Contoh: Main Aman", "For example: Stay Safe")}
              />
            ) : null}

            <Field
              key={`tagline-${prefillKey}`}
              label={tx("Ringkasan satu kalimat", "One-line summary")}
              name="tagline"
              hint={tx("Manfaat utamanya dalam bahasa sederhana. Diambil dari halaman jika dikosongkan.", "Its main benefit in plain language. Taken from the page when you leave it blank.")}
              error={errors.tagline}
              defaultValue={values.tagline || preview?.tagline || ""}
              maxLength={MAXIMUM.tagline}
              placeholder={tx("Contoh: Materi keamanan digital untuk orang tua dan anak.", "For example: Digital safety materials for parents and children.")}
            />

            <Field
              key={`logo-${prefillKey}`}
              label={tx("URL ikon atau logo", "Icon or logo URL")}
              name="logoUrl"
              hint={tx("Tautan langsung ke berkas PNG, SVG, WebP, atau ICO. Diambil dari halaman jika dikosongkan.", "A direct link to a PNG, SVG, WebP, or ICO file. Taken from the page when you leave it blank.")}
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
            <legend>{tx("Brief singkat", "Short brief")}</legend>
            <p className="step-intro">
              {tx("Tulisan ini tidak perlu seperti proposal dan tidak ada bagian yang wajib. Satu atau dua kalimat konkret untuk setiap pertanyaan sudah cukup.", "This does not need to read like a proposal, and no part of it is required. One or two concrete sentences per question are enough.")}
            </p>

            <Field
              label={tx("Masalah apa yang ingin kamu selesaikan?", "What problem are you solving?")}
              name="problem"
              hint={tx("Siapa yang mengalami kesulitan, dalam situasi apa, dan mengapa cara yang ada belum cukup?", "Who is struggling, in what situation, and why is the current approach not enough?")}
              error={errors.problem}
              defaultValue={values.problem}
              rows={4}
              maxLength={MAXIMUM.problem}
            />

            <Field
              label={tx("Apa yang sedang kamu buat?", "What are you making?")}
              name="solution"
              hint={tx("Jelaskan bentuk solusi dan arah yang ingin kamu jajaki.", "Describe the form of the solution and the direction you want to explore.")}
              error={errors.solution}
              defaultValue={values.solution}
              rows={4}
              maxLength={MAXIMUM.solution}
            />

            <Field
              label={tx("Untuk siapa proyek ini?", "Who is it for?")}
              name="audience"
              hint={tx("Sebutkan secara spesifik kelompok yang paling terbantu.", "Name the group of people it will help most specifically.")}
              error={errors.audience}
              defaultValue={values.audience}
              rows={2}
              maxLength={MAXIMUM.audience}
            />
          </fieldset>

          <fieldset className="step">
            <legend>{tx("Status dan tautan", "Status and links")}</legend>
            <p className="step-intro">
              {entryMethod === "description"
                ? tx("Jika tidak dipilih, proyek disimpan sebagai Ide. Pilih tahap lain hanya jika sudah ada pekerjaan atau tautan yang mendukungnya.", "Left alone, the project is saved as an Idea. Choose another stage only when there is work or a link to support it.")
                : tx("Jika tidak dipilih, status mengikuti tautannya: sesuatu yang dapat dibuka orang dianggap berjalan, sedangkan repositori dianggap sedang dibangun.", "Left alone, the status follows the link: something people can open is live, a repository is being built.")}
            </p>

            <p className="type-picker-divider" id="stage-label">
              {tx("Status proyek", "Project status")}
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
                      <strong>{stageLabel(item, locale)}</strong>
                      <small>{stageBlurb(item, locale)}</small>
                    </span>
                  </label>
                </li>
              ))}
            </ul>

            <Field
              label={tx("Apa yang sedang kamu kerjakan?", "What are you working on now?")}
              name="now"
              hint={tx("Satu kalimat sudah cukup. Kamu dapat memperbaruinya kapan saja dari halaman proyek.", "One sentence is enough. You can update it any time from the project page.")}
              error={errors.now}
              defaultValue={values.now}
              maxLength={MAXIMUM.now}
              placeholder={tx("Contoh: Menyusun draf materi keamanan pertama.", "For example: Drafting the first safety materials.")}
            />

            <Field
              label={tx("Dokumen atau riset", "Document or research")}
              name="docUrl"
              error={errors.docUrl}
              defaultValue={values.docUrl}
              type="url"
              placeholder="https://"
            />

            <Field
              label={tx("Tautan lainnya", "Another link")}
              name="liveUrl"
              hint={entryMethod === "description"
                ? tx("Opsional. Tambahkan jika proyek sudah memiliki halaman yang dapat dibuka.", "Optional. Add this if the project already has a page people can open.")
                : tx("Isi hanya jika tautan di bagian atas bukan situs web proyek.", "Only if the link at the top is not the project's own website.")}
              error={errors.liveUrl}
              defaultValue={values.liveUrl}
              type="url"
              placeholder="https://"
            />
          </fieldset>

          <fieldset className="step">
            <legend>{tx("Buka kontribusi melalui GitHub", "Open contributions through GitHub")}</legend>
            <p className="step-intro">
              {tx("Pilih ini hanya jika kamu menerima issue dan pull request dari komunitas. Kami akan menampilkan lencana khusus dan membantu mengisi draf dari repositori publikmu.", "Select this only if you welcome community issues and pull requests. We will show a dedicated project badge and help prefill the draft from your public repository.")}
            </p>

            <label className={`help-toggle ${openForGitHubContributions ? "is-on" : ""}`}>
              <input
                type="checkbox"
                checked={openForGitHubContributions}
                onChange={(event) => setOpenForGitHubContributions(event.target.checked)}
              />
              <span>
                <strong>{tx("Terbuka untuk kontribusi GitHub", "Open to GitHub contributions")}</strong>
                <small>{tx("Orang dapat melihat bahwa proyek ini terbuka untuk kontribusi GitHub.", "People can see that GitHub contributions are open for this project.")}</small>
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
                  label={tx("URL repositori GitHub", "GitHub repository URL")}
                  name="repoUrl"
                  hint={tx("Harus berupa repositori GitHub publik, misalnya https://github.com/organization/project. Biarkan kosong jika sudah ditempel di atas.", "Must be a public GitHub repository, for example https://github.com/organization/project. Leave blank if you already pasted it above.")}
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
            <legend>{tx("Mencari bantuan?", "Looking for help?")}</legend>
            <p className="step-intro">{tx("Kamu juga dapat membuka peran nanti dari halaman proyek.", "You can also open a role later, from the project page.")}</p>

            <label className={`help-toggle ${wantsHelp ? "is-on" : ""}`}>
              <input
                type="checkbox"
                checked={wantsHelp}
                onChange={(event) => setWantsHelp(event.target.checked)}
              />
              <span>
                <strong>{tx("Ya, saya sedang mencari bantuan", "Yes, I am looking for help")}</strong>
                <small>{tx("Tampilkan peran, pekerjaan yang terlibat, dan perkiraan waktunya.", "Show the role, the work involved, and the estimated time.")}</small>
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
                  <label htmlFor="seatBrief">{tx("Bagian yang membutuhkan bantuan", "What needs help")}</label>
                  <textarea
                    id="seatBrief"
                    name="seatBrief"
                    rows={3}
                    maxLength={MAXIMUM.seatBrief}
                    defaultValue={values.seatBrief}
                    required
                    aria-invalid={errors.seatBrief ? true : undefined}
                    placeholder={tx("Contoh: Wawancarai lima calon pengguna dan rangkum temuannya.", "For example: Interview five potential users and summarize what you learn.")}
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
        {pending ? tx("Menambahkan…", "Adding…") : tx("Tambah proyek", "Add project")}
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
  const { tx } = useLanguage();
  if (reading) {
    return (
      <p className="link-reading" aria-live="polite">
        {tx("Membaca halaman…", "Reading the page…")}
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
        <p className="link-preview-note">{tx("Halaman tersebut tidak dapat kami baca, jadi kami menggunakan alamatnya.", "That page would not let us read it, so we used its address.")}</p>
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
