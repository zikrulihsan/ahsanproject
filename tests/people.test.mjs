import assert from "node:assert/strict";
import test from "node:test";
import {
  filterAndRankPeople,
  normalisePeopleTerms,
  peopleFacets,
  peoplePage,
  primaryProfession,
} from "../app/lib/people.ts";

const person = (overrides = {}) => ({
  id: overrides.id ?? "u-1",
  username: overrides.username ?? "rina",
  name: overrides.name ?? "Rina Putri",
  profession: overrides.profession ?? "Frontend Developer",
  headline: overrides.headline ?? "Membuat produk publik yang mudah dipakai",
  bio: overrides.bio ?? "",
  skills: overrides.skills ?? ["Next.js", "TypeScript"],
  yearsExperience: overrides.yearsExperience ?? 4,
  fields: overrides.fields ?? ["Fintech"],
  website: "",
  github: "",
  activityHidden: [],
});

const project = (id, title) => ({ id, title, tagline: "Project untuk warga", tags: ["publik"] });

const entry = (overrides = {}) => ({
  person: person(overrides.person),
  building: overrides.building ?? [project(1, "Bayar Mudah")],
  helping: overrides.helping ?? [],
  roles: overrides.roles ?? [],
});

const emptyFilters = {
  q: "",
  profession: "",
  skill: "",
  experience: "",
  field: "",
  involvement: "",
};

test("people search reads identity, profession, skill, and proof of work", () => {
  const rina = entry();
  for (const q of ["rina", "frontend", "typescript", "bayar mudah", "publik"]) {
    assert.deepEqual(filterAndRankPeople([rina], { ...emptyFilters, q }), [rina], q);
  }
  assert.deepEqual(filterAndRankPeople([rina], { ...emptyFilters, q: "videografer" }), []);
});

test("people filters combine profession, skill, experience, field, and involvement", () => {
  const rina = entry();
  const matching = {
    ...emptyFilters,
    profession: "frontend developer",
    skill: "next.js",
    experience: "3-5",
    field: "fintech",
    involvement: "building",
  };
  assert.deepEqual(filterAndRankPeople([rina], matching), [rina]);
  assert.deepEqual(filterAndRankPeople([rina], { ...matching, experience: "10+" }), []);
  assert.deepEqual(filterAndRankPeople([rina], { ...matching, involvement: "helping" }), []);
});

test("profession falls back to an evidenced project role on sparse profiles", () => {
  const sparse = entry({
    person: { profession: "", headline: "" },
    building: [],
    helping: [project(2, "Kelas Sore")],
    roles: ["Mentor"],
  });
  assert.equal(primaryProfession(sparse), "Mentor");
});

test("facets count labels case-insensitively and profile terms stay clean", () => {
  const rina = entry();
  const dita = entry({ person: { id: "u-2", username: "dita", skills: ["next.js", "Figma"] } });
  const facets = peopleFacets([rina, dita]);
  assert.deepEqual(facets.skills[0], { value: "Next.js", count: 2 });
  assert.deepEqual(normalisePeopleTerms(" Figma, figma\nUser Research,  ", 10), ["Figma", "User Research"]);
});

test("pagination clamps pages and reports the visible range", () => {
  const values = Array.from({ length: 25 }, (_, index) => index + 1);
  assert.deepEqual(peoplePage(values, 2, 10), {
    items: [11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
    page: 2,
    pageCount: 3,
    total: 25,
    from: 11,
    to: 20,
  });
  assert.equal(peoplePage(values, 99, 10).page, 3);
});
