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

export const taskStatusMeta: Record<TaskStatus, { label: string; blurb: string; tone: string }> = {
  todo: { label: "Belum jalan", blurb: "Sudah dicatat, belum ada yang mulai.", tone: "task-todo" },
  doing: { label: "Lagi dikerjain", blurb: "Ada yang sedang menggarap ini.", tone: "task-doing" },
  done: { label: "Beres", blurb: "Sudah selesai.", tone: "task-done" },
};

export function isTaskStatus(value: string): value is TaskStatus {
  return (TASK_STATUSES as readonly string[]).includes(value);
}

/** Unknown values fall back rather than throwing, like `roleLabel`. */
export function taskStatusLabel(value: string): string {
  return isTaskStatus(value) ? taskStatusMeta[value].label : taskStatusMeta.todo.label;
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

export function validateTask(input: TaskInput): TaskErrors {
  const errors: TaskErrors = {};
  const title = input.title.trim();
  const detail = input.detail.trim();

  if (!title) {
    errors.title = "Tugasnya belum diberi judul.";
  } else if (title.length < TASK_LIMITS.title.min) {
    errors.title = `Judul tugasnya terlalu pendek — minimal ${TASK_LIMITS.title.min} karakter.`;
  } else if (title.length > TASK_LIMITS.title.max) {
    errors.title = `Judul tugasnya terlalu panjang — maksimal ${TASK_LIMITS.title.max} karakter.`;
  }

  if (detail.length > TASK_LIMITS.detail.max) {
    errors.detail = `Penjelasannya terlalu panjang — maksimal ${TASK_LIMITS.detail.max} karakter.`;
  }

  return errors;
}

/** Groups tasks for display: what is moving first, what is finished last. */
export const TASK_ORDER: TaskStatus[] = ["doing", "todo", "done"];
