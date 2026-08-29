/**
 * What kind of thing a project is.
 *
 * A different question from `stages.ts` and from the topic tags, and it has to
 * stay that way or the three collapse into one muddled label. A stage says how
 * far the work has got; a topic says what it is about; the type here says why
 * it exists — and, because of that, what joining it actually means for whoever
 * offers to help.
 *
 * That last part is the whole reason this exists. Somebody scanning the board
 * is not only asking "can I do this work"; they are asking "do I want this kind
 * of arrangement". A weekend experiment where nothing is expected of you and a
 * product with paying customers can want the very same role and be completely
 * different things to say yes to. Without this, the only way to find that out
 * was to read the brief and guess.
 *
 * Store the key, never the label — the same rule as `roles.ts`. The Indonesian
 * copy can be rewritten without touching a single row.
 */
export const PROJECT_TYPES = ["pet", "community", "product", "commercial"] as const;

export type ProjectType = (typeof PROJECT_TYPES)[number];

export const projectTypeMeta: Record<
  ProjectType,
  {
    label: string;
    /** What the project is. */
    blurb: string;
    /** What contributing to it is like — the part people are really choosing. */
    contribution: string;
    tone: string;
  }
> = {
  pet: {
    label: "Pet project",
    blurb: "Built alone, to learn, try things out, and enjoy it.",
    contribution:
      "Relaxed, and open to experiment. No deadlines and no pay — what you take away is the experience and the work itself.",
    tone: "type-pet",
  },
  community: {
    label: "Community project",
    blurb: "Built in the open for shared benefit rather than for profit.",
    contribution:
      "Work alongside many people, on something everyone ends up owning. A good fit if you want the work used widely.",
    tone: "type-community",
  },
  product: {
    label: "Product with users",
    blurb: "Already used by people outside the team, and not monetised.",
    contribution:
      "What you build reaches users who are already there. That brings a release rhythm, and the responsibility that comes with it.",
    tone: "type-product",
  },
  commercial: {
    label: "Commercial project",
    blurb: "Earning money already, or deliberately heading that way.",
    contribution:
      "There is money involved. Settle what you get — pay, a share, or ownership — before you start.",
    tone: "type-commercial",
  },
};

/**
 * A project that has not said which it is.
 *
 * Every project made before this existed is one, and an empty value is the only
 * honest thing to store for them: guessing would put a claim on somebody's row
 * that they never made. New projects have to pick — see `createProject` — so
 * the gap closes on its own rather than being papered over.
 */
export const PROJECT_TYPE_UNSET = "";

export function isProjectType(value: string): value is ProjectType {
  return (PROJECT_TYPES as readonly string[]).includes(value);
}

/** The visible name, or an empty string when the project has not said. */
export function projectTypeLabel(value: string): string {
  return isProjectType(value) ? projectTypeMeta[value].label : "";
}

/** The badge's colour class, or an empty string when there is no badge to draw. */
export function projectTypeTone(value: string): string {
  return isProjectType(value) ? projectTypeMeta[value].tone : "";
}

/** What joining this kind of project means, for the project page to say out loud. */
export function projectTypeContribution(value: string): string {
  return isProjectType(value) ? projectTypeMeta[value].contribution : "";
}
