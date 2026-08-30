"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { createProject, previewProjectLink, type CreateState, type LinkPreview } from "../actions";
import { MAXIMUM, MINIMUM, domainOf } from "../lib/brief";
import type { Locale } from "../lib/locale";
import { STAGES, stageBlurb, stageLabel, tagList, type Stage } from "../lib/stages";
import { projectTypeLabel } from "../lib/project-types";
import { roleLabel } from "../lib/roles";
import { topicLabel } from "../lib/topics";
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
type Step = 1 | 2 | 3;

/** What the first step asks for, per route. Everything else belongs to step two. */
const STEP_ONE_FIELDS: Record<EntryMethod, readonly string[]> = {
  link: ["link", "title", "highlight"],
  description: ["title", "highlight"],
};

/** The detail fields an idea has to answer itself, having no page to be read. */
const REQUIRED_DETAILS = ["tagline", "problem", "solution", "audience"] as const;

/**
 * Adding a project is three steps, and only the first one has to be answered.
 *
 * Step one takes whichever evidence already exists: a link, whose page supplies
 * the name, summary and icon, or a short description for an idea that has no
 * page yet. Step two is the fuller brief, and its weight follows what step one
 * gave us — a link can carry a project on its own, so its details are optional
 * and skippable, while a description-only idea has nothing else to be read from
 * and is asked to finish the brief. Step three is the card everyone else will
 * see, shown before anything is saved rather than after.
 */
export function CreateForm() {
  const [state, formAction, pending] = useActionState(createProject, EMPTY);
  const formRef = useRef<HTMLFormElement>(null);
  const { errors, values } = state;

  const [entryMethod, setEntryMethod] = useState<EntryMethod>(
    values.entryMethod === "description" ? "description" : "link",
  );
  const [step, setStep] = useState<Step>(1);
  const [link, setLink] = useState(values.link ?? "");
  const [preview, setPreview] = useState<LinkPreview | null>(null);
  const [previewError, setPreviewError] = useState("");
  const [reading, startReading] = useTransition();
  /** What a step objected to itself, before the server saw anything. */
  const [stepErrors, setStepErrors] = useState<Record<string, string>>({});
  /** Everything typed so far, read off the form when the review opens. */
  const [review, setReview] = useState<Review | null>(null);

  const initialStage = STAGES.includes(values.stage as Stage) ? (values.stage as Stage) : null;
  const [stage, setStage] = useState<Stage | null>(initialStage);
  const [wantsHelp, setWantsHelp] = useState(values.openSeat === "yes");
  const [openForGitHubContributions, setOpenForGitHubContributions] = useState(
    values.openForGitHubContributions === "yes",
  );
  const { locale, tx } = useLanguage();

  /* A description-only idea has no page to be read from, so its brief is the
     project; a link can stand on its own, so its details stay optional. */
  const detailsRequired = entryMethod === "description";
  /* Once there is something link-shaped to read, the name and the highlight
     belong on this step too — they are what the page was read for. */
  const linkStarted = entryMethod === "link" && looksLikeLink(link.trim());

  function errorFor(field: string): string | undefined {
    return stepErrors[field] || errors[field as keyof typeof errors];
  }

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
    if (stepErrors.link) setStepErrors((current) => omit(current, "link"));
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

  /*
   * Send them back to the step that holds the problem.
   *
   * A rejected submission was posted from the review, so an error on an earlier
   * field would otherwise be reported on a screen nobody is looking at. This
   * reacts to a new result from the action rather than to a render, so it is an
   * adjustment during rendering and not an effect.
   */
  const [answered, setAnswered] = useState(state);
  if (answered !== state) {
    setAnswered(state);
    const named = Object.keys(errors).filter((field) => field !== "form");
    if (named.length > 0) {
      const first = STEP_ONE_FIELDS[values.entryMethod === "description" ? "description" : "link"];
      setStep(named.some((field) => first.includes(field)) ? 1 : 2);
    }
  }

  /** The starting point, checked here so nobody pays a round trip to be told. */
  function leaveStartingPoint() {
    const found: Record<string, string> = {};
    const title = fieldValue(formRef.current, "title");

    if (entryMethod === "link") {
      if (!looksLikeLink(link.trim())) {
        found.link = tx(
          "Tempel tautan proyek—situs web, halaman aplikasi, atau repositori.",
          "Paste the project link — a website, an app listing, or a repository.",
        );
      }
    } else {
      if (title.length < MINIMUM.title) {
        found.title = tx(
          `Tuliskan nama proyek atau ide—minimal ${MINIMUM.title} karakter.`,
          `Write the project or idea name — at least ${MINIMUM.title} characters.`,
        );
      }
      if (!fieldValue(formRef.current, "highlight")) {
        found.highlight = tx(
          "Tuliskan deskripsi singkat agar orang memahami idenya.",
          "Write a short description so people can understand the idea.",
        );
      }
    }

    setStepErrors(found);
    if (Object.keys(found).length === 0) goToStep(2);
  }

  /** The details, which only an idea has to have answered before the review. */
  function leaveDetails() {
    const found: Record<string, string> = {};
    if (detailsRequired) {
      for (const field of REQUIRED_DETAILS) {
        if (!fieldValue(formRef.current, field)) found[field] = DETAIL_PROMPTS[field](tx);
      }
    }

    setStepErrors(found);
    if (Object.keys(found).length === 0) goToStep(3);
  }

  function goToStep(next: Step) {
    if (next === 3) setReview(readReview(formRef.current, preview, link, locale));
    if (next < 3) setStepErrors((current) => (next === 1 ? current : {}));
    setStep(next);
    formRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }

  // Remounts the prefilled inputs when a new page has been read, so the name
  // and summary show what was found instead of staying empty. Anything typed
  // there stays typed: their value is what gets posted either way.
  const prefillKey = preview?.url ?? "no-preview";

  return (
    /* Validated here and on the server rather than by the browser: the two
       steps that are not on screen stay in the document so their answers are
       still posted, and a required field inside a hidden section is one the
       browser refuses to submit and cannot focus to explain why. */
    <form className="create-form link-form" action={formAction} ref={formRef} noValidate>
      {errors.form ? (
        <p className="form-error" role="alert">
          {errors.form}
        </p>
      ) : null}

      <nav className="step-nav">
        {step > 1 ? (
          <button className="step-nav-link" type="button" onClick={() => goToStep((step - 1) as Step)}>
            <span aria-hidden="true">←</span> {tx("Kembali", "Back")}
          </button>
        ) : (
          <span />
        )}

        <p className="step-indicator">
          {step === 1
            ? tx("Langkah 1 dari 3 · Titik awal", "Step 1 of 3 · Starting point")
            : step === 2
              ? tx("Langkah 2 dari 3 · Detail", "Step 2 of 3 · Details")
              : tx("Langkah 3 dari 3 · Tinjau", "Step 3 of 3 · Review")}
        </p>

        {step === 2 && !detailsRequired ? (
          <button className="step-nav-link is-end" type="button" onClick={() => goToStep(3)}>
            {tx("Lewati", "Skip")} <span aria-hidden="true">→</span>
          </button>
        ) : (
          <span />
        )}
      </nav>

      {/* Every step stays mounted: the ones behind still have to post their
          answers with the submit, and going back must not empty what was
          typed. */}
      <section className="link-start" hidden={step !== 1}>
        <fieldset className="entry-method">
          <legend>{tx("Mau mulai dari mana?", "How would you like to start?")}</legend>
          <div className="entry-method-options">
            <label className={entryMethod === "link" ? "is-selected" : ""}>
              <input
                type="radio"
                name="entryMethod"
                value="link"
                checked={entryMethod === "link"}
                onChange={() => {
                  setEntryMethod("link");
                  setStepErrors({});
                }}
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
                onChange={() => {
                  setEntryMethod("description");
                  setStepErrors({});
                }}
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
            <div className={`field ${errorFor("link") ? "has-error" : ""}`}>
              <label htmlFor="link">{tx("Tautan proyek", "Project link")}</label>
              <p className="hint" id="link-hint">
                {tx("Nama dan deskripsi diambil dari halaman ini.", "The name and description are read from this page.")}
              </p>
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
                aria-describedby="link-hint"
                aria-invalid={errorFor("link") ? true : undefined}
              />
              {errorFor("link") ? (
                <p className="field-error" role="alert">
                  {errorFor("link")}
                </p>
              ) : null}
            </div>

            <LinkReading reading={reading} preview={preview} error={previewError} />

            {linkStarted ? (
              <>
                <Field
                  key={`title-${prefillKey}`}
                  label={tx("Nama proyek", "Project name")}
                  name="title"
                  hint={tx("Diambil dari halaman jika dikosongkan.", "Taken from the page when you leave it blank.")}
                  error={errorFor("title")}
                  defaultValue={values.title || preview?.title || ""}
                  maxLength={MAXIMUM.title}
                  placeholder={tx("Contoh: Main Aman", "For example: Stay Safe")}
                />

                <Field
                  label={tx("Apa yang menarik dari proyek ini?", "What is interesting about this project?")}
                  name="highlight"
                  hint={tx("Opsional.", "Optional.")}
                  error={errorFor("highlight")}
                  defaultValue={values.highlight}
                  rows={3}
                  maxLength={MAXIMUM.highlight}
                />
              </>
            ) : null}
          </>
        ) : (
          <>
            <Field
              label={tx("Nama proyek atau ide", "Project or idea name")}
              name="title"
              error={errorFor("title")}
              defaultValue={values.title}
              maxLength={MAXIMUM.title}
              placeholder={tx("Contoh: Teman Belajar", "For example: Study Buddy")}
            />
            <Field
              label={tx("Deskripsikan ide atau proyekmu", "Describe your idea or project")}
              name="highlight"
              hint={tx("Ceritakan apa yang ingin dibuat, masalah yang ingin dijawab, atau siapa yang akan terbantu. Satu sampai tiga kalimat sudah cukup.", "Tell people what you want to make, the problem it addresses, or who it could help. One to three sentences is enough.")}
              error={errorFor("highlight")}
              defaultValue={values.highlight}
              rows={3}
              maxLength={MAXIMUM.highlight}
            />
            <p className="idea-entry-note">
              <strong>{tx("Status awal: Ide", "Starting stage: Idea")}</strong>
              <span>{tx("Tautan dapat ditambahkan kapan saja saat proyek mulai dibangun.", "You can add a link any time once the project starts taking shape.")}</span>
            </p>
          </>
        )}

        <button className="primary-button create-submit" type="button" onClick={leaveStartingPoint}>
          {tx("Lanjut", "Continue")}
        </button>
      </section>

      <section className="project-details" hidden={step !== 2}>
        <div className="step-head">
          <h2>
            {detailsRequired
              ? tx("Lengkapi detail idemu", "Complete your idea's details")
              : tx("Detail proyek", "Project details")}
          </h2>
          <p>
            {detailsRequired
              ? tx("Idemu belum punya halaman yang bisa dibaca, jadi bagian ini yang menjelaskannya kepada orang lain.", "Your idea has no page for us to read, so this is what explains it to other people.")
              : tx("Semuanya opsional—kamu bisa langsung melewatinya, atau melengkapinya nanti dari halaman proyek.", "All optional — you can skip straight past this, or fill it in later from the project page.")}
          </p>
        </div>

        <div className="project-details-body">
          <fieldset className="step">
            <legend>{tx("Proyek", "The project")}</legend>

            <Field
              key={`tagline-${prefillKey}`}
              label={tx("Ringkasan satu kalimat", "One-line summary")}
              name="tagline"
              hint={detailsRequired
                ? tx("Manfaat utamanya dalam bahasa sederhana.", "Its main benefit in plain language.")
                : tx("Manfaat utamanya dalam bahasa sederhana. Diambil dari halaman jika dikosongkan.", "Its main benefit in plain language. Taken from the page when you leave it blank.")}
              error={errorFor("tagline")}
              defaultValue={values.tagline || preview?.tagline || ""}
              maxLength={MAXIMUM.tagline}
              required={detailsRequired}
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
              {detailsRequired
                ? tx("Tulisan ini tidak perlu seperti proposal. Satu atau dua kalimat konkret untuk setiap pertanyaan sudah cukup.", "This does not need to read like a proposal. One or two concrete sentences per question are enough.")
                : tx("Tulisan ini tidak perlu seperti proposal dan tidak ada bagian yang wajib. Satu atau dua kalimat konkret untuk setiap pertanyaan sudah cukup.", "This does not need to read like a proposal, and no part of it is required. One or two concrete sentences per question are enough.")}
            </p>

            <Field
              label={tx("Masalah apa yang ingin kamu selesaikan?", "What problem are you solving?")}
              name="problem"
              hint={tx("Siapa yang mengalami kesulitan, dalam situasi apa, dan mengapa cara yang ada belum cukup?", "Who is struggling, in what situation, and why is the current approach not enough?")}
              error={errorFor("problem")}
              defaultValue={values.problem}
              rows={4}
              required={detailsRequired}
              maxLength={MAXIMUM.problem}
            />

            <Field
              label={tx("Apa yang sedang kamu buat?", "What are you making?")}
              name="solution"
              hint={tx("Jelaskan bentuk solusi dan arah yang ingin kamu jajaki.", "Describe the form of the solution and the direction you want to explore.")}
              error={errorFor("solution")}
              defaultValue={values.solution}
              rows={4}
              required={detailsRequired}
              maxLength={MAXIMUM.solution}
            />

            <Field
              label={tx("Untuk siapa proyek ini?", "Who is it for?")}
              name="audience"
              hint={tx("Sebutkan secara spesifik kelompok yang paling terbantu.", "Name the group of people it will help most specifically.")}
              error={errorFor("audience")}
              defaultValue={values.audience}
              rows={2}
              required={detailsRequired}
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

        <button className="primary-button create-submit" type="button" onClick={leaveDetails}>
          {tx("Lanjut", "Continue")}
        </button>
      </section>

      <section className="review-step" hidden={step !== 3}>
        <div className="step-head">
          <h2>{tx("Beginilah proyekmu akan terlihat", "This is how your project will look")}</h2>
          <p>{tx("Periksa sekali lagi sebelum dikirim. Setelah tampil, semuanya masih bisa diubah dari halaman proyek.", "Have one more look before you send it. Once it is up, all of this can still be edited from the project page.")}</p>
        </div>

        {step === 3 && review ? <ReviewCard review={review} locale={locale} /> : null}

        <button className="primary-button create-submit" type="submit" disabled={pending}>
          {pending ? tx("Menambahkan…", "Adding…") : tx("Tambah proyek", "Add project")}
        </button>
      </section>
    </form>
  );
}

/** Everything the review shows, read off the form the moment it is opened. */
type Review = {
  title: string;
  tagline: string;
  highlight: string;
  logoUrl: string;
  stage: Stage;
  topics: string[];
  projectType: string;
  problem: string;
  solution: string;
  audience: string;
  now: string;
  docUrl: string;
  liveUrl: string;
  repoUrl: string;
  openToGitHub: boolean;
  seat: { role: string; brief: string; commitment: string } | null;
};

/**
 * The form as the board will read it.
 *
 * Taken from `FormData` rather than from React state because most of these
 * inputs are uncontrolled: their value lives in the DOM, and this is the same
 * snapshot the server action is about to be handed. The fallbacks mirror
 * `createProject` — a blank name becomes the page's name, a blank stage is
 * inferred from the evidence — so the card is a rehearsal, not a guess.
 */
function readReview(
  form: HTMLFormElement | null,
  preview: LinkPreview | null,
  link: string,
  locale: Locale,
): Review {
  const data = form ? new FormData(form) : new FormData();
  const value = (name: string) => String(data.get(name) ?? "").trim();

  const entryMethod = value("entryMethod") === "description" ? "description" : "link";
  const typedLink = link.trim();
  const repoLink = isGitHubRepository(typedLink);
  const chosen = value("stage");
  const custom = tagList(value("customTags"));
  const seatRole = value("seatRole");

  return {
    title: value("title") || preview?.title || domainOf(typedLink) || typedLink,
    tagline: value("tagline") || preview?.tagline || "",
    highlight: value("highlight"),
    logoUrl: value("logoUrl") || preview?.logoUrl || "",
    stage: STAGES.includes(chosen as Stage)
      ? (chosen as Stage)
      : entryMethod === "description"
        ? "idea"
        : repoLink
          ? "building"
          : "live",
    topics: [
      ...new Set([
        ...data.getAll("topics").map((topic) => String(topic).trim()).filter(Boolean),
        ...custom,
      ]),
    ].slice(0, 6),
    projectType: value("projectType"),
    problem: value("problem"),
    solution: value("solution"),
    audience: value("audience"),
    now: value("now"),
    docUrl: value("docUrl"),
    liveUrl: value("liveUrl") || (entryMethod === "link" && !repoLink ? typedLink : ""),
    repoUrl: value("repoUrl") || (repoLink ? typedLink : ""),
    openToGitHub: value("openForGitHubContributions") === "yes",
    seat:
      value("openSeat") === "yes" && seatRole
        ? {
            role: roleLabel(seatRole, value("seatRoleTitle"), locale),
            brief: value("seatBrief"),
            commitment: value("seatCommitment"),
          }
        : null,
  };
}

/** The card, plus the parts of the brief a card does not have room for. */
function ReviewCard({ review, locale }: { review: Review; locale: Locale }) {
  const { tx } = useLanguage();
  const rows: [string, string][] = [
    [tx("Jenis proyek", "Project kind"), review.projectType ? projectTypeLabel(review.projectType, locale) : ""],
    [tx("Masalah", "Problem"), review.problem],
    [tx("Yang dibuat", "What is being made"), review.solution],
    [tx("Untuk siapa", "Who it is for"), review.audience],
    [tx("Sedang dikerjakan", "Working on now"), review.now],
    [tx("Situs proyek", "Project site"), review.liveUrl],
    [tx("Repositori", "Repository"), review.repoUrl],
    [tx("Dokumen", "Document"), review.docUrl],
  ];
  const filled = rows.filter(([, body]) => body);

  return (
    <>
      <div className="review-card">
        <div className="review-card-top">
          <span className={`review-mark level-${review.stage}`} aria-hidden="true">
            {review.logoUrl ? (
              // A runtime URL from somebody else's domain, which is exactly what
              // next/image's configured host list cannot cover.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={review.logoUrl} alt="" />
            ) : (
              review.title.slice(0, 1).toUpperCase() || "?"
            )}
          </span>
          <span className="review-stage">{stageLabel(review.stage, locale)}</span>
        </div>

        <h3>{review.title}</h3>
        {review.tagline ? <p className="card-tagline">{review.tagline}</p> : null}
        {review.highlight ? <p className="card-now">{review.highlight}</p> : null}
        {review.topics.length > 0 ? (
          <p className="tag-row">{review.topics.map((topic) => topicLabel(topic, locale)).join(" · ")}</p>
        ) : null}
        {review.openToGitHub ? (
          <p className="seat-chips">
            <span className="seat-chip">{tx("Terbuka untuk kontribusi GitHub", "Open to GitHub contributions")}</span>
          </p>
        ) : null}
        {review.seat ? (
          <p className="seat-chips">
            <span className="seat-chip">
              {review.seat.role}
              {review.seat.commitment ? ` · ${review.seat.commitment}` : ""}
            </span>
          </p>
        ) : null}
      </div>

      {filled.length > 0 || review.seat?.brief ? (
        <dl className="review-list">
          {filled.map(([label, body]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{body}</dd>
            </div>
          ))}
          {review.seat?.brief ? (
            <div>
              <dt>{tx("Bantuan yang dicari", "Help wanted")}</dt>
              <dd>{review.seat.brief}</dd>
            </div>
          ) : null}
        </dl>
      ) : (
        <p className="review-empty">
          {tx("Belum ada detail tambahan. Kamu bisa kembali dan mengisinya, atau menambahkannya nanti.", "No extra details yet. You can go back and add some, or fill them in later.")}
        </p>
      )}
    </>
  );
}

/** What we found behind the link, what we are still reading, or nothing. */
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
      <>
        <div className="link-preview is-loading">
          <span className="link-preview-mark">
            <span className="skeleton" style={{ height: "100%", width: "100%" }} />
          </span>
          <div className="link-preview-copy">
            <span className="skeleton" style={{ height: 15, width: "48%" }} />
            <span className="skeleton" style={{ height: 11, width: "84%", marginTop: 9 }} />
            <span className="skeleton" style={{ height: 10, width: "30%", marginTop: 9 }} />
          </div>
        </div>
        <p className="sr-only" aria-live="polite">
          {tx("Membaca halaman…", "Reading the page…")}
        </p>
      </>
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

/** The prompts the details step uses for what an idea left blank. */
const DETAIL_PROMPTS: Record<
  (typeof REQUIRED_DETAILS)[number],
  (tx: (id: string, en: string) => string) => string
> = {
  tagline: (tx) => tx("Tuliskan ringkasan satu kalimat tentang idemu.", "Write a one-line summary of your idea."),
  problem: (tx) => tx("Jelaskan masalah yang ingin kamu selesaikan.", "Describe the problem you want to solve."),
  solution: (tx) => tx("Jelaskan apa yang sedang atau akan kamu buat.", "Describe what you are making, or plan to make."),
  audience: (tx) => tx("Sebutkan untuk siapa proyek ini.", "Say who this project is for."),
};

/** The same record without one key, for clearing a single resolved complaint. */
function omit(errors: Record<string, string>, key: string): Record<string, string> {
  const rest = { ...errors };
  delete rest[key];
  return rest;
}

/** The value a named control currently holds, trimmed, or an empty string. */
function fieldValue(form: HTMLFormElement | null, name: string): string {
  const control = form?.elements.namedItem(name);
  if (!control || !("value" in control) || typeof control.value !== "string") return "";
  return control.value.trim();
}

/** Good enough for a preview; the server decides what is really a repository. */
function isGitHubRepository(value: string): boolean {
  return /^(https?:\/\/)?(www\.)?github\.com\/[^/]+\/[^/]+/i.test(value);
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
