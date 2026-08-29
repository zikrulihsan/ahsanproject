import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { BoardCard, initials } from "../components/pieces";
import { ExploreSearchForm } from "../components/explore-search-form";
import { SearchableFilter } from "../components/searchable-filter";
import { Arrow, SiteFooter, SiteHeader } from "../components/shell";
import { SortSelect } from "../components/sort-select";
import { LoadingNote, Skeleton } from "../components/skeleton";
import { shareCard } from "../content";
import {
  arrangeForYou,
  familiarRoles,
  isLane,
  listPeople,
  listOpenRoleSuggestions,
  listProjects,
  openSeatsByRole,
  tagCountsFromProjects,
  type FeedQuery,
  type Lane,
  type ProjectSummary,
} from "../lib/data";
import { readPublicly } from "../lib/public-read";
import {
  PROJECT_TYPES,
  isProjectType,
  projectTypeMeta,
  type ProjectType,
} from "../lib/project-types";
import { normaliseRole, roleLabel, type Role } from "../lib/roles";
import { isStage, stageMeta, STAGES, type Stage } from "../lib/stages";
import { viewerId } from "../lib/session";

const title = "Explore — Ahsan Project";
const description = "Explore projects by category, stage, and role, then find the best place to contribute.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/explore" },
  openGraph: shareCard({ title, description, url: "/explore" }),
};

const SORTS: { value: Lane; label: string }[] = [
  { value: "for-you", label: "For you" },
  { value: "newest", label: "Newest projects" },
  { value: "active", label: "Most active" },
];

const SORT_VALUES = new Set<Lane>(SORTS.map((option) => option.value));
const LEGACY_LANE_STAGE: Record<string, Stage> = { dibangun: "building", berjalan: "live" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function one(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

/** What the URL is asking the board for. */
type BoardQuery = {
  sort: Lane;
  stage: Stage | "";
  /** Which kind of project, from PROJECT_TYPES. Empty means every kind. */
  type: ProjectType | "";
  role: Role | "";
  tag: string;
  q: string;
  searchBy: "project" | "role";
  needs: "open" | "";
};

function readBoardQuery(params: Record<string, string | string[] | undefined>): BoardQuery {
  const askedLane = one(params.lane);
  const legacyStage = LEGACY_LANE_STAGE[askedLane];

  return {
    sort: isLane(askedLane) && SORT_VALUES.has(askedLane) ? askedLane : "for-you",
    stage: legacyStage ?? (isStage(one(params.stage)) ? (one(params.stage) as Stage) : ""),
    type: isProjectType(one(params.type)) ? (one(params.type) as ProjectType) : "",
    role: normaliseRole(one(params.role)) ?? "",
    tag: one(params.tag),
    q: one(params.q),
    searchBy: one(params.searchBy) === "role" ? "role" : "project",
    needs: one(params.needs) === "open" || askedLane === "needs-help" ? "open" : "",
  };
}

function pathFor(query: BoardQuery): string {
  return linkTo(query);
}

/**
 * Explore's frame, which is the same question however it is being asked.
 *
 * The heading, the invitation to add a project and the footer read nothing, so
 * they prerender once and arrive with the document. Everything below depends on
 * the filters in the URL and, for the "untukmu" ordering, on who is asking —
 * neither of which exists until somebody asks, so they stream in behind a
 * skeleton rather than holding the page back.
 */
export default function CollaborationPage({ searchParams }: { searchParams?: SearchParams }) {
  const params = searchParams ?? Promise.resolve({});

  return (
    <>
      <SiteHeader returnTo={params.then((value) => pathFor(readBoardQuery(value)))} active="explore" />

      <main id="main-content" className="discovery-page collaboration-page">
        <section className="collaboration-hero" aria-labelledby="collaboration-title">
          <div>
            <h1 id="collaboration-title">Explore & Contribute</h1>
            <p>Browse projects by what they need, find a contribution that fits, or get inspired.</p>
          </div>
          <ContributorPulse />
        </section>

        <Suspense fallback={<BoardSkeleton />}>
          <Board params={params} />
        </Suspense>
      </main>

      <SiteFooter />
    </>
  );
}

/**
 * How many people are here. A cached public read with nothing per-visitor in
 * it, so it is prerendered into the shell alongside the heading.
 */
async function ContributorPulse() {
  const { value: people } = await readPublicly("people in Explore", () => listPeople(400), []);

  return (
    <div className="contributor-pulse" aria-label={`${people.length} contributors`}>
      <div className="pulse-avatars" aria-hidden="true">
        {people.slice(0, 3).map((person) => (
          <span key={person.id}>{initials(person.name)}</span>
        ))}
        <span className="pulse-plus">+</span>
      </div>
      <p>
        <strong>{people.length} contributors</strong>
        <small>ready to build together</small>
      </p>
    </div>
  );
}

function BoardSkeleton() {
  return (
    <>
      <LoadingNote />
      <section className="collaboration-panel">
        <Skeleton height={55} />
        <Skeleton height={44} style={{ marginTop: 10 }} />
      </section>
      <div className="discovery-content collaboration-content">
        <section>
          <div className="home-list-head">
            <Skeleton height={24} width={220} />
          </div>
          {[0, 1, 2, 3].map((slot) => (
            <Skeleton key={slot} height={190} style={{ marginTop: 12 }} />
          ))}
        </section>
        <aside className="discovery-sidebar">
          <Skeleton height={260} />
          <Skeleton height={360} />
        </aside>
      </div>
    </>
  );
}

async function Board({ params: paramsPromise }: { params: SearchParams }) {
  const { sort, stage, type, role, tag, q, searchBy, needs } = readBoardQuery(await paramsPromise);

  const query: FeedQuery = {
    lane: sort,
    stage,
    projectType: type,
    tag,
    role,
    q: searchBy === "project" ? q : "",
    roleQuery: searchBy === "role" ? q : "",
    needsHelp: needs === "open",
  };

  // Who is asking does not change which projects come back — only the order of
  // the "untukmu" lane. So this is started rather than awaited: the board reads
  // below go out at the same time, and the two settle together. Awaiting it
  // here instead put the whole board behind an auth round trip and then a
  // second query, for a sort that could just as well happen at the end.
  const familiarPromise = sort === "for-you"
    ? readPublicly<string[]>(
        "familiar roles for recommendations",
        async () => {
          const id = await viewerId();
          return id ? familiarRoles(id) : [];
        },
        [],
      )
    : Promise.resolve({ value: [] as string[], unavailable: false });

  const projectsPromise = readPublicly<ProjectSummary[]>(
    "project Explore",
    () => listProjects(query),
    [],
  );
  const topicProjectsPromise = tag
    ? readPublicly<ProjectSummary[]>(
        "Explore categories",
        () => listProjects({ ...query, tag: "" }),
        [],
      )
    : projectsPromise;
  const [
    projectsResult,
    topicProjectsResult,
    helpBoardResult,
    roleSuggestionsResult,
    familiarResult,
  ] = await Promise.all([
    projectsPromise,
    topicProjectsPromise,
    readPublicly<ProjectSummary[]>(
      "projects needing help",
      () => listProjects({ lane: "needs-help" }),
      [],
    ),
    readPublicly("open role suggestions", () => listOpenRoleSuggestions(), []),
    familiarPromise,
  ]);

  // The one place the visitor changes what they see: rows everybody shares,
  // put in an order that leans on the roles this person has held before.
  const projects = sort === "for-you"
    ? arrangeForYou(projectsResult.value, familiarResult.value)
    : projectsResult.value;
  const topics = tagCountsFromProjects(topicProjectsResult.value);
  const helpBoard = helpBoardResult.value;
  const roleSuggestions = roleSuggestionsResult.value;
  const seatsResult = await readPublicly<Map<number, Record<string, number>>>(
    "open role count",
    () => openSeatsByRole(projects.map((project) => project.id)),
    new Map(),
  );
  const seatsByRole = seatsResult.value;
  const dataUnavailable = [
    familiarResult,
    projectsResult,
    topicProjectsResult,
    helpBoardResult,
    roleSuggestionsResult,
    seatsResult,
  ].some((result) => result.unavailable);
  const rankedRoles = rankRoles(helpBoard).slice(0, 5);
  const filtered = Boolean(stage || type || tag || role || q || needs);
  const activeControlCount = [stage, type, tag, role, needs, sort === "for-you" ? "" : sort].filter(Boolean).length;
  const currentPath = linkTo({ lane: sort, stage, type, tag, role, q, searchBy, needs });

  return (
    <>
        {dataUnavailable ? (
          <p className="public-data-notice" role="status">
            Some data could not load. <Link href={currentPath}>Try again</Link>.
          </p>
        ) : null}

        <section className="collaboration-panel" aria-label="Search projects or roles, then filter and sort the results">
          <ExploreSearchForm
            mode={searchBy}
            q={q}
            suggestions={roleSuggestions}
            hidden={{
              stage,
              type,
              tag,
              role,
              needs,
              lane: sort === "for-you" ? "" : sort,
            }}
          />

          <details className="collaboration-filter-panel">
            <summary className="collaboration-filter-summary">
              <span><FilterIcon /> Filter &amp; sort</span>
              <span>
                {activeControlCount > 0 ? `${activeControlCount} active` : "Optional"}
                <i aria-hidden="true" />
              </span>
            </summary>

            <div className="collaboration-filter-controls">
              <div className="collaboration-control collaboration-sort-control">
                <span>Sort</span>
                <SortSelect
                  action="/explore"
                  name="lane"
                  value={sort}
                  label="Sort projects"
                  options={SORTS}
                  hidden={{ stage, type, tag, role, q, searchBy: searchBy === "role" ? searchBy : "", needs }}
                />
              </div>

              <div className="collaboration-control">
                <span>Category</span>
                <SearchableFilter
                  action="/explore"
                  name="tag"
                  value={tag}
                  label="Filter categories"
                  placeholder="Enter a category…"
                  options={withSelectedTopic(topics, tag).map((topic) => ({
                    value: topic.tag,
                    label: topic.tag,
                    meta: `${topic.count} projects`,
                  }))}
                  hidden={{ stage, type, role, q, searchBy: searchBy === "role" ? searchBy : "", needs, lane: sort === "for-you" ? "" : sort }}
                />
              </div>

              <div className="collaboration-control">
                <span>Project stage</span>
                <SortSelect
                  action="/explore"
                  name="stage"
                  value={stage}
                  label="Filter project stages"
                  options={[
                    { value: "", label: "All stages" },
                    ...STAGES.map((entry) => ({ value: entry, label: stageMeta[entry].label })),
                  ]}
                  hidden={{ type, tag, role, q, searchBy: searchBy === "role" ? searchBy : "", needs, lane: sort === "for-you" ? "" : sort }}
                />
              </div>

              <div className="collaboration-control">
                <span>Project kind</span>
                <SortSelect
                  action="/explore"
                  name="type"
                  value={type}
                  label="Filter project kind"
                  options={[
                    { value: "", label: "All kinds" },
                    ...PROJECT_TYPES.map((entry) => ({
                      value: entry,
                      label: projectTypeMeta[entry].label,
                    })),
                  ]}
                  hidden={{ stage, tag, role, q, searchBy: searchBy === "role" ? searchBy : "", needs, lane: sort === "for-you" ? "" : sort }}
                />
              </div>

              <div className="collaboration-control">
                <span>Needs</span>
                <SortSelect
                  action="/explore"
                  name="needs"
                  value={needs}
                  label="Filter collaboration needs"
                  options={[
                    { value: "", label: "All projects" },
                    { value: "open", label: "Looking for collaborators" },
                  ]}
                  hidden={{ stage, type, tag, role, q, searchBy: searchBy === "role" ? searchBy : "", lane: sort === "for-you" ? "" : sort }}
                />
              </div>
            </div>
          </details>
        </section>

        {filtered ? (
          <div className="active-filters home-active-filters" aria-label="Active filters">
            <ul>
              {role ? (
                <li>
                  <Link href={linkTo({ lane: sort, stage, type, tag, q, searchBy, needs })}>
                    Role: <strong>{roleLabel(role)}</strong> <span>×</span>
                  </Link>
                </li>
              ) : null}
              {tag ? <li><Link href={linkTo({ lane: sort, stage, type, role, q, searchBy, needs })}>Category: <strong>{tag}</strong> <span>×</span></Link></li> : null}
              {stage ? <li><Link href={linkTo({ lane: sort, type, tag, role, q, searchBy, needs })}>Stage: <strong>{stageMeta[stage].label}</strong> <span>×</span></Link></li> : null}
              {type ? <li><Link href={linkTo({ lane: sort, stage, tag, role, q, searchBy, needs })}>Kind: <strong>{projectTypeMeta[type].label}</strong> <span>×</span></Link></li> : null}
              {needs ? <li><Link href={linkTo({ lane: sort, stage, type, tag, role, q, searchBy })}>Needs: <strong>Looking for collaborators</strong> <span>×</span></Link></li> : null}
              {q ? <li><Link href={linkTo({ lane: sort, stage, type, tag, role, searchBy, needs })}>{searchBy === "role" ? "Role search" : "Search"}: <strong>“{q}”</strong> <span>×</span></Link></li> : null}
            </ul>
            <Link className="clear-filters" href={linkTo({ lane: sort })}>Clear all</Link>
          </div>
        ) : null}

        <div className="discovery-content collaboration-content">
          <section className="home-projects" aria-labelledby="collaboration-project-list-title">
            <div className="home-list-head collaboration-list-head">
              <div>
                <h2 id="collaboration-project-list-title">Projects for collaboration</h2>
                <p>{projects.length} projects found</p>
              </div>
            </div>

            <div className="feed" aria-label="Project list">
              {projects.length === 0 ? (
                <div className="empty home-empty">
                  <p>No projects match this search yet.</p>
                  <Link href="/explore">View all projects</Link>
                </div>
              ) : (
                <ul className="board-grid">
                  {projects.map((project) => (
                    <BoardCard
                      key={project.id}
                      project={project}
                      roleCounts={seatsByRole.get(project.id)}
                    />
                  ))}
                </ul>
              )}
            </div>
          </section>

          <aside className="discovery-sidebar" aria-label="Collaboration shortcuts">
            <section className="show-project-card">
              <span className="show-project-plus" aria-hidden="true">+</span>
              <h2>Building something?</h2>
              <p>Show your project and find people who can help move it forward.</p>
              <Link href="/new">Add a project</Link>
              <small>Free for the community</small>
            </section>

            <section className="role-ranking">
              <div className="role-ranking-head">
                <div>
                  <p className="home-eyebrow">Start with your role</p>
                  <h2>Most requested roles</h2>
                  <p>Choose a role, then see projects waiting for your contribution.</p>
                </div>
                <span className="live-dot" title="Updated from open roles" />
              </div>
              {rankedRoles.length > 0 ? (
                <ol>
                  {rankedRoles.map((entry, index) => (
                    <li key={entry.role}>
                      <Link href={linkTo({ lane: sort, stage, type, tag, q: roleLabel(entry.role), searchBy: "role", needs: "open" })}>
                        <span className="role-number">{String(index + 1).padStart(2, "0")}</span>
                        <span>
                          <strong>{roleLabel(entry.role)}</strong>
                          <small>{entry.count} projects</small>
                        </span>
                        <Arrow />
                      </Link>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="role-ranking-empty">No roles are open yet.</p>
              )}
              <Link className="all-roles-link" href="/explore?searchBy=role&needs=open">
                View all roles <Arrow />
              </Link>
            </section>
          </aside>
        </div>
    </>
  );
}

function rankRoles(projects: ProjectSummary[]): { role: Role; count: number }[] {
  const counts = new Map<Role, number>();
  for (const project of projects) {
    const roles = new Set(project.openRoles.map(normaliseRole).filter((entry): entry is Role => Boolean(entry)));
    for (const role of roles) counts.set(role, (counts.get(role) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([role, count]) => ({ role, count }))
    .sort((a, b) => b.count - a.count || roleLabel(a.role).localeCompare(roleLabel(b.role), "id"));
}

function withSelectedTopic(topics: { tag: string; count: number }[], selected: string) {
  return selected && !topics.some((topic) => topic.tag === selected)
    ? [{ tag: selected, count: 0 }, ...topics]
    : topics;
}

function FilterIcon() {
  return (
    <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 7h16M7 12h10M10 17h4" />
    </svg>
  );
}

function linkTo(query: {
  lane?: string;
  stage?: string;
  type?: string;
  tag?: string;
  role?: string;
  q?: string;
  searchBy?: string;
  needs?: string;
}): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    const isDefault = (key === "lane" && value === "for-you") ||
      (key === "searchBy" && value === "project");
    if (value && !isDefault) params.set(key, value);
  }
  const search = params.toString();
  return search ? `/explore?${search}` : "/explore";
}
