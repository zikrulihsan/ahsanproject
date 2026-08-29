/**
 * The journey a project writes for itself.
 *
 * `events` records what happened, written by triggers, and nobody can forge an
 * entry. This is the other half: what the people building it say about it —
 * what got finished, what is being tried, what turned out to be wrong. One is
 * evidence, the other is the story, and a project page needs both.
 *
 * Kept as thin as the task list: a headline and a paragraph. No cover image,
 * no formatting, no comments of its own. What makes an update worth reading is
 * that it is recent and true, not that it is decorated.
 */

/** Matches the CHECK constraints in supabase/migrations/0010_showcase.sql. */
export const UPDATE_LIMITS = {
  title: { min: 3, max: 120 },
  body: { max: 1000 },
} as const;

export type UpdateInput = { title: string; body: string };
export type UpdateErrors = Partial<Record<keyof UpdateInput, string>>;

export function validateUpdate(input: UpdateInput): UpdateErrors {
  const errors: UpdateErrors = {};
  const title = input.title.trim();
  const body = input.body.trim();

  if (!title) {
    errors.title = "Give this update a title.";
  } else if (title.length < UPDATE_LIMITS.title.min) {
    errors.title = `The title is too short—at least ${UPDATE_LIMITS.title.min} characters.`;
  } else if (title.length > UPDATE_LIMITS.title.max) {
    errors.title = `The title is too long—at most ${UPDATE_LIMITS.title.max} characters.`;
  }

  if (body.length > UPDATE_LIMITS.body.max) {
    errors.body = `The details are too long—at most ${UPDATE_LIMITS.body.max} characters.`;
  }

  return errors;
}

/**
 * "18 Agustus" — how a journey entry is dated.
 *
 * Day and month, no year: the journey is read top to bottom, and the year is
 * only news at the point it changes, which `journeyYear` below marks instead.
 */
export function journeyDate(value: string): string {
  const then = parse(value);
  if (Number.isNaN(then)) return "";
  return new Intl.DateTimeFormat("en-US", { day: "numeric", month: "long" }).format(then);
}

export function journeyYear(value: string): string {
  const then = parse(value);
  return Number.isNaN(then) ? "" : String(new Date(then).getFullYear());
}

function parse(value: string): number {
  return Date.parse(value.includes("T") ? value : value.replace(" ", "T") + "Z");
}
