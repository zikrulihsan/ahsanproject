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
  GitHubContributeBadge,
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
  listProjects,
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

/**
 * Prime the public project pages people are most likely to open from Explore.
 *
 * Cache Components upgrades every other slug after its first prefetch or
 * visit, so this deliberately stays a bounded set: a catalogue growing into
 * thousands of projects must not turn every deployment into thousands of
 * five-query detail renders.
 */
export async function generateStaticParams(): Promise<{ slug: string }[]> {
  try {
    const projects = await listProjects({ lane: "active" });
    return projects.slice(0, 32).map((project) => ({ slug: project.slug }));
  } catch (error) {
    // A temporary database outage should not make a deploy fail. Unknown
    // slugs still receive the segment loading state and upgrade on first use.
    console.warn("[ahsan] Project detail was not prerendered:", error);
    return [];
  }
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProject(slug);
  if (!project) return { title: "Project not found — Ahsan Project" };

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
  const activeTab: ProjectTab = requestedTab && isProjectTab(requestedTab) ? requestedTab : "about";
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
    activeTab === "about"
      ? `/projects/${project.slug}`
      : `/projects/${project.slug}?tab=${activeTab}`;

  const stageInput = toStageInput(project);

  const team = project.seats.filter((seat) => seat.status === "filled");
  const open = project.seats.filter((seat) => seat.status === "open");
  const viewerSeat = viewer ? project.seats.find((seat) => seat.person?.id === viewer.id) : undefined;
  const canPropose = Boolean(viewer && profileReady(viewer));
  const profileReturnTo = `/account/profile?returnTo=${encodeURIComponent(returnTo)}`;
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
            <Link href="/">Explore</Link> <span aria-hidden="true">/</span> {project.title}
          </p>
          {isOwner ? <Link className="edit-link" href={`/projects/${project.slug}/edit`}>Edit project</Link> : null}
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
              <div className="project-head-badges">
                <StageBadge stage={project.stage} />
                {project.openForGitHubContributions ? (
                  <GitHubContributeBadge repoUrl={project.repoUrl} />
                ) : null}
              </div>
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
                    {team.length > 0 ? ` + ${team.length} people` : ""}
                  </strong>
                  <small>{freshness(project)}</small>
                </span>
              </Link>

              <div className="hero-actions">
                {viewer ? (
                  <form action={toggleFollow}>
                    <input type="hidden" name="slug" value={project.slug} />
                    <SubmitButton className={`follow ${following ? "is-on" : ""}`}>
                      {following ? "Following" : "Follow project"}
                    </SubmitButton>
                  </form>
                ) : (
                  <Link className="follow" href={signInPath(returnTo)}>
                    Follow project
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
                      <span className="sr-only">support</span>
                    </SubmitButton>
                  </form>
                ) : (
                  <Link className="boost" href={signInPath(returnTo)}>
                    <span aria-hidden="true">♡</span>
                    <strong>{project.boostCount}</strong>
                    <span className="sr-only">support</span>
                  </Link>
                )}
              </div>
            </div>

            {(project.liveUrl || project.docUrl || project.repoUrl) && (
              <ul className="project-links">
                {project.liveUrl ? (
                  <li>
                    <a href={project.liveUrl} target="_blank" rel="noreferrer">
                      {domainOf(project.liveUrl) || "Open product"} <Arrow diagonal />
                    </a>
                  </li>
                ) : null}
                {project.docUrl ? (
                  <li>
                    <a href={project.docUrl} target="_blank" rel="noreferrer">
                      Document <Arrow diagonal />
                    </a>
                  </li>
                ) : null}
                {project.repoUrl ? (
                  <li>
                    <a href={project.repoUrl} target="_blank" rel="noreferrer">
                      {isGitHubRepositoryUrl(project.repoUrl) ? "View GitHub repository" : "Repository"} <Arrow diagonal />
                    </a>
                  </li>
                ) : null}
              </ul>
            )}
          </div>
        </section>

        <ProjectTabSwitcher initialTab={activeTab}>
          <div className="project-main">
            <ProjectTabContent tab="about">
              <section className="brief" aria-labelledby="brief-heading">
                <h2 id="brief-heading">About this project</h2>
                <article>
                  <h3>Problem to solve</h3>
                  <p>{project.problem}</p>
                </article>
                <article>
                  <h3>What is being built</h3>
                  <p>{project.solution}</p>
                </article>
                <article>
                  <h3>Who it is for</h3>
                  <p>{project.audience}</p>
                </article>
                {isGitHubRepositoryUrl(project.repoUrl) ? (
                  <article className="github-contribution">
                    <h3>Want to help with code?</h3>
                    <p>
                      View the contribution guide, open issues, or open a pull request directly from
                      this project’s GitHub repository.
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
            <ProjectTabContent tab="about">
              <section className="now-card" aria-labelledby="now-heading">
              <h2 id="now-heading">Work in progress</h2>

              {project.nowText ? (
                <>
                  <p className="now-headline">{project.nowText}</p>
                  {project.nowUpdatedAt ? (
                    <p className="now-when">Written {timeAgo(project.nowUpdatedAt)}</p>
                  ) : null}
                </>
              ) : (
                <p className="muted">
                  Nothing has been written yet.
                  {isManager ? " One sentence is enough to make this project feel active." : ""}
                </p>
              )}

              {isManager ? (
                <details className="owner-tool">
                  <summary>{project.nowText ? "Update" : "Write what you are working on"}</summary>
                  <form action={setNow}>
                    <input type="hidden" name="slug" value={project.slug} />
                    <label htmlFor="now-text">Working on now…</label>
                    <input
                      id="now-text"
                      name="now"
                      type="text"
                      maxLength={MAXIMUM.now}
                      defaultValue={project.nowText}
                      placeholder="Drafting the first safety materials."
                    />
                    <p className="hint">
                      One sentence—update it whenever the direction changes. This is how people know
                      the project is still moving.
                    </p>
                    <SubmitButton pendingLabel="Saving…">Save</SubmitButton>
                  </form>
                </details>
              ) : null}
              </section>
            </ProjectTabContent>

            {/* Contribution details live together in their own tab. */}
            <ProjectTabContent tab="collaboration">
              {(open.length > 0 || isManager) && (
                <section className="help" aria-labelledby="help-heading">
                <h2 id="help-heading">Want to help?</h2>

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
                          <p className="muted">Waiting for someone to join.</p>
                        ) : viewer ? (
                          viewerSeat ? (
                            <p className="muted">
                              {viewerSeat.status === "filled"
                                ? `You are already on this team as ${roleLabel(viewerSeat.role, viewerSeat.roleTitle)}.`
                                : "You have already applied to this project."}
                            </p>
                          ) : !canPropose ? (
                            <p className="muted">
                              Complete your talent-pool profile to apply for this role. {" "}
                              <Link href={profileReturnTo}>Complete your profile</Link>
                            </p>
                          ) : (
                            proposalsForSeat(seat.id).some((proposal) => proposal.person.id === viewer.id && proposal.status === "pending") ? (
                              <p className="muted">Your proposal is awaiting a response.</p>
                            ) : (
                              <details>
                                <summary>Apply for this role</summary>
                                <form action={submitProposal}>
                                <input type="hidden" name="slug" value={project.slug} />
                                <input type="hidden" name="seatId" value={seat.id} />
                                <label htmlFor={`pitch-${seat.id}`}>
                                  Tell us why you are a good fit and how much time you can
                                  contribute.
                                </label>
                                <textarea
                                  id={`pitch-${seat.id}`}
                                  name="pitch"
                                  rows={4}
                                  required
                                  placeholder="For example: I have helped with similar research and can contribute three hours per week."
                                />
                                  <SubmitButton pendingLabel="Sending…">Send proposal</SubmitButton>
                                </form>
                              </details>
                            )
                          )
                        ) : (
                          <Link className="ghost-button" href={signInPath(returnTo)}>
                            Sign in to join
                          </Link>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted">
                    No help is being requested yet.
                    {isManager ? " Open a role below if there is work to share." : ""}
                  </p>
                )}

                {isManager && proposals.filter((proposal) => proposal.seatId && proposal.status === "pending").length > 0 ? (
                  <div className="pending-list">
                    <h3>Pending role proposals</h3>
                    {open.flatMap((seat) => proposalsForSeat(seat.id)
                      .filter((proposal) => proposal.status === "pending")
                      .map((proposal) => (
                        <article key={proposal.id} className="pending-card">
                          <p><strong>{proposal.person.name}</strong> wants to help as {roleLabel(seat.role, seat.roleTitle)}</p>
                          <blockquote>{proposal.pitch}</blockquote>
                          <form action={decideProposal}>
                            <input type="hidden" name="slug" value={project.slug} />
                            <input type="hidden" name="proposalId" value={proposal.id} />
                            <SubmitButton name="decision" value="terima" pendingLabel="Please wait…">Accept</SubmitButton>
                            <SubmitButton className="quiet" name="decision" value="tolak">Decline</SubmitButton>
                          </form>
                        </article>
                      )))}
                  </div>
                ) : null}

                {isManager ? (
                  <details className="owner-tool">
                    <summary>Find new help</summary>
                    <form action={openSeat}>
                      <input type="hidden" name="slug" value={project.slug} />
                      <RoleFields id="new-seat-role" />
                      <label htmlFor="new-seat-brief">What needs help</label>
                      <textarea id="new-seat-brief" name="brief" rows={3} required />
                      <CommitmentField
                        id="new-seat-commitment"
                        name="commitment"
                      />
                      <SubmitButton pendingLabel="Opening…">Open role</SubmitButton>
                    </form>
                  </details>
                ) : null}
                </section>
              )}
            </ProjectTabContent>

            <ProjectTabContent tab="journey">
              <section className="journey-section" aria-labelledby="journey-heading">
              <h2 id="journey-heading">Project journey</h2>
              <p className="muted">Written by the people working on it, newest first.</p>

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
                          <SubmitButton className="quiet">Delete</SubmitButton>
                        </form>
                      )
                    : undefined
                }
              />

              {isManager ? (
                <details className="owner-tool">
                  <summary>Write an update</summary>
                  <form action={postUpdate}>
                    <input type="hidden" name="slug" value={project.slug} />
                    <label htmlFor="update-title">What is the update?</label>
                    <input
                      id="update-title"
                      name="title"
                      type="text"
                      required
                      minLength={UPDATE_LIMITS.title.min}
                      maxLength={UPDATE_LIMITS.title.max}
                      placeholder="First materials draft completed"
                    />
                    <label htmlFor="update-body">Details</label>
                    <textarea
                      id="update-body"
                      name="body"
                      rows={4}
                      maxLength={UPDATE_LIMITS.body.max}
                      placeholder="What changed, what did you learn, and what comes next?"
                    />
                    <SubmitButton pendingLabel="Sending…">Post update</SubmitButton>
                  </form>
                </details>
              ) : null}
              </section>
            </ProjectTabContent>

            <ProjectTabContent tab="collaboration">
              <section className="team" aria-labelledby="team-heading">
              <h2 id="team-heading">People behind the project</h2>

              <ul className="member-list">
                <li>
                  <span className="avatar" aria-hidden="true">
                    {initials(project.owner.name)}
                  </span>
                  <span>
                    <strong>
                      <Link href={`/u/${project.owner.username}`}>{project.owner.name}</Link>
                    </strong>
                    <small>Started it</small>
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
                          "Unnamed"
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
                  <summary>Manage access</summary>
                  <p className="hint">
                    Admins can manage tasks, seek help, respond to applicants, and write updates.
                    The brief, stage, and project deletion remain yours alone.
                  </p>
                  {team.map((seat) => (
                    <form className="access-form" action={setSeatAccess} key={seat.id}>
                      <input type="hidden" name="slug" value={project.slug} />
                      <input type="hidden" name="seatId" value={seat.id} />
                      <span>{seat.person?.name ?? "Unnamed"}</span>
                      <SubmitButton
                        name="access"
                        value={seat.access === "admin" ? "member" : "admin"}
                        className={seat.access === "admin" ? "quiet" : ""}
                      >
                        {seat.access === "admin" ? "Make member" : "Make admin"}
                      </SubmitButton>
                    </form>
                  ))}
                </details>
              ) : null}
              </section>
            </ProjectTabContent>

            {/* The task list is for the people already working on it. */}
            <ProjectTabContent tab="tasks">
              <section className="tasks" aria-labelledby="tasks-heading">
                <h2 id="tasks-heading">
                  Tasks
                  {project.tasks.length > 0 ? ` (${doneTasks} of ${project.tasks.length} complete)` : ""}
                </h2>

                {project.tasks.length === 0 ? (
                  <p className="muted">
                    There are no tasks here yet.
                    {isManager ? " Add one so people know what is in progress." : ""}
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
                                    <p className="task-role">Related role: {roleLabel(task.role.role, task.role.roleTitle)}</p>
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
                                      <span className="muted">Nobody has taken it yet</span>
                                    )}
                                  </p>

                                  {isManager ? (
                                    <form className="task-manage" action={assignTask}>
                                      <input type="hidden" name="slug" value={project.slug} />
                                      <input type="hidden" name="taskId" value={task.id} />
                                      <label className="sr-only" htmlFor={`assignee-${task.id}`}>
                                        Who is assigned to {task.title}
                                      </label>
                                      <select
                                        id={`assignee-${task.id}`}
                                        name="assigneeId"
                                        defaultValue={task.assignee?.id ?? ""}
                                      >
                                        <option value="">Nobody has taken it yet</option>
                                        {assignable.map((person) => (
                                          <option key={person.id} value={person.id}>
                                            {person.name}
                                          </option>
                                        ))}
                                      </select>
                                      <SubmitButton pendingLabel="Please wait…">Save</SubmitButton>
                                      <label className="sr-only" htmlFor={`task-role-${task.id}`}>
                                        Related role for {task.title}
                                      </label>
                                      <select id={`task-role-${task.id}`} name="seatId" defaultValue={task.role?.id ?? ""}>
                                        <option value="">No related role</option>
                                        {project.seats.map((seat) => (
                                          <option key={seat.id} value={seat.id}>
                                            {roleLabel(seat.role, seat.roleTitle)}
                                          </option>
                                        ))}
                                      </select>
                                      <SubmitButton className="quiet" formAction={setTaskRole}>Save role</SubmitButton>
                                      <SubmitButton className="quiet" formAction={deleteTask}>
                                        Delete
                                      </SubmitButton>
                                    </form>
                                  ) : null}

                                  {!isManager && !task.assignee && task.status !== "done" ? (
                                    !viewer ? (
                                      <Link className="ghost-button" href={signInPath(returnTo)}>Sign in to apply for this task</Link>
                                    ) : !canPropose ? (
                                      <p className="muted">
                                        Complete your talent-pool profile to apply for this task. {" "}
                                        <Link href={profileReturnTo}>Complete your profile</Link>
                                      </p>
                                    ) : proposalsForTask(task.id).some((proposal) => proposal.person.id === viewer.id && proposal.status === "pending") ? (
                                      <p className="muted">Your proposal is awaiting a response.</p>
                                    ) : (
                                      <details className="task-proposal">
                                        <summary>Apply to work on this</summary>
                                        <form action={submitProposal}>
                                          <input type="hidden" name="slug" value={project.slug} />
                                          <input type="hidden" name="taskId" value={task.id} />
                                          <label htmlFor={`task-pitch-${task.id}`}>Why are you a good fit for this?</label>
                                          <textarea id={`task-pitch-${task.id}`} name="pitch" rows={3} required />
                                          <SubmitButton pendingLabel="Sending…">Send proposal</SubmitButton>
                                        </form>
                                      </details>
                                    )
                                  ) : null}

                                  {isManager && proposalsForTask(task.id).filter((proposal) => proposal.status === "pending").length > 0 ? (
                                    <div className="pending-list task-proposal-list">
                                      <h4>Proposals for this task</h4>
                                      {proposalsForTask(task.id).filter((proposal) => proposal.status === "pending").map((proposal) => (
                                        <article key={proposal.id} className="pending-card">
                                          <p><strong>{proposal.person.name}</strong> wants to work on this task.</p>
                                          <blockquote>{proposal.pitch}</blockquote>
                                          <form action={decideProposal}>
                                            <input type="hidden" name="slug" value={project.slug} />
                                            <input type="hidden" name="proposalId" value={proposal.id} />
                                            <SubmitButton name="decision" value="terima" pendingLabel="Please wait…">Accept</SubmitButton>
                                            <SubmitButton className="quiet" name="decision" value="tolak">Decline</SubmitButton>
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
                    <summary>Add task</summary>
                    <form action={createTask}>
                      <input type="hidden" name="slug" value={project.slug} />
                      <label htmlFor="task-title">Task title</label>
                      <input id="task-title" name="title" type="text" required maxLength={120} />
                      <label htmlFor="task-detail">Short description</label>
                      <textarea id="task-detail" name="detail" rows={2} maxLength={400} />
                      <label htmlFor="task-role">Related role (optional)</label>
                      <select id="task-role" name="seatId" defaultValue="">
                        <option value="">Not linked to a role</option>
                        {project.seats.map((seat) => (
                          <option key={seat.id} value={seat.id}>
                            {roleLabel(seat.role, seat.roleTitle)}{seat.status === "open" ? " · open" : ""}
                          </option>
                        ))}
                      </select>
                      <label htmlFor="task-assignee">Assignee</label>
                      <select id="task-assignee" name="assigneeId" defaultValue="">
                        <option value="">Nobody has taken it yet</option>
                        {assignable.map((person) => (
                          <option key={person.id} value={person.id}>
                            {person.name}
                          </option>
                        ))}
                      </select>
                      <SubmitButton pendingLabel="Adding…">Add task</SubmitButton>
                    </form>
                  </details>
                ) : null}
              </section>
            </ProjectTabContent>

            <ProjectTabContent tab="discussion">
              <section className="discussion" aria-labelledby="discussion-heading">
              <h2 id="discussion-heading">Discussion ({project.comments.length})</h2>

              {viewer ? (
                <form className="comment-form" action={addComment}>
                  <input type="hidden" name="slug" value={project.slug} />
                  <label htmlFor="comment-body">Comment or question</label>
                  <textarea
                    id="comment-body"
                    name="body"
                    rows={4}
                    required
                    placeholder="Which part feels most risky? Is there a simpler way?"
                  />
                  <SubmitButton pendingLabel="Sending…">Send</SubmitButton>
                </form>
              ) : (
                <p className="muted">
                  <Link href={signInPath(returnTo)}>Sign in</Link> to join this project’s discussion.
                </p>
              )}

              {project.comments.length === 0 ? (
                <p className="muted">No comments yet. Feel free to start the conversation.</p>
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

            <ProjectTabContent tab="journey">
              {history.length > 0 ? (
                <section className="history" aria-labelledby="history-heading">
                  <h2 id="history-heading">System record</h2>
                  <p className="muted">
                    Recorded by the system when it happened—not typed in later. It complements the journey above.
                  </p>
                  <ActivityList events={history} showActor />
                </section>
              ) : null}
            </ProjectTabContent>
          </div>

          <aside className="project-side">
            <section className="level-card">
              <h2>So far</h2>
              <RungRail stage={project.stage} />

              <h3>Requirements for this stage</h3>
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
                  <h3>Change stage</h3>
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
                              : "The requirements for this stage are not met yet."
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
                  {project.followerCount} people follow this project.
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
