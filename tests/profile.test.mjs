import assert from "node:assert/strict";
import test from "node:test";

import { PROFILE_MAXIMUM, validateProfile } from "../app/lib/profile.ts";

const blank = {
  name: "",
  profession: "",
  headline: "",
  bio: "",
  skills: "",
  yearsExperience: "",
  fields: "",
  website: "",
  publicEmail: "",
  github: "",
  linkedin: "",
  x: "",
  resume: "",
};

const named = { ...blank, name: "Zikrul Ihsan" };

test("only a name is actually required", () => {
  assert.deepEqual(validateProfile(named), {});
  assert.ok(validateProfile(blank).name);
});

test("a link without a scheme is refused rather than silently dropped", () => {
  for (const field of ["website", "github", "linkedin", "x", "resume"]) {
    const errors = validateProfile({ ...named, [field]: "contoh.id/halaman" });
    assert.ok(errors[field], `${field} harus ditolak`);
  }
  assert.deepEqual(validateProfile({ ...named, website: "https://contoh.id" }), {});
});

test("a link that is not an ordinary web link is refused too", () => {
  assert.ok(validateProfile({ ...named, website: "javascript:alert(1)" }).website);
  assert.ok(validateProfile({ ...named, resume: "data:text/plain,x" }).resume);
});

test("a public email has to look like an address", () => {
  assert.ok(validateProfile({ ...named, publicEmail: "halo-at-contoh" }).publicEmail);
  assert.deepEqual(validateProfile({ ...named, publicEmail: "halo@contoh.id" }), {});
});

test("the ceilings match the columns the row is stored in", () => {
  const errors = validateProfile({
    ...named,
    bio: "a".repeat(PROFILE_MAXIMUM.bio + 1),
    headline: "b".repeat(PROFILE_MAXIMUM.headline + 1),
  });
  assert.ok(errors.bio);
  assert.ok(errors.headline);
  assert.deepEqual(validateProfile({ ...named, bio: "a".repeat(PROFILE_MAXIMUM.bio) }), {});
});

test("years of experience is a whole number, or nothing at all", () => {
  assert.deepEqual(validateProfile({ ...named, yearsExperience: "" }), {});
  assert.deepEqual(validateProfile({ ...named, yearsExperience: "5" }), {});
  assert.ok(validateProfile({ ...named, yearsExperience: "banyak" }).yearsExperience);
  assert.ok(validateProfile({ ...named, yearsExperience: "-1" }).yearsExperience);
  assert.ok(validateProfile({ ...named, yearsExperience: "80" }).yearsExperience);
  assert.ok(validateProfile({ ...named, yearsExperience: "2.5" }).yearsExperience);
});
