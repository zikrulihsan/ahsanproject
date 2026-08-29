import type { PersonAtWork } from "./data";
import { profileReady } from "./next-steps";

export const PEOPLE_PAGE_SIZE = 12;

export const EXPERIENCE_BANDS = ["0-2", "3-5", "6-10", "10+"] as const;
export type ExperienceBand = (typeof EXPERIENCE_BANDS)[number];

export const experienceBandLabel: Record<ExperienceBand, string> = {
  "0-2": "0–2 tahun",
  "3-5": "3–5 tahun",
  "6-10": "6–10 tahun",
  "10+": "10+ tahun",
};

export type PeopleFilters = {
  q: string;
  profession: string;
  skill: string;
  experience: ExperienceBand | "";
  field: string;
  involvement: "building" | "helping" | "";
};

export type PeopleFacets = {
  professions: { value: string; count: number }[];
  skills: { value: string; count: number }[];
  fields: { value: string; count: number }[];
};

/**
 * The label used to place somebody at a glance.
 *
 * Older profiles only have `headline`, while profiles created after migration
 * 0013 can state a profession explicitly. A role held on a project is the last
 * fallback because it is verifiable, even when the profile is still sparse.
 */
export function primaryProfession(entry: PersonAtWork): string {
  return (
    entry.person.profession.trim() ||
    entry.person.headline.trim() ||
    entry.roles[0] ||
    (entry.building.length > 0 ? "Project Builder" : "")
  );
}

/**
 * A public profile only joins the talent pool once it contains the details the
 * directory can actually match: a profession, at least one skill, and a short
 * introduction. The same rule drives the onboarding step, so the promise made
 * there and the people shown here cannot drift apart.
 */
export function isTalentPoolMember(entry: PersonAtWork): boolean {
  return profileReady(entry.person);
}

/** URL filters are exact facets; search is the deliberately broad path. */
export function filterAndRankPeople(
  people: PersonAtWork[],
  filters: PeopleFilters,
): PersonAtWork[] {
  const query = searchable(filters.q);
  const profession = searchable(filters.profession);
  const skill = searchable(filters.skill);
  const field = searchable(filters.field);

  return people
    .filter((entry) => {
      if (profession && searchable(primaryProfession(entry)) !== profession) return false;
      if (skill && !entry.person.skills.some((value) => searchable(value) === skill)) return false;
      if (field && !entry.person.fields.some((value) => searchable(value) === field)) return false;
      if (filters.experience && !experienceMatches(entry.person.yearsExperience, filters.experience)) {
        return false;
      }
      if (filters.involvement === "building" && entry.building.length === 0) return false;
      if (filters.involvement === "helping" && entry.helping.length === 0) return false;
      if (query && relevance(entry, query) === 0) return false;
      return true;
    })
    .sort((a, b) => {
      if (query) {
        const byRelevance = relevance(b, query) - relevance(a, query);
        if (byRelevance !== 0) return byRelevance;
      }

      // Evidence breaks a tie, but never becomes a public score on the card.
      const aWork = a.building.length * 2 + a.helping.length;
      const bWork = b.building.length * 2 + b.helping.length;
      return bWork - aWork || a.person.name.localeCompare(b.person.name, "id");
    });
}

export function peopleFacets(people: PersonAtWork[]): PeopleFacets {
  return {
    professions: countValues(people.flatMap((entry) => [primaryProfession(entry)])),
    skills: countValues(people.flatMap((entry) => entry.person.skills)),
    fields: countValues(people.flatMap((entry) => entry.person.fields)),
  };
}

/**
 * The terms other people already use, most common first.
 *
 * Fed to the profile editor as a `<datalist>`. Suggesting rather than
 * constraining: somebody typing "Riset Pengguna" when the rest of the site
 * writes "User Research" is two entries in the talent pool that should have
 * been one, and nobody can see that from inside their own form.
 */
export function termSuggestions(
  people: { skills: string[]; fields: string[] }[],
  key: "skills" | "fields",
  limit = 40,
): string[] {
  return countValues(people.flatMap((person) => person[key]))
    .slice(0, limit)
    .map((entry) => entry.value);
}

export function peoplePage<T>(items: T[], requestedPage: number, pageSize = PEOPLE_PAGE_SIZE) {
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Math.min(Math.max(1, Math.trunc(requestedPage) || 1), pageCount);
  const offset = (page - 1) * pageSize;
  const pageItems = items.slice(offset, offset + pageSize);

  return {
    items: pageItems,
    page,
    pageCount,
    total: items.length,
    from: pageItems.length > 0 ? offset + 1 : 0,
    to: offset + pageItems.length,
  };
}

export function isExperienceBand(value: string): value is ExperienceBand {
  return (EXPERIENCE_BANDS as readonly string[]).includes(value);
}

/** Comma/newline input as clean, display-ready, case-insensitively unique terms. */
export function normalisePeopleTerms(value: string, limit: number): string[] {
  const seen = new Set<string>();
  const terms: string[] = [];

  for (const raw of value.split(/[,\n]/)) {
    const term = raw.trim().replace(/\s+/g, " ").slice(0, 50);
    const key = searchable(term);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    terms.push(term);
    if (terms.length === limit) break;
  }

  return terms;
}

function relevance(entry: PersonAtWork, query: string): number {
  const name = searchable(entry.person.name);
  const username = searchable(entry.person.username);
  const profession = searchable(primaryProfession(entry));
  const exactSkills = entry.person.skills.map(searchable);
  let score = 0;

  if (name === query || username === query) score += 120;
  if (name.startsWith(query) || username.startsWith(query)) score += 70;
  if (name.includes(query) || username.includes(query)) score += 45;
  if (profession === query) score += 65;
  if (profession.includes(query)) score += 38;
  if (exactSkills.includes(query)) score += 55;

  const haystack = searchable(
    [
      entry.person.headline,
      entry.person.bio,
      ...entry.person.skills,
      ...entry.person.fields,
      ...entry.roles,
      ...entry.building.flatMap((project) => [project.title, project.tagline, ...project.tags]),
      ...entry.helping.flatMap((project) => [project.title, project.tagline, ...project.tags]),
    ].join(" "),
  );
  if (haystack.includes(query)) score += 20;

  return score;
}

function experienceMatches(years: number | null, band: ExperienceBand): boolean {
  if (years === null) return false;
  if (band === "0-2") return years <= 2;
  if (band === "3-5") return years >= 3 && years <= 5;
  if (band === "6-10") return years >= 6 && years <= 10;
  return years >= 10;
}

function countValues(values: string[]): { value: string; count: number }[] {
  const labels = new Map<string, { value: string; count: number }>();

  for (const raw of values) {
    const value = raw.trim();
    const key = searchable(value);
    if (!key) continue;
    const current = labels.get(key);
    labels.set(key, { value: current?.value ?? value, count: (current?.count ?? 0) + 1 });
  }

  return [...labels.values()].sort(
    (a, b) => b.count - a.count || a.value.localeCompare(b.value, "id"),
  );
}

function searchable(value: string): string {
  return value
    .toLocaleLowerCase("id")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}
