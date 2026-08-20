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
] as const;

export type EventKind = (typeof EVENT_KINDS)[number];

/** Labels for the checkbox list where somebody chooses what stays public. */
export const eventKindMeta: Record<EventKind, { label: string }> = {
  project_created: { label: "Menaruh ide baru" },
  project_stage_changed: { label: "Memindahkan level proyek" },
  seat_opened: { label: "Membuka peran" },
  seat_applied: { label: "Melamar peran" },
  seat_filled: { label: "Gabung ke proyek" },
  task_created: { label: "Menambah tugas" },
  task_taken: { label: "Kebagian tugas" },
  task_done: { label: "Membereskan tugas" },
  comment_posted: { label: "Ikut membahas" },
  boost_given: { label: "Mendukung proyek" },
};

export function isEventKind(value: string): value is EventKind {
  return (EVENT_KINDS as readonly string[]).includes(value);
}

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
      return { lead: "menaruh ide ", trail: "." };
    case "project_stage_changed":
      return { lead: "memindahkan ", trail: ` ke level ${stage}.` };
    case "seat_opened":
      return { lead: `membuka peran ${role} di `, trail: "." };
    case "seat_applied":
      return { lead: `melamar sebagai ${role} di `, trail: "." };
    case "seat_filled":
      return { lead: "mulai menggarap ", trail: ` sebagai ${role}.` };
    case "task_created":
      return { lead: `menambah tugas “${task}” di `, trail: "." };
    case "task_taken":
      return { lead: `kebagian tugas “${task}” di `, trail: "." };
    case "task_done":
      return { lead: `membereskan tugas “${task}” di `, trail: "." };
    case "comment_posted":
      return { lead: "ikut membahas ", trail: "." };
    case "boost_given":
      return { lead: "mendukung ", trail: "." };
    default:
      // A kind this build has not heard of still reads as something, the same
      // way roleLabel falls back rather than throwing.
      return { lead: "ikut mengerjakan ", trail: "." };
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
