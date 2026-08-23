/**
 * Where a project is in its life.
 *
 * Four levels, not five. Somebody browsing is not looking for "a project that
 * is being validated" — they are looking for something being built that they
 * could help with, so validation is a step in the journey rather than a status
 * of its own, and it lives in the project's updates now.
 *
 * Working alone is not a lesser project — most of the board started that way —
 * so no level asks for a team. What each level asks for is evidence the work
 * has actually moved: something written down, something being worked on right
 * now, something other people can open.
 */
export const STAGES = ["idea", "building", "live", "resting"] as const;

export type Stage = (typeof STAGES)[number];

export const stageMeta: Record<Stage, { label: string; blurb: string; tone: string }> = {
  idea: {
    label: "Ide",
    blurb: "Baru gagasan, tapi sudah ditulis serius dan terbuka untuk dibahas.",
    tone: "stage-idea",
  },
  building: {
    label: "Sedang dibangun",
    blurb: "Ada yang sedang menggarapnya. Hasilnya belum bisa dipakai orang lain.",
    tone: "stage-building",
  },
  live: {
    label: "Sudah berjalan",
    blurb: "Sudah bisa dipakai orang lain hari ini juga.",
    tone: "stage-live",
  },
  resting: {
    label: "Diistirahatkan",
    blurb: "Sedang tidak dikerjakan. Boleh diambil alih atau dilanjutkan.",
    tone: "stage-resting",
  },
};

export function isStage(value: string): value is Stage {
  return (STAGES as readonly string[]).includes(value);
}

/** Everything a level check needs to know about a project. */
export type StageInput = {
  problem: string;
  solution: string;
  audience: string;
  tags: string[];
  /** What the project is working on right now — see projects.now_text. */
  nowText: string;
  docUrl: string;
  repoUrl: string;
  liveUrl: string;
};

export type Requirement = { label: string; met: boolean };

/**
 * What a project must have to sit at a given level.
 *
 * `building` accepts the "sekarang sedang…" line as evidence, not only a link.
 * Somebody who has just started has nothing to link yet and is still building;
 * saying out loud what they are working on is the same claim, and it is the
 * one a single row can vouch for — which matters, because the CHECK constraint
 * in the schema enforces the same rule and cannot see other tables.
 *
 * `resting` is a decision, not an achievement, so it carries no requirements.
 */
export function requirementsFor(stage: Stage, project: StageInput): Requirement[] {
  const brief: Requirement[] = [
    {
      label: "Brief terisi: masalah, solusi, dan untuk siapa",
      met: Boolean(project.problem && project.solution && project.audience),
    },
    { label: "Punya minimal satu tag", met: project.tags.length > 0 },
  ];

  switch (stage) {
    case "idea":
      return brief;
    case "building":
      return [
        ...brief,
        {
          label: "Ada yang sedang dikerjakan, atau tautan kerjanya",
          met: Boolean(project.nowText || project.repoUrl || project.docUrl || project.liveUrl),
        },
      ];
    case "live":
      return [
        ...requirementsFor("building", project),
        { label: "Ada tautan yang bisa dibuka orang lain", met: Boolean(project.liveUrl) },
      ];
    case "resting":
      return [];
  }
}

export function meetsStage(stage: Stage, project: StageInput): boolean {
  return requirementsFor(stage, project).every((requirement) => requirement.met);
}

/** Levels the project is allowed to move to right now. */
export function reachableStages(project: StageInput): Stage[] {
  return STAGES.filter((stage) => meetsStage(stage, project));
}

/**
 * The level a project should sit at after an edit.
 *
 * Editing can take away what a level stood on — clearing the live link on a
 * project marked "sudah berjalan", say. Rather than refuse the edit or leave a
 * badge that lies, the project drops to the highest level it still earns.
 * A level that is still earned is never touched, and `resting` is a decision
 * rather than an achievement, so it stays put.
 */
export function settleStage(current: Stage, project: StageInput): Stage {
  if (current === "resting" || meetsStage(current, project)) return current;

  const earned = reachableStages(project).filter((stage) => stage !== "resting");
  return earned.length > 0 ? earned[earned.length - 1] : "idea";
}

/**
 * The three rungs a project climbs, for the journey rail.
 *
 * Deliberately not a percentage and not four segments of a bar: a project is
 * not 75% done, and a bar that says so makes this look like a tracker. Three
 * dots say where it is and nothing more.
 */
export const RUNGS = ["idea", "building", "live"] as const satisfies readonly Stage[];

export function rungIndex(stage: Stage): number {
  return (RUNGS as readonly Stage[]).indexOf(stage);
}

/** Parses the comma-separated tag field people type into a clean list. */
export function tagList(tags: string): string[] {
  return tags
    .split(",")
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean);
}
