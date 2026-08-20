import assert from "node:assert/strict";
import test from "node:test";

import { MINIMUM, briefCompleteness, normaliseTags, slugify, validateBrief } from "../app/lib/brief.ts";
import { meetsStage, reachableStages, requirementsFor } from "../app/lib/stages.ts";

const fullBrief = {
  title: "Warung Antre",
  tagline: "Antrean digital untuk warung kecil yang ramai di jam makan.",
  problem: "x".repeat(MINIMUM.problem),
  solution: "y".repeat(MINIMUM.solution),
  audience: "z".repeat(MINIMUM.audience),
  tags: "umkm, operasional",
  docUrl: "",
  repoUrl: "",
  liveUrl: "",
};

test("a complete brief passes", () => {
  assert.deepEqual(validateBrief(fullBrief), {});
});

test("an empty project cannot be created", () => {
  const errors = validateBrief({ ...fullBrief, problem: "", solution: "terlalu pendek", tags: "" });
  assert.ok(errors.problem, "a missing problem is rejected");
  assert.ok(errors.solution, "a too-short solution is rejected");
  assert.ok(errors.tags, "a project needs at least one tag");
});

test("links must be real http links", () => {
  assert.ok(validateBrief({ ...fullBrief, docUrl: "bukan-tautan" }).docUrl);
  assert.deepEqual(validateBrief({ ...fullBrief, docUrl: "https://ahsan.example/doc" }).docUrl, undefined);
});

test("tags are de-duplicated, lowercased and capped", () => {
  assert.deepEqual(normaliseTags("UMKM, umkm , Tools"), ["umkm", "tools"]);
  assert.equal(normaliseTags("a,b,c,d,e,f,g").length, 6);
});

test("slugs stay url-safe", () => {
  assert.equal(slugify("Tap Tap Dzikr!"), "tap-tap-dzikr");
  assert.equal(slugify("  — — "), "");
});

const stageInput = {
  problem: fullBrief.problem,
  solution: fullBrief.solution,
  audience: fullBrief.audience,
  tags: ["umkm", "operasional"],
  docUrl: "",
  repoUrl: "",
  liveUrl: "",
  seatCount: 0,
};

test("a written-down idea sits at the idea level", () => {
  assert.ok(meetsStage("idea", stageInput));
  assert.deepEqual(reachableStages(stageInput), ["idea", "resting"]);
});

test("levels only open once their requirements are actually met", () => {
  const withSeat = { ...stageInput, seatCount: 1 };
  assert.ok(meetsStage("validating", withSeat));
  assert.ok(!meetsStage("building", withSeat), "building needs something to show for it");

  const building = { ...withSeat, repoUrl: "https://example.com/repo" };
  assert.ok(meetsStage("building", building));
  assert.ok(!meetsStage("live", building), "live needs a link people can open");

  assert.ok(meetsStage("live", { ...building, liveUrl: "https://example.com" }));
});

test("working alone is not a lesser project", () => {
  // Every project on the board started solo. No level may ask for a team.
  const solo = { ...stageInput, seatCount: 0, liveUrl: "https://example.com" };
  assert.ok(meetsStage("live", solo), "a solo project can still be live");
});

test("the requirement list explains what is still missing", () => {
  const missing = requirementsFor("live", stageInput).filter((requirement) => !requirement.met);
  assert.ok(missing.length > 0);
  assert.ok(missing.every((requirement) => requirement.label.length > 0));
});

test("completeness rewards a fuller brief", () => {
  const bare = briefCompleteness({ ...fullBrief, tags: ["umkm"], seatCount: 0 });
  const full = briefCompleteness({
    ...fullBrief,
    tags: ["umkm"],
    docUrl: "https://example.com/doc",
    liveUrl: "https://example.com",
    seatCount: 2,
  });
  assert.ok(full > bare);
  assert.equal(full, 100);
});
