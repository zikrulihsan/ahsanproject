import assert from "node:assert/strict";
import test from "node:test";

import { MAXIMUM, MINIMUM, slugify, validateBrief } from "../app/lib/brief.ts";

function validBrief(overrides = {}) {
  return {
    title: "A valid project",
    tagline: "A clear summary of the project",
    problem: "p".repeat(MINIMUM.problem),
    solution: "s".repeat(MINIMUM.solution),
    audience: "a".repeat(MINIMUM.audience),
    tags: "community",
    docUrl: "",
    repoUrl: "",
    liveUrl: "",
    logoUrl: "",
    ...overrides,
  };
}

test("project brief accepts every field at the documented database boundary", () => {
  assert.deepEqual(validateBrief(validBrief()), {});
});

test("project brief rejects values immediately below each minimum", () => {
  for (const field of Object.keys(MINIMUM)) {
    const value = "x".repeat(MINIMUM[field] - 1);
    assert.match(validateBrief(validBrief({ [field]: value }))[field], /too short/);
  }
});

test("project brief rejects values above each maximum", () => {
  for (const field of ["title", "tagline", "problem", "solution", "audience"]) {
    const value = "x".repeat(MAXIMUM[field] + 1);
    assert.match(validateBrief(validBrief({ [field]: value }))[field], /too long/);
  }
});

test("project slugs always fit the database format", () => {
  assert.equal(slugify("A!"), "project");
  assert.equal(slugify("Project Pendidikan & Kesehatan"), "project-pendidikan-kesehatan");
  assert.equal(slugify("x".repeat(60)).length, 48);
});
