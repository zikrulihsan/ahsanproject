import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  addComment,
  assignTask,
  createTask,
  decideProposal,
  deleteTask,
  deleteUpdate,
  moveTask,
  openSeat,
  postUpdate,
  submitProposal,
  setNow,
  setSeatAccess,
  setStage,
  setTaskRole,
  toggleBoost,
  toggleFollow,
} from "../../actions";
import { signInPath } from "../../lib/urls";
import { SubmitButton } from "../../components/submit-button";
import { SiteFooter, SiteHeader, Arrow } from "../../components/shell";
import {
  ActivityList,
  JourneyList,
  RungRail,
  StageBadge,
  TagRow,
  freshness,
  initials,
  timeAgo,
} from "../../components/pieces";
import { MAXIMUM, domainOf } from "../../lib/brief";
import {
  getProject,
  hasBoosted,
  isFollowing,
  listProjectProposals,
  listProjectActivity,
  type ProjectDetail,
} from "../../lib/data";
import { profileReady } from "../../lib/next-steps";
import { roleLabel } from "../../lib/roles";
import { CommitmentField } from "../../components/commitment-field";
import { RoleFields } from "../../components/role-fields";
import { STAGES, meetsStage, requirementsFor, stageMeta, type StageInput } from "../../lib/stages";
import { accessOf, canManage } from "../../lib/access";
import { UPDATE_LIMITS } from "../../lib/updates";
import {
  TASK_ORDER,
  TASK_STATUSES,
  taskStatusLabel,
  taskStatusMeta,
  taskStatusTone,
} from "../../lib/tasks";
import { currentViewer } from "../../lib/session";
import { ProjectScrollTop } from "../../components/project-scroll-top";
import { ProjectLogo } from "../../components/project-logo";
import { ProjectTabContent, ProjectTabSwitcher } from "../../components/project-tabs";
import { isProjectTab, type ProjectTab } from "../../lib/project-tabs";
import { isGitHubRepositoryUrl } from "../../lib/github";

type Params = Promise<{ slug: string }>;
type SearchParams = Promise<{ tab?: string | string[] }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProject(slug);
  if (!project) return { title: "Project tidak ditemukan — Ahsan Project" };

  return {
    title: `${project.title} — Ahsan Project`,
    // What it is doing now says more than what it is, when there is one.
    description: project.nowText || project.tagline,
    alternates: { canonical: `/projects/${project.slug}` },
    // The card image comes from opengraph-image.tsx beside this file.
    openGraph: {
      type: "article",
      title: `${project.title} — Ahsan Project`,
      description: project.nowText || project.tagline,
      url: `/projects/${project.slug}`,
    },
  };
}

export default async function ProjectPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const requestedTab = Array.isArray(query.tab) ? query.tab[0] : query.tab;
  const activeTab: ProjectTab = requestedTab && isProjectTab(requestedTab) ? requestedTab : "tentang";
  // The project and the visitor are independent questions — ask them together.
  const [project, viewer] = await Promise.all([getProject(slug), currentViewer()]);
  if (!project) notFound();

  // Where this visitor stands. The database decides what may actually
  // happen; this only decides what is worth rendering.
  const access = accessOf(viewer?.id, project.owner.id, project.seats);
  const isOwner = access === "owner";
  const isManager = canManage(access);
  const [boosted, following, history, proposals] = await Promise.all([
    viewer ? hasBoosted(project.id, viewer.id) : Promise.resolve(false),
    viewer ? isFollowing(project.id, viewer.id) : Promise.resolve(false),
    listProjectActivity(project.id, { slug: project.slug, viewer }),
    viewer
      ? listProjectProposals(
          project.tasks.map((task) => task.id),
          project.seats.map((seat) => seat.id),
        )
      : Promise.resolve([]),
  ]);
  const returnTo =
    activeTab === "tentang"
      ? `/projects/${project.slug}`
      : `/projects/${project.slug}?tab=${activeTab}`;

  const stageInput = toStageInput(project);

  const team = project.seats.filter((seat) => seat.status === "filled");
  const open = project.seats.filter((seat) => seat.status === "open");
  const viewerSeat = viewer ? project.seats.find((seat) => seat.person?.id === viewer.id) : undefined;
  const canPropose = Boolean(viewer && profileReady(viewer));
  const profileReturnTo = `/akun/profil?returnTo=${encodeURIComponent(returnTo)}`;
  const proposalsForSeat = (seatId: number) => proposals.filter((proposal) => proposal.seatId === seatId);
  const proposalsForTask = (taskId: number) => proposals.filter((proposal) => proposal.taskId === taskId);

  const doneTasks = project.tasks.filter((task) => task.status === "done").length;
  // Who a task may be handed to: the owner, plus everybody holding a seat.
  const assignable = [
    { id: project.owner.id, name: project.owner.name },
    ...team.flatMap((seat) => (seat.person ? [{ id: seat.person.id, name: seat.person.name }] : [])),
  ];

  return (
    <>
      <ProjectScrollTop />
      <SiteHeader returnTo={returnTo} />

      <main id="main-content" className="project-page">
        <div className="breadcrumb breadcrumb-row">
          <p>
            <Link href="/">Jelajah</Link> <span aria-hidden="true">/</span> {project.title}
          </p>
          {isOwner ? <Link className="edit-link" href={`/projects/${project.slug}/edit`}>Ubah project</Link> : null}
        </div>

        {/* Identity, then what it is, then who is behind it, then the two
            things a visitor can do about it. Nothing measures the project
            here — that is what the journey further down is for. */}
        <section className="project-hero">
          <div className="project-hero-copy">
            <div className="project-hero-top">
              <ProjectLogo
                className={`hero-glyph level-${project.stage}`}
                fallback={project.glyph || initials(project.title)}
                title={project.title}
                website={project.liveUrl}
                logoUrl={project.logoUrl}
              />
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
                  <strong>
                    {project.owner.name}
                    {team.length > 0 ? ` + ${team.length} orang` : ""}
                  </strong>
                  <small>{freshness(project)}</small>
                </span>
              </Link>

              <div className="hero-actions">
                {viewer ? (
                  <form action={toggleFollow}>
                    <input type="hidden" name="slug" value={project.slug} />
                    <SubmitButton className={`follow ${following ? "is-on" : ""}`}>
                      {following ? "Diikuti" : "Ikuti project"}
                    </SubmitButton>
                  </form>
                ) : (
                  <Link className="follow" href={signInPath(returnTo)}>
                    Ikuti project
                  </Link>
                )}

                {/* Support stays, small and to the side: it is a nice signal,
                    not the point of the page. */}
                {viewer ? (
                  <form action={toggleBoost}>
                    <input type="hidden" name="slug" value={project.slug} />
                    <SubmitButton className={`boost ${boosted ? "is-on" : ""}`}>
                      <span aria-hidden="true">♡</span>
                      <strong>{project.boostCount}</strong>
                      <span className="sr-only">dukungan</span>
                    </SubmitButton>
                  </form>
                ) : (
                  <Link className="boost" href={signInPath(returnTo)}>
                    <span aria-hidden="true">♡</span>
                    <strong>{project.boostCount}</strong>
                    <span className="sr-only">dukungan</span>
                  </Link>
                )}
              </div>
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
                      {isGitHubRepositoryUrl(project.repoUrl) ? "Lihat repository GitHub" : "Repo"} <Arrow diagonal />
                    </a>
                  </li>
                ) : null}
              </ul>
            )}
          </div>
        </section>

        <ProjectTabSwitcher initialTab={activeTab}>
          <div className="project-main">
            <ProjectTabContent tab="tentang">
              <section className="brief" aria-labelledby="brief-heading">
                <h2 id="brief-heading">Tentang project ini</h2>
                <article>
                  <h3>Masalah yang ingin dibereskan</h3>
                  <p>{project.problem}</p>
                </article>
                <article>
                  <h3>Yang sedang dibuat</h3>
                  <p>{project.solution}</p>
                </article>
                <article>
                  <h3>Untuk siapa</h3>
                  <p>{project.audience}</p>
                </article>
                {isGitHubRepositoryUrl(project.repoUrl) ? (
                  <article className="github-contribution">
                    <h3>Ingin bantu lewat kode?</h3>
                    <p>
                      Lihat panduan kontribusi, issue yang tersedia, atau buka pull request langsung dari
                      repository GitHub project ini.
                    </p>
                    <a href={project.repoUrl} target="_blank" rel="noreferrer">
                      Contribute on GitHub <Arrow diagonal />
                    </a>
                  </article>
                ) : null}
              </section>
            </ProjectTabContent>

            {/* Right under the story, because "what are they doing about it"
                is the next question anybody has — and the answer is what makes
                the project look alive rather than parked. */}
            <ProjectTabContent tab="tentang">
              <section className="now-card" aria-labelledby="now-heading">
              <h2 id="now-heading">Sedang dikerjakan</h2>

              {project.nowText ? (
                <>
                  <p className="now-headline">{project.nowText}</p>
                  {project.nowUpdatedAt ? (
                    <p className="now-when">Ditulis {timeAgo(project.nowUpdatedAt)}</p>
                  ) : null}
                </>
              ) : (
                <p className="muted">
                  Belum ada yang ditulis.
                  {isManager ? " Satu kalimat saja sudah cukup bikin project ini terlihat hidup." : ""}
                </p>
              )}

              {isManager ? (
                <details className="owner-tool">
                  <summary>{project.nowText ? "Perbarui" : "Tulis sekarang sedang apa"}</summary>
                  <form action={setNow}>
                    <input type="hidden" name="slug" value={project.slug} />
                    <label htmlFor="now-text">Sekarang sedang…</label>
                    <input
                      id="now-text"
                      name="now"
                      type="text"
                      maxLength={MAXIMUM.now}
                      defaultValue={project.nowText}
                      placeholder="Menyusun materi keselamatan pertama."
                    />
                    <p className="hint">
                      Satu kalimat, ganti kapan pun arahnya berubah. Ini yang dibaca orang untuk
                      tahu project ini masih jalan.
                    </p>
                    <SubmitButton pendingLabel="Menyimpan…">Simpan</SubmitButton>
                  </form>
                </details>
              ) : null}
              </section>
            </ProjectTabContent>

            {/* Contribution details live together in their own tab. */}
            <ProjectTabContent tab="kolaborasi">
              {(open.length > 0 || isManager) && (
                <section className="help" aria-labelledby="help-heading">
                <h2 id="help-heading">Mau ikut bantu?</h2>

                {open.length > 0 ? (
                  <ul className="seat-list">
                    {open.map((seat) => (
                      <li key={seat.id}>
                        <div>
                          <h3>{roleLabel(seat.role, seat.roleTitle)}</h3>
                          <p>{seat.brief}</p>
                          {seat.commitment ? (
                            <p className="seat-commitment">{seat.commitment}</p>
                          ) : null}
                        </div>
                        {isOwner ? (
                          <p className="muted">Menunggu orang lain.</p>
                        ) : viewer ? (
                          viewerSeat ? (
                            <p className="muted">
                              {viewerSeat.status === "filled"
                                ? `Kamu sudah di tim ini sebagai ${roleLabel(viewerSeat.role, viewerSeat.roleTitle)}.`
                                : "Kamu sudah mengajukan diri di project ini."}
                            </p>
                          ) : !canPropose ? (
                            <p className="muted">
                              Lengkapi profil talent pool untuk mengajukan role ini. {" "}
                              <Link href={profileReturnTo}>Lengkapi profil</Link>
                            </p>
                          ) : (
                            proposalsForSeat(seat.id).some((proposal) => proposal.person.id === viewer.id && proposal.status === "pending") ? (
                              <p className="muted">Proposalmu sedang menunggu jawaban.</p>
                            ) : (
                              <details>
                                <summary>Ajukan diri untuk role ini</summary>
                                <form action={submitProposal}>
                                <input type="hidden" name="slug" value={project.slug} />
                                <input type="hidden" name="seatId" value={seat.id} />
                                <label htmlFor={`pitch-${seat.id}`}>
                                  Ceritakan kenapa kamu cocok dan berapa waktu yang bisa kamu
                                  luangkan.
                                </label>
                                <textarea
                                  id={`pitch-${seat.id}`}
                                  name="pitch"
                                  rows={4}
                                  required
                                  placeholder="Contoh: saya pernah bantu riset serupa, bisa luangkan 3 jam per minggu."
                                />
                                  <SubmitButton pendingLabel="Mengirim…">Kirim proposal</SubmitButton>
                                </form>
                              </details>
                            )
                          )
                        ) : (
                          <Link className="ghost-button" href={signInPath(returnTo)}>
                            Masuk untuk ikut
                          </Link>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted">
                    Belum ada bantuan yang dicari.
                    {isManager ? " Buka satu di bawah kalau ada yang bisa dibagi." : ""}
                  </p>
                )}

                {isManager && proposals.filter((proposal) => proposal.seatId && proposal.status === "pending").length > 0 ? (
                  <div className="pending-list">
                    <h3>Proposal role yang menunggu</h3>
                    {open.flatMap((seat) => proposalsForSeat(seat.id)
                      .filter((proposal) => proposal.status === "pending")
                      .map((proposal) => (
                        <article key={proposal.id} className="pending-card">
                          <p><strong>{proposal.person.name}</strong> mau bantu sebagai {roleLabel(seat.role, seat.roleTitle)}</p>
                          <blockquote>{proposal.pitch}</blockquote>
                          <form action={decideProposal}>
                            <input type="hidden" name="slug" value={project.slug} />
                            <input type="hidden" name="proposalId" value={proposal.id} />
                            <SubmitButton name="decision" value="terima" pendingLabel="Sebentar…">Terima</SubmitButton>
                            <SubmitButton className="quiet" name="decision" value="tolak">Tolak</SubmitButton>
                          </form>
                        </article>
                      )))}
                  </div>
                ) : null}

                {isManager ? (
                  <details className="owner-tool">
                    <summary>Cari bantuan baru</summary>
                    <form action={openSeat}>
                      <input type="hidden" name="slug" value={project.slug} />
                      <RoleFields id="new-seat-role" />
                      <label htmlFor="new-seat-brief">Yang perlu dibantu</label>
                      <textarea id="new-seat-brief" name="brief" rows={3} required />
                      <CommitmentField
                        id="new-seat-commitment"
                        name="commitment"
                      />
                      <SubmitButton pendingLabel="Membuka…">Buka</SubmitButton>
                    </form>
                  </details>
                ) : null}
                </section>
              )}
            </ProjectTabContent>

            <ProjectTabContent tab="perjalanan">
              <section className="journey-section" aria-labelledby="journey-heading">
              <h2 id="journey-heading">Perjalanan project</h2>
              <p className="muted">Ditulis orang yang mengerjakannya, dari yang terbaru.</p>

              <JourneyList
                updates={project.updates}
                startedAt={project.createdAt}
                slug={project.slug}
                onDelete={
                  isManager
                    ? (update) => (
                        <form className="journey-remove" action={deleteUpdate}>
                          <input type="hidden" name="slug" value={project.slug} />
                          <input type="hidden" name="updateId" value={update.id} />
                          <SubmitButton className="quiet">Hapus</SubmitButton>
                        </form>
                      )
                    : undefined
                }
              />

              {isManager ? (
                <details className="owner-tool">
                  <summary>Tulis kabar baru</summary>
                  <form action={postUpdate}>
                    <input type="hidden" name="slug" value={project.slug} />
                    <label htmlFor="update-title">Kabarnya apa</label>
                    <input
                      id="update-title"
                      name="title"
                      type="text"
                      required
                      minLength={UPDATE_LIMITS.title.min}
                      maxLength={UPDATE_LIMITS.title.max}
                      placeholder="Draft materi pertama selesai"
                    />
                    <label htmlFor="update-body">Ceritanya</label>
                    <textarea
                      id="update-body"
                      name="body"
                      rows={4}
                      maxLength={UPDATE_LIMITS.body.max}
                      placeholder="Apa yang berubah, apa yang dipelajari, apa yang berikutnya."
                    />
                    <SubmitButton pendingLabel="Mengirim…">Kirim kabar</SubmitButton>
                  </form>
                </details>
              ) : null}
              </section>
            </ProjectTabContent>

            <ProjectTabContent tab="kolaborasi">
              <section className="team" aria-labelledby="team-heading">
              <h2 id="team-heading">Orang di balik project</h2>

              <ul className="member-list">
                <li>
                  <span className="avatar" aria-hidden="true">
                    {initials(project.owner.name)}
                  </span>
                  <span>
                    <strong>
                      <Link href={`/u/${project.owner.username}`}>{project.owner.name}</Link>
                    </strong>
                    <small>Yang memulai</small>
                  </span>
                </li>
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
                        {roleLabel(seat.role, seat.roleTitle)}
                        {seat.access === "admin" ? <span className="access-badge">admin</span> : null}
                      </small>
                    </span>
                  </li>
                ))}
              </ul>

              {isOwner && team.length > 0 ? (
                <details className="owner-tool">
                  <summary>Atur akses</summary>
                  <p className="hint">
                    Admin bisa mengurus tugas, mencari bantuan, menjawab yang tertarik, dan menulis
                    kabar. Brief, level, dan hapus project tetap cuma kamu.
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
            </ProjectTabContent>

            {/* The task list is for the people already working on it. */}
            <ProjectTabContent tab="tugas">
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
                                  {task.role ? (
                                    <p className="task-role">Terkait role: {roleLabel(task.role.role, task.role.roleTitle)}</p>
                                  ) : null}
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
                                      <label className="sr-only" htmlFor={`task-role-${task.id}`}>
                                        Role terkait {task.title}
                                      </label>
                                      <select id={`task-role-${task.id}`} name="seatId" defaultValue={task.role?.id ?? ""}>
                                        <option value="">Tanpa role terkait</option>
                                        {project.seats.map((seat) => (
                                          <option key={seat.id} value={seat.id}>
                                            {roleLabel(seat.role, seat.roleTitle)}
                                          </option>
                                        ))}
                                      </select>
                                      <SubmitButton className="quiet" formAction={setTaskRole}>Simpan role</SubmitButton>
                                      <SubmitButton className="quiet" formAction={deleteTask}>
                                        Hapus
                                      </SubmitButton>
                                    </form>
                                  ) : null}

                                  {!isManager && !task.assignee && task.status !== "done" ? (
                                    !viewer ? (
                                      <Link className="ghost-button" href={signInPath(returnTo)}>Masuk untuk mengajukan tugas</Link>
                                    ) : !canPropose ? (
                                      <p className="muted">
                                        Lengkapi profil talent pool untuk mengajukan tugas ini. {" "}
                                        <Link href={profileReturnTo}>Lengkapi profil</Link>
                                      </p>
                                    ) : proposalsForTask(task.id).some((proposal) => proposal.person.id === viewer.id && proposal.status === "pending") ? (
                                      <p className="muted">Proposalmu sedang menunggu jawaban.</p>
                                    ) : (
                                      <details className="task-proposal">
                                        <summary>Ajukan diri untuk mengerjakan</summary>
                                        <form action={submitProposal}>
                                          <input type="hidden" name="slug" value={project.slug} />
                                          <input type="hidden" name="taskId" value={task.id} />
                                          <label htmlFor={`task-pitch-${task.id}`}>Kenapa kamu cocok mengerjakan ini?</label>
                                          <textarea id={`task-pitch-${task.id}`} name="pitch" rows={3} required />
                                          <SubmitButton pendingLabel="Mengirim…">Kirim proposal</SubmitButton>
                                        </form>
                                      </details>
                                    )
                                  ) : null}

                                  {isManager && proposalsForTask(task.id).filter((proposal) => proposal.status === "pending").length > 0 ? (
                                    <div className="pending-list task-proposal-list">
                                      <h4>Proposal untuk tugas ini</h4>
                                      {proposalsForTask(task.id).filter((proposal) => proposal.status === "pending").map((proposal) => (
                                        <article key={proposal.id} className="pending-card">
                                          <p><strong>{proposal.person.name}</strong> ingin mengerjakan tugas ini.</p>
                                          <blockquote>{proposal.pitch}</blockquote>
                                          <form action={decideProposal}>
                                            <input type="hidden" name="slug" value={project.slug} />
                                            <input type="hidden" name="proposalId" value={proposal.id} />
                                            <SubmitButton name="decision" value="terima" pendingLabel="Sebentar…">Terima</SubmitButton>
                                            <SubmitButton className="quiet" name="decision" value="tolak">Tolak</SubmitButton>
                                          </form>
                                        </article>
                                      ))}
                                    </div>
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
                      <label htmlFor="task-role">Terkait role (opsional)</label>
                      <select id="task-role" name="seatId" defaultValue="">
                        <option value="">Tidak terhubung ke role</option>
                        {project.seats.map((seat) => (
                          <option key={seat.id} value={seat.id}>
                            {roleLabel(seat.role, seat.roleTitle)}{seat.status === "open" ? " · terbuka" : ""}
                          </option>
                        ))}
                      </select>
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
            </ProjectTabContent>

            <ProjectTabContent tab="diskusi">
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
                  <Link href={signInPath(returnTo)}>Masuk</Link> untuk ikut membahas project ini.
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
            </ProjectTabContent>

            <ProjectTabContent tab="perjalanan">
              {history.length > 0 ? (
                <section className="history" aria-labelledby="history-heading">
                  <h2 id="history-heading">Tercatat sistem</h2>
                  <p className="muted">
                    Ditulis sendiri saat kejadian — bukan diketik. Melengkapi perjalanan di atas.
                  </p>
                  <ActivityList events={history} showActor />
                </section>
              ) : null}
            </ProjectTabContent>
          </div>

          <aside className="project-side">
            <section className="level-card">
              <h2>Sejauh ini</h2>
              <RungRail stage={project.stage} />

              <h3>Syarat tahap ini</h3>
              <ul className="requirement-list">
                {requirementsFor(project.stage, stageInput).map((requirement) => (
                  <li key={requirement.label} className={requirement.met ? "met" : ""}>
                    <span aria-hidden="true">{requirement.met ? "✓" : "○"}</span>
                    {requirement.label}
                  </li>
                ))}
              </ul>

              {isOwner ? (
                <form className="stage-form" action={setStage}>
                  <input type="hidden" name="slug" value={project.slug} />
                  <h3>Pindahkan tahap</h3>
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
                              : "Syaratnya belum terpenuhi untuk tahap ini."
                          }
                        >
                          {stageMeta[stage].label}
                        </SubmitButton>
                      );
                    })}
                  </div>
                </form>
              ) : null}

              {project.followerCount > 0 ? (
                <p className="follower-count">
                  {project.followerCount} orang mengikuti project ini.
                </p>
              ) : null}
            </section>
          </aside>
        </ProjectTabSwitcher>
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
    nowText: project.nowText,
    docUrl: project.docUrl,
    repoUrl: project.repoUrl,
    liveUrl: project.liveUrl,
  };
}
