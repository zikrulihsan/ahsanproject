import assert from "node:assert/strict";
import test from "node:test";

import { MINIMUM, normaliseTags, slugify, validateBrief } from "../app/lib/brief.ts";
import { meetsStage, reachableStages, requirementsFor, rungIndex, settleStage } from "../app/lib/stages.ts";
import { validateUpdate, journeyDate } from "../app/lib/updates.ts";
import { arrangeForYou } from "../app/lib/feed.ts";
import { taskStatusLabel, validateTask } from "../app/lib/tasks.ts";
import { accessOf, canManage, isOwner } from "../app/lib/access.ts";
import { EVENT_KINDS, activitySentence, hiddenFrom } from "../app/lib/activity.ts";
import { ROLES, isRole, normaliseRole, roleLabel } from "../app/lib/roles.ts";

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
  logoUrl: "",
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
  assert.ok(validateBrief({ ...fullBrief, logoUrl: "data:image/png,x" }).logoUrl);
  assert.ok(validateBrief({ ...fullBrief, logoUrl: `https://example.com/${"x".repeat(500)}` }).logoUrl);
});

test("tags are de-duplicated, lowercased and capped", () => {
  assert.deepEqual(normaliseTags("UMKM, umkm , Tools"), ["umkm", "tools"]);
  assert.equal(normaliseTags("a,b,c,d,e,f,g").length, 6);
});

test("slugs stay url-safe", () => {
  assert.equal(slugify("Tap Tap Dzikr!"), "tap-tap-dzikr");
  assert.equal(slugify("  — — "), "");
});

test("posisi project hanya menerima role dari katalog bersama", () => {
  assert.ok(ROLES.length > 10, "katalog cukup spesifik untuk beberapa jenis project");
  assert.ok(isRole("ui-ux-designer"));
  assert.ok(isRole("frontend-developer"));
  assert.ok(isRole("other"), "role di luar katalog punya jalur yang sah");
  assert.ok(!isRole("desainer sesuka pemilik"));
  assert.equal(roleLabel("ui-ux-designer"), "UI/UX Designer");
  assert.equal(roleLabel("other", "Videografer"), "Videografer");
  assert.equal(roleLabel("other"), "Role lainnya");
});

test("role lama dinormalisasi supaya tautan dan data existing tetap bekerja", () => {
  assert.equal(normaliseRole("pm"), "product-manager");
  assert.equal(normaliseRole("design"), "ui-ux-designer");
  assert.equal(normaliseRole("entah"), null);
});

const stageInput = {
  problem: fullBrief.problem,
  solution: fullBrief.solution,
  audience: fullBrief.audience,
  tags: ["umkm", "operasional"],
  nowText: "",
  docUrl: "",
  repoUrl: "",
  liveUrl: "",
};

test("a written-down idea sits at the idea level", () => {
  assert.ok(meetsStage("idea", stageInput));
  assert.deepEqual(reachableStages(stageInput), ["idea", "resting"]);
});

test("levels only open once their requirements are actually met", () => {
  assert.ok(!meetsStage("building", stageInput), "building needs something to show for it");

  const building = { ...stageInput, repoUrl: "https://example.com/repo" };
  assert.ok(meetsStage("building", building));
  assert.ok(!meetsStage("live", building), "live needs a link people can open");

  assert.ok(meetsStage("live", { ...building, liveUrl: "https://example.com" }));
});

test("saying what you are working on is evidence enough to be building", () => {
  // Somebody who has just started has nothing to link yet, and is still
  // building. The CHECK constraint in 0010_showcase.sql agrees.
  const started = { ...stageInput, nowText: "Menyusun materi pertama." };
  assert.ok(meetsStage("building", started));
  assert.ok(!meetsStage("live", started), "still nothing anybody else can open");
});

test("working alone is not a lesser project", () => {
  // Every project on the board started solo. No level may ask for a team.
  const solo = { ...stageInput, liveUrl: "https://example.com" };
  assert.ok(meetsStage("live", solo), "a solo project can still be live");
});

test("the requirement list explains what is still missing", () => {
  const missing = requirementsFor("live", stageInput).filter((requirement) => !requirement.met);
  assert.ok(missing.length > 0);
  assert.ok(missing.every((requirement) => requirement.label.length > 0));
});

test("the journey rail has three rungs, and resting is not one of them", () => {
  assert.equal(rungIndex("idea"), 0);
  assert.equal(rungIndex("building"), 1);
  assert.equal(rungIndex("live"), 2);
  assert.equal(rungIndex("resting"), -1, "resting is a decision, not a rung");
});

test("an edit that removes what a level stood on drops the level", () => {
  const live = {
    ...stageInput,
    repoUrl: "https://example.com/repo",
    liveUrl: "https://example.com",
  };
  assert.equal(settleStage("live", live), "live", "an earned level is left alone");

  // The owner clears the live link. "Sudah berjalan" is no longer true.
  const withoutLink = { ...live, liveUrl: "" };
  assert.equal(settleStage("live", withoutLink), "building");

  // And clearing everything drops it all the way back to an idea.
  assert.equal(settleStage("live", stageInput), "idea");
});

test("clearing the now line can cost a project its level", () => {
  const started = { ...stageInput, nowText: "Lagi bikin prototipe." };
  assert.equal(settleStage("building", started), "building");
  assert.equal(settleStage("building", { ...started, nowText: "" }), "idea");
});

test("resting is a decision, so an edit never moves it", () => {
  assert.equal(settleStage("resting", stageInput), "resting");
});

/* ------------------------------------------------------------------ *
 * The journey a project writes for itself
 * ------------------------------------------------------------------ */

test("an update needs a headline worth reading", () => {
  assert.ok(validateUpdate({ title: "", body: "" }).title);
  assert.ok(validateUpdate({ title: "ab", body: "" }).title, "two characters is not a headline");
  assert.deepEqual(validateUpdate({ title: "Draft pertama selesai", body: "" }), {});
  assert.ok(validateUpdate({ title: "Selesai juga", body: "x".repeat(1001) }).body);
});

test("journey entries are dated by day and month", () => {
  assert.match(journeyDate("2026-08-18 09:00:00"), /18/);
  assert.equal(journeyDate("bukan tanggal"), "", "an unreadable date says nothing rather than NaN");
});

/* ------------------------------------------------------------------ *
 * The board's "untuk kamu" lane
 * ------------------------------------------------------------------ */

const listing = [
  { id: 1, openRoles: [], openSeatCount: 0 },
  { id: 2, openRoles: ["design"], openSeatCount: 1 },
  { id: 3, openRoles: ["research"], openSeatCount: 2 },
];

test("projects asking for help come before ones that are not", () => {
  const arranged = arrangeForYou(listing, []);
  assert.deepEqual(arranged.map((project) => project.id), [2, 3, 1]);
});

test("a role somebody has held before comes first", () => {
  const arranged = arrangeForYou(listing, ["research"]);
  assert.deepEqual(arranged.map((project) => project.id), [3, 2, 1]);
});

test("arranging never drops or duplicates a project", () => {
  const arranged = arrangeForYou(listing, ["design", "research"]);
  assert.equal(arranged.length, listing.length);
  assert.deepEqual(new Set(arranged.map((project) => project.id)), new Set([1, 2, 3]));
});

test("within a band the order the board gave is kept", () => {
  // Both ask for help and neither is familiar, so "moved most recently" — the
  // order the database returned — has to survive the sort.
  const arranged = arrangeForYou([listing[2], listing[1], listing[0]], []);
  assert.deepEqual(arranged.map((project) => project.id), [3, 2, 1]);
});

/* ------------------------------------------------------------------ *
 * Tasks and access levels
 * ------------------------------------------------------------------ */

const seat = (status, access, id) => ({ status, access, person: id ? { id } : null });

test("a task needs a title somebody can read", () => {
  assert.deepEqual(validateTask({ title: "Sketsa layar penjual", detail: "Satu layar saja." }), {});
  assert.ok(validateTask({ title: "", detail: "" }).title, "an empty title is rejected");
  assert.ok(validateTask({ title: "ab", detail: "" }).title, "two characters is not a title");
  assert.ok(validateTask({ title: "t".repeat(121), detail: "" }).title, "an essay is not a title");
  assert.ok(validateTask({ title: "Judul cukup", detail: "d".repeat(401) }).detail);
  assert.deepEqual(validateTask({ title: "Judul cukup", detail: "" }).detail, undefined, "detail is optional");
});

test("an unknown task status falls back rather than throwing", () => {
  assert.equal(taskStatusLabel("doing"), "Lagi dikerjain");
  assert.equal(taskStatusLabel("entah"), taskStatusLabel("todo"));
});

test("access is read from the seat somebody actually holds", () => {
  const owner = "u-owner";
  const seats = [
    seat("filled", "admin", "u-admin"),
    seat("filled", "member", "u-member"),
    seat("pending", "member", "u-applicant"),
    seat("open", "member", null),
  ];

  assert.equal(accessOf(owner, owner, seats), "owner");
  assert.equal(accessOf("u-admin", owner, seats), "admin");
  assert.equal(accessOf("u-member", owner, seats), "member");
  assert.equal(accessOf("u-applicant", owner, seats), "guest", "an application is not membership");
  assert.equal(accessOf("u-stranger", owner, seats), "guest");
  assert.equal(accessOf(null, owner, seats), "guest");
});

test("admins run the work; owners run the project", () => {
  assert.ok(canManage("owner"));
  assert.ok(canManage("admin"));
  assert.ok(!canManage("member"), "a member does not manage the task list");
  assert.ok(!canManage("guest"));

  assert.ok(isOwner("owner"));
  assert.ok(!isOwner("admin"), "an admin is not a second owner");
});

/* ------------------------------------------------------------------ *
 * The activity trail
 * ------------------------------------------------------------------ */

const trail = (kind, payload = {}) => ({ kind, projectTitle: "Warung Antre", payload });

test("every kind of trail entry reads as a sentence", () => {
  const cases = {
    project_created: /menaruh ide Warung Antre\./,
    project_stage_changed: /memindahkan Warung Antre ke tahap Sudah berjalan\./,
    seat_opened: /membuka peran Researcher di Warung Antre\./,
    seat_applied: /melamar sebagai Researcher di Warung Antre\./,
    seat_filled: /mulai menggarap Warung Antre sebagai Researcher\./,
    task_created: /menambah tugas .Tulis brief-nya. di Warung Antre\./,
    task_taken: /kebagian tugas .Tulis brief-nya. di Warung Antre\./,
    task_done: /membereskan tugas .Tulis brief-nya. di Warung Antre\./,
    comment_posted: /ikut membahas Warung Antre\./,
    boost_given: /mendukung Warung Antre\./,
    update_posted: /mengabari perkembangan Warung Antre/,
  };

  for (const kind of EVENT_KINDS) {
    const sentence = activitySentence(
      trail(kind, { role: "research", to: "live", task_title: "Tulis brief-nya" }),
    );
    assert.match(sentence, cases[kind], `${kind} harus terbaca`);
  }
});

test("a kind this build has not heard of still reads as something", () => {
  assert.match(activitySentence(trail("entah-apa")), /ikut mengerjakan Warung Antre\./);
});

test("the checkbox form maps back to the kinds that stay hidden", () => {
  assert.deepEqual(hiddenFrom([...EVENT_KINDS]), [], "everything checked hides nothing");
  assert.deepEqual(hiddenFrom([]).sort(), [...EVENT_KINDS].sort(), "nothing checked hides everything");

  const shown = EVENT_KINDS.filter((kind) => kind !== "comment_posted");
  assert.deepEqual(hiddenFrom([...shown]), ["comment_posted"]);
});

test("an older page cannot un-hide a kind it never rendered", () => {
  // The form only submits the kinds this build knows about, so anything else
  // already stored has to survive the round trip untouched.
  const hidden = hiddenFrom([...EVENT_KINDS], ["kind_dari_masa_depan"]);
  assert.deepEqual(hidden, ["kind_dari_masa_depan"]);
});
