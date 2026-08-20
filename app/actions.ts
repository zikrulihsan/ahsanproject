"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSupabase, type Supabase } from "./lib/supabase";
import { MAXIMUM, normaliseTags, slugify, validateBrief, type FieldErrors } from "./lib/brief";
import { isRole } from "./lib/roles";
import { isStage, meetsStage, settleStage, type Stage } from "./lib/stages";
import { currentViewer } from "./lib/session";

export type CreateState = {
  errors: FieldErrors & { form?: string };
  values: Record<string, string>;
};

export type EditState = CreateState;

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
    const supabase = await requireSupabase();
    slug = await freeSlug(supabase, values.title);

    const { data: project, error } = await supabase
      .from("projects")
      .insert({
        slug,
        title: values.title,
        tagline: values.tagline,
        owner_id: viewer.id,
        stage: values.liveUrl ? "building" : "idea",
        problem: values.problem,
        solution: values.solution,
        audience: values.audience,
        doc_url: values.docUrl,
        repo_url: values.repoUrl,
        live_url: values.liveUrl,
        tags: normaliseTags(values.tags),
        accent: pick(ACCENTS, values.title),
        glyph: pick(GLYPHS, values.tagline),
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    if (values.seatBrief && isRole(values.seatRole)) {
      const { error: seatError } = await supabase.from("seats").insert({
        project_id: project.id,
        role: values.seatRole,
        brief: values.seatBrief.slice(0, MAXIMUM.seatBrief),
      });
      if (seatError) throw new Error(seatError.message);
    }
  } catch (error) {
    return { errors: { form: messageOf(error) }, values };
  }

  revalidatePath("/");
  redirect(`/projects/${slug}`);
}

/**
 * Rewrites a project's brief.
 *
 * The same minimums apply as when it was created, so a project cannot be
 * hollowed out after the fact. If the edit takes away what its level stood on,
 * the level drops with it rather than staying as a badge that lies.
 */
export async function updateProject(_state: EditState, formData: FormData): Promise<EditState> {
  const slug = text(formData, "slug");
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
  };

  const viewer = await currentViewer();
  if (!viewer) return { errors: { form: "Masuk dulu untuk mengubah proyek ini." }, values };

  const errors: EditState["errors"] = validateBrief(values);
  if (Object.keys(errors).length > 0) return { errors, values };

  try {
    const supabase = await requireSupabase();
    const { data: project, error } = await supabase
      .from("project_overview")
      .select("id, owner_id, stage, seat_count")
      .eq("slug", slug)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!project) return { errors: { form: "Proyeknya tidak ketemu." }, values };
    if (project.owner_id !== viewer.id) {
      return { errors: { form: "Cuma pemilik proyek yang bisa mengubahnya." }, values };
    }

    const tags = normaliseTags(values.tags);
    const stage = settleStage(project.stage as Stage, {
      problem: values.problem,
      solution: values.solution,
      audience: values.audience,
      tags,
      docUrl: values.docUrl,
      repoUrl: values.repoUrl,
      liveUrl: values.liveUrl,
      seatCount: Number(project.seat_count),
    });

    const { error: updateError } = await supabase
      .from("projects")
      .update({
        title: values.title,
        tagline: values.tagline,
        problem: values.problem,
        solution: values.solution,
        audience: values.audience,
        doc_url: values.docUrl,
        repo_url: values.repoUrl,
        live_url: values.liveUrl,
        tags,
        stage,
      })
      .eq("id", project.id);
    if (updateError) throw new Error(updateError.message);
  } catch (error) {
    return { errors: { form: messageOf(error) }, values };
  }

  revalidatePath(`/projects/${slug}`);
  revalidatePath("/");
  redirect(`/projects/${slug}`);
}

/**
 * Removes a project for good, along with its seats, comments and support.
 *
 * Asks for the slug to be typed back because there is no undo — the cascade in
 * the schema takes the discussion with it.
 */
export async function deleteProject(formData: FormData): Promise<void> {
  const slug = text(formData, "slug");
  const confirmation = text(formData, "confirm");
  if (!slug || confirmation !== slug) return;

  const viewer = await currentViewer();
  if (!viewer) return;

  const supabase = await requireSupabase();
  const { error } = await supabase.from("projects").delete().eq("slug", slug);
  if (error) throw new Error(error.message);

  revalidatePath("/");
  redirect(`/u/${viewer.username}`);
}

export async function setStage(formData: FormData): Promise<void> {
  const slug = text(formData, "slug");
  const stage = text(formData, "stage");
  if (!isStage(stage)) return;

  const supabase = await requireSupabase();
  const { data: project, error } = await supabase
    .from("project_overview")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!project) return;

  const allowed = meetsStage(stage as Stage, {
    problem: project.problem,
    solution: project.solution,
    audience: project.audience,
    tags: project.tags,
    docUrl: project.doc_url,
    repoUrl: project.repo_url,
    liveUrl: project.live_url,
    seatCount: Number(project.seat_count),
  });
  if (!allowed) return;

  // Ownership is the database's call: the update matches no rows for anybody
  // else. This only decides whether the level itself is earned.
  const { error: updateError } = await supabase
    .from("projects")
    .update({ stage })
    .eq("id", project.id);
  if (updateError) throw new Error(updateError.message);

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

  const supabase = await requireSupabase();
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (!project) return;

  const { error } = await supabase
    .from("seats")
    .insert({ project_id: project.id, role, brief });
  if (error) throw new Error(error.message);

  revalidatePath(`/projects/${slug}`);
}

export async function applyForSeat(formData: FormData): Promise<void> {
  const slug = text(formData, "slug");
  const seatId = Number(text(formData, "seatId"));
  const pitch = text(formData, "pitch").slice(0, MAXIMUM.pitch);
  if (!Number.isInteger(seatId) || !pitch) return;

  const supabase = await requireSupabase();
  const { error } = await supabase.rpc("apply_for_seat", { seat_id: seatId, pitch });
  if (error) throw new Error(error.message);

  revalidatePath(`/projects/${slug}`);
  revalidatePath("/");
}

export async function decideSeat(formData: FormData): Promise<void> {
  const slug = text(formData, "slug");
  const seatId = Number(text(formData, "seatId"));
  const decision = text(formData, "decision");
  if (!Number.isInteger(seatId) || (decision !== "terima" && decision !== "tolak")) return;

  const supabase = await requireSupabase();
  const { error } = await supabase.rpc("decide_seat", {
    seat_id: seatId,
    accept: decision === "terima",
  });
  if (error) throw new Error(error.message);

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

  const supabase = await requireSupabase();
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (!project) return;

  const { error } = await supabase
    .from("comments")
    .insert({ project_id: project.id, author_id: viewer.id, body });
  if (error) throw new Error(error.message);

  revalidatePath(`/projects/${slug}`);
}

export async function toggleBoost(formData: FormData): Promise<void> {
  const slug = text(formData, "slug");
  const viewer = await currentViewer();
  if (!viewer) return;

  const supabase = await requireSupabase();
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (!project) return;

  const { data: existing } = await supabase
    .from("boosts")
    .select("user_id")
    .eq("project_id", project.id)
    .eq("user_id", viewer.id)
    .maybeSingle();

  const { error } = existing
    ? await supabase
        .from("boosts")
        .delete()
        .eq("project_id", project.id)
        .eq("user_id", viewer.id)
    : await supabase.from("boosts").insert({ project_id: project.id, user_id: viewer.id });
  if (error) throw new Error(error.message);

  revalidatePath(`/projects/${slug}`);
  revalidatePath("/");
}

/* ------------------------------------------------------------------ *
 * Profile
 * ------------------------------------------------------------------ */

export async function updateProfile(formData: FormData): Promise<void> {
  const viewer = await currentViewer();
  if (!viewer) return;

  const supabase = await requireSupabase();
  const { error } = await supabase
    .from("profiles")
    .update({
      name: text(formData, "name").slice(0, 80) || viewer.name,
      headline: text(formData, "headline").slice(0, 140),
      bio: text(formData, "bio").slice(0, 800),
      website: text(formData, "website").slice(0, 200),
      github: text(formData, "github").slice(0, 200),
    })
    .eq("id", viewer.id);
  if (error) throw new Error(error.message);

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

async function freeSlug(supabase: Supabase, title: string): Promise<string> {
  const base = slugify(title) || "proyek";

  for (let suffix = 0; suffix < 50; suffix += 1) {
    const candidate = suffix === 0 ? base : `${base}-${suffix + 1}`;
    const { data } = await supabase
      .from("projects")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();
    if (!data) return candidate;
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
