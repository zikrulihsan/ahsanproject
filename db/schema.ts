import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

/**
 * Ahsan Project data model.
 *
 * One person owns a project; anyone can contribute to it. A project always
 * carries its brief (problem/solution/audience) — see `app/lib/brief.ts` for
 * the minimums we refuse to create a project without.
 */

export const users = sqliteTable(
  "users",
  {
    /** Identity from Sign in with ChatGPT, or a stable seed id for imported people. */
    id: text("id").primaryKey(),
    username: text("username").notNull(),
    name: text("name").notNull(),
    email: text("email").notNull().default(""),
    headline: text("headline").notNull().default(""),
    bio: text("bio").notNull().default(""),
    website: text("website").notNull().default(""),
    github: text("github").notNull().default(""),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [uniqueIndex("users_username_unique").on(table.username)],
);

export const projects = sqliteTable(
  "projects",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    tagline: text("tagline").notNull(),
    ownerId: text("owner_id").notNull().references(() => users.id),
    /** idea | validating | building | live | resting — see app/lib/stages.ts */
    stage: text("stage").notNull().default("idea"),
    /** The brief. A project is never allowed to be empty on these three. */
    problem: text("problem").notNull(),
    solution: text("solution").notNull(),
    audience: text("audience").notNull(),
    /** Optional extras that unlock the later stages. */
    docUrl: text("doc_url").notNull().default(""),
    liveUrl: text("live_url").notNull().default(""),
    repoUrl: text("repo_url").notNull().default(""),
    /** Comma-separated tags, lowercase. */
    tags: text("tags").notNull().default(""),
    /** Card presentation, kept in the row so a project looks like itself everywhere. */
    accent: text("accent").notNull().default("mint"),
    glyph: text("glyph").notNull().default("✦"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("projects_slug_unique").on(table.slug),
    index("projects_owner_idx").on(table.ownerId),
    index("projects_stage_idx").on(table.stage),
  ],
);

/**
 * A seat on a project. Seats exist before anyone fills them: an open seat is
 * the "open contribution" ask, a filled seat is the assignment.
 */
export const seats = sqliteTable(
  "seats",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    projectId: integer("project_id").notNull().references(() => projects.id),
    /** pm | design | engineering | research | content | growth | other */
    role: text("role").notNull(),
    /** What this seat is actually for, in the owner's words. */
    brief: text("brief").notNull().default(""),
    /** open | pending | filled */
    status: text("status").notNull().default("open"),
    /** Set once somebody applies or is assigned. */
    userId: text("user_id").references(() => users.id),
    /** Why the applicant thinks they fit. */
    pitch: text("pitch").notNull().default(""),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("seats_project_idx").on(table.projectId),
    index("seats_user_idx").on(table.userId),
  ],
);

export const comments = sqliteTable(
  "comments",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    projectId: integer("project_id").notNull().references(() => projects.id),
    authorId: text("author_id").notNull().references(() => users.id),
    body: text("body").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("comments_project_idx").on(table.projectId)],
);

export const boosts = sqliteTable(
  "boosts",
  {
    projectId: integer("project_id").notNull().references(() => projects.id),
    userId: text("user_id").notNull().references(() => users.id),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [uniqueIndex("boosts_unique").on(table.projectId, table.userId)],
);
