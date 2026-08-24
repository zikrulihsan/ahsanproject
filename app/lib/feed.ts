/**
 * The board's main cut.
 *
 * Lanes, not sorts. Somebody arriving is asking "what is worth looking at" or
 * "what can I help with" — not "order this by boost count descending". Each
 * lane is a question, and the filters below it (topic, level, role) narrow the
 * answer.
 *
 * Its own module because it is pure: the unit tests reach it directly, and
 * anything living in `data.ts` pulls in the Supabase client and, through it,
 * `next/headers`.
 */
export const LANES = ["untukmu", "terbaru", "aktif", "butuh-bantuan", "dibangun", "berjalan"] as const;

export type Lane = (typeof LANES)[number];

export function isLane(value: string): value is Lane {
  return (LANES as readonly string[]).includes(value);
}

/**
 * The "untukmu" lane, arranged.
 *
 * No machine learning and no secret score — three plain rules, in order:
 * a project asking for a role this person has held before comes first, then
 * anything else asking for help, then the rest. Within each band the order the
 * database already gave stands, which is "moved most recently".
 *
 * Pure so it can be read and tested; exported for the same reason.
 */
export function arrangeForYou<T extends { openRoles: string[]; openSeatCount: number }>(
  projects: T[],
  familiarRoles: readonly string[] = [],
): T[] {
  const band = (project: T): number => {
    if (familiarRoles.some((role) => project.openRoles.includes(role))) return 0;
    if (project.openSeatCount > 0) return 1;
    return 2;
  };

  // Index as the tiebreak keeps it a stable sort on every engine, so the
  // database's ordering survives inside each band.
  return projects
    .map((project, index) => ({ project, index, band: band(project) }))
    .sort((a, b) => a.band - b.band || a.index - b.index)
    .map((entry) => entry.project);
}
