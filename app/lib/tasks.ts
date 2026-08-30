/**
 * What a project is actually working on.
 *
 * Deliberately thin — three statuses, one person, no dates. Enough to answer
 * "lagi ngerjain apa" without turning into an issue tracker. The database
 * values stay English tokens; the Indonesian words live here, the same way
 * `stages.ts` and `roles.ts` already work.
 */
export const TASK_STATUSES = ["todo", "doing", "done"] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

import { tx, type Locale } from "./locale";

export const taskStatusMeta: Record<TaskStatus, { label: string; blurb: string; tone: string }> = {
  todo: { label: "Belum dimulai", blurb: "Sudah dicatat, tetapi belum ada yang mengerjakannya.", tone: "task-todo" },
  doing: { label: "Sedang dikerjakan", blurb: "Ada yang sedang mengerjakan ini.", tone: "task-doing" },
  done: { label: "Selesai", blurb: "Sudah diselesaikan.", tone: "task-done" },
};

const TASK_STATUS_EN: Record<TaskStatus, { label: string; blurb: string }> = {
  todo: { label: "Not started", blurb: "Recorded, but nobody has started it yet." },
  doing: { label: "In progress", blurb: "Someone is working on this." },
  done: { label: "Done", blurb: "Completed." },
};

export function taskStatusBlurb(value: string, locale: Locale): string {
  const status = isTaskStatus(value) ? value : "todo";
  return tx(locale, taskStatusMeta[status].blurb, TASK_STATUS_EN[status].blurb);
}

export function isTaskStatus(value: string): value is TaskStatus {
  return (TASK_STATUSES as readonly string[]).includes(value);
}

/** Unknown values fall back rather than throwing, like `roleLabel`. */
export function taskStatusLabel(value: string, locale: Locale = "en"): string {
  const status = isTaskStatus(value) ? value : "todo";
  return tx(locale, taskStatusMeta[status].label, TASK_STATUS_EN[status].label);
}

export function taskStatusTone(value: string): string {
  return isTaskStatus(value) ? taskStatusMeta[value].tone : taskStatusMeta.todo.tone;
}

/** Matches the CHECK constraints in supabase/migrations/0004_access_and_tasks.sql. */
export const TASK_LIMITS = {
  title: { min: 3, max: 120 },
  detail: { max: 400 },
} as const;

export type TaskInput = { title: string; detail: string };
export type TaskErrors = Partial<Record<keyof TaskInput, string>>;

export function validateTask(input: TaskInput, locale: Locale = "en"): TaskErrors {
  const errors: TaskErrors = {};
  const title = input.title.trim();
  const detail = input.detail.trim();

  if (!title) {
    errors.title = tx(locale, "Beri judul untuk tugas ini.", "Give this task a title.");
  } else if (title.length < TASK_LIMITS.title.min) {
    errors.title = tx(locale, `Judul tugas terlalu pendek—minimal ${TASK_LIMITS.title.min} karakter.`, `The task title is too short—at least ${TASK_LIMITS.title.min} characters.`);
  } else if (title.length > TASK_LIMITS.title.max) {
    errors.title = tx(locale, `Judul tugas terlalu panjang—maksimal ${TASK_LIMITS.title.max} karakter.`, `The task title is too long—at most ${TASK_LIMITS.title.max} characters.`);
  }

  if (detail.length > TASK_LIMITS.detail.max) {
    errors.detail = tx(locale, `Deskripsi terlalu panjang—maksimal ${TASK_LIMITS.detail.max} karakter.`, `The description is too long—at most ${TASK_LIMITS.detail.max} characters.`);
  }

  return errors;
}

/** Groups tasks for display: what is moving first, what is finished last. */
export const TASK_ORDER: TaskStatus[] = ["doing", "todo", "done"];
