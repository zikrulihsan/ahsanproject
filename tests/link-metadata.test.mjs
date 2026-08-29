import assert from "node:assert/strict";
import test from "node:test";

import {
  fetchLinkMetadata,
  iconHref,
  isPrivateAddress,
  metaContent,
  normaliseLink,
  titleFromLink,
} from "../app/lib/link-metadata.ts";

const PAGE = `<!doctype html><html><head>
  <title>Pamerin &mdash; ignored, og wins</title>
  <meta property="og:title" content="Pamerin &amp; friends">
  <meta name="description" content="A shorter description that loses">
  <meta property="og:description" content="Show what you built, in one link.">
  <meta property="og:site_name" content="Pamerin">
  <link rel="icon" href="/favicon-16.png" sizes="16x16">
  <link rel="apple-touch-icon" href="/apple.png">
  <meta property="og:image" content="https://cdn.example.com/card.png">
</head><body>ignored</body></html>`;

function server(routes) {
  return async (url) => {
    const route = routes[url];
    if (!route) throw new Error(`unexpected request: ${url}`);
    return new Response(route.body ?? "", {
      status: route.status ?? 200,
      headers: { "content-type": "text/html; charset=utf-8", ...(route.headers ?? {}) },
    });
  };
}

test("a bare domain is still a link", () => {
  assert.equal(normaliseLink("pamerin.lol"), "https://pamerin.lol/");
  assert.equal(normaliseLink("  https://pamerin.lol/x?a=1  "), "https://pamerin.lol/x?a=1");
  assert.equal(normaliseLink("javascript:alert(1)"), "");
  assert.equal(normaliseLink(""), "");
});

test("credentials and fragments are stripped before we request anything", () => {
  assert.equal(normaliseLink("https://user:secret@example.com/x#top"), "https://example.com/x");
});

test("the address alone yields a usable project name", () => {
  assert.equal(titleFromLink("https://github.com/zikrulihsan/ahsan-project"), "Ahsan Project");
  assert.equal(titleFromLink("https://pamerin.lol"), "Pamerin");
  assert.equal(titleFromLink("not a url"), "Project");
});

test("meta tags are read regardless of attribute style", () => {
  assert.equal(metaContent(PAGE, ["og:title"]), "Pamerin & friends");
  assert.equal(metaContent(PAGE, ["og:description", "description"]), "Show what you built, in one link.");
  assert.equal(metaContent(PAGE, ["nothing:here"]), "");
  assert.equal(metaContent(`<meta content='x' name=og:title>`, ["og:title"]), "x");
});

test("the biggest declared icon wins, and an Apple touch icon wins outright", () => {
  assert.equal(iconHref(PAGE), "/apple.png");
  assert.equal(iconHref(`<link rel="icon" href="/a.png" sizes="16x16"><link rel="icon" href="/b.png" sizes="180x180">`), "/b.png");
  assert.equal(iconHref("<p>no head at all</p>"), "");
});

test("a page describes itself, and relative icons are resolved against it", async () => {
  const metadata = await fetchLinkMetadata(
    "pamerin.lol",
    server({ "https://pamerin.lol/": { body: PAGE } }),
  );

  assert.equal(metadata.fetched, true);
  assert.equal(metadata.title, "Pamerin & friends");
  assert.equal(metadata.description, "Show what you built, in one link.");
  assert.equal(metadata.siteName, "Pamerin");
  assert.equal(metadata.iconUrl, "https://pamerin.lol/apple.png");
  assert.equal(metadata.imageUrl, "https://cdn.example.com/card.png");
  assert.equal(metadata.domain, "pamerin.lol");
});

test("redirects are followed, and the page that answers is the one recorded", async () => {
  const metadata = await fetchLinkMetadata(
    "https://pamerin.lol/old",
    server({
      "https://pamerin.lol/old": { status: 301, headers: { location: "/new" } },
      "https://pamerin.lol/new": { body: PAGE },
    }),
  );

  assert.equal(metadata.url, "https://pamerin.lol/new");
  assert.equal(metadata.title, "Pamerin & friends");
});

test("a page that will not answer costs the description, never the submission", async () => {
  for (const route of [
    { status: 403, body: "no robots here" },
    { status: 200, body: "%PDF-1.7", headers: { "content-type": "application/pdf" } },
  ]) {
    const metadata = await fetchLinkMetadata(
      "https://pamerin.lol/",
      server({ "https://pamerin.lol/": route }),
    );
    assert.equal(metadata.fetched, false);
    assert.equal(metadata.title, "Pamerin");
    assert.equal(metadata.description, "");
  }
});

test("a request that throws is not an error the person has to deal with", async () => {
  const metadata = await fetchLinkMetadata("https://pamerin.lol/", async () => {
    throw new Error("upstream is down");
  });
  assert.equal(metadata.fetched, false);
  assert.equal(metadata.title, "Pamerin");
});

test("addresses that are not on the public internet are never requested", async () => {
  const refuse = async () => {
    throw new Error("a request should never have been made");
  };

  for (const address of [
    "http://localhost:3000",
    "http://127.0.0.1/",
    "http://169.254.169.254/latest/meta-data/",
    "http://10.1.2.3/",
    "http://192.168.0.1/",
    "http://172.20.0.5/",
    "http://[::1]/",
    "http://router.local/",
    "http://metadata.internal/",
  ]) {
    const metadata = await fetchLinkMetadata(address, refuse);
    assert.equal(metadata.fetched, false, address);
  }
});

test("the private-range check knows what is routable", () => {
  for (const address of ["127.0.0.1", "10.0.0.1", "192.168.1.1", "172.16.0.1", "169.254.169.254", "::1", "fd00::1", "::ffff:127.0.0.1", "100.64.0.1"]) {
    assert.equal(isPrivateAddress(address), true, address);
  }
  for (const address of ["8.8.8.8", "172.32.0.1", "2606:4700::1111"]) {
    assert.equal(isPrivateAddress(address), false, address);
  }
});
