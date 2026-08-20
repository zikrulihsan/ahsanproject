import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "../../db";
import { boosts, comments, projects, seats, users } from "../../db/schema";
import { seedProjects, seedUsers } from "./seed";
import { tagList, type Stage } from "./stages";

export type Person = {
  id: string;
  username: string;
  name: string;
  headline: string;
  bio: string;
  website: string;
  github: string;
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
  tags: string;
  accent: string;
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
};

export type SeatView = {
  id: number;
  role: string;
  brief: string;
  status: string;
  pitch: string;
  person: Pick<Person, "id" | "username" | "name"> | null;
};

export type CommentView = {
  id: number;
  body: string;
  createdAt: string;
  author: Pick<Person, "id" | "username" | "name">;
};

export type ProjectDetail = ProjectSummary & {
  seats: SeatView[];
  comments: CommentView[];
};

export type FeedQuery = {
  stage?: string;
  tag?: string;
  role?: string;
  q?: string;
  sort?: "terbaru" | "didukung" | "dibutuhkan";
};

/* ------------------------------------------------------------------ *
 * Reads
 * ------------------------------------------------------------------ */

export async function listProjects(query: FeedQuery = {}): Promise<ProjectSummary[]> {
  const all = await allProjects();
  return sortProjects(all.filter((project) => matches(project, query)), query.sort);
}

export async function getProject(slug: string): Promise<ProjectDetail | null> {
  const db = await getDb();
  if (!db) return seedDetail(slug);

  const [row] = await db
    .select({ project: projects, owner: users })
    .from(projects)
    .innerJoin(users, eq(users.id, projects.ownerId))
    .where(eq(projects.slug, slug))
    .limit(1);
  if (!row) return null;

  const counts = await countsFor(row.project.id);
  const seatRows = await db
    .select({ seat: seats, person: users })
    .from(seats)
    .leftJoin(users, eq(users.id, seats.userId))
    .where(eq(seats.projectId, row.project.id))
    .orderBy(seats.id);
  const commentRows = await db
    .select({ comment: comments, author: users })
    .from(comments)
    .innerJoin(users, eq(users.id, comments.authorId))
    .where(eq(comments.projectId, row.project.id))
    .orderBy(comments.id);

  return {
    ...toSummary(row.project, row.owner, counts),
    seats: seatRows.map(({ seat, person }) => ({
      id: seat.id,
      role: seat.role,
      brief: seat.brief,
      status: seat.status,
      pitch: seat.pitch,
      person: person ? briefPerson(person) : null,
    })),
    comments: commentRows.map(({ comment, author }) => ({
      id: comment.id,
      body: comment.body,
      createdAt: comment.createdAt,
      author: briefPerson(author),
    })),
  };
}

export async function getPerson(username: string): Promise<Person | null> {
  const db = await getDb();
  if (!db) {
    const seed = seedUsers.find((user) => user.username === username);
    return seed ? { ...seed } : null;
  }

  const [row] = await db.select().from(users).where(eq(users.username, username)).limit(1);
  return row ? toPerson(row) : null;
}

/** Projects this person owns, plus the ones they hold a filled seat on. */
export async function getPortfolio(person: Person) {
  const all = await allProjects();
  const owned = sortProjects(all.filter((project) => project.owner.id === person.id), "terbaru");

  const db = await getDb();
  let contributingIds: number[] = [];
  if (db) {
    const rows = await db
      .select({ projectId: seats.projectId })
      .from(seats)
      .where(and(eq(seats.userId, person.id), eq(seats.status, "filled")));
    contributingIds = rows.map((row) => row.projectId);
  } else {
    contributingIds = seedProjects
      .filter((project) => project.seats.some((seat) => seat.status === "filled" && seat.userId === person.id))
      .map((project) => project.id);
  }

  const contributing = all.filter(
    (project) => contributingIds.includes(project.id) && project.owner.id !== person.id,
  );

  return { owned, contributing };
}

export async function listTags(): Promise<{ tag: string; count: number }[]> {
  const all = await allProjects();
  const counts = new Map<string, number>();
  for (const project of all) {
    for (const tag of tagList(project.tags)) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

export async function hasBoosted(projectId: number, userId: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const [row] = await db
    .select({ projectId: boosts.projectId })
    .from(boosts)
    .where(and(eq(boosts.projectId, projectId), eq(boosts.userId, userId)))
    .limit(1);
  return Boolean(row);
}

/* ------------------------------------------------------------------ *
 * Shared plumbing
 * ------------------------------------------------------------------ */

async function allProjects(): Promise<ProjectSummary[]> {
  const db = await getDb();
  if (!db) return seedSummaries();

  const rows = await db
    .select({ project: projects, owner: users })
    .from(projects)
    .innerJoin(users, eq(users.id, projects.ownerId))
    .orderBy(desc(projects.createdAt), desc(projects.id));
  if (rows.length === 0) return [];

  const ids = rows.map((row) => row.project.id);
  const counts = await countsForMany(ids);

  return rows.map(({ project, owner }) => toSummary(project, owner, counts.get(project.id)));
}

type Counts = { seatCount: number; openSeatCount: number; activeMemberCount: number; boostCount: number; commentCount: number };

const EMPTY_COUNTS: Counts = {
  seatCount: 0,
  openSeatCount: 0,
  activeMemberCount: 0,
  boostCount: 0,
  commentCount: 0,
};

async function countsFor(projectId: number): Promise<Counts> {
  return (await countsForMany([projectId])).get(projectId) ?? EMPTY_COUNTS;
}

async function countsForMany(ids: number[]): Promise<Map<number, Counts>> {
  const db = await getDb();
  const result = new Map<number, Counts>();
  if (!db || ids.length === 0) return result;

  const seatRows = await db
    .select({
      projectId: seats.projectId,
      total: sql<number>`count(*)`,
      open: sql<number>`sum(case when ${seats.status} = 'open' then 1 else 0 end)`,
      filled: sql<number>`sum(case when ${seats.status} = 'filled' then 1 else 0 end)`,
    })
    .from(seats)
    .where(inArray(seats.projectId, ids))
    .groupBy(seats.projectId);
  const boostRows = await db
    .select({ projectId: boosts.projectId, total: sql<number>`count(*)` })
    .from(boosts)
    .where(inArray(boosts.projectId, ids))
    .groupBy(boosts.projectId);
  const commentRows = await db
    .select({ projectId: comments.projectId, total: sql<number>`count(*)` })
    .from(comments)
    .where(inArray(comments.projectId, ids))
    .groupBy(comments.projectId);

  for (const id of ids) result.set(id, { ...EMPTY_COUNTS });
  for (const row of seatRows) {
    const counts = result.get(row.projectId);
    if (!counts) continue;
    counts.seatCount = Number(row.total ?? 0);
    counts.openSeatCount = Number(row.open ?? 0);
    counts.activeMemberCount = Number(row.filled ?? 0);
  }
  for (const row of boostRows) {
    const counts = result.get(row.projectId);
    if (counts) counts.boostCount = Number(row.total ?? 0);
  }
  for (const row of commentRows) {
    const counts = result.get(row.projectId);
    if (counts) counts.commentCount = Number(row.total ?? 0);
  }

  return result;
}

type ProjectRow = typeof projects.$inferSelect;
type UserRow = typeof users.$inferSelect;

function toSummary(project: ProjectRow, owner: UserRow, counts: Counts = EMPTY_COUNTS): ProjectSummary {
  return {
    id: project.id,
    slug: project.slug,
    title: project.title,
    tagline: project.tagline,
    stage: project.stage as Stage,
    problem: project.problem,
    solution: project.solution,
    audience: project.audience,
    tags: project.tags,
    accent: project.accent,
    glyph: project.glyph,
    docUrl: project.docUrl,
    liveUrl: project.liveUrl,
    repoUrl: project.repoUrl,
    createdAt: project.createdAt,
    owner: briefPerson(owner),
    ...counts,
  };
}

function toPerson(row: UserRow): Person {
  return {
    id: row.id,
    username: row.username,
    name: row.name,
    headline: row.headline,
    bio: row.bio,
    website: row.website,
    github: row.github,
  };
}

function briefPerson(row: Pick<UserRow, "id" | "username" | "name">) {
  return { id: row.id, username: row.username, name: row.name };
}

function matches(project: ProjectSummary, query: FeedQuery): boolean {
  if (query.stage && project.stage !== query.stage) return false;
  if (query.tag && !tagList(project.tags).includes(query.tag)) return false;
  if (query.q) {
    const needle = query.q.toLowerCase();
    const haystack = `${project.title} ${project.tagline} ${project.problem} ${project.tags}`.toLowerCase();
    if (!haystack.includes(needle)) return false;
  }
  return true;
}

function sortProjects(list: ProjectSummary[], sort: FeedQuery["sort"] = "terbaru"): ProjectSummary[] {
  const sorted = [...list];
  if (sort === "didukung") {
    sorted.sort((a, b) => b.boostCount - a.boostCount || compareNewest(a, b));
  } else if (sort === "dibutuhkan") {
    sorted.sort((a, b) => b.openSeatCount - a.openSeatCount || compareNewest(a, b));
  } else {
    sorted.sort(compareNewest);
  }
  return sorted;
}

function compareNewest(a: ProjectSummary, b: ProjectSummary): number {
  return b.createdAt.localeCompare(a.createdAt) || b.id - a.id;
}

/* ------------------------------------------------------------------ *
 * Read-only fallback, used when no database is attached
 * ------------------------------------------------------------------ */

function seedSummaries(): ProjectSummary[] {
  return seedProjects.map((project) => {
    const owner = seedUsers.find((user) => user.id === project.ownerId);
    return {
      ...project,
      stage: project.stage as Stage,
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
    };
  });
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
      pitch: seat.pitch,
      person: null,
    })),
    comments: [],
  };
}
