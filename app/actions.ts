"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireDb } from "../db";
import { boosts, comments, projects, seats, users } from "../db/schema";
import { MAXIMUM, normaliseTags, slugify, validateBrief, type FieldErrors } from "./lib/brief";
import { isRole } from "./lib/roles";
import { isStage, meetsStage, type Stage } from "./lib/stages";
import { currentViewer } from "./lib/session";

export type CreateState = {
  errors: FieldErrors & { form?: string };
  values: Record<string, string>;
};

const ACCENTS = ["mint", "yellow", "blue", "coral", "purple", "green", "sand", "sky"] as const;
const GLYPHS = ["✦", "○○○", "▱", "⌖", "≡", "↗", "◔", "⌁"] as const;

/* ------------------------------------------------------------------ *
 * Projects
 * ------------------------------------------------------------------ */

export async function createProject(_state: CreateState, formData: FormData): Promise<CreateState> {
  const values = {
    title: text(formData, "title"),
    tagline: text(formData, "tagline"),
    problem: text(formData, "problem"),
    solution: text(formData, "solution"),
    audience: text(formData, "audience"),
    tags: text(formData, "tags"),
    docUrl: text(formData, "docUrl"),
    repoUrl: text(formData, "repoUrl"),
    liveUrl: text(formData, "liveUrl"),
    seatRole: text(formData, "seatRole"),
    seatBrief: text(formData, "seatBrief"),
  };

  const viewer = await currentViewer();
  if (!viewer) return { errors: { form: "Masuk dulu sebelum menaruh ide di sini." }, values };

  const errors: CreateState["errors"] = validateBrief(values);
  if (values.seatBrief && !isRole(values.seatRole)) {
    errors.form = "Pilih peran untuk bantuan yang kamu cari.";
  }
  if (Object.keys(errors).length > 0) return { errors, values };

  let slug = "";
  try {
    const db = await requireDb();
    slug = await freeSlug(values.title);
    const [project] = await db
      .insert(projects)
      .values({
        slug,
        title: values.title,
        tagline: values.tagline,
        ownerId: viewer.id,
        stage: values.liveUrl ? "building" : "idea",
        problem: values.problem,
        solution: values.solution,
        audience: values.audience,
        docUrl: values.docUrl,
        repoUrl: values.repoUrl,
        liveUrl: values.liveUrl,
        tags: normaliseTags(values.tags),
        accent: pick(ACCENTS, values.title),
        glyph: pick(GLYPHS, values.tagline),
      })
      .returning();

    if (values.seatBrief && isRole(values.seatRole)) {
      await db.insert(seats).values({
        projectId: project.id,
        role: values.seatRole,
        brief: values.seatBrief.slice(0, MAXIMUM.seatBrief),
      });
    }
  } catch (error) {
    return { errors: { form: messageOf(error) }, values };
  }

  revalidatePath("/");
  redirect(`/projects/${slug}`);
}

export async function setStage(formData: FormData): Promise<void> {
  const slug = text(formData, "slug");
  const stage = text(formData, "stage");
  if (!isStage(stage)) return;

  const db = await requireDb();
  const project = await ownedProject(slug);
  const seatRows = await db.select().from(seats).where(eq(seats.projectId, project.id));

  const allowed = meetsStage(stage as Stage, {
    ...project,
    seatCount: seatRows.length,
    activeMemberCount: seatRows.filter((seat) => seat.status === "filled").length,
  });
  if (!allowed) return;

  await db
    .update(projects)
    .set({ stage, updatedAt: new Date().toISOString() })
    .where(eq(projects.id, project.id));

  revalidatePath(`/projects/${slug}`);
  revalidatePath("/");
}

/* ------------------------------------------------------------------ *
 * Seats — the open contribution slots
 * ------------------------------------------------------------------ */

export async function openSeat(formData: FormData): Promise<void> {
  const slug = text(formData, "slug");
  const role = text(formData, "role");
  const brief = text(formData, "brief").slice(0, MAXIMUM.seatBrief);
  if (!isRole(role) || !brief) return;

  const db = await requireDb();
  const project = await ownedProject(slug);
  await db.insert(seats).values({ projectId: project.id, role, brief });

  revalidatePath(`/projects/${slug}`);
}

export async function applyForSeat(formData: FormData): Promise<void> {
  const slug = text(formData, "slug");
  const seatId = Number(text(formData, "seatId"));
  const pitch = text(formData, "pitch").slice(0, MAXIMUM.pitch);
  if (!Number.isInteger(seatId) || !pitch) return;

  const viewer = await currentViewer();
  if (!viewer) return;

  const db = await requireDb();
  await db
    .update(seats)
    .set({ status: "pending", userId: viewer.id, pitch })
    .where(and(eq(seats.id, seatId), eq(seats.status, "open")));

  revalidatePath(`/projects/${slug}`);
}

export async function decideSeat(formData: FormData): Promise<void> {
  const slug = text(formData, "slug");
  const seatId = Number(text(formData, "seatId"));
  const decision = text(formData, "decision");
  if (!Number.isInteger(seatId) || (decision !== "terima" && decision !== "tolak")) return;

  const db = await requireDb();
  const project = await ownedProject(slug);

  await db
    .update(seats)
    .set(
      decision === "terima"
        ? { status: "filled" }
        : { status: "open", userId: null, pitch: "" },
    )
    .where(and(eq(seats.id, seatId), eq(seats.projectId, project.id), eq(seats.status, "pending")));

  revalidatePath(`/projects/${slug}`);
  revalidatePath("/");
}

/* ------------------------------------------------------------------ *
 * Discussion and support
 * ------------------------------------------------------------------ */

export async function addComment(formData: FormData): Promise<void> {
  const slug = text(formData, "slug");
  const body = text(formData, "body").slice(0, MAXIMUM.comment);
  if (!body) return;

  const viewer = await currentViewer();
  if (!viewer) return;

  const db = await requireDb();
  const [project] = await db.select().from(projects).where(eq(projects.slug, slug)).limit(1);
  if (!project) return;

  await db.insert(comments).values({ projectId: project.id, authorId: viewer.id, body });
  revalidatePath(`/projects/${slug}`);
}

export async function toggleBoost(formData: FormData): Promise<void> {
  const slug = text(formData, "slug");
  const viewer = await currentViewer();
  if (!viewer) return;

  const db = await requireDb();
  const [project] = await db.select().from(projects).where(eq(projects.slug, slug)).limit(1);
  if (!project) return;

  const where = and(eq(boosts.projectId, project.id), eq(boosts.userId, viewer.id));
  const [existing] = await db.select({ userId: boosts.userId }).from(boosts).where(where).limit(1);

  if (existing) {
    await db.delete(boosts).where(where);
  } else {
    await db.insert(boosts).values({ projectId: project.id, userId: viewer.id });
  }

  revalidatePath(`/projects/${slug}`);
  revalidatePath("/");
}

/* ------------------------------------------------------------------ *
 * Profile
 * ------------------------------------------------------------------ */

export async function updateProfile(formData: FormData): Promise<void> {
  const viewer = await currentViewer();
  if (!viewer) return;

  const db = await requireDb();
  await db
    .update(users)
    .set({
      name: text(formData, "name").slice(0, 80) || viewer.name,
      headline: text(formData, "headline").slice(0, 140),
      bio: text(formData, "bio").slice(0, 800),
      website: text(formData, "website").slice(0, 200),
      github: text(formData, "github").slice(0, 200),
    })
    .where(eq(users.id, viewer.id));

  revalidatePath(`/u/${viewer.username}`);
  redirect(`/u/${viewer.username}`);
}

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

/** Loads a project and refuses unless the signed-in visitor owns it. */
async function ownedProject(slug: string) {
  const viewer = await currentViewer();
  if (!viewer) throw new Error("Masuk dulu untuk mengubah proyek ini.");

  const db = await requireDb();
  const [project] = await db.select().from(projects).where(eq(projects.slug, slug)).limit(1);
  if (!project) throw new Error("Proyeknya tidak ketemu.");
  if (project.ownerId !== viewer.id) throw new Error("Cuma pemilik proyek yang bisa mengubah bagian ini.");

  return project;
}

async function freeSlug(title: string): Promise<string> {
  const db = await requireDb();
  const base = slugify(title) || "proyek";

  for (let suffix = 0; suffix < 50; suffix += 1) {
    const candidate = suffix === 0 ? base : `${base}-${suffix + 1}`;
    const [taken] = await db
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.slug, candidate))
      .limit(1);
    if (!taken) return candidate;
  }

  return `${base}-${Date.now().toString(36)}`;
}

/** Stable pick so a project keeps the same colour and glyph on every render. */
function pick<T>(options: readonly T[], seed: string): T {
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) % 100000;
  return options[hash % options.length];
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : "Ada yang gagal saat menyimpan. Coba lagi sebentar.";
}
