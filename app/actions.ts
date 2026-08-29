"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireSupabase, type Supabase } from "./lib/supabase";
import {
  MAXIMUM,
  domainOf,
  normaliseTags,
  slugify,
  validateBrief,
  type FieldErrors,
} from "./lib/brief";
import { isProjectType } from "./lib/project-types";
import { isRole } from "./lib/roles";
import { isStage, meetsStage, settleStage, type Stage } from "./lib/stages";
import { TASK_LIMITS, isTaskStatus, validateTask } from "./lib/tasks";
import { UPDATE_LIMITS, validateUpdate } from "./lib/updates";
import { hiddenFrom } from "./lib/activity";
import { getGitHubProjectDraft, isGitHubRepositoryUrl, type GitHubProjectDraft } from "./lib/github";
import { fetchLinkMetadata, normaliseLink, titleFromLink } from "./lib/link-metadata";
import { currentViewer, viewerId } from "./lib/session";
import { normalisePeopleTerms } from "./lib/people";
import {
  PROFILE_LIMITS,
  PROFILE_MAXIMUM,
  isEmail,
  validateProfile,
  type ProfileFieldErrors,
  type ProfileInput,
} from "./lib/profile";
import { tags } from "./lib/cache-tags";

export type CreateState = {
  errors: FieldErrors & {
    form?: string;
    link?: string;
    stage?: string;
    now?: string;
    projectType?: string;
    seatRole?: string;
    seatRoleTitle?: string;
    seatBrief?: string;
    seatCommitment?: string;
    openForGitHubContributions?: string;
  };
  values: Record<string, string>;
};

export type EditState = CreateState;

export type GitHubImportResult =
  | { ok: true; draft: GitHubProjectDraft }
  | { ok: false; error: string };

/** What a pasted link turned out to be, as the form shows it back. */
export type LinkPreview = {
  /** Exactly what was typed, so the form can tell a stale preview from a fresh one. */
  requested: string;
  url: string;
  domain: string;
  title: string;
  tagline: string;
  logoUrl: string;
  imageUrl: string;
  /** False when the page could not be read; the title is then from the address. */
  fetched: boolean;
};

export type LinkPreviewResult =
  | { ok: true; preview: LinkPreview }
  | { ok: false; error: string };

export type ProfileState = {
  errors: ProfileFieldErrors & { form?: string };
  values: ProfileInput;
};

const GLYPHS = ["✦", "○○○", "▱", "⌖", "≡", "↗", "◔", "⌁"] as const;

/* ------------------------------------------------------------------ *
 * Retiring what a write has just made wrong
 * ------------------------------------------------------------------ *
 *
 * The public reads in `lib/data.ts` are cached and shared between visitors, so
 * a write has to say what it invalidated or the change would sit unseen behind
 * the cache until it expired on its own.
 *
 * `updateTag` rather than `revalidateTag`: the person who just saved is about
 * to be shown the page they saved. Serving them the previous copy while a fresh
 * one is built in the background — which is what `revalidateTag` does — would
 * read as the edit not having worked.
 *
 * The `revalidatePath` calls below these stay as they were. They clear the
 * router's cache of a rendered route, which is a different store from the
 * tagged data these reads come from; the two are meant to be used together.
 */

/** A project's own page, and every board listing that carries its card. */
function projectChanged(slug: string): void {
  updateTag(tags.project(slug));
  updateTag(tags.projects);
}

/**
 * A seat opened, taken, decided or closed.
 *
 * Wider than one project on purpose: the open-seat counts, the "role yang
 * paling dicari" ranking and the Explore autocomplete are all built from every
 * seat on the site, so any one of them moving dates all of it.
 */
function seatsChanged(slug: string): void {
  projectChanged(slug);
  updateTag(tags.seats);
}

/**
 * Something happened that a trail records.
 *
 * The person's tag covers their profile and, because project trails are filed
 * under the people in them, the projects they already appear on. The project's
 * own tag covers the case this does not: the first time they appear there.
 */
function trailChanged(personId: string | null | undefined, slug?: string): void {
  if (personId) updateTag(tags.trail(personId));
  if (slug) updateTag(tags.projectTrail(slug));
}

/* ------------------------------------------------------------------ *
 * Projects
 * ------------------------------------------------------------------ */

/** Reads public GitHub copy into a browser draft; it never writes a project. */
export async function importGitHubReadme(repoUrl: string): Promise<GitHubImportResult> {
  const viewer = await currentViewer();
  if (!viewer) return { ok: false, error: "Sign in before importing a README." };

  try {
    return { ok: true, draft: await getGitHubProjectDraft(repoUrl) };
  } catch (error) {
    return { ok: false, error: messageOf(error) };
  }
}

/**
 * Reads a pasted link so the form can show what it found.
 *
 * A preview, not a save: the same read runs again inside `createProject` when
 * the browser never got one, so a person who pastes and submits immediately is
 * not punished for being quick.
 */
export async function previewProjectLink(rawLink: string): Promise<LinkPreviewResult> {
  const viewer = await currentViewer();
  if (!viewer) return { ok: false, error: "Sign in before adding a project." };

  const link = normaliseLink(rawLink);
  if (!link) return { ok: false, error: "That does not look like a link yet." };

  const metadata = await fetchLinkMetadata(link);
  return {
    ok: true,
    preview: {
      requested: rawLink.trim(),
      url: link,
      domain: metadata.domain || domainOf(link),
      title: metadata.title || titleFromLink(link),
      tagline: metadata.description,
      logoUrl: usableLogo(metadata.iconUrl, metadata.imageUrl),
      imageUrl: metadata.imageUrl,
      fetched: metadata.fetched,
    },
  };
}

/**
 * Adds a project from a link.
 *
 * Everything except the link is optional, and the two ways a person can reach
 * this differ only in how much they chose to fill in:
 *
 *   - paste a link and press the button, in which case the page's own title,
 *     description and icon are recorded and the project exists in one step;
 *   - open "Add project details" first and write as much as they want, in
 *     which case what they wrote wins over anything the page said about itself.
 *
 * Nothing the upstream page does can stop the save. A site that is slow, down
 * or hostile to robots costs the project its description, not its existence —
 * the address itself still yields a name.
 */
export async function createProject(_state: CreateState, formData: FormData): Promise<CreateState> {
  const values = {
    link: text(formData, "link"),
    highlight: text(formData, "highlight").slice(0, MAXIMUM.highlight),
    title: text(formData, "title"),
    tagline: text(formData, "tagline"),
    problem: text(formData, "problem"),
    solution: text(formData, "solution"),
    audience: text(formData, "audience"),
    tags: formTopics(formData),
    now: text(formData, "now").slice(0, MAXIMUM.now),
    stage: text(formData, "stage"),
    projectType: text(formData, "projectType"),
    docUrl: text(formData, "docUrl"),
    repoUrl: text(formData, "repoUrl"),
    liveUrl: text(formData, "liveUrl"),
    logoUrl: text(formData, "logoUrl"),
    seatRole: text(formData, "seatRole"),
    seatRoleTitle: text(formData, "seatRoleTitle").slice(0, MAXIMUM.roleTitle),
    seatBrief: text(formData, "seatBrief"),
    seatCommitment: formCommitment(formData, "seatCommitment"),
    openSeat: text(formData, "openSeat"),
    openForGitHubContributions: text(formData, "openForGitHubContributions"),
  };

  const viewer = await currentViewer();
  if (!viewer) return { errors: { form: "Sign in before showing a project here." }, values };

  const link = normaliseLink(values.link);
  if (!link) {
    return {
      errors: { link: "Paste the project link — a website, an app listing, or a repository." },
      values,
    };
  }

  /*
   * Where the link belongs on the project.
   *
   * A repository is not the same claim as a product: sending a GitHub URL to
   * `live_url` would badge a pile of source code as something other people can
   * use today. Anything else is treated as the thing itself.
   */
  const repoLink = isGitHubRepositoryUrl(link);
  const repoUrl = values.repoUrl || (repoLink ? link : "");
  const liveUrl = values.liveUrl || (repoLink ? "" : link);

  // Only read the page when the person has not already named the project — for
  // anybody who filled the details in themselves there is nothing left to find.
  const metadata = values.title && values.tagline && values.logoUrl
    ? null
    : await fetchLinkMetadata(link);
  const title = values.title || metadata?.title || titleFromLink(link);
  const tagline = values.tagline || (metadata?.description ?? "");
  const logoUrl = values.logoUrl || usableLogo(metadata?.iconUrl, metadata?.imageUrl);

  const brief = {
    ...values,
    title,
    tagline,
    repoUrl,
    liveUrl,
    logoUrl,
  };
  const errors: CreateState["errors"] = validateBrief(brief);
  if (values.openSeat === "yes") {
    if (!isRole(values.seatRole)) errors.seatRole = "Choose the role you are looking for.";
    if (values.seatRole === "other" && !values.seatRoleTitle) {
      errors.seatRoleTitle = "Write the name of a role that is not in the catalogue.";
    }
    if (!values.seatBrief) errors.seatBrief = "Describe the specific work you need help with.";
    if (!values.seatCommitment) {
      errors.seatCommitment = "Provide a time estimate so people know whether they can join.";
    }
  }
  if (values.projectType && !isProjectType(values.projectType)) {
    errors.projectType = "Choose one of the available project kinds.";
  }
  if (values.openForGitHubContributions === "yes" && !isGitHubRepositoryUrl(repoUrl)) {
    errors.repoUrl = "To open GitHub contributions, enter a valid public GitHub repository URL.";
  }
  if (Object.keys(errors).length > 0) return { errors, values };

  /*
   * The stage nobody was asked for.
   *
   * Guessing an answer on somebody's behalf is what this board refuses to do —
   * but this is not a guess. A link that opens is evidence a stranger can use
   * the thing today, and a repository is evidence work is happening; both are
   * observable from the row itself, which is exactly what every stage rule
   * asks for. Anyone who picked a stage in the details keeps it, and
   * `settleStage` still drops a claim the links do not support.
   */
  const tags = normaliseTags(values.tags);
  const requestedStage = isStage(values.stage) ? values.stage : repoLink ? "building" : "live";
  const stage = settleStage(requestedStage, {
    nowText: values.now,
    docUrl: values.docUrl,
    repoUrl,
    liveUrl,
  });

  let slug = "";
  try {
    const supabase = await requireSupabase();
    slug = await freeSlug(supabase, title);

    const { data: project, error } = await supabase
      .from("projects")
      .insert({
        slug,
        title,
        tagline,
        owner_id: viewer.id,
        stage,
        project_type: isProjectType(values.projectType) ? values.projectType : "",
        highlight: values.highlight,
        problem: values.problem,
        solution: values.solution,
        audience: values.audience,
        now_text: values.now,
        // The trigger only touches this on UPDATE, so a project that starts
        // life already saying what it is doing gets its first timestamp here.
        now_updated_at: values.now ? new Date().toISOString() : null,
        doc_url: values.docUrl,
        repo_url: repoUrl,
        open_for_github_contributions: values.openForGitHubContributions === "yes",
        live_url: liveUrl,
        logo_url: logoUrl,
        tags,
        glyph: pick(GLYPHS, tagline || title),
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    if (values.openSeat === "yes" && values.seatBrief && isRole(values.seatRole)) {
      const { error: seatError } = await supabase.from("seats").insert({
        project_id: project.id,
        role: values.seatRole,
        role_title: values.seatRole === "other" ? values.seatRoleTitle : "",
        brief: values.seatBrief.slice(0, MAXIMUM.seatBrief),
        commitment: values.seatCommitment,
      });
      if (seatError) throw new Error(seatError.message);
    }
  } catch (error) {
    return { errors: { form: messageOf(error) }, values };
  }

  seatsChanged(slug);
  trailChanged(viewer.id, slug);
  revalidatePath("/");
  redirect(`/projects/${slug}`);
}

/**
 * The mark to store for a project, out of what the page offered.
 *
 * An icon is what a card wants — square, small, already the project's face
 * everywhere else. A social image is the fallback rather than the first choice:
 * it is usually a wide banner with the name written across it, which reads
 * badly at 40 pixels. Either way the column is 500 characters, and a URL longer
 * than that is not worth truncating into a broken image.
 */
function usableLogo(iconUrl?: string, imageUrl?: string): string {
  return [iconUrl, imageUrl].find((url) => url && url.length <= MAXIMUM.logoUrl) ?? "";
}

/**
 * Rewrites a project's brief.
 *
 * The same minimums apply as when it was created, so a project cannot be
 * hollowed out after the fact. The owner can also move its status, as long as
 * the selected status is supported by the brief and links being saved.
 */
export async function updateProject(_state: EditState, formData: FormData): Promise<EditState> {
  const slug = text(formData, "slug");
  const values = {
    title: text(formData, "title"),
    tagline: text(formData, "tagline"),
    highlight: text(formData, "highlight").slice(0, MAXIMUM.highlight),
    problem: text(formData, "problem"),
    solution: text(formData, "solution"),
    audience: text(formData, "audience"),
    tags: formTopics(formData),
    now: text(formData, "now").slice(0, MAXIMUM.now),
    projectType: text(formData, "projectType"),
    docUrl: text(formData, "docUrl"),
    repoUrl: text(formData, "repoUrl"),
    liveUrl: text(formData, "liveUrl"),
    logoUrl: text(formData, "logoUrl"),
    stage: text(formData, "stage"),
    openForGitHubContributions: text(formData, "openForGitHubContributions"),
  };

  const viewer = await currentViewer();
  if (!viewer) return { errors: { form: "Sign in to edit this project." }, values };

  const errors: EditState["errors"] = validateBrief(values);
  // Empty stays allowed here for the same reason it is allowed in the column:
  // an owner filling in the rest of a link-first project should not be stopped
  // at a question they have no answer for yet.
  if (values.projectType && !isProjectType(values.projectType)) {
    errors.projectType = "Choose one of the available project kinds.";
  }
  const requestedStage = isStage(values.stage) ? values.stage : null;
  if (!requestedStage) {
    errors.stage = "Choose an available project status.";
  } else if (
    requestedStage === "building" &&
    !values.now &&
    !values.docUrl &&
    !values.repoUrl &&
    !values.liveUrl
  ) {
    errors.now = "Describe the work in progress, or add a working link.";
  } else if (requestedStage === "live" && !values.liveUrl) {
    errors.liveUrl = "A live project needs a link other people can open.";
  }
  if (values.openForGitHubContributions === "yes" && !isGitHubRepositoryUrl(values.repoUrl)) {
    errors.repoUrl = "To open GitHub contributions, enter a valid public GitHub repository URL.";
  }
  if (Object.keys(errors).length > 0) return { errors, values };

  try {
    const supabase = await requireSupabase();
    const { data: project, error } = await supabase
      .from("project_overview")
      .select("id, owner_id, stage")
      .eq("slug", slug)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!project) return { errors: { form: "Project not found." }, values };
    if (project.owner_id !== viewer.id) {
      return { errors: { form: "Only the project owner can edit it." }, values };
    }

    const tags = normaliseTags(values.tags);
    const { data: updatedProject, error: updateError } = await supabase
      .from("projects")
      .update({
        title: values.title,
        tagline: values.tagline,
        highlight: values.highlight,
        problem: values.problem,
        solution: values.solution,
        audience: values.audience,
        now_text: values.now,
        doc_url: values.docUrl,
        repo_url: values.repoUrl,
        open_for_github_contributions: values.openForGitHubContributions === "yes",
        live_url: values.liveUrl,
        logo_url: values.logoUrl,
        project_type: values.projectType,
        tags,
        stage: requestedStage,
      })
      .eq("id", project.id)
      .select("id")
      .maybeSingle();
    if (updateError) throw new Error(updateError.message);
    if (!updatedProject) {
      return {
        errors: { form: "The project could not be saved. Refresh the page and try again." },
        values,
      };
    }
  } catch (error) {
    return { errors: { form: messageOf(error) }, values };
  }

  projectChanged(slug);
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

  seatsChanged(slug);
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
    nowText: project.now_text ?? "",
    docUrl: project.doc_url,
    repoUrl: project.repo_url,
    liveUrl: project.live_url,
  });
  if (!allowed) return;

  // Ownership is the database's call: the update matches no rows for anybody
  // else. This only decides whether the level itself is earned.
  const { error: updateError } = await supabase
    .from("projects")
    .update({ stage })
    .eq("id", project.id);
  if (updateError) throw new Error(updateError.message);

  projectChanged(slug);
  trailChanged(await viewerId(), slug);
  revalidatePath(`/projects/${slug}`);
  revalidatePath("/");
}

/* ------------------------------------------------------------------ *
 * Seats — the open contribution slots
 * ------------------------------------------------------------------ */

export async function openSeat(formData: FormData): Promise<void> {
  const slug = text(formData, "slug");
  const role = text(formData, "role");
  const roleTitle = text(formData, "roleTitle").slice(0, MAXIMUM.roleTitle);
  const brief = text(formData, "brief").slice(0, MAXIMUM.seatBrief);
  const commitment = formCommitment(formData, "commitment");
  if (!isRole(role) || !brief || !commitment || (role === "other" && !roleTitle)) return;

  const supabase = await requireSupabase();
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (!project) return;

  const { error } = await supabase
    .from("seats")
    .insert({
      project_id: project.id,
      role,
      role_title: role === "other" ? roleTitle : "",
      brief,
      commitment,
    });
  if (error) throw new Error(error.message);

  seatsChanged(slug);
  revalidatePath(`/projects/${slug}`);
}

/** Submit a proposal for either a role or a concrete unassigned task. */
export async function submitProposal(formData: FormData): Promise<void> {
  const slug = text(formData, "slug");
  const taskId = Number(text(formData, "taskId"));
  const seatId = Number(text(formData, "seatId"));
  const pitch = text(formData, "pitch").slice(0, MAXIMUM.pitch);
  const hasTask = Number.isInteger(taskId);
  const hasSeat = Number.isInteger(seatId);
  if (hasTask === hasSeat || !pitch) return;

  const supabase = await requireSupabase();
  const { error } = await supabase.rpc("submit_proposal", {
    target_task_id: hasTask ? taskId : null,
    target_seat_id: hasSeat ? seatId : null,
    message: pitch,
  });
  if (error) throw new Error(error.message);

  seatsChanged(slug);
  trailChanged(await viewerId(), slug);
  revalidatePath(`/projects/${slug}`);
  revalidatePath("/");
}

export async function decideProposal(formData: FormData): Promise<void> {
  const slug = text(formData, "slug");
  const proposalId = Number(text(formData, "proposalId"));
  const decision = text(formData, "decision");
  if (!Number.isInteger(proposalId) || (decision !== "terima" && decision !== "tolak")) return;

  const supabase = await requireSupabase();
  const { error } = await supabase.rpc("decide_proposal", {
    proposal_id: proposalId,
    accept: decision === "terima",
  });
  if (error) throw new Error(error.message);

  seatsChanged(slug);
  updateTag(tags.projectTrail(slug));
  revalidatePath(`/projects/${slug}`);
  revalidatePath("/");
}

/* ------------------------------------------------------------------ *
 * What the project is doing right now, and how it got here
 * ------------------------------------------------------------------ */

/**
 * Rewrites the one line that says what the project is working on.
 *
 * Its own action rather than part of the brief, because it is meant to be
 * changed often — a brief is written once and revisited, this is answered
 * every couple of weeks, and burying it behind the whole edit form is what
 * would make it go stale.
 *
 * `set_now()` rather than a plain update, for the reason `move_task` is a
 * function too: row level security is row level, not column level, so the
 * policy that let an admin write this line would also let them rewrite the
 * brief. The function also settles the level, because clearing the line can
 * cost a project the level it stood on — and `now_updated_at` is written by a
 * trigger, so the freshness people read is never something a request can set.
 */
export async function setNow(formData: FormData): Promise<void> {
  const slug = text(formData, "slug");
  const now = text(formData, "now").slice(0, MAXIMUM.now);

  const supabase = await requireSupabase();
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (!project) return;

  const { error } = await supabase.rpc("set_now", { project: project.id, line: now });
  if (error) throw new Error(error.message);

  projectChanged(slug);
  trailChanged(await viewerId(), slug);
  revalidatePath(`/projects/${slug}`);
  revalidatePath("/");
  // The same line is editable from the owner's next-steps page.
  revalidatePath("/get-started");
}

/**
 * Adds an entry to the project's journey.
 *
 * Deliberately append-only: `updates` has no UPDATE policy and no update
 * grant, so a log entry can be written and removed but never quietly reworded
 * after people have read it.
 */
export async function postUpdate(formData: FormData): Promise<void> {
  const slug = text(formData, "slug");
  const title = text(formData, "title").slice(0, UPDATE_LIMITS.title.max);
  const body = text(formData, "body").slice(0, UPDATE_LIMITS.body.max);
  if (Object.keys(validateUpdate({ title, body })).length > 0) return;

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
    .from("updates")
    .insert({ project_id: project.id, author_id: viewer.id, title, body });
  if (error) throw new Error(error.message);

  projectChanged(slug);
  updateTag(tags.updates(slug));
  trailChanged(viewer.id, slug);
  revalidatePath(`/projects/${slug}`);
  revalidatePath("/");
}

export async function deleteUpdate(formData: FormData): Promise<void> {
  const slug = text(formData, "slug");
  const updateId = Number(text(formData, "updateId"));
  if (!Number.isInteger(updateId)) return;

  const supabase = await requireSupabase();
  const { error } = await supabase.from("updates").delete().eq("id", updateId);
  if (error) throw new Error(error.message);

  projectChanged(slug);
  updateTag(tags.updates(slug));
  revalidatePath(`/projects/${slug}`);
}

/**
 * Follow a project, or stop.
 *
 * Separate from support on purpose: supporting is a verdict, following is an
 * intention to keep watching. Somebody should not have to praise a project to
 * hear about it.
 */
export async function toggleFollow(formData: FormData): Promise<void> {
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
    .from("follows")
    .select("user_id")
    .eq("project_id", project.id)
    .eq("user_id", viewer.id)
    .maybeSingle();

  const { error } = existing
    ? await supabase
        .from("follows")
        .delete()
        .eq("project_id", project.id)
        .eq("user_id", viewer.id)
    : await supabase.from("follows").insert({ project_id: project.id, user_id: viewer.id });
  if (error) throw new Error(error.message);

  // Nothing tagged to retire: who follows what is read per visitor and never
  // cached, so there is no shared copy of it to go stale.
  revalidatePath(`/projects/${slug}`);
  revalidatePath("/inbox");
}

/* ------------------------------------------------------------------ *
 * Tasks — what the project is actually working on
 * ------------------------------------------------------------------ */

export async function createTask(formData: FormData): Promise<void> {
  const slug = text(formData, "slug");
  const title = text(formData, "title").slice(0, TASK_LIMITS.title.max);
  const detail = text(formData, "detail").slice(0, TASK_LIMITS.detail.max);
  const assigneeId = text(formData, "assigneeId");
  const rawSeatId = text(formData, "seatId");
  const seatId = rawSeatId ? Number(rawSeatId) : null;
  if (rawSeatId && !Number.isInteger(seatId)) return;
  if (Object.keys(validateTask({ title, detail })).length > 0) return;

  const viewer = await currentViewer();
  if (!viewer) return;

  const supabase = await requireSupabase();
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (!project) return;

  // Who may do this is the database's call: the insert policy checks both that
  // the caller manages the project and that the assignee is on it.
  const { error } = await supabase.from("tasks").insert({
    project_id: project.id,
    title,
    detail,
    seat_id: seatId,
    assignee_id: assigneeId || null,
    created_by: viewer.id,
  });
  if (error) throw new Error(error.message);

  projectChanged(slug);
  updateTag(tags.tasks(slug));
  trailChanged(viewer.id, slug);
  revalidatePath(`/projects/${slug}`);
  revalidatePath("/");
}

/**
 * Hand a task to somebody, or take it back off them.
 *
 * Editing a task's wording is deliberately not here yet: a text field on every
 * row would bury the list under forms, and knowing who holds what is the part
 * people actually need.
 */
export async function assignTask(formData: FormData): Promise<void> {
  const slug = text(formData, "slug");
  const taskId = Number(text(formData, "taskId"));
  const assigneeId = text(formData, "assigneeId");
  if (!Number.isInteger(taskId)) return;

  const supabase = await requireSupabase();
  const { error } = await supabase
    .from("tasks")
    .update({ assignee_id: assigneeId || null })
    .eq("id", taskId);
  if (error) throw new Error(error.message);

  projectChanged(slug);
  updateTag(tags.tasks(slug));
  revalidatePath(`/projects/${slug}`);
}

/** Connect or disconnect an existing task from a role on the same project. */
export async function setTaskRole(formData: FormData): Promise<void> {
  const slug = text(formData, "slug");
  const taskId = Number(text(formData, "taskId"));
  const rawSeatId = text(formData, "seatId");
  const seatId = rawSeatId ? Number(rawSeatId) : null;
  if (!Number.isInteger(taskId) || (rawSeatId && !Number.isInteger(seatId))) return;

  const supabase = await requireSupabase();
  const { error } = await supabase.from("tasks").update({ seat_id: seatId }).eq("id", taskId);
  if (error) throw new Error(error.message);

  projectChanged(slug);
  updateTag(tags.tasks(slug));
  revalidatePath(`/projects/${slug}`);
}

export async function moveTask(formData: FormData): Promise<void> {
  const slug = text(formData, "slug");
  const taskId = Number(text(formData, "taskId"));
  const status = text(formData, "status");
  if (!Number.isInteger(taskId) || !isTaskStatus(status)) return;

  // move_task rather than an update: row level security cannot narrow a write
  // down to one column, so the assignee gets a function instead of a policy.
  const supabase = await requireSupabase();
  const { error } = await supabase.rpc("move_task", { task_id: taskId, next_status: status });
  if (error) throw new Error(error.message);

  projectChanged(slug);
  updateTag(tags.tasks(slug));
  updateTag(tags.projectTrail(slug));
  revalidatePath(`/projects/${slug}`);
  revalidatePath("/");
}

export async function deleteTask(formData: FormData): Promise<void> {
  const slug = text(formData, "slug");
  const taskId = Number(text(formData, "taskId"));
  if (!Number.isInteger(taskId)) return;

  const supabase = await requireSupabase();
  const { error } = await supabase.from("tasks").delete().eq("id", taskId);
  if (error) throw new Error(error.message);

  projectChanged(slug);
  updateTag(tags.tasks(slug));
  revalidatePath(`/projects/${slug}`);
  revalidatePath("/");
}

export async function setSeatAccess(formData: FormData): Promise<void> {
  const slug = text(formData, "slug");
  const seatId = Number(text(formData, "seatId"));
  const access = text(formData, "access");
  if (!Number.isInteger(seatId) || (access !== "member" && access !== "admin")) return;

  // Only the owner can land an 'admin' row — the seat policy checks the new
  // value against ownership, not merely against management.
  const supabase = await requireSupabase();
  const { error } = await supabase.from("seats").update({ access }).eq("id", seatId);
  if (error) throw new Error(error.message);

  seatsChanged(slug);
  revalidatePath(`/projects/${slug}`);
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

  projectChanged(slug);
  updateTag(tags.comments(slug));
  trailChanged(viewer.id, slug);
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

  projectChanged(slug);
  trailChanged(viewer.id, slug);
  revalidatePath(`/projects/${slug}`);
  revalidatePath("/");
}

/**
 * Marks every notice read.
 *
 * A button rather than a side effect of opening /inbox: a page that quietly
 * clears its own badge on render can wipe a decision somebody never actually
 * looked at, and a GET should not change anything anyway. The update matches
 * nothing for anybody else — the policy in 0008 sees to that.
 */
export async function markNoticesSeen(): Promise<void> {
  const viewer = await currentViewer();
  if (!viewer) return;

  const supabase = await requireSupabase();
  const { error } = await supabase
    .from("notices")
    .update({ seen: true })
    .eq("recipient_id", viewer.id)
    .eq("seen", false);
  if (error) throw new Error(error.message);

  // Notices belong to one recipient, so they are never part of a shared cache.
  revalidatePath("/inbox");
  revalidatePath("/", "layout");
}

/* ------------------------------------------------------------------ *
 * Profile
 * ------------------------------------------------------------------ */

/**
 * Which kinds of trail entry stay public.
 *
 * Separate from updateProfile because it belongs beside the trail rather than
 * beside the bio, and because updateProfile ends in a redirect.
 */
export async function setActivityVisibility(formData: FormData): Promise<void> {
  const viewer = await currentViewer();
  if (!viewer) return;

  const shown = formData.getAll("show").filter((value): value is string => typeof value === "string");

  const supabase = await requireSupabase();
  const { error } = await supabase
    .from("profiles")
    .update({ activity_hidden: hiddenFrom(shown, viewer.activityHidden) })
    .eq("id", viewer.id);
  if (error) throw new Error(error.message);

  trailChanged(viewer.id);
  revalidatePath(`/u/${viewer.username}`);
}

/**
 * Saves the profile, or says what is wrong with it.
 *
 * Takes the `useActionState` shape rather than returning void, because the
 * previous version silently dropped whatever it could not use: a website typed
 * without `https://` became an empty column and the page came back looking as
 * though the edit had been ignored. Now nothing is written until every field
 * is acceptable, and the form comes back with what was typed still in it.
 *
 * `profileUrl` and `profileEmail` below stay in place under the validation.
 * Validation is what turns a mistake into a sentence; those two are what keep
 * an unexpected value out of the row when a request skips the form entirely.
 */
export async function updateProfile(
  _state: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const returnTo = safeProjectReturnTo(text(formData, "returnTo"));
  const values: ProfileInput = {
    name: text(formData, "name"),
    profession: text(formData, "profession"),
    headline: text(formData, "headline"),
    bio: text(formData, "bio"),
    skills: text(formData, "skills"),
    yearsExperience: text(formData, "yearsExperience"),
    fields: text(formData, "fields"),
    website: text(formData, "website"),
    publicEmail: text(formData, "publicEmail"),
    github: text(formData, "github"),
    linkedin: text(formData, "linkedin"),
    x: text(formData, "x"),
    resume: text(formData, "resume"),
  };

  const viewer = await currentViewer();
  if (!viewer) {
    return { errors: { form: "You are no longer signed in. Sign in again, then save once more." }, values };
  }

  const errors = validateProfile(values);
  if (Object.keys(errors).length > 0) return { errors, values };

  const rawExperience = values.yearsExperience;
  const yearsExperience =
    rawExperience === ""
      ? null
      : Math.max(0, Math.min(Number(rawExperience), PROFILE_LIMITS.yearsExperience));

  const supabase = await requireSupabase();
  const { error } = await supabase
    .from("profiles")
    .update({
      name: values.name.slice(0, PROFILE_MAXIMUM.name),
      profession: values.profession.slice(0, PROFILE_MAXIMUM.profession),
      headline: values.headline.slice(0, PROFILE_MAXIMUM.headline),
      bio: values.bio.slice(0, PROFILE_MAXIMUM.bio),
      skills: normalisePeopleTerms(values.skills, PROFILE_LIMITS.skills),
      years_experience: yearsExperience,
      fields: normalisePeopleTerms(values.fields, PROFILE_LIMITS.fields),
      website: profileUrl(values.website),
      public_email: profileEmail(values.publicEmail),
      github: profileUrl(values.github),
      linkedin: profileUrl(values.linkedin),
      x_url: profileUrl(values.x),
      resume_url: profileUrl(values.resume),
    })
    .eq("id", viewer.id);
  if (error) return { errors: { form: error.message }, values };

  updateTag(tags.person(viewer.username));
  updateTag(tags.people);
  updateTag(tags.projects);
  revalidatePath(`/u/${viewer.username}`);
  revalidatePath("/people");
  revalidatePath("/get-started");
  redirect(returnTo ?? `/u/${viewer.username}?saved=1`);
}

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

/** Never turn a hidden form value into an open redirect. */
function safeProjectReturnTo(value: string): string | null {
  return value.startsWith("/projects/") && !value.startsWith("//") ? value : null;
}

/** Last gate before a link reaches the row, however the request arrived. */
function profileUrl(raw: string): string {
  const value = raw.slice(0, PROFILE_MAXIMUM.link);
  if (!value) return "";
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? value : "";
  } catch {
    return "";
  }
}

function profileEmail(raw: string): string {
  const value = raw.toLowerCase().slice(0, PROFILE_MAXIMUM.publicEmail);
  return isEmail(value) ? value : "";
}

/** Topic chips and the free-text escape hatch share the old comma-list shape. */
function formTopics(formData: FormData): string {
  const selected = formData
    .getAll("topics")
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean);
  const custom = text(formData, "customTags");
  const legacy = text(formData, "tags");
  return [...selected, custom || (selected.length === 0 ? legacy : "")].filter(Boolean).join(", ");
}

/** A preset is stored as ordinary copy; custom text takes its place when chosen. */
function formCommitment(formData: FormData, key: string): string {
  const preset = text(formData, `${key}Preset`);
  const custom = text(formData, key);
  return (preset === "custom" ? custom : preset || custom).slice(0, MAXIMUM.commitment);
}

async function freeSlug(supabase: Supabase, title: string): Promise<string> {
  const base = slugify(title);

  for (let suffix = 0; suffix < 50; suffix += 1) {
    const ending = suffix === 0 ? "" : `-${suffix + 1}`;
    const candidate = `${base.slice(0, 48 - ending.length).replace(/-+$/g, "")}${ending}`;
    const { data } = await supabase
      .from("projects")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();
    if (!data) return candidate;
  }

  const ending = `-${Date.now().toString(36)}`;
  return `${base.slice(0, 48 - ending.length).replace(/-+$/g, "")}${ending}`;
}

/** Stable pick so a project keeps the same colour and glyph on every render. */
function pick<T>(options: readonly T[], seed: string): T {
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) % 100000;
  return options[hash % options.length];
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong while saving. Please try again shortly.";
}
