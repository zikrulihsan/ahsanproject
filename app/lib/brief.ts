import { tagList } from "./stages";
import { tx, type Locale } from "./locale";

/**
 * The one thing every project must carry: a name.
 *
 * It used to be more. A project could not exist here until its owner had
 * written a problem, a solution and an audience at length, which read as a
 * standard and worked as a wall — the people whose projects this board most
 * wanted were the ones who met six required paragraphs and closed the tab.
 *
 * The brief did not go anywhere; it moved. A finished project can arrive from
 * a link, while an idea can arrive from its owner's short description; the rest
 * can be filled in afterwards from the project page. `MINIMUM` is what is left
 * of the old floor: a real name, because a row nobody can name is a row nobody
 * can find.
 */
export const MINIMUM = {
  title: 3,
} as const;

export const MAXIMUM = {
  title: 60,
  tagline: 140,
  /** projects.highlight — "what is interesting about this", in their words. */
  highlight: 280,
  problem: 2000,
  solution: 2000,
  audience: 600,
  pitch: 1000,
  comment: 2000,
  seatBrief: 400,
  /** projects.now_text — one line, so it stays a sentence and not a changelog. */
  now: 200,
  /** seats.commitment — "± 2 jam per minggu", not a contract. */
  commitment: 80,
  /** seats.role_title — only used when the shared catalogue does not fit. */
  roleTitle: 80,
  /** projects.logo_url — direct public image URL, not embedded data. */
  logoUrl: 500,
} as const;

/** The raw form values, before tags are split into a list. */
export type BriefInput = {
  title: string;
  tagline: string;
  highlight: string;
  problem: string;
  solution: string;
  audience: string;
  tags: string;
  docUrl: string;
  repoUrl: string;
  liveUrl: string;
  logoUrl: string;
};

export type FieldErrors = Partial<Record<keyof BriefInput, string>>;

const FIELD_LABELS: Record<keyof BriefInput, string> = {
  title: "Project name",
  tagline: "Short summary",
  highlight: "What is interesting about this project",
  problem: "Problem to solve",
  solution: "Proposed solution",
  audience: "Who it is for",
  tags: "Topics",
  docUrl: "Document link",
  repoUrl: "Repository link",
  liveUrl: "Project link",
  logoUrl: "Logo link",
};

const CAPPED = [
  "title",
  "tagline",
  "highlight",
  "problem",
  "solution",
  "audience",
] as const satisfies readonly (keyof typeof MAXIMUM)[];

/**
 * Checks what is written, never that something was written.
 *
 * Every field but the name is optional now, so an empty value is an answer —
 * "not said yet" — and only a value somebody actually typed is held to the
 * ceiling the database enforces.
 */
export function validateBrief(input: BriefInput, locale: Locale = "en"): FieldErrors {
  const errors: FieldErrors = {};

  const title = input.title.trim();
  if (!title) {
    errors.title = tx(locale, "Masukkan nama proyek.", "Enter the project name.");
  } else if (title.length < MINIMUM.title) {
    errors.title = tx(locale, `Nama proyek terlalu pendek—minimal ${MINIMUM.title} karakter.`, `${FIELD_LABELS.title} is too short—at least ${MINIMUM.title} characters.`);
  }

  for (const field of CAPPED) {
    const value = input[field].trim();
    if (value.length > MAXIMUM[field]) {
      errors[field] = tx(locale, `${fieldLabelId(field)} terlalu panjang—maksimal ${MAXIMUM[field]} karakter.`, `${FIELD_LABELS[field]} is too long—at most ${MAXIMUM[field]} characters.`);
    }
  }

  if (tagList(input.tags).length > 6) {
    errors.tags = tx(locale, "Gunakan maksimal enam topik.", "Use no more than six tags.");
  }

  for (const field of ["docUrl", "repoUrl", "liveUrl", "logoUrl"] as const) {
    const value = input[field].trim();
    if (value && !isHttpUrl(value)) {
      errors[field] = tx(locale, "Tautan harus diawali http:// atau https://.", "Links must start with http:// or https://.");
    } else if (field === "logoUrl" && value.length > MAXIMUM.logoUrl) {
      errors[field] = tx(locale, `URL logo terlalu panjang—maksimal ${MAXIMUM.logoUrl} karakter.`, `The logo URL is too long—at most ${MAXIMUM.logoUrl} characters.`);
    }
  }

  return errors;
}

function fieldLabelId(field: keyof BriefInput): string {
  const labels: Record<keyof BriefInput, string> = {
    title: "Nama proyek",
    tagline: "Ringkasan singkat",
    highlight: "Hal yang menarik dari proyek ini",
    problem: "Masalah yang ingin diselesaikan",
    solution: "Solusi yang diusulkan",
    audience: "Sasaran pengguna",
    tags: "Topik",
    docUrl: "Tautan dokumen",
    repoUrl: "Tautan repositori",
    liveUrl: "Tautan proyek",
    logoUrl: "Tautan logo",
  };
  return labels[field];
}

/**
 * The line a card shows under the project name.
 *
 * A project may have no one-line summary yet, in which case the owner's
 * highlight is the closest thing to one. For a link-only submission, the
 * domain is still better than an empty row.
 */
export function projectBlurb(project: {
  tagline: string;
  highlight: string;
  liveUrl: string;
  repoUrl: string;
}): string {
  const highlight = project.highlight.trim();
  return (
    project.tagline.trim() ||
    (highlight.length > 140 ? `${highlight.slice(0, 139).trimEnd()}…` : highlight) ||
    domainOf(project.liveUrl) ||
    domainOf(project.repoUrl)
  );
}

export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/** The tag field as the database wants it: lowercase, unique, at most six. */
export function normaliseTags(tags: string): string[] {
  return [...new Set(tagList(tags))].slice(0, 6);
}

export function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  // The database requires at least two characters. A valid project title can
  // still collapse to one ("A!") or none (non-Latin text), so use a stable
  // fallback rather than letting an otherwise valid save hit a constraint.
  return slug.length >= 2 ? slug : "project";
}

export function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}
