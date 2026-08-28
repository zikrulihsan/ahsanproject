import assert from "node:assert/strict";
import test from "node:test";

import {
  faviconUrl,
  projectLogoUrl,
  safeNextPath,
  signInPath,
  startPath,
  strayCodeTarget,
} from "../app/lib/urls.ts";

const params = (query) => new URLSearchParams(query);

test("a redirect target stays inside this site", () => {
  assert.equal(safeNextPath("/projects/warung-antre"), "/projects/warung-antre");
  assert.equal(safeNextPath("/?stage=idea"), "/?stage=idea");
});

test("anything pointing off-site collapses to the board", () => {
  for (const hostile of [
    "https://contoh-jahat.example/curi",
    "//contoh-jahat.example/curi",
    "javascript:alert(1)",
    "",
    null,
    undefined,
  ]) {
    assert.equal(safeNextPath(hostile), "/", `${hostile} harus jadi /`);
  }
});

test("the sign-in link carries a safe destination, or none at all", () => {
  assert.equal(signInPath("/new"), "/signin?next=%2Fnew");
  assert.equal(signInPath("/"), "/signin");
  assert.equal(signInPath("https://contoh-jahat.example"), "/signin");
});

test("a plain sign-in lands on the next-steps page", () => {
  assert.equal(startPath("/"), "/mulai");
  assert.equal(startPath(""), "/mulai");
  assert.equal(startPath(null), "/mulai");
  // Anything off-site collapses to "/" first, so it cannot skip past /mulai.
  assert.equal(startPath("https://contoh-jahat.example"), "/mulai");
});

test("a destination somebody actually asked for always wins", () => {
  assert.equal(startPath("/projects/warung-antre"), "/projects/warung-antre");
  assert.equal(startPath("/akun/password"), "/akun/password");
  assert.equal(startPath("/kolaborasi?cari=desain"), "/kolaborasi?cari=desain");
});

test("a code stranded off the callback is sent where it can be spent", () => {
  assert.deepEqual(
    strayCodeTarget("/mulai", params("code=abc&next=%2F"), false),
    { pathname: "/auth/callback", search: "code=abc" },
  );
  // A destination worth keeping survives the detour.
  assert.deepEqual(
    strayCodeTarget("/", params("code=abc&next=%2Fkolaborasi"), false),
    { pathname: "/auth/callback", search: "code=abc&next=%2Fkolaborasi" },
  );
});

test("with no next of its own, the page the code landed on becomes the destination", () => {
  assert.deepEqual(
    strayCodeTarget("/kolaborasi", params("code=abc"), false),
    { pathname: "/auth/callback", search: "code=abc&next=%2Fkolaborasi" },
  );
});

test("a hostile next cannot ride in on a stray code", () => {
  assert.deepEqual(
    strayCodeTarget("/", params("code=abc&next=https%3A%2F%2Fjahat.example"), false),
    { pathname: "/auth/callback", search: "code=abc" },
  );
});

test("the callback itself is never redirected to itself", () => {
  assert.equal(strayCodeTarget("/auth/callback", params("code=abc&next=%2F"), false), null);
  assert.equal(strayCodeTarget("/auth/callback", params("code=abc"), true), null);
});

test("a request with no code is left alone", () => {
  assert.equal(strayCodeTarget("/mulai", params(""), false), null);
  assert.equal(strayCodeTarget("/mulai", params("semua=1"), true), null);
});

test("somebody already signed in keeps their session and loses the spent code", () => {
  // Spending it again would fail and throw them back to /signin.
  assert.deepEqual(
    strayCodeTarget("/mulai", params("code=abc&semua=1"), true),
    { pathname: "/mulai", search: "semua=1" },
  );
  assert.deepEqual(
    strayCodeTarget("/", params("code=abc"), true),
    { pathname: "/", search: "" },
  );
});

test("a project website becomes a sized favicon request", () => {
  assert.equal(
    faviconUrl("https://swegrowth.id/program?tab=baru"),
    "https://www.google.com/s2/favicons?domain_url=https%3A%2F%2Fswegrowth.id&sz=128",
  );
});

test("missing, malformed, and non-web links keep the initials fallback", () => {
  for (const value of ["", "swegrowth.id", "javascript:alert(1)", "data:image/png,x", null]) {
    assert.equal(faviconUrl(value), "");
  }
});

test("a project logo accepts only ordinary web image URLs", () => {
  assert.equal(projectLogoUrl("https://flipcard.id/favicon.ico"), "https://flipcard.id/favicon.ico");
  for (const value of ["", "flipcard.id/logo.png", "data:image/png,x", "javascript:alert(1)"]) {
    assert.equal(projectLogoUrl(value), "");
  }
});
