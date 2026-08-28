/**
 * What a profile may carry, and what to say when it does not.
 *
 * The ceilings here are the same ones `profiles` checks in
 * `0001_schema.sql`, `0013_people_directory.sql`, and `0014_profile_links.sql`.
 * They are repeated rather than inferred on purpose: a mismatch would turn a
 * fixable typo into a Postgres constraint error nobody can read.
 *
 * No Next.js or Supabase imports, so `tests/profile.test.mjs` can call these
 * directly.
 */

import { isHttpUrl } from "./brief";

export const PROFILE_MAXIMUM = {
  name: 80,
  profession: 80,
  headline: 140,
  bio: 800,
  publicEmail: 254,
  /** website, github, linkedin, x, resume — one ceiling, five columns. */
  link: 300,
} as const;

export const PROFILE_LIMITS = {
  skills: 20,
  fields: 10,
  yearsExperience: 60,
} as const;

/** The raw form values, before skills and fields are split into lists. */
export type ProfileInput = {
  name: string;
  profession: string;
  headline: string;
  bio: string;
  skills: string;
  yearsExperience: string;
  fields: string;
  website: string;
  publicEmail: string;
  github: string;
  linkedin: string;
  x: string;
  resume: string;
};

export type ProfileFieldErrors = Partial<Record<keyof ProfileInput, string>>;

const LINK_FIELDS = ["website", "github", "linkedin", "x", "resume"] as const;

const LABELS: Record<keyof ProfileInput, string> = {
  name: "Nama",
  profession: "Profesi",
  headline: "Satu baris tentang kamu",
  bio: "Cerita singkat",
  skills: "Skill",
  yearsExperience: "Lama pengalaman",
  fields: "Bidang",
  website: "Situs",
  publicEmail: "Email publik",
  github: "GitHub",
  linkedin: "LinkedIn",
  x: "X / Twitter",
  resume: "Tautan résumé",
};

const TEXT_CEILINGS = {
  name: PROFILE_MAXIMUM.name,
  profession: PROFILE_MAXIMUM.profession,
  headline: PROFILE_MAXIMUM.headline,
  bio: PROFILE_MAXIMUM.bio,
} as const;

/**
 * Everything wrong with a profile, by field.
 *
 * Only `name` is required — a profile that says nothing about its owner is
 * their business. What this refuses is input that would be silently thrown
 * away instead: a link with no scheme, an address that is not an address, a
 * bio past the column's ceiling.
 */
export function validateProfile(input: ProfileInput): ProfileFieldErrors {
  const errors: ProfileFieldErrors = {};

  const name = input.name.trim();
  if (!name) {
    errors.name = "Namamu belum diisi.";
  } else if (name.length > PROFILE_MAXIMUM.name) {
    errors.name = tooLong("name", PROFILE_MAXIMUM.name);
  }

  for (const field of ["profession", "headline", "bio"] as const) {
    if (input[field].trim().length > TEXT_CEILINGS[field]) {
      errors[field] = tooLong(field, TEXT_CEILINGS[field]);
    }
  }

  const experience = input.yearsExperience.trim();
  if (experience) {
    const years = Number(experience);
    if (!Number.isInteger(years) || years < 0 || years > PROFILE_LIMITS.yearsExperience) {
      errors.yearsExperience = `Lama pengalaman diisi angka bulat 0–${PROFILE_LIMITS.yearsExperience}, atau dikosongkan.`;
    }
  }

  for (const field of LINK_FIELDS) {
    const value = input[field].trim();
    if (!value) continue;
    if (!isHttpUrl(value)) {
      errors[field] = `${LABELS[field]} harus berupa tautan yang diawali http:// atau https://.`;
    } else if (value.length > PROFILE_MAXIMUM.link) {
      errors[field] = tooLong(field, PROFILE_MAXIMUM.link);
    }
  }

  const email = input.publicEmail.trim();
  if (email && !isEmail(email)) {
    errors.publicEmail = "Alamat email publiknya belum benar.";
  } else if (email.length > PROFILE_MAXIMUM.publicEmail) {
    errors.publicEmail = tooLong("publicEmail", PROFILE_MAXIMUM.publicEmail);
  }

  return errors;
}

export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function tooLong(field: keyof ProfileInput, ceiling: number): string {
  return `${LABELS[field]} terlalu panjang — maksimal ${ceiling} karakter.`;
}
