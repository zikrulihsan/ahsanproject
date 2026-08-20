import assert from "node:assert/strict";
import test, { after, before } from "node:test";
import { spawn } from "node:child_process";

/**
 * Renders the built site and reads what comes back.
 *
 * These run with no Supabase credentials, so the site serves the read-only seed
 * from `app/lib/seed.ts` (see `app/lib/data.ts`). That covers every page and
 * every guest path. What it cannot cover is the signed-in half — that needs a
 * real Supabase project; see `tests/supabase.test.mjs`.
 */
const PORT = 3100;
const BASE = `http://127.0.0.1:${PORT}`;

let server;

before(async () => {
  server = spawn("npx", ["next", "start", "-p", String(PORT)], {
    // Its own process group, so shutting down takes the whole tree with it.
    detached: true,
    // Nothing reads the server's output, and an undrained pipe eventually
    // fills up and wedges the process.
    stdio: "ignore",
    env: {
      ...process.env,
      NEXT_PUBLIC_SUPABASE_URL: "",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
    },
  });

  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    try {
      await fetch(BASE, { redirect: "manual" });
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 400));
    }
  }
  throw new Error("next start tidak siap dalam 60 detik");
});

after(() => {
  if (server?.pid) {
    try {
      process.kill(-server.pid, "SIGTERM");
    } catch {
      server.kill("SIGTERM");
    }
  }
});

async function html(path) {
  const response = await fetch(BASE + path);
  assert.equal(response.status, 200, `${path} harus tampil`);
  return response.text();
}

const SEEDED = [
  "Tap Tap Dzikr",
  "Wecard",
  "CariKontak",
  "Invoice Cepat",
  "Main Aman",
  "Swegrowth",
  "Warung Antre",
  "Titip Jemput",
];

test("papan menampilkan semua proyek bawaan", async () => {
  const page = await html("/");
  assert.match(page, /<title>Ahsan Project — Tempat ide dikerjakan bareng<\/title>/i);
  for (const name of SEEDED) assert.match(page, new RegExp(name));
});

test("saringan level mempersempit papan", async () => {
  const page = await html("/?stage=idea");
  assert.match(page, /Warung Antre/);
  assert.doesNotMatch(page, /Tap Tap Dzikr/);
});

test("pencarian membaca brief, bukan cuma judul", async () => {
  const page = await html("/?q=antrean");
  assert.match(page, /Warung Antre/);
  assert.doesNotMatch(page, /Swegrowth/);
});

test("halaman proyek memuat brief, level, dan peran terbuka", async () => {
  const page = await html("/projects/warung-antre");
  assert.match(page, /<title>Warung Antre — Ahsan Project<\/title>/i);
  assert.match(page, /Masalah yang mau dibereskan/);
  assert.match(page, /Level proyek/);
  assert.match(page, /Researcher/);
  assert.match(page, /Masuk untuk ambil peran/);
});

test("halaman orang sekaligus jadi portofolionya", async () => {
  const page = await html("/u/zikrulihsan");
  assert.match(page, /Zikrul Ihsan/);
  assert.match(page, /Proyeknya/);
  assert.match(page, /Tap Tap Dzikr/);
});

test("halaman cerita tersedia dalam dua bahasa", async () => {
  const id = await html("/about");
  assert.match(id, /Nama saya Ihsan/);
  const en = await html("/en/about");
  assert.match(en, /My name is Ihsan/);
  assert.match(en, /lang="en"/);
});

test("halaman masuk dan daftar bisa dibuka tamu", async () => {
  const masuk = await html("/signin");
  assert.match(masuk, /Selamat datang lagi/);
  const daftar = await html("/signup");
  assert.match(daftar, /Bikin akun dulu/);
});

test("tanpa Supabase, masuk dijelaskan bukan dibiarkan rusak", async () => {
  const page = await html("/signin");
  assert.match(page, /belum tersambung ke Supabase/);
});

test("tujuan setelah masuk tidak bisa diarahkan ke luar situs", async () => {
  const page = await html("/signin?next=https://contoh-jahat.example/curi");

  // The raw query string is echoed back inside the RSC payload, which is just
  // the address the browser already has. What matters is that nothing
  // clickable, and nothing the form would submit, points off-site.
  const hrefs = [...page.matchAll(/href="([^"]*)"/g)].map(([, value]) => value);
  assert.ok(hrefs.length > 0, "halaman harus punya tautan");
  for (const href of hrefs) {
    assert.doesNotMatch(href, /contoh-jahat/, `tautan ${href} mengarah ke luar situs`);
  }

  const hidden = [...page.matchAll(/name="next"[^>]*value="([^"]*)"/g)].map(([, value]) => value);
  for (const value of hidden) {
    assert.doesNotMatch(value, /contoh-jahat/, "formulir membawa tujuan ke luar situs");
  }
});

test("kotak masuk minta masuk dulu, bukan menampilkan punya orang", async () => {
  const response = await fetch(`${BASE}/inbox`, { redirect: "manual" });
  assert.ok([307, 308].includes(response.status), `dapat ${response.status}`);
  assert.match(response.headers.get("location") ?? "", /\/signin/);
});

test("halaman ubah proyek tertutup untuk tamu", async () => {
  const response = await fetch(`${BASE}/projects/warung-antre/edit`, { redirect: "manual" });
  assert.ok([307, 308].includes(response.status), `dapat ${response.status}`);
  assert.match(response.headers.get("location") ?? "", /\/signin/);
});

test("tamu tidak melihat tautan ubah proyek", async () => {
  const page = await html("/projects/warung-antre");
  assert.doesNotMatch(page, /Ubah proyek/);
});

test("proyek yang tidak ada jadi 404, bukan error", async () => {
  const response = await fetch(`${BASE}/projects/tidak-ada`);
  assert.equal(response.status, 404);
});
