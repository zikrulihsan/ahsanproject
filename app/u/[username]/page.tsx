import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { setActivityVisibility, updateProfile } from "../../actions";
import { SiteFooter, SiteHeader, Arrow } from "../../components/shell";
import { ActivityList, ProjectCard, initials, monthYear } from "../../components/pieces";
import { SubmitButton } from "../../components/submit-button";
import { getPerson, getPersonStats, getPortfolio, listPersonActivity } from "../../lib/data";
import { EVENT_KINDS, HIGHLIGHT_KINDS, eventKindMeta } from "../../lib/activity";
import { domainOf } from "../../lib/brief";
import { currentViewer } from "../../lib/session";

export const dynamic = "force-dynamic";

type Params = Promise<{ username: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { username } = await params;
  const person = await getPerson(username);
  if (!person) return { title: "Orang tidak ditemukan — Ahsan Project" };

  const description =
    person.headline || `Proyek dan kontribusi ${person.name} di Ahsan Project.`;

  return {
    title: `${person.name} — Ahsan Project`,
    description,
    alternates: { canonical: `/u/${person.username}` },
    // The card image comes from opengraph-image.tsx beside this file.
    openGraph: {
      type: "profile",
      title: `${person.name} — Ahsan Project`,
      description,
      url: `/u/${person.username}`,
    },
  };
}

const TRAIL_PAGE = 40;

export default async function ProfilePage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { username } = await params;
  const query = (await searchParams) ?? {};
  const [person, viewer] = await Promise.all([getPerson(username), currentViewer()]);
  if (!person) notFound();

  // "Muat lebih lama" grows the limit instead of paging cursors: the list is
  // one request either way, and the URL stays shareable.
  const showAll = query.jejak === "semua";
  const rawLimit = Number(Array.isArray(query.batas) ? query.batas[0] : query.batas);
  const limit = Math.min(Number.isInteger(rawLimit) && rawLimit > 0 ? rawLimit : TRAIL_PAGE, 400);

  const isSelf = viewer?.id === person.id;
  const [{ owned, contributing }, activity, stats] = await Promise.all([
    getPortfolio(person),
    listPersonActivity(person.id, {
      limit: limit + 1,
      kinds: showAll ? undefined : HIGHLIGHT_KINDS,
    }),
    getPersonStats(person.id),
  ]);
  const hasOlder = activity.length > limit;
  const trail = activity.slice(0, limit);
  const live = owned.filter((project) => project.stage === "live").length;

  const trailPath = (next: { jejak?: string; batas?: number }) => {
    const params = new URLSearchParams();
    if (next.jejak === "semua") params.set("jejak", "semua");
    if (next.batas && next.batas > TRAIL_PAGE) params.set("batas", String(next.batas));
    const search = params.toString();
    return `/u/${person.username}${search ? `?${search}` : ""}#activity-heading`;
  };

  return (
    <>
      <SiteHeader returnTo={`/u/${person.username}`} />

      {/* Portfolio by evidence: the band makes the claim, the
          card under it is the evidence — identity on the left, what this
          person actually did on the right. */}
      <section className="profile-band">
        <div className="profile-band-inner">
          <p className="eyebrow light">
            <span /> Portofolio
          </p>
          <h1>{person.name}</h1>
          {person.headline ? <p className="profile-headline">{person.headline}</p> : null}
        </div>
      </section>

      <main id="main-content" className="profile-page">
        <article className="profile-card">
          <div className="profile-sidebar">
            <span className="avatar avatar-lg" aria-hidden="true">
              {initials(person.name)}
            </span>
            <h2>{person.name}</h2>
            <p className="handle">@{person.username}</p>
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
              {stats.rolesTaken > 0 ? (
                <li>
                  <strong>{stats.rolesTaken}</strong> peran dijalani
                </li>
              ) : null}
              {stats.tasksDone > 0 ? (
                <li>
                  <strong>{stats.tasksDone}</strong> tugas dibereskan
                </li>
              ) : null}
              {stats.since ? <li>aktif sejak {monthYear(stats.since)}</li> : null}
            </ul>
          </div>

          <div className="profile-content">
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
              <p className="trail-note">
                Jejak ini ditulis sistem saat kejadiannya — bukan diketik belakangan.
              </p>

              <div className="trail-modes">
                <Link className={showAll ? "" : "is-active"} href={trailPath({})}>
                  Sorotan
                </Link>
                <Link className={showAll ? "is-active" : ""} href={trailPath({ jejak: "semua" })}>
                  Semua jejak
                </Link>
              </div>

              {trail.length === 0 ? (
                <p className="muted">
                  {showAll ? "Belum ada jejak." : "Belum ada sorotan."}
                  {isSelf
                    ? " Yang kamu kerjakan di sini akan muncul sendiri — tidak perlu ditulis."
                    : ""}
                </p>
              ) : (
                <ActivityList events={trail} hidden={isSelf ? person.activityHidden : []} />
              )}

              {hasOlder ? (
                <p className="trail-more">
                  <Link
                    href={trailPath({
                      jejak: showAll ? "semua" : undefined,
                      batas: limit + TRAIL_PAGE,
                    })}
                  >
                    Muat jejak lebih lama
                  </Link>
                </p>
              ) : null}

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
                    <ProjectCard key={project.id} project={project} contributionRole={project.role} />
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        </article>
      </main>

      <SiteFooter />
    </>
  );
}
