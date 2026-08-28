import assert from "node:assert/strict";
import test from "node:test";

import { readPublicly } from "../app/lib/public-read.ts";
import { resilientSupabaseFetch } from "../app/lib/resilient-fetch.ts";

test("a temporary failed read is retried once", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    return calls === 1
      ? new Response(null, { status: 503 })
      : new Response("ok", { status: 200 });
  };

  try {
    const response = await resilientSupabaseFetch("https://example.test/data");
    assert.equal(response.status, 200);
    assert.equal(calls, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("a failed mutation is never replayed", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    return new Response(null, { status: 503 });
  };

  try {
    const response = await resilientSupabaseFetch("https://example.test/data", { method: "POST" });
    assert.equal(response.status, 503);
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("a failed public read returns its fallback instead of throwing", async () => {
  const originalError = console.error;
  console.error = () => {};

  try {
    const result = await readPublicly(
      "test data",
      async () => {
        throw new Error("temporary outage");
      },
      ["fallback"],
    );

    assert.deepEqual(result, { value: ["fallback"], unavailable: true });
  } finally {
    console.error = originalError;
  }
});
