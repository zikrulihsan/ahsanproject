import assert from "node:assert/strict";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("renders the Ahsan Project portal", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<title>Ahsan Project — Ide kecil, dampak baik<\/title>/i);
  assert.match(html, /Tap Tap Dzikr/);
  assert.match(html, /Wecard/);
  assert.match(html, /CariKontak/);
  assert.match(html, /Invoice Cepat/);
  assert.match(html, /Main Aman/);
  assert.match(html, /Swegrowth/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/i);
});
