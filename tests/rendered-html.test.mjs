import assert from "node:assert/strict";
import test from "node:test";

/**
 * These run against the built worker with no D1 binding attached, so the site
 * serves the read-only seed from `app/lib/seed.ts` (see `app/lib/data.ts`).
 */
async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

async function html(path) {
  const response = await render(path);
  assert.equal(response.status, 200, `${path} should render`);
  return response.text();
}

test("the board lists every seeded project", async () => {
  const page = await html("/");
  assert.match(page, /<title>Ahsan Project — Tempat ide dikerjakan bareng<\/title>/i);
  for (const name of ["Tap Tap Dzikr", "Wecard", "CariKontak", "Invoice Cepat", "Main Aman", "Swegrowth", "Warung Antre", "Titip Jemput"]) {
    assert.match(page, new RegExp(name));
  }
  assert.doesNotMatch(page, /codex-preview|react-loading-skeleton/i);
});

test("the stage filter narrows the board", async () => {
  const page = await html("/?stage=idea");
  assert.match(page, /Warung Antre/);
  assert.doesNotMatch(page, /Tap Tap Dzikr/);
});

test("search matches the brief, not just the title", async () => {
  const page = await html("/?q=antrean");
  assert.match(page, /Warung Antre/);
  assert.doesNotMatch(page, /Swegrowth/);
});

test("a project page shows its brief, level and open roles", async () => {
  const page = await html("/projects/warung-antre");
  assert.match(page, /<title>Warung Antre — Ahsan Project<\/title>/i);
  assert.match(page, /Masalah yang mau dibereskan/);
  assert.match(page, /Gambaran solusinya/);
  assert.match(page, /Untuk siapa/);
  assert.match(page, /Level proyek/);
  assert.match(page, /Researcher/);
  assert.match(page, /Masuk untuk ambil peran/);
});

test("a profile page doubles as that person's portfolio", async () => {
  const page = await html("/u/zikrulihsan");
  assert.match(page, /Zikrul Ihsan/);
  assert.match(page, /Proyeknya/);
  assert.match(page, /Tap Tap Dzikr/);
});

test("the story page is available in both languages", async () => {
  const id = await html("/about");
  assert.match(id, /Nama saya Ihsan/);
  const en = await html("/en/about");
  assert.match(en, /My name is Ihsan/);
  assert.match(en, /lang="en"/);
  assert.match(id, /href="\/en\/about"/);
  assert.match(en, /href="\/about"/);
});

test("the old English homepage still leads somewhere", async () => {
  const response = await render("/en");
  assert.ok([307, 308].includes(response.status), `expected a redirect, got ${response.status}`);
  assert.match(response.headers.get("location") ?? "", /\/en\/about$/);
});

test("an unknown project is a 404, not a crash", async () => {
  const response = await render("/projects/tidak-ada");
  assert.equal(response.status, 404);
});
