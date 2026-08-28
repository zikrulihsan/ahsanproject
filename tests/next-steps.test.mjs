import assert from "node:assert/strict";
import test from "node:test";

import { hasContact, nextSteps, profileReady, remainingSteps } from "../app/lib/next-steps.ts";

const emptyPerson = {
  profession: "",
  headline: "",
  bio: "",
  skills: [],
  website: "",
  publicEmail: "",
  github: "",
  linkedin: "",
  x: "",
  resume: "",
};

const filledPerson = {
  ...emptyPerson,
  profession: "Frontend Developer",
  headline: "Membangun antarmuka yang bisa dipakai orang biasa.",
  skills: ["Next.js", "Figma"],
  publicEmail: "halo@contoh.id",
};

const project = (over = {}) => ({ slug: "warung-antre", nowText: "", openSeatCount: 0, ...over });

test("a brand new account owes the three starting steps", () => {
  const steps = nextSteps({ person: emptyPerson, owned: [], contributing: [] });
  assert.deepEqual(
    remainingSteps(steps).map((step) => step.id),
    ["project", "talent", "contact"],
  );
});

test("the project steps stay hidden until there is a project to say them about", () => {
  const steps = nextSteps({ person: emptyPerson, owned: [], contributing: [] });
  assert.equal(steps.some((step) => step.id === "now"), false);
  assert.equal(steps.some((step) => step.id === "role"), false);
});

test("helping on somebody else's project counts as showing work", () => {
  const steps = nextSteps({ person: emptyPerson, owned: [], contributing: [{ role: "designer" }] });
  assert.equal(steps.find((step) => step.id === "project").done, true);
});

test("a filled profile with a live project owes nothing", () => {
  const steps = nextSteps({
    person: filledPerson,
    owned: [project({ nowText: "Menyusun materi pertama." })],
    contributing: [],
  });
  assert.deepEqual(remainingSteps(steps), []);
});

test("opening a role is offered but never owed", () => {
  const steps = nextSteps({
    person: filledPerson,
    owned: [project({ nowText: "Menyusun materi pertama." })],
    contributing: [],
  });
  const role = steps.find((step) => step.id === "role");
  assert.equal(role.done, false);
  assert.equal(role.optional, true);
  assert.equal(remainingSteps(steps).includes(role), false);
});

test("the now step points at a project that has not said anything yet", () => {
  const steps = nextSteps({
    person: filledPerson,
    owned: [project({ slug: "sudah", nowText: "Sedang uji coba." }), project({ slug: "belum" })],
    contributing: [],
  });
  const now = steps.find((step) => step.id === "now");
  assert.equal(now.href, "/projects/belum");
  // One project speaking is enough for the step itself to be settled.
  assert.equal(now.done, true);
});

test("a profile needs a profession, a skill, and something written", () => {
  assert.equal(profileReady(emptyPerson), false);
  assert.equal(profileReady({ ...emptyPerson, profession: "Desainer" }), false);
  assert.equal(profileReady({ ...emptyPerson, profession: "Desainer", skills: ["Figma"] }), false);
  assert.equal(profileReady(filledPerson), true);
  // Whitespace is not an answer.
  assert.equal(profileReady({ ...filledPerson, profession: "   " }), false);
});

test("any one public link is enough to be reachable", () => {
  assert.equal(hasContact(emptyPerson), false);
  assert.equal(hasContact({ ...emptyPerson, resume: "https://contoh.id/cv.pdf" }), true);
  assert.equal(hasContact({ ...emptyPerson, github: "  " }), false);
});
