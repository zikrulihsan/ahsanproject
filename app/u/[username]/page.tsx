import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { setActivityVisibility, updateProfile } from "../../actions";
import { SiteFooter, SiteHeader, Arrow } from "../../components/shell";
import { ActivityList, ProjectCard, initials } from "../../components/pieces";
import { SubmitButton } from "../../components/submit-button";
import { getPerson, getPortfolio, listPersonActivity } from "../../lib/data";
import { EVENT_KINDS, eventKindMeta } from "../../lib/activity";
import { domainOf } from "../../lib/brief";
import { currentViewer } from "../../lib/session";

export const dynamic = "force-dynamic";

type Params = Promise<{ username: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { username } = await params;
  const person = await getPerson(username);
  if (!person) return { title: "Orang tidak ditemukan — Ahsan Project" };

  return {
    title: `${person.name} — Ahsan Project`,
    description: person.headline || `Proyek dan kontribusi ${person.name} di Ahsan Project.`,
    alternates: { canonical: `/u/${person.username}` },
  };
}

export default async function ProfilePage({ params }: { params: Params }) {
  const { username } = await params;
  const [person, viewer] = await Promise.all([getPerson(username), currentViewer()]);
  if (!person) notFound();

  const isSelf = viewer?.id === person.id;
  const [{ owned, contributing }, activity] = await Promise.all([
    getPortfolio(person),
    listPersonActivity(person.id),
  ]);
  const live = owned.filter((project) => project.stage === "live").length;

  return (
    <>
      <SiteHeader returnTo={`/u/${person.username}`} />

      <main className="profile-page">
        <section className="profile-hero">
          <span className="avatar avatar-lg" aria-hidden="true">
            {initials(person.name)}
          </span>
          <div>
            <p className="eyebrow">
              <span /> Portofolio
            </p>
            <h1>{person.name}</h1>
            {person.headline ? <p className="profile-headline">{person.headline}</p> : null}
            {person.bio ? <p className="profile-bio">{person.bio}</p> : null}

            <ul className="profile-links">
              {person.website ? (
                <li>
                  <a href={person.website} target="_blank" rel="noreferrer">
                    {domainOf(person.website) || person.website} <Arrow diagonal />
                  </a>
                </li>
              ) : null}
              {person.github ? (
                <li>
                  <a href={person.github} target="_blank" rel="noreferrer">
                    GitHub <Arrow diagonal />
                  </a>
                </li>
              ) : null}
            </ul>

            <ul className="profile-stats">
              <li>
                <strong>{owned.length}</strong> proyek dimiliki
              </li>
              <li>
                <strong>{live}</strong> sudah jalan
              </li>
              <li>
                <strong>{contributing.length}</strong> ikut menggarap
              </li>
            </ul>
          </div>
        </section>

        {isSelf ? (
          <details className="owner-tool profile-edit">
            <summary>Ubah profil</summary>
            <form action={updateProfile}>
              <label htmlFor="name">Nama</label>
              <input id="name" name="name" type="text" defaultValue={person.name} />
              <label htmlFor="headline">Satu baris tentang kamu</label>
              <input id="headline" name="headline" type="text" defaultValue={person.headline} />
              <label htmlFor="bio">Cerita singkat</label>
              <textarea id="bio" name="bio" rows={4} defaultValue={person.bio} />
              <label htmlFor="website">Situs</label>
              <input id="website" name="website" type="url" defaultValue={person.website} />
              <label htmlFor="github">GitHub</label>
              <input id="github" name="github" type="url" defaultValue={person.github} />
              <SubmitButton pendingLabel="Menyimpan…">Simpan</SubmitButton>
            </form>
          </details>
        ) : null}

        <section aria-labelledby="activity-heading">
          <h2 id="activity-heading" className="section-title">
            Jejak
          </h2>

          {activity.length === 0 ? (
            <p className="muted">
              Belum ada jejak.
              {isSelf
                ? " Yang kamu kerjakan di sini akan muncul sendiri — tidak perlu ditulis."
                : ""}
            </p>
          ) : (
            <ActivityList events={activity} hidden={isSelf ? person.activityHidden : []} />
          )}

          {isSelf ? (
            <details className="owner-tool">
              <summary>Atur apa yang tampil</summary>
              <form action={setActivityVisibility}>
                <p className="hint">
                  Yang dicentang tampil di profilmu untuk orang lain. Yang tidak, cuma kamu yang
                  lihat — jejaknya tetap tersimpan, tidak terhapus.
                </p>
                <ul className="kind-list">
                  {EVENT_KINDS.map((kind) => (
                    <li key={kind}>
                      <label htmlFor={`show-${kind}`}>
                        <input
                          id={`show-${kind}`}
                          type="checkbox"
                          name="show"
                          value={kind}
                          defaultChecked={!person.activityHidden.includes(kind)}
                        />
                        {eventKindMeta[kind].label}
                      </label>
                    </li>
                  ))}
                </ul>
                <SubmitButton pendingLabel="Menyimpan…">Simpan</SubmitButton>
              </form>
            </details>
          ) : null}
        </section>

        <section aria-labelledby="owned-heading">
          <h2 id="owned-heading" className="section-title">
            Proyeknya
          </h2>
          {owned.length === 0 ? (
            <p className="muted">
              Belum ada proyek. {isSelf ? <Link href="/new">Taruh ide pertamamu</Link> : null}
            </p>
          ) : (
            <div className="project-grid">
              {owned.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          )}
        </section>

        {contributing.length > 0 ? (
          <section aria-labelledby="contrib-heading">
            <h2 id="contrib-heading" className="section-title">
              Ikut menggarap
            </h2>
            <div className="project-grid">
              {contributing.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          </section>
        ) : null}
      </main>

      <SiteFooter />
    </>
  );
}
