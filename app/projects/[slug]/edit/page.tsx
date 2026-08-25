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

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ubah project — Ahsan Project",
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
          <span aria-hidden="true">/</span> Ubah
        </p>

        <p className="eyebrow">
          <span /> Ubah project
        </p>
        <h1>{project.title}</h1>
        <p className="lede">
          Alamatnya tetap <code>/projects/{project.slug}</code>, jadi tautan yang sudah kamu bagikan
          tidak mati. Tahap sekarang: <strong>{stageMeta[project.stage].label}</strong>.
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
            nowText: project.nowText,
            docUrl: project.docUrl,
            repoUrl: project.repoUrl,
            liveUrl: project.liveUrl,
            logoUrl: project.logoUrl,
          }}
        />

        <section className="danger-zone">
          <h2>Hapus project</h2>
          <p>
            Ini permanen. Diskusi, lamaran, dan dukungan yang menempel ikut terhapus, dan tidak ada
            cara mengembalikannya. Kalau cuma sedang tidak digarap, pindahkan saja levelnya ke{" "}
            <strong>Diistirahatkan</strong> dari halaman project — isinya tetap terbaca.
          </p>
          <details>
            <summary>Saya tetap mau menghapus</summary>
            <form action={deleteProject}>
              <input type="hidden" name="slug" value={project.slug} />
              <label htmlFor="confirm">
                Ketik <code>{project.slug}</code> untuk memastikan ini bukan kepencet.
              </label>
              <input id="confirm" name="confirm" type="text" autoComplete="off" required />
              <SubmitButton className="danger" pendingLabel="Menghapus…">
                Hapus project ini
              </SubmitButton>
            </form>
          </details>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
