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
  // The project segment streams its skeleton first (see its loading.tsx), so
  // the status is already 200 by the time redirect() speaks — the redirect
  // arrives inside the stream instead, as a meta refresh that also covers
  // visitors without JavaScript. What matters is that a guest ends up at
  // sign-in and never sees the edit form.
  const page = await html("/projects/warung-antre/edit");
  assert.match(page, /http-equiv="refresh"[^>]*signin/);
  assert.doesNotMatch(page, /Simpan perubahan/);
});

test("tamu tidak melihat tautan ubah proyek", async () => {
  const page = await html("/projects/warung-antre");
  assert.doesNotMatch(page, /Ubah proyek/);
});

test("halaman proyek menampilkan tugas yang lagi jalan", async () => {
  const page = await html("/projects/warung-antre");
  // React splits a text node from the expression beside it with a comment
  // marker, so match the counted part rather than the whole heading.
  assert.match(page, /1 dari 3 beres/, "judul membawa kemajuannya");
  assert.match(page, /Ngobrol dengan lima pemilik warung/);
  assert.match(page, /Sketsa layar penjual/);
  assert.match(page, /Lagi dikerjain/);
  assert.match(page, /Beres/);
  assert.match(page, /Belum ada yang ambil/, "tugas tanpa penerima dikatakan apa adanya");
});

test("tamu tidak melihat kontrol pengelola", async () => {
  const page = await html("/projects/warung-antre");
  assert.doesNotMatch(page, /Tambah tugas/);
  assert.doesNotMatch(page, /Atur akses/);
  assert.doesNotMatch(page, /Buka peran baru/);
  // The move buttons belong to the assignee and the managers, nobody else.
  assert.doesNotMatch(page, /name="taskId"/);
});

test("kartu di papan menunjukkan tugas yang jalan", async () => {
  const page = await html("/");
  assert.match(page, /2 tugas jalan/, "Warung Antre punya dua tugas belum beres");
});

test("proyek tanpa tugas mengatakannya, bukan diam", async () => {
  const page = await html("/projects/tap-tap-dzikr");
  assert.match(page, /Belum ada tugas di sini/);
});

test("profil menampilkan jejak, bukan cuma daftar proyek", async () => {
  const page = await html("/u/zikrulihsan");
  assert.match(page, /Jejak/);
  assert.match(page, /menaruh ide/);
  assert.match(page, /membereskan tugas/);
});

test("tamu tidak bisa mengatur jejak orang lain", async () => {
  const page = await html("/u/zikrulihsan");
  assert.doesNotMatch(page, /Atur apa yang tampil/);
  assert.doesNotMatch(page, /name="show"/);
});

test("proyek yang tidak ada tampil sebagai halaman tak-ketemu, bukan error", async () => {
  // Same streaming trade-off: the skeleton flushes with a 200 before
  // notFound() runs, so the guard here is the page itself — the visitor gets
  // the not-found copy, not a crash and not a broken half-render.
  const page = await html("/projects/tidak-ada");
  assert.match(page, /Tidak ketemu/);
  assert.doesNotMatch(page, /Ada yang tersendat/);
});
