import assert from "node:assert/strict";
import test from "node:test";

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

const PROJECTS = [
  "Tap Tap Dzikr",
  "Wecard",
  "CariKontak",
  "Invoice Cepat",
  "Main Aman",
  "Swegrowth",
];

test("renders the Indonesian portal", async () => {
  const response = await render("/");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<title>Ahsan Project — Ide kecil, manfaat nyata<\/title>/i);
  assert.match(html, /Sudah jalan/);
  for (const name of PROJECTS) assert.match(html, new RegExp(name));
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/i);
});

test("renders the English portal", async () => {
  const response = await render("/en");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<title>Ahsan Project — Small ideas, actually useful<\/title>/i);
  assert.match(html, /Small ideas\./);
  assert.match(html, /lang="en"/);
  for (const name of PROJECTS) assert.match(html, new RegExp(name));
});

test("each language links to the other", async () => {
  const id = await (await render("/")).text();
  const en = await (await render("/en")).text();
  assert.match(id, /href="\/en"/);
  assert.match(en, /href="\/"/);
});
