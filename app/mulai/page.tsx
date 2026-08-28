import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { setNow } from "../actions";
import { SiteFooter, SiteHeader } from "../components/shell";
import { StageBadge } from "../components/pieces";
import { ProjectLogo } from "../components/project-logo";
import { SubmitButton } from "../components/submit-button";
import { MAXIMUM } from "../lib/brief";
import { getPortfolio, type ProjectSummary } from "../lib/data";
import { nextSteps, remainingSteps, type NextStep } from "../lib/next-steps";
import { currentViewer } from "../lib/session";
import { signInPath } from "../lib/urls";

/*
 * Allowed to block — same reason as /inbox. The whole page is one person's
 * own state, there is nothing cacheable to paint before knowing who is asking,
 * and a visitor about to be redirected should not watch it render first.
 */
export const instant = false;

export const metadata: Metadata = {
  title: "Langkah berikutnya — Ahsan Project",
  description: "Yang tersisa supaya projectmu terlihat dan profilmu bisa ditemukan.",
  robots: { index: false },
};

/**
 * Where signing in lands, until there is nothing left to do here.
 *
 * A named list, not a progress bar: `docs/redesign-showcase.md` threw the
 * brief's completeness percentage out because a number turns a story into a
 * form to finish, and that argument does not stop being true one page over.
 * Each line says what it is for and links straight at the thing that does it.
 *
 * Nothing here blocks anybody. Every step can be skipped, and once none are
 * owed the page forwards to the board instead of standing in the way of every
 * future sign-in — `?semua=1` keeps it reachable on purpose from the menu.
 */
export default async function StartPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const viewer = await currentViewer();
  if (!viewer) redirect(signInPath("/mulai"));

  const query = (await searchParams) ?? {};
  const keepOpen = query.semua === "1";

  const { owned, contributing } = await getPortfolio(viewer);
  const steps = nextSteps({ person: viewer, owned, contributing });
  const remaining = remainingSteps(steps);
  if (remaining.length === 0 && !keepOpen) redirect("/");

  const [owed, extras] = [steps.filter((step) => !step.optional), steps.filter((step) => step.optional)];
  const firstName = viewer.name.split(" ")[0];

  return (
    <>
      <SiteHeader returnTo="/mulai" />

      <main id="main-content" className="page-narrow start-page">
        <p className="eyebrow">
          <span /> Langkah berikutnya
        </p>
        <h1>Halo, {firstName}.</h1>
        <p className="lede">
          {remaining.length === 0
            ? "Semua langkahnya sudah beres. Yang di bawah ini tinggal tempat mengubahnya lagi."
            : `Sisa ${remaining.length} langkah supaya projectmu terlihat dan profilmu bisa ditemukan orang. Tidak ada yang wajib sekarang juga.`}
        </p>

        <ol className="next-steps">
          {owed.map((step) => (
            <StepRow key={step.id} step={step} />
          ))}
        </ol>

        {extras.length > 0 ? (
          <section className="next-step-optional" aria-labelledby="optional-heading">
            <h2 id="optional-heading" className="section-title">
              Kalau perlu
            </h2>
            <ol className="next-steps">
              {extras.map((step) => (
                <StepRow key={step.id} step={step} />
              ))}
            </ol>
          </section>
        ) : null}

        <section aria-labelledby="projects-heading">
          <h2 id="projects-heading" className="section-title">
            Project kamu
          </h2>

          {owned.length === 0 ? (
            <p className="muted">
              Belum ada. <Link href="/new">Tunjukkan yang pertama</Link> — boleh yang masih ide.
            </p>
          ) : (
            <ul className="start-project-list">
              {owned.map((project) => (
                <StartProjectRow key={project.id} project={project} />
              ))}
            </ul>
          )}
        </section>

        <p className="start-skip">
          <Link href="/">Lewati dulu, lihat-lihat board</Link>
        </p>
      </main>

      <SiteFooter />
    </>
  );
}

function StepRow({ step }: { step: NextStep }) {
  return (
    <li className={`next-step ${step.done ? "is-done" : ""}`}>
      <span className="next-step-mark" aria-hidden="true">
        {step.done ? "✓" : ""}
      </span>
      <div className="next-step-copy">
        <h3>
          {step.title}
          {step.done ? <span className="next-step-state"> · sudah</span> : null}
        </h3>
        <p>{step.blurb}</p>
      </div>
      <Link className="next-step-cta" href={step.href}>
        {step.done ? "Ubah" : step.cta}
      </Link>
    </li>
  );
}

/**
 * One owned project with the three things its owner most often comes back for.
 *
 * The "sekarang sedang…" line is edited here rather than linked to, because it
 * otherwise lives inside a collapsed panel inside a tab on the project page —
 * far enough away that the line people read for freshness is the one least
 * likely to be kept fresh. `setNow` is the same action that panel calls.
 */
function StartProjectRow({ project }: { project: ProjectSummary }) {
  return (
    <li className="start-project-row">
      <div className="start-project-head">
        <ProjectLogo title={project.title} website={project.liveUrl} logoUrl={project.logoUrl} />
        <div className="start-project-title">
          <h3>
            <Link href={`/projects/${project.slug}`}>{project.title}</Link>
          </h3>
          <StageBadge stage={project.stage} />
        </div>
        <Link className="start-project-edit" href={`/projects/${project.slug}/edit`}>
          Ubah brief
        </Link>
      </div>

      <form className="start-now-form" action={setNow}>
        <input type="hidden" name="slug" value={project.slug} />
        <label htmlFor={`now-${project.slug}`}>Sekarang sedang…</label>
        <div className="start-now-row">
          <input
            id={`now-${project.slug}`}
            name="now"
            type="text"
            maxLength={MAXIMUM.now}
            defaultValue={project.nowText}
            placeholder="Contoh: Menyusun materi keselamatan pertama."
          />
          <SubmitButton pendingLabel="Menyimpan…">Simpan</SubmitButton>
        </div>
      </form>

      <p className="start-project-seats">
        {project.openSeatCount > 0
          ? `${project.openSeatCount} role terbuka.`
          : "Belum ada role terbuka."}{" "}
        <Link href={`/projects/${project.slug}?tab=kolaborasi`}>
          {project.openSeatCount > 0 ? "Lihat kolaborasi" : "Buka role"}
        </Link>
      </p>
    </li>
  );
}
