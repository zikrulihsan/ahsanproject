import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { addComment, applyForSeat, decideSeat, openSeat, setStage, toggleBoost } from "../../actions";
import { signInPath } from "../../lib/urls";
import { SiteFooter, SiteHeader, Arrow } from "../../components/shell";
import { StageBadge, TagRow, initials, timeAgo } from "../../components/pieces";
import { briefCompleteness, domainOf } from "../../lib/brief";
import { getProject, hasBoosted, type ProjectDetail } from "../../lib/data";
import { ROLES, roleLabel, roleMeta } from "../../lib/roles";
import { STAGES, meetsStage, requirementsFor, stageMeta, type Stage, type StageInput } from "../../lib/stages";
import { currentViewer } from "../../lib/session";

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProject(slug);
  if (!project) return { title: "Proyek tidak ditemukan — Ahsan Project" };

  return {
    title: `${project.title} — Ahsan Project`,
    description: project.tagline,
    alternates: { canonical: `/projects/${project.slug}` },
  };
}

export default async function ProjectPage({ params }: { params: Params }) {
  const { slug } = await params;
  const project = await getProject(slug);
  if (!project) notFound();

  const viewer = await currentViewer();
  const isOwner = viewer?.id === project.owner.id;
  const boosted = viewer ? await hasBoosted(project.id, viewer.id) : false;
  const returnTo = `/projects/${project.slug}`;

  const stageInput = toStageInput(project);
  const completeness = briefCompleteness({ ...project, seatCount: project.seatCount });

  const team = project.seats.filter((seat) => seat.status === "filled");
  const pending = project.seats.filter((seat) => seat.status === "pending");
  const open = project.seats.filter((seat) => seat.status === "open");
  const viewerSeat = viewer ? project.seats.find((seat) => seat.person?.id === viewer.id) : undefined;

  return (
    <>
      <SiteHeader returnTo={returnTo} />

      <main className="project-page">
        <p className="breadcrumb">
          <Link href="/">Papan ide</Link> <span aria-hidden="true">/</span> {project.title}
        </p>

        <section className={`project-hero ${project.accent}`}>
          <div className="project-hero-copy">
            <div className="project-hero-top">
              <StageBadge stage={project.stage} />
              <span className="hero-glyph" aria-hidden="true">
                {project.glyph}
              </span>
            </div>
            <h1>{project.title}</h1>
            <p className="project-tagline">{project.tagline}</p>
            <TagRow tags={project.tags} />

            <div className="project-hero-meta">
              <Link className="card-owner" href={`/u/${project.owner.username}`}>
                <span className="avatar" aria-hidden="true">
                  {initials(project.owner.name)}
                </span>
                <span>
                  <strong>{project.owner.name}</strong>
                  <small>pemilik proyek · {timeAgo(project.createdAt)}</small>
                </span>
              </Link>

              {viewer ? (
                <form action={toggleBoost}>
                  <input type="hidden" name="slug" value={project.slug} />
                  <button className={`boost ${boosted ? "is-on" : ""}`} type="submit">
                    ▲ <strong>{project.boostCount}</strong>
                    <span>{boosted ? "Kamu dukung" : "Dukung"}</span>
                  </button>
                </form>
              ) : (
                <Link className="boost" href={signInPath(returnTo)}>
                  ▲ <strong>{project.boostCount}</strong>
                  <span>Dukung</span>
                </Link>
              )}
            </div>

            {(project.liveUrl || project.docUrl || project.repoUrl) && (
              <ul className="project-links">
                {project.liveUrl ? (
                  <li>
                    <a href={project.liveUrl} target="_blank" rel="noreferrer">
                      {domainOf(project.liveUrl) || "Buka produknya"} <Arrow diagonal />
                    </a>
                  </li>
                ) : null}
                {project.docUrl ? (
                  <li>
                    <a href={project.docUrl} target="_blank" rel="noreferrer">
                      Dokumen <Arrow diagonal />
                    </a>
                  </li>
                ) : null}
                {project.repoUrl ? (
                  <li>
                    <a href={project.repoUrl} target="_blank" rel="noreferrer">
                      Repo <Arrow diagonal />
                    </a>
                  </li>
                ) : null}
              </ul>
            )}
          </div>
        </section>

        <div className="project-body">
          <div className="project-main">
            <section className="brief" aria-labelledby="brief-heading">
              <h2 id="brief-heading">Brief</h2>
              <article>
                <h3>Masalah yang mau dibereskan</h3>
                <p>{project.problem}</p>
              </article>
              <article>
                <h3>Gambaran solusinya</h3>
                <p>{project.solution}</p>
              </article>
              <article>
                <h3>Untuk siapa</h3>
                <p>{project.audience}</p>
              </article>
            </section>

            <section className="team" aria-labelledby="team-heading">
              <h2 id="team-heading">Tim dan peran</h2>

              {team.length > 0 ? (
                <ul className="member-list">
                  {team.map((seat) => (
                    <li key={seat.id}>
                      <span className="avatar" aria-hidden="true">
                        {initials(seat.person?.name ?? "?")}
                      </span>
                      <span>
                        <strong>
                          {seat.person ? (
                            <Link href={`/u/${seat.person.username}`}>{seat.person.name}</Link>
                          ) : (
                            "Tanpa nama"
                          )}
                        </strong>
                        <small>{roleLabel(seat.role)}</small>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">Belum ada yang bergabung. Peran di bawah masih kosong.</p>
              )}

              {isOwner && pending.length > 0 ? (
                <div className="pending-list">
                  <h3>Menunggu keputusanmu</h3>
                  {pending.map((seat) => (
                    <article key={seat.id} className="pending-card">
                      <p>
                        <strong>{seat.person?.name ?? "Seseorang"}</strong> melamar sebagai{" "}
                        {roleLabel(seat.role)}
                      </p>
                      <blockquote>{seat.pitch}</blockquote>
                      <form action={decideSeat}>
                        <input type="hidden" name="slug" value={project.slug} />
                        <input type="hidden" name="seatId" value={seat.id} />
                        <button type="submit" name="decision" value="terima">
                          Terima
                        </button>
                        <button className="quiet" type="submit" name="decision" value="tolak">
                          Buka lagi
                        </button>
                      </form>
                    </article>
                  ))}
                </div>
              ) : null}

              {open.length > 0 ? (
                <ul className="seat-list">
                  {open.map((seat) => (
                    <li key={seat.id}>
                      <div>
                        <h3>{roleLabel(seat.role)}</h3>
                        <p>{seat.brief}</p>
                      </div>
                      {viewer ? (
                        viewerSeat ? (
                          <p className="muted">Kamu sudah melamar di proyek ini.</p>
                        ) : (
                          <details>
                            <summary>Ambil peran ini</summary>
                            <form action={applyForSeat}>
                              <input type="hidden" name="slug" value={project.slug} />
                              <input type="hidden" name="seatId" value={seat.id} />
                              <label htmlFor={`pitch-${seat.id}`}>
                                Ceritakan kenapa kamu cocok dan berapa waktu yang bisa kamu luangkan.
                              </label>
                              <textarea
                                id={`pitch-${seat.id}`}
                                name="pitch"
                                rows={4}
                                required
                                placeholder="Contoh: saya pernah bantu riset serupa, bisa luangkan 3 jam per minggu."
                              />
                              <button type="submit">Kirim lamaran</button>
                            </form>
                          </details>
                        )
                      ) : (
                        <Link className="ghost-button" href={signInPath(returnTo)}>
                          Masuk untuk ambil peran
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              ) : pending.length === 0 ? (
                <p className="muted">Belum ada peran yang dibuka.</p>
              ) : null}

              {!isOwner && pending.length > 0 ? (
                <ul className="seat-list waiting-list">
                  {pending.map((seat) => (
                    <li key={seat.id}>
                      <div>
                        <h3>{roleLabel(seat.role)}</h3>
                        <p>
                          {seat.person?.id === viewer?.id
                            ? "Lamaranmu sudah masuk, tinggal menunggu jawaban pemilik proyek."
                            : `${seat.person?.name ?? "Seseorang"} sedang menunggu jawaban pemilik proyek.`}
                        </p>
                      </div>
                      <span className="waiting-flag">Menunggu konfirmasi</span>
                    </li>
                  ))}
                </ul>
              ) : null}

              {isOwner ? (
                <details className="owner-tool">
                  <summary>Buka peran baru</summary>
                  <form action={openSeat}>
                    <input type="hidden" name="slug" value={project.slug} />
                    <label htmlFor="new-seat-role">Peran</label>
                    <select id="new-seat-role" name="role" defaultValue="pm">
                      {ROLES.map((role) => (
                        <option key={role} value={role}>
                          {roleMeta[role].label}
                        </option>
                      ))}
                    </select>
                    <label htmlFor="new-seat-brief">Yang perlu dibantu</label>
                    <textarea id="new-seat-brief" name="brief" rows={3} required />
                    <button type="submit">Buka peran</button>
                  </form>
                </details>
              ) : null}
            </section>

            <section className="discussion" aria-labelledby="discussion-heading">
              <h2 id="discussion-heading">Diskusi ({project.comments.length})</h2>

              {viewer ? (
                <form className="comment-form" action={addComment}>
                  <input type="hidden" name="slug" value={project.slug} />
                  <label htmlFor="comment-body">Tanggapan atau pertanyaan</label>
                  <textarea
                    id="comment-body"
                    name="body"
                    rows={4}
                    required
                    placeholder="Bagian mana yang menurutmu paling berisiko? Ada cara yang lebih sederhana?"
                  />
                  <button type="submit">Kirim</button>
                </form>
              ) : (
                <p className="muted">
                  <Link href={signInPath(returnTo)}>Masuk</Link> untuk ikut membahas ide ini.
                </p>
              )}

              {project.comments.length === 0 ? (
                <p className="muted">Belum ada yang berkomentar. Mulai duluan boleh banget.</p>
              ) : (
                <ul className="comment-list">
                  {project.comments.map((comment) => (
                    <li key={comment.id}>
                      <div className="comment-head">
                        <span className="avatar" aria-hidden="true">
                          {initials(comment.author.name)}
                        </span>
                        <Link href={`/u/${comment.author.username}`}>{comment.author.name}</Link>
                        <small>{timeAgo(comment.createdAt)}</small>
                      </div>
                      <p>{comment.body}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <aside className="project-side">
            <section className="level-card">
              <h2>Level proyek</h2>
              <p className="muted">{stageMeta[project.stage].blurb}</p>

              <ol className="level-track">
                {STAGES.filter((stage) => stage !== "resting").map((stage) => (
                  <li
                    key={stage}
                    className={
                      stage === project.stage
                        ? "is-current"
                        : passed(stage, project.stage)
                          ? "is-passed"
                          : ""
                    }
                  >
                    <span>{stageMeta[stage].label}</span>
                  </li>
                ))}
              </ol>

              <h3>Syarat level ini</h3>
              <ul className="requirement-list">
                {requirementsFor(project.stage, stageInput).map((requirement) => (
                  <li key={requirement.label} className={requirement.met ? "met" : ""}>
                    <span aria-hidden="true">{requirement.met ? "✓" : "○"}</span>
                    {requirement.label}
                  </li>
                ))}
              </ul>

              <h3>Kelengkapan brief</h3>
              <div
                className="meter"
                role="meter"
                aria-valuenow={completeness}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Kelengkapan brief"
              >
                <span style={{ width: `${completeness}%` }} />
              </div>
              <p className="meter-value">{completeness}% terisi</p>

              {isOwner ? (
                <form className="stage-form" action={setStage}>
                  <input type="hidden" name="slug" value={project.slug} />
                  <h3>Pindahkan level</h3>
                  <div className="stage-buttons">
                    {STAGES.filter((stage) => stage !== project.stage).map((stage) => {
                      const allowed = meetsStage(stage, stageInput);
                      return (
                        <button
                          key={stage}
                          type="submit"
                          name="stage"
                          value={stage}
                          disabled={!allowed}
                          title={
                            allowed
                              ? stageMeta[stage].blurb
                              : "Syaratnya belum terpenuhi untuk level ini."
                          }
                        >
                          {stageMeta[stage].label}
                        </button>
                      );
                    })}
                  </div>
                </form>
              ) : null}
            </section>
          </aside>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}

function toStageInput(project: ProjectDetail): StageInput {
  return {
    problem: project.problem,
    solution: project.solution,
    audience: project.audience,
    tags: project.tags,
    docUrl: project.docUrl,
    repoUrl: project.repoUrl,
    liveUrl: project.liveUrl,
    seatCount: project.seatCount,
  };
}

function passed(stage: Stage, current: Stage): boolean {
  return STAGES.indexOf(stage) < STAGES.indexOf(current);
}
