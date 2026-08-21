import { getSupabase } from "./supabase";
import type {
  CommentRow,
  EventRow,
  ProfileRow,
  ProjectOverviewRow,
  SeatRow,
  TaskRow,
} from "./database.types";
import { seedEvents, seedProjects, seedUsers } from "./seed";
import type { Stage } from "./stages";

export type Person = {
  id: string;
  username: string;
  name: string;
  headline: string;
  bio: string;
  website: string;
  github: string;
  /** Trail kinds kept off this person's public profile. */
  activityHidden: string[];
};

export type ActivityEvent = {
  id: number;
  kind: string;
  createdAt: string;
  /** Null once the project it happened on has been deleted. */
  projectId: number | null;
  projectSlug: string;
  projectTitle: string;
  payload: Record<string, string>;
  actor: Pick<Person, "id" | "username" | "name"> | null;
};

export type ProjectSummary = {
  id: number;
  slug: string;
  title: string;
  tagline: string;
  stage: Stage;
  problem: string;
  solution: string;
  audience: string;
  tags: string[];
  glyph: string;
  docUrl: string;
  liveUrl: string;
  repoUrl: string;
  createdAt: string;
  owner: Pick<Person, "id" | "username" | "name">;
  seatCount: number;
  openSeatCount: number;
  activeMemberCount: number;
  boostCount: number;
  commentCount: number;
  openTaskCount: number;
  doneTaskCount: number;
};

export type SeatView = {
  id: number;
  role: string;
  brief: string;
  status: string;
  /** member | admin — see app/lib/access.ts. */
  access: string;
  pitch: string;
  person: Pick<Person, "id" | "username" | "name"> | null;
};

export type TaskView = {
  id: number;
  title: string;
  detail: string;
  status: string;
  createdAt: string;
  assignee: Pick<Person, "id" | "username" | "name"> | null;
};

export type CommentView = {
  id: number;
  body: string;
  createdAt: string;
  author: Pick<Person, "id" | "username" | "name">;
};

export type ProjectDetail = ProjectSummary & {
  seats: SeatView[];
  tasks: TaskView[];
  comments: CommentView[];
};

/** A seat somebody has applied for, shown from either side of the decision. */
export type ApplicationView = {
  seatId: number;
  role: string;
  brief: string;
  status: string;
  pitch: string;
  createdAt: string;
  project: { slug: string; title: string };
  person: Pick<Person, "id" | "username" | "name"> | null;
};

export type FeedQuery = {
  stage?: string;
  tag?: string;
  q?: string;
  sort?: "terbaru" | "didukung" | "dibutuhkan";
};

const SORT_COLUMN: Record<NonNullable<FeedQuery["sort"]>, string> = {
  terbaru: "created_at",
  didukung: "boost_count",
  dibutuhkan: "open_seat_count",
};

/* ------------------------------------------------------------------ *
 * Reads
 * ------------------------------------------------------------------ */

/**
 * Whether a query failed only because its table is not there yet.
 *
 * Migrations are applied by hand in the Supabase SQL editor, so a deploy can
 * legitimately run ahead of the database for a while. When that happens a page
 * should lose the feature the missing table feeds, not fall over — a profile is
 * still a profile without its trail. Everything else still throws.
 *
 * PostgREST reports it as 42P01 from Postgres, or PGRST205 when its schema
 * cache has never heard of the table at all.
 */
function isMissingTable(error: { code?: string } | null): boolean {
  return error?.code === "42P01" || error?.code === "PGRST205";
}

/** Says it once per server start, so the gap is visible in the deploy logs. */
const warned = new Set<string>();

function warnMissingTable(table: string): void {
  if (warned.has(table)) return;
  warned.add(table);
  console.warn(
    `[ahsan] Tabel "${table}" belum ada di Supabase. Jalankan berkas di supabase/migrations/ ` +
      `sesuai urutannya. Sementara ini bagiannya dilewati.`,
  );
}

export async function listProjects(query: FeedQuery = {}): Promise<ProjectSummary[]> {
  const supabase = await getSupabase();
  if (!supabase) return seedFeed(query);

  const sort = query.sort ?? "terbaru";
  let request = supabase.from("project_overview").select("*");

  if (query.stage) request = request.eq("stage", query.stage);
  if (query.tag) request = request.contains("tags", [query.tag]);
  if (query.q) {
    const term = `%${escapeLike(query.q)}%`;
    request = request.or(`title.ilike.${term},tagline.ilike.${term},problem.ilike.${term}`);
  }

  const { data, error } = await request
    .order(SORT_COLUMN[sort], { ascending: false })
    .order("id", { ascending: false })
    .limit(120);
  if (error) throw new Error(error.message);

  return (data ?? []).map(toSummary);
}

export async function getProject(slug: string): Promise<ProjectDetail | null> {
  const supabase = await getSupabase();
  if (!supabase) return seedDetail(slug);

  const { data: project, error } = await supabase
    .from("project_overview")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!project) return null;

  const [seats, comments, tasks] = await Promise.all([
    supabase
      .from("seats")
      .select("*, person:profiles(id, username, name)")
      .eq("project_id", project.id)
      .order("id"),
    supabase
      .from("comments")
      .select("*, author:profiles(id, username, name)")
      .eq("project_id", project.id)
      .order("id"),
    supabase
      // `tasks` points at `profiles` twice, so the embed has to name the
      // constraint. Without it PostgREST cannot tell assignee from creator.
      .from("tasks")
      .select("*, assignee:profiles!tasks_assignee_id_fkey(id, username, name)")
      .eq("project_id", project.id)
      .order("id"),
  ]);
  if (seats.error) throw new Error(seats.error.message);
  if (comments.error) throw new Error(comments.error.message);
  if (tasks.error && !isMissingTable(tasks.error)) throw new Error(tasks.error.message);
  if (tasks.error) warnMissingTable("tasks");

  type SeatWithPerson = SeatRow & { person: BriefPerson | null };
  type CommentWithAuthor = CommentRow & { author: BriefPerson | null };
  type TaskWithAssignee = TaskRow & { assignee: BriefPerson | null };

  return {
    ...toSummary(project),
    seats: ((seats.data ?? []) as SeatWithPerson[]).map((seat) => ({
      id: seat.id,
      role: seat.role,
      brief: seat.brief,
      status: seat.status,
      access: seat.access,
      pitch: seat.pitch,
      person: seat.person ?? null,
    })),
    tasks: ((tasks.data ?? []) as TaskWithAssignee[] | null ?? []).map((task) => ({
      id: task.id,
      title: task.title,
      detail: task.detail,
      status: task.status,
      createdAt: task.created_at,
      assignee: task.assignee ?? null,
    })),
    comments: ((comments.data ?? []) as CommentWithAuthor[])
      .filter((comment) => comment.author)
      .map((comment) => ({
        id: comment.id,
        body: comment.body,
        createdAt: comment.created_at,
        author: comment.author as BriefPerson,
      })),
  };
}

export async function getPerson(username: string): Promise<Person | null> {
  const supabase = await getSupabase();
  if (!supabase) {
    const seed = seedUsers.find((user) => user.username === username);
    return seed ? { ...seed } : null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .maybeSingle();
  if (error) throw new Error(error.message);

  return data ? toPerson(data) : null;
}

/** Projects this person owns, plus the ones they hold a filled seat on. */
export async function getPortfolio(person: Person) {
  const supabase = await getSupabase();

  if (!supabase) {
    const owned = seedFeed({}).filter((project) => project.owner.id === person.id);
    return { owned, contributing: [] as ProjectSummary[] };
  }

  const [ownedResult, seatResult] = await Promise.all([
    supabase
      .from("project_overview")
      .select("*")
      .eq("owner_id", person.id)
      .order("created_at", { ascending: false }),
    supabase.from("seats").select("project_id").eq("user_id", person.id).eq("status", "filled"),
  ]);
  if (ownedResult.error) throw new Error(ownedResult.error.message);
  if (seatResult.error) throw new Error(seatResult.error.message);

  const owned = (ownedResult.data ?? []).map(toSummary);
  const seatProjectIds = (seatResult.data ?? []).map((seat) => seat.project_id);
  if (seatProjectIds.length === 0) return { owned, contributing: [] };

  const { data, error } = await supabase
    .from("project_overview")
    .select("*")
    .in("id", seatProjectIds)
    .neq("owner_id", person.id)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  return { owned, contributing: (data ?? []).map(toSummary) };
}

export async function listTags(): Promise<{ tag: string; count: number }[]> {
  const supabase = await getSupabase();

  const allTags = supabase
    ? await (async () => {
        const { data, error } = await supabase.from("projects").select("tags");
        if (error) throw new Error(error.message);
        return (data ?? []).flatMap((row) => row.tags);
      })()
    : seedProjects.flatMap((project) => project.tags);

  const counts = new Map<string, number>();
  for (const tag of allTags) counts.set(tag, (counts.get(tag) ?? 0) + 1);

  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

/* ------------------------------------------------------------------ *
 * Applications
 * ------------------------------------------------------------------ */

const APPLICATION_COLUMNS =
  "id, role, brief, status, pitch, created_at, " +
  "project:projects!inner(slug, title, owner_id), " +
  "person:profiles(id, username, name)";

/** Applications waiting on this person's own projects. */
export async function listIncomingApplications(userId: string): Promise<ApplicationView[]> {
  const supabase = await getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("seats")
    .select(APPLICATION_COLUMNS)
    .eq("project.owner_id", userId)
    .eq("status", "pending")
    .order("id", { ascending: false });
  if (error) throw new Error(error.message);

  return (data ?? []).map(toApplication);
}

/** Seats this person has applied for, whatever came of them. */
export async function listMyApplications(userId: string): Promise<ApplicationView[]> {
  const supabase = await getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("seats")
    .select(APPLICATION_COLUMNS)
    .eq("user_id", userId)
    .order("id", { ascending: false });
  if (error) throw new Error(error.message);

  return (data ?? []).map(toApplication);
}

/**
 * How many applications are waiting on this person's projects.
 *
 * Runs on every page for a signed-in visitor to feed the header badge, so it
 * asks for the count alone rather than the rows.
 */
export async function countIncomingApplications(userId: string): Promise<number> {
  const supabase = await getSupabase();
  if (!supabase) return 0;

  const { count, error } = await supabase
    .from("seats")
    .select("id, project:projects!inner(owner_id)", { count: "exact", head: true })
    .eq("project.owner_id", userId)
    .eq("status", "pending");
  if (error) throw new Error(error.message);

  return count ?? 0;
}

/**
 * Somebody's trail, newest first.
 *
 * No kind filtering here on purpose: the SELECT policy on `events` already
 * hides what this person chose to hide, and shows them their own hidden
 * entries. Re-filtering in the query would only be able to get that wrong.
 */
export async function listPersonActivity(personId: string, limit = 40): Promise<ActivityEvent[]> {
  const supabase = await getSupabase();
  if (!supabase) return seedActivity(personId);

  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("actor_id", personId)
    .order("id", { ascending: false })
    .limit(limit);
  if (error) {
    if (!isMissingTable(error)) throw new Error(error.message);
    warnMissingTable("events");
    return [];
  }

  return (data ?? []).map((row) => toActivity(row as EventRow));
}

/** What has happened on one project, newest first. */
export async function listProjectActivity(projectId: number, limit = 20): Promise<ActivityEvent[]> {
  const supabase = await getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("events")
    .select("*, actor:profiles(id, username, name)")
    .eq("project_id", projectId)
    .order("id", { ascending: false })
    .limit(limit);
  if (error) {
    if (!isMissingTable(error)) throw new Error(error.message);
    warnMissingTable("events");
    return [];
  }

  return (data ?? []).map((row) => toActivity(row as EventRow & { actor: BriefPerson | null }));
}

export async function hasBoosted(projectId: number, userId: string): Promise<boolean> {
  const supabase = await getSupabase();
  if (!supabase) return false;

  const { data, error } = await supabase
    .from("boosts")
    .select("user_id")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);

  return Boolean(data);
}

/* ------------------------------------------------------------------ *
 * Shaping
 * ------------------------------------------------------------------ */

type BriefPerson = Pick<Person, "id" | "username" | "name">;

type ApplicationRow = {
  id: number;
  role: string;
  brief: string;
  status: string;
  pitch: string;
  created_at: string;
  project: { slug: string; title: string } | null;
  person: BriefPerson | null;
};

function toApplication(row: unknown): ApplicationView {
  const seat = row as ApplicationRow;
  return {
    seatId: seat.id,
    role: seat.role,
    brief: seat.brief,
    status: seat.status,
    pitch: seat.pitch,
    createdAt: seat.created_at,
    project: seat.project ?? { slug: "", title: "Proyek terhapus" },
    person: seat.person ?? null,
  };
}

function toSummary(row: ProjectOverviewRow): ProjectSummary {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    tagline: row.tagline,
    stage: row.stage as Stage,
    problem: row.problem,
    solution: row.solution,
    audience: row.audience,
    tags: row.tags,
    glyph: row.glyph,
    docUrl: row.doc_url,
    liveUrl: row.live_url,
    repoUrl: row.repo_url,
    createdAt: row.created_at,
    owner: { id: row.owner_id, username: row.owner_username, name: row.owner_name },
    seatCount: Number(row.seat_count),
    openSeatCount: Number(row.open_seat_count),
    activeMemberCount: Number(row.active_member_count),
    boostCount: Number(row.boost_count),
    commentCount: Number(row.comment_count),
    openTaskCount: Number(row.open_task_count),
    doneTaskCount: Number(row.done_task_count),
  };
}

function toPerson(row: ProfileRow): Person {
  return {
    id: row.id,
    username: row.username,
    name: row.name,
    headline: row.headline,
    bio: row.bio,
    website: row.website,
    github: row.github,
    activityHidden: row.activity_hidden ?? [],
  };
}

function toActivity(row: EventRow & { actor?: BriefPerson | null }): ActivityEvent {
  const payload = row.payload ?? {};
  return {
    id: row.id,
    kind: row.kind,
    createdAt: row.created_at,
    projectId: row.project_id,
    projectSlug: payload.slug ?? "",
    projectTitle: payload.title ?? "proyek yang sudah dihapus",
    payload,
    actor: row.actor ?? null,
  };
}

/** `%` and `_` are wildcards in ILIKE; a search box should treat them as text. */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (match) => `\\${match}`);
}

/* ------------------------------------------------------------------ *
 * Read-only fallback, used when no Supabase project is attached
 * ------------------------------------------------------------------ */

function seedActivity(personId: string): ActivityEvent[] {
  const person = seedUsers.find((user) => user.id === personId);
  const hidden = person?.activityHidden ?? [];

  return seedEvents
    .filter((event) => event.actorId === personId && !hidden.includes(event.kind))
    .map((event) => ({
      id: event.id,
      kind: event.kind,
      createdAt: event.createdAt,
      projectId: seedProjects.find((project) => project.slug === event.projectSlug)?.id ?? null,
      projectSlug: event.projectSlug,
      projectTitle: event.payload.title ?? "",
      payload: event.payload,
      actor: person ? { id: person.id, username: person.username, name: person.name } : null,
    }));
}

function seedSummaries(): ProjectSummary[] {
  return seedProjects.map((project) => {
    const owner = seedUsers.find((user) => user.id === project.ownerId);
    return {
      ...project,
      stage: project.stage as Stage,
      docUrl: project.docUrl,
      liveUrl: project.liveUrl,
      repoUrl: project.repoUrl,
      createdAt: project.createdAt,
      owner: {
        id: project.ownerId,
        username: owner?.username ?? "ahsan",
        name: owner?.name ?? "Ahsan Project",
      },
      seatCount: project.seats.length,
      openSeatCount: project.seats.filter((seat) => seat.status === "open").length,
      activeMemberCount: project.seats.filter((seat) => seat.status === "filled").length,
      boostCount: 0,
      commentCount: 0,
      openTaskCount: project.tasks.filter((task) => task.status !== "done").length,
      doneTaskCount: project.tasks.filter((task) => task.status === "done").length,
    };
  });
}

function seedFeed(query: FeedQuery): ProjectSummary[] {
  const sort = query.sort ?? "terbaru";
  const needle = query.q?.toLowerCase() ?? "";

  return seedSummaries()
    .filter((project) => {
      if (query.stage && project.stage !== query.stage) return false;
      if (query.tag && !project.tags.includes(query.tag)) return false;
      if (needle) {
        const haystack = `${project.title} ${project.tagline} ${project.problem}`.toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sort === "didukung") return b.boostCount - a.boostCount || newest(a, b);
      if (sort === "dibutuhkan") return b.openSeatCount - a.openSeatCount || newest(a, b);
      return newest(a, b);
    });
}

function newest(a: ProjectSummary, b: ProjectSummary): number {
  return b.createdAt.localeCompare(a.createdAt) || b.id - a.id;
}

function seedDetail(slug: string): ProjectDetail | null {
  const summary = seedSummaries().find((project) => project.slug === slug);
  const source = seedProjects.find((project) => project.slug === slug);
  if (!summary || !source) return null;

  return {
    ...summary,
    seats: source.seats.map((seat, index) => ({
      id: index + 1,
      role: seat.role,
      brief: seat.brief,
      status: seat.status,
      access: seat.access,
      pitch: seat.pitch,
      person: null,
    })),
    tasks: source.tasks.map((task, index) => ({
      id: index + 1,
      title: task.title,
      detail: task.detail,
      status: task.status,
      createdAt: source.createdAt,
      assignee: task.assigneeId
        ? (() => {
            const owner = seedUsers.find((user) => user.id === task.assigneeId);
            return owner
              ? { id: owner.id, username: owner.username, name: owner.name }
              : null;
          })()
        : null,
    })),
    comments: [],
  };
}
