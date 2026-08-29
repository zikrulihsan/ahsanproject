import { roleLabel } from "./roles";
import { isStage, stageMeta } from "./stages";

/**
 * The trail a profile shows: what somebody has actually done, written by the
 * database as it happens rather than typed in afterwards.
 *
 * Keep this list in step with `events_kind_valid` and
 * `profiles_activity_hidden_valid` in supabase/migrations/0005_activity.sql —
 * the same duplication the project already accepts between STAGES and
 * `projects_stage_valid`.
 */
export const EVENT_KINDS = [
  "project_created",
  "project_stage_changed",
  "seat_opened",
  "seat_applied",
  "seat_filled",
  "task_created",
  "task_taken",
  "task_done",
  "comment_posted",
  "boost_given",
  "update_posted",
] as const;

export type EventKind = (typeof EVENT_KINDS)[number];

/** Labels for the checkbox list where somebody chooses what stays public. */
export const eventKindMeta: Record<EventKind, { label: string }> = {
  project_created: { label: "Added a new idea" },
  project_stage_changed: { label: "Changed a project stage" },
  seat_opened: { label: "Opened a role" },
  seat_applied: { label: "Applied for a role" },
  seat_filled: { label: "Joined a project" },
  task_created: { label: "Added a task" },
  task_taken: { label: "Took a task" },
  task_done: { label: "Completed a task" },
  comment_posted: { label: "Joined a discussion" },
  boost_given: { label: "Supported a project" },
  update_posted: { label: "Posted an update" },
};

export function isEventKind(value: string): value is EventKind {
  return (EVENT_KINDS as readonly string[]).includes(value);
}

/**
 * The kinds a profile leads with.
 *
 * A portfolio is a claim about work, so the default trail shows the entries
 * that carry weight — starting something, moving it, joining, finishing —
 * and keeps the running commentary (comments, boosts, applications, task
 * bookkeeping) behind "tampilkan semua". Nothing is hidden by this: it is a
 * reading order, not a visibility rule, which stays with `activity_hidden`.
 */
export const HIGHLIGHT_KINDS = [
  "project_created",
  "project_stage_changed",
  "seat_opened",
  "seat_filled",
  "task_done",
  "update_posted",
] as const satisfies readonly EventKind[];

/**
 * The kinds a project's own history keeps.
 *
 * The project page already shows its tasks, its discussion and its support as
 * live state, right above the trail — replaying them underneath said the same
 * thing twice, and pushed the entries only the trail can carry off the bottom
 * of the section. What is left is how the project got here: it started, it
 * moved level, it asked for help, somebody joined.
 *
 * `seat_applied` is deliberately out. Who applied, and was still waiting, is
 * between them and the people running the project — the pending list above
 * already shows it to exactly those people, and this trail is public.
 */
export const PROJECT_MEMORY_KINDS = [
  "project_created",
  "project_stage_changed",
  "seat_opened",
  "seat_filled",
] as const satisfies readonly EventKind[];

/*
 * `update_posted` is not in the list above on purpose: the project page renders
 * the update itself, with its own words, in the same journey. Repeating it as
 * "X mengabari perkembangan Y" would say the same thing twice, one line apart.
 */

export type ActivityLike = {
  kind: string;
  projectTitle: string;
  payload: Record<string, string>;
};

/**
 * A trail entry split around the project title, so the page can make the title
 * a link without this module knowing anything about markup.
 */
export function activityParts(event: ActivityLike): { lead: string; trail: string } {
  const { payload } = event;
  const role = payload.role ? roleLabel(payload.role) : "";
  const task = payload.task_title ?? "";
  const stage = payload.to && isStage(payload.to) ? stageMeta[payload.to].label : payload.to;

  switch (event.kind) {
    case "project_created":
      return { lead: "added ", trail: "." };
    case "project_stage_changed":
      return { lead: "moved ", trail: ` to ${stage}.` };
    case "seat_opened":
      return { lead: `opened the ${role} role on `, trail: "." };
    case "seat_applied":
      return { lead: `applied as ${role} on `, trail: "." };
    case "seat_filled":
      return { lead: "started working on ", trail: ` as ${role}.` };
    case "task_created":
      return { lead: `added the task “${task}” to `, trail: "." };
    case "task_taken":
      return { lead: `took the task “${task}” on `, trail: "." };
    case "task_done":
      return { lead: `completed the task “${task}” on `, trail: "." };
    case "comment_posted":
      return { lead: "joined the discussion on ", trail: "." };
    case "boost_given":
      return { lead: "supported ", trail: "." };
    case "update_posted":
      return { lead: "posted an update on ", trail: payload.update_title ? `: “${payload.update_title}”.` : "." };
    default:
      // A kind this build has not heard of still reads as something, the same
      // way roleLabel falls back rather than throwing.
      return { lead: "contributed to ", trail: "." };
  }
}

export function activitySentence(event: ActivityLike): string {
  const { lead, trail } = activityParts(event);
  return `${lead}${event.projectTitle}${trail}`;
}

/**
 * The checkbox form submits what should stay visible; the column stores what
 * should not. Anything this build does not know about is left alone, so an
 * older page cannot quietly un-hide a kind it never rendered.
 */
export function hiddenFrom(shown: string[], current: string[] = []): string[] {
  const unknown = current.filter((kind) => !isEventKind(kind));
  const hidden = EVENT_KINDS.filter((kind) => !shown.includes(kind));
  return [...new Set([...hidden, ...unknown])];
}
