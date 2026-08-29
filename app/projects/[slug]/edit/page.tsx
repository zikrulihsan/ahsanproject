import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { deleteProject } from "../../../actions";
import { SiteFooter, SiteHeader } from "../../../components/shell";
import { SubmitButton } from "../../../components/submit-button";
import { EditForm } from "../../../components/edit-form";
import { getProject } from "../../../lib/data";
import { currentViewer } from "../../../lib/session";
import { signInPath } from "../../../lib/urls";
import { stageMeta } from "../../../lib/stages";

/*
 * Allowed to block.
 *
 * This page decides what to render — or whether to redirect — from who is
 * signed in, and there is no useful shell to show before that answer arrives:
 * a visitor who is about to be sent elsewhere should not watch this page paint
 * first. Nothing here is cacheable and nothing here is indexed, so blocking on
 * the session costs a request that was always going to be per-visitor.
 */
export const instant = false;

export const metadata: Metadata = {
  title: "Edit project — Ahsan Project",
  robots: { index: false },
};

type Params = Promise<{ slug: string }>;

export default async function EditProjectPage({ params }: { params: Params }) {
  const { slug } = await params;
  const [project, viewer] = await Promise.all([getProject(slug), currentViewer()]);
  if (!project) notFound();

  if (!viewer) redirect(signInPath(`/projects/${slug}/edit`));

  // Someone else's project is not theirs to edit, and not theirs to know about
  // either — same answer as a project that does not exist.
  if (viewer.id !== project.owner.id) notFound();

  return (
    <>
      <SiteHeader returnTo={`/projects/${slug}/edit`} />

      <main id="main-content" className="page-narrow">
        <p className="breadcrumb">
          <Link href={`/projects/${project.slug}`}>{project.title}</Link>{" "}
          <span aria-hidden="true">/</span> Edit
        </p>

        <p className="eyebrow">
          <span /> Edit project
        </p>
        <h1>{project.title}</h1>
        <p className="lede">
          Its address remains <code>/projects/{project.slug}</code>, so links you have already shared
          keep working. Current stage: <strong>{stageMeta[project.stage].label}</strong>.
        </p>

        <EditForm
          project={{
            slug: project.slug,
            title: project.title,
            tagline: project.tagline,
            problem: project.problem,
            solution: project.solution,
            audience: project.audience,
            tags: project.tags,
            projectType: project.projectType,
            nowText: project.nowText,
            docUrl: project.docUrl,
            repoUrl: project.repoUrl,
            openForGitHubContributions: project.openForGitHubContributions,
            liveUrl: project.liveUrl,
            logoUrl: project.logoUrl,
            stage: project.stage,
          }}
        />

        <section className="danger-zone">
          <h2>Delete project</h2>
          <p>
            This is permanent. Its discussions, applications, and support will be deleted too, with
            no way to restore them. If work is only paused, change the project to{" "}
            <strong>Resting</strong> from its page—the content remains visible.
          </p>
          <details>
            <summary>I still want to delete it</summary>
            <form action={deleteProject}>
              <input type="hidden" name="slug" value={project.slug} />
              <label htmlFor="confirm">
                Type <code>{project.slug}</code> to confirm this was intentional.
              </label>
              <input id="confirm" name="confirm" type="text" autoComplete="off" required />
              <SubmitButton className="danger" pendingLabel="Deleting…">
                Delete this project
              </SubmitButton>
            </form>
          </details>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
