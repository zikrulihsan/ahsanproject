import { tagList } from "./stages";

/**
 * The bare minimum a project must carry before it exists here.
 *
 * The point of the rule is that nobody can post a one-line "ide bagus" and
 * walk away: whoever reads it should be able to tell what the problem is, what
 * the guess at a solution is, and who it is for.
 */
export const MINIMUM = {
  title: 3,
  tagline: 20,
  problem: 120,
  solution: 120,
  audience: 40,
} as const;

export const MAXIMUM = {
  title: 60,
  tagline: 140,
  problem: 2000,
  solution: 2000,
  audience: 600,
  pitch: 1000,
  comment: 2000,
  seatBrief: 400,
} as const;

/** The raw form values, before tags are split into a list. */
export type BriefInput = {
  title: string;
  tagline: string;
  problem: string;
  solution: string;
  audience: string;
  tags: string;
  docUrl: string;
  repoUrl: string;
  liveUrl: string;
};

export type FieldErrors = Partial<Record<keyof BriefInput, string>>;

const FIELD_LABELS: Record<keyof typeof MINIMUM, string> = {
  title: "Nama proyek",
  tagline: "Satu kalimat ringkas",
  problem: "Masalah yang mau dibereskan",
  solution: "Gambaran solusinya",
  audience: "Untuk siapa",
};

export function validateBrief(input: BriefInput): FieldErrors {
  const errors: FieldErrors = {};

  for (const field of Object.keys(MINIMUM) as (keyof typeof MINIMUM)[]) {
    const value = input[field].trim();
    if (!value) {
      errors[field] = `${FIELD_LABELS[field]} belum diisi.`;
    } else if (value.length < MINIMUM[field]) {
      errors[field] = `${FIELD_LABELS[field]} masih terlalu pendek — minimal ${MINIMUM[field]} karakter, baru ${value.length}.`;
    } else if (value.length > MAXIMUM[field]) {
      errors[field] = `${FIELD_LABELS[field]} terlalu panjang — maksimal ${MAXIMUM[field]} karakter.`;
    }
  }

  if (tagList(input.tags).length === 0) {
    errors.tags = "Isi minimal satu tag supaya idenya gampang ditemukan.";
  } else if (tagList(input.tags).length > 6) {
    errors.tags = "Maksimal enam tag.";
  }

  for (const field of ["docUrl", "repoUrl", "liveUrl"] as const) {
    const value = input[field].trim();
    if (value && !isHttpUrl(value)) {
      errors[field] = "Tautan harus diawali http:// atau https://.";
    }
  }

  return errors;
}

export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/** How full the brief is, 0–100. Drives the meter on the project page. */
export function briefCompleteness(project: {
  problem: string;
  solution: string;
  audience: string;
  tags: string[];
  docUrl: string;
  repoUrl: string;
  liveUrl: string;
  seatCount: number;
}): number {
  const checks = [
    project.problem.length >= MINIMUM.problem,
    project.solution.length >= MINIMUM.solution,
    project.audience.length >= MINIMUM.audience,
    project.tags.length > 0,
    Boolean(project.docUrl || project.repoUrl),
    project.seatCount > 0,
    Boolean(project.liveUrl),
  ];

  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

/** The tag field as the database wants it: lowercase, unique, at most six. */
export function normaliseTags(tags: string): string[] {
  return [...new Set(tagList(tags))].slice(0, 6);
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}
