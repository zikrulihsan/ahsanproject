import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  addComment,
  applyForSeat,
  assignTask,
  createTask,
  decideSeat,
  deleteTask,
  moveTask,
  openSeat,
  setSeatAccess,
  setStage,
  toggleBoost,
} from "../../actions";
import { boardPath, signInPath } from "../../lib/urls";
import { SubmitButton } from "../../components/submit-button";
import { SiteFooter, SiteHeader, Arrow } from "../../components/shell";
import { ActivityList, StageBadge, TagRow, initials, timeAgo } from "../../components/pieces";
import { briefCompleteness, domainOf } from "../../lib/brief";
import { getProject, hasBoosted, listProjectActivity, type ProjectDetail } from "../../lib/data";
import { ROLES, roleLabel, roleMeta } from "../../lib/roles";
import { STAGES, meetsStage, requirementsFor, stageMeta, type Stage, type StageInput } from "../../lib/stages";
import { accessOf, canManage } from "../../lib/access";
import {
  TASK_ORDER,
  TASK_STATUSES,
  taskStatusLabel,
  taskStatusMeta,
  taskStatusTone,
} from "../../lib/tasks";
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
    // The card image comes from opengraph-image.tsx beside this file.
    openGraph: {
      type: "article",
      title: `${project.title} — Ahsan Project`,
      description: project.tagline,
      url: `/projects/${project.slug}`,
    },
  };
}

export default async function ProjectPage({ params }: { params: Params }) {
  const { slug } = await params;
  // The project and the visitor are independent questions — ask them together.
  const [project, viewer] = await Promise.all([getProject(slug), currentViewer()]);
  if (!project) notFound();

  // Where this visitor stands. The database decides what may actually
  // happen; this only decides what is worth rendering.
  const access = accessOf(viewer?.id, project.owner.id, project.seats);
  const isOwner = access === "owner";
  const isManager = canManage(access);
  const [boosted, history] = await Promise.all([
    viewer ? hasBoosted(project.id, viewer.id) : Promise.resolve(false),
    listProjectActivity(project.id),
  ]);
  const returnTo = `/projects/${project.slug}`;

  const stageInput = toStageInput(project);
  const completeness = briefCompleteness({ ...project, seatCount: project.seatCount });

  const team = project.seats.filter((seat) => seat.status === "filled");
  const pending = project.seats.filter((seat) => seat.status === "pending");
  const open = project.seats.filter((seat) => seat.status === "open");
  const viewerSeat = viewer ? project.seats.find((seat) => seat.person?.id === viewer.id) : undefined;

  const doneTasks = project.tasks.filter((task) => task.status === "done").length;
  // Who a task may be handed to: the owner, plus everybody holding a seat.
  const assignable = [
    { id: project.owner.id, name: project.owner.name },
    ...team.flatMap((seat) => (seat.person ? [{ id: seat.person.id, name: seat.person.name }] : [])),
  ];

  return (
    <>
      <SiteHeader returnTo={returnTo} />

      <main id="main-content" className="project-page">
        <div className="breadcrumb breadcrumb-row">
          <p>
            <Link href={boardPath}>Papan ide</Link> <span aria-hidden="true">/</span> {project.title}
          </p>
          {isOwner ? <Link className="edit-link" href={`/projects/${project.slug}/edit`}>Ubah proyek</Link> : null}
        </div>

        <section className="project-hero">
          <div className="project-hero-copy">
            <div className="project-hero-top">
              <span className={`hero-glyph level-${project.stage}`} aria-hidden="true">
                {project.glyph || initials(project.title)}
              </span>
              <StageBadge stage={project.stage} />
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
                  <SubmitButton className={`boost ${boosted ? "is-on" : ""}`}>
                    <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="m12 5 7 8H5l7-8Z" />
                    </svg>
                    <strong>{project.boostCount}</strong>
                    <span>{boosted ? "Kamu dukung" : "Dukung"}</span>
                  </SubmitButton>
                </form>
              ) : (
                <Link className="boost" href={signInPath(returnTo)}>
                  <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="m12 5 7 8H5l7-8Z" />
                  </svg>
                  <strong>{project.boostCount}</strong>
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
                        <small>
                          {roleLabel(seat.role)}
                          {seat.access === "admin" ? <span className="access-badge">admin</span> : null}
                        </small>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">Belum ada yang bergabung. Peran di bawah masih kosong.</p>
              )}

              {isManager && pending.length > 0 ? (
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
                        <SubmitButton name="decision" value="terima" pendingLabel="Sebentar…">
                          Terima
                        </SubmitButton>
                        <SubmitButton className="quiet" name="decision" value="tolak">
                          Buka lagi
                        </SubmitButton>
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
                              <SubmitButton pendingLabel="Mengirim…">Kirim lamaran</SubmitButton>
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

              {!isManager && pending.length > 0 ? (
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

              {isManager ? (
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
                    <SubmitButton pendingLabel="Membuka…">Buka peran</SubmitButton>
                  </form>
                </details>
              ) : null}

              {isOwner && team.length > 0 ? (
                <details className="owner-tool">
                  <summary>Atur akses</summary>
                  <p className="hint">
                    Admin bisa mengurus tugas, membuka peran, dan menjawab lamaran. Brief, level, dan
                    hapus proyek tetap cuma kamu.
                  </p>
                  {team.map((seat) => (
                    <form className="access-form" action={setSeatAccess} key={seat.id}>
                      <input type="hidden" name="slug" value={project.slug} />
                      <input type="hidden" name="seatId" value={seat.id} />
                      <span>{seat.person?.name ?? "Tanpa nama"}</span>
                      <SubmitButton
                        name="access"
                        value={seat.access === "admin" ? "member" : "admin"}
                        className={seat.access === "admin" ? "quiet" : ""}
                      >
                        {seat.access === "admin" ? "Turunkan jadi anggota" : "Jadikan admin"}
                      </SubmitButton>
                    </form>
                  ))}
                </details>
              ) : null}
            </section>

            <section className="tasks" aria-labelledby="tasks-heading">
              <h2 id="tasks-heading">
                Tugas
                {project.tasks.length > 0 ? ` (${doneTasks} dari ${project.tasks.length} beres)` : ""}
              </h2>

              {project.tasks.length === 0 ? (
                <p className="muted">
                  Belum ada tugas di sini.
                  {isManager ? " Tulis satu supaya orang tahu apa yang lagi jalan." : ""}
                </p>
              ) : (
                TASK_ORDER.map((status) => {
                  const items = project.tasks.filter((task) => task.status === status);
                  if (items.length === 0) return null;

                  return (
                    <div className="task-group" key={status}>
                      <h3>{taskStatusMeta[status].label}</h3>
                      <ul className="task-list">
                        {items.map((task) => {
                          const mine = Boolean(viewer && task.assignee?.id === viewer.id);

                          return (
                            <li key={task.id} className={status === "done" ? "is-done" : ""}>
                              <div>
                                <h4>{task.title}</h4>
                                {task.detail ? <p className="muted">{task.detail}</p> : null}
                                <p className="task-holder">
                                  {task.assignee ? (
                                    <>
                                      <span className="avatar" aria-hidden="true">
                                        {initials(task.assignee.name)}
                                      </span>
                                      <Link href={`/u/${task.assignee.username}`}>
                                        {task.assignee.name}
                                      </Link>
                                    </>
                                  ) : (
                                    <span className="muted">Belum ada yang ambil</span>
                                  )}
                                </p>

                                {isManager ? (
                                  <form className="task-manage" action={assignTask}>
                                    <input type="hidden" name="slug" value={project.slug} />
                                    <input type="hidden" name="taskId" value={task.id} />
                                    <label className="sr-only" htmlFor={`assignee-${task.id}`}>
                                      Siapa yang pegang {task.title}
                                    </label>
                                    <select
                                      id={`assignee-${task.id}`}
                                      name="assigneeId"
                                      defaultValue={task.assignee?.id ?? ""}
                                    >
                                      <option value="">Belum ada yang ambil</option>
                                      {assignable.map((person) => (
                                        <option key={person.id} value={person.id}>
                                          {person.name}
                                        </option>
                                      ))}
                                    </select>
                                    <SubmitButton pendingLabel="Sebentar…">Simpan</SubmitButton>
                                    <SubmitButton className="quiet" formAction={deleteTask}>
                                      Hapus
                                    </SubmitButton>
                                  </form>
                                ) : null}
                              </div>

                              <div className="task-side">
                                <span className={`task-status ${taskStatusTone(task.status)}`}>
                                  {taskStatusLabel(task.status)}
                                </span>

                                {mine || isManager ? (
                                  <form className="task-move" action={moveTask}>
                                    <input type="hidden" name="slug" value={project.slug} />
                                    <input type="hidden" name="taskId" value={task.id} />
                                    {TASK_STATUSES.map((next) => (
                                      <SubmitButton
                                        key={next}
                                        name="status"
                                        value={next}
                                        disabled={next === task.status}
                                        title={taskStatusMeta[next].blurb}
                                      >
                                        {taskStatusMeta[next].label}
                                      </SubmitButton>
                                    ))}
                                  </form>
                                ) : null}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  );
                })
              )}

              {isManager ? (
                <details className="owner-tool">
                  <summary>Tambah tugas</summary>
                  <form action={createTask}>
                    <input type="hidden" name="slug" value={project.slug} />
                    <label htmlFor="task-title">Tugasnya apa</label>
                    <input id="task-title" name="title" type="text" required maxLength={120} />
                    <label htmlFor="task-detail">Penjelasan singkat</label>
                    <textarea id="task-detail" name="detail" rows={2} maxLength={400} />
                    <label htmlFor="task-assignee">Siapa yang pegang</label>
                    <select id="task-assignee" name="assigneeId" defaultValue="">
                      <option value="">Belum ada yang ambil</option>
                      {assignable.map((person) => (
                        <option key={person.id} value={person.id}>
                          {person.name}
                        </option>
                      ))}
                    </select>
                    <SubmitButton pendingLabel="Menambah…">Tambah tugas</SubmitButton>
                  </form>
                </details>
              ) : null}
            </section>

            {history.length > 0 ? (
              <section className="history" aria-labelledby="history-heading">
                <h2 id="history-heading">Riwayat</h2>
                <ActivityList events={history} showActor />
              </section>
            ) : null}

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
                  <SubmitButton pendingLabel="Mengirim…">Kirim</SubmitButton>
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
                        <SubmitButton
                          key={stage}
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
                        </SubmitButton>
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
