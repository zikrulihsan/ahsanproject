/**
 * Project levelling.
 *
 * A project climbs from a written-down idea to something people can actually
 * open. Each level has requirements that are checked against the project
 * itself, so the badge on a card means the same thing everywhere.
 *
 * Working alone is not a lesser project — most of the board started that way —
 * so no level asks for a team. What each level asks for is evidence the work
 * has actually moved: something written down, something to look at, something
 * to open.
 */
export const STAGES = ["idea", "validating", "building", "live", "resting"] as const;

export type Stage = (typeof STAGES)[number];

export const stageMeta: Record<Stage, { label: string; blurb: string; tone: string }> = {
  idea: {
    label: "Ide",
    blurb: "Baru gagasan, briefnya sudah ditulis dan terbuka untuk dibahas.",
    tone: "stage-idea",
  },
  validating: {
    label: "Divalidasi",
    blurb: "Sedang dicek ke calon pengguna: masalahnya nyata atau tidak.",
    tone: "stage-validating",
  },
  building: {
    label: "Dikerjakan",
    blurb: "Sudah ada yang menggarap. Timnya jalan, hasilnya belum rilis.",
    tone: "stage-building",
  },
  live: {
    label: "Sudah jalan",
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
  docUrl: string;
  repoUrl: string;
  liveUrl: string;
  seatCount: number;
};

export type Requirement = { label: string; met: boolean };

/**
 * What a project must have to sit at a given level. `resting` is a decision,
 * not an achievement, so it carries no requirements.
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
    case "validating":
      return [
        ...brief,
        {
          // A project that already shipped has cleared this bar by definition,
          // so a solo build that never opened a seat is not stuck at "idea".
          label: "Ada dokumen pendukung, peran yang dibuka, atau produknya",
          met: Boolean(project.docUrl) || project.seatCount > 0 || Boolean(project.liveUrl),
        },
      ];
    case "building":
      return [
        ...requirementsFor("validating", project),
        {
          label: "Ada tautan kerja: repo, dokumen, atau produknya",
          met: Boolean(project.repoUrl || project.docUrl || project.liveUrl),
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

/** Parses the comma-separated tag field people type into a clean list. */
export function tagList(tags: string): string[] {
  return tags
    .split(",")
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean);
}
