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

/**
 * Just the card grid.
 *
 * The tabs above it count every level, whatever the board is filtered to, so a
 * page-wide match would see projects the filter excluded and call it a leak.
 * Anything about filtering looks in here.
 *
 * `<ul` rather than the bare class: the board's skeleton (its loading.tsx)
 * flushes a `<div class="board-grid">` of grey bars into the same response.
 */
function feedList(page) {
  const start = page.indexOf('<ul class="board-grid">');
  // A project row carries its own role list, so slice to the sidebar rather
  // than the first </ul>.
  const end = page.indexOf('<aside class="discovery-sidebar"', start);
  return start < 0 || end < 0 ? "" : page.slice(start, end);
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
  assert.match(page, /<title>Ahsan Project — Tunjukkan yang sedang kamu bangun<\/title>/i);
  for (const name of SEEDED) assert.match(page, new RegExp(name));
});

test("saringan tahap mempersempit papan", async () => {
  const list = feedList(await html("/?stage=idea"));
  assert.match(list, /Warung Antre/);
  assert.doesNotMatch(list, /Tap Tap Dzikr/);
});

test("lajur lama mendarat di tab tahap yang dimaksudnya", async () => {
  // `/?lane=dibangun` dan `/?lane=berjalan` sekarang adalah tab tahap; tautan
  // lamanya masih beredar, jadi keduanya harus mendarat di tempat yang benar.
  const building = feedList(await html("/?lane=dibangun"));
  assert.match(building, /Titip Jemput/, "Titip Jemput sedang dibangun");
  assert.doesNotMatch(building, /Tap Tap Dzikr/, "yang sudah berjalan bukan yang sedang dibangun");

  const live = feedList(await html("/?lane=berjalan"));
  assert.match(live, /Tap Tap Dzikr/);
  assert.doesNotMatch(live, /Warung Antre/, "sebuah ide belum berjalan");

  const helping = feedList(await html("/?lane=butuh-bantuan"));
  assert.match(helping, /Tap Tap Dzikr/, "masih mencari designer");
  assert.doesNotMatch(helping, /CariKontak/, "tidak sedang mencari siapa-siapa");
});

test("lajur yang mengada-ada jatuh ke lajur bawaan, bukan papan kosong", async () => {
  const list = feedList(await html("/?lane=entah"));
  for (const name of SEEDED) assert.match(list, new RegExp(name));
});

test("saringan bantuan menampilkan project yang mencarinya saja", async () => {
  const list = feedList(await html("/?lane=butuh-bantuan&role=pm"));
  assert.match(list, /Invoice Cepat/);
  assert.match(list, /Titip Jemput/);
  assert.doesNotMatch(list, /Wecard/);
});

test("bantuan yang mengada-ada tidak mengosongkan papan", async () => {
  const list = feedList(await html("/?role=hacker"));
  for (const name of SEEDED) assert.match(list, new RegExp(name));
});

test("baris project menyebut posisi baku yang dicari, berikut jumlahnya", async () => {
  const list = feedList(await html("/"));
  assert.match(list, /Sedang mencari/);
  assert.match(list, /Product Manager/);
  assert.match(list, /UI\/UX Designer/);
  assert.match(list, /UI\/UX Designer<!-- --> · <!-- -->1/);
});

test("baris project mengikuti urutan judul, konteks, posisi, lalu pemilik", async () => {
  const list = feedList(await html("/"));
  assert.match(list, /class="home-project-meta"/);
  assert.match(list, /class="home-open-call"/);
  assert.match(list, /Digagas oleh/);
  assert.match(list, /Belum membuka posisi kontribusi/);
});

test("beranda membuka dengan hero, pencarian, kategori, dan role populer", async () => {
  const page = await html("/");
  assert.match(page, /Temukan project yang layak dibantu/);
  assert.match(page, /Cari project, program, atau kata kunci/);
  assert.match(page, /Semua kategori/);
  assert.match(page, /Role yang paling dicari/);
  assert.match(page, /Punya sesuatu yang sedang dibangun/);
  assert.match(page, /Bukan sekadar etalase/);
});

test("tahap lama tetap menyaring beranda dan tampil sebagai filter aktif", async () => {
  const page = await html("/?stage=building");
  assert.match(page, /Tahap:.*Sedang dibangun/s);
  const list = feedList(page);
  assert.match(list, /Titip Jemput/);
  assert.doesNotMatch(list, /Tap Tap Dzikr/, "yang sudah berjalan bukan yang sedang dibangun");
});

test("ranking role memakai posisi yang benar-benar dicari dan menerima URL lama", async () => {
  const page = await html("/?cari=peran");
  assert.match(page, /Role yang paling dicari/);
  assert.match(page, /UI\/UX Designer/);

  const list = feedList(await html("/?cari=peran&role=design"));
  assert.match(list, /Tap Tap Dzikr/);
  assert.doesNotMatch(list, /CariKontak/, "tidak sedang mencari siapa-siapa");
});

test("kategori mengubah pilihan dropdown dan lingkup pencarian", async () => {
  const page = await html("/?tag=umkm");
  assert.match(page, /<option value="umkm" selected="">umkm \(2\)<\/option>/);
  assert.match(page, /Kategori:.*umkm/s);
  const list = feedList(page);
  assert.match(list, /Invoice Cepat/);
  assert.match(list, /Warung Antre/);
  assert.doesNotMatch(list, /Tap Tap Dzikr/);
});

test("semua saringan aktif bisa dilepas sendiri atau sekaligus", async () => {
  const page = await html("/?tag=umkm&stage=idea&role=research&q=antre");
  assert.match(page, /Kategori:.*umkm/s);
  assert.match(page, /Tahap:.*Ide/s);
  assert.match(page, /Menampilkan kebutuhan untuk.*Researcher/s);
  assert.match(page, /Pencarian:.*antre/s);
  assert.match(page, /Hapus semua/);
});

test("urutan papan bisa diganti tanpa kehilangan saringannya", async () => {
  const page = await html("/?stage=live&lane=terbaru");
  assert.match(page, /class="is-active" aria-current="page" href="\/\?lane=terbaru&amp;stage=live">Terbaru<\/a>/);
  assert.match(page, /href="\/\?lane=aktif&amp;stage=live"/);
});

test("pencarian membaca brief, bukan cuma judul", async () => {
  const list = feedList(await html("/?q=antrean"));
  assert.match(list, /Warung Antre/);
  assert.doesNotMatch(list, /Swegrowth/);
});

test("pencarian membaca seluruh brief, termasuk solusi dan audiens", async () => {
  // "memindai" cuma ada di kolom solusi Warung Antre, "kedai kopi" cuma di
  // audiensnya — dua kolom yang dulu tidak ikut dibaca.
  const bySolution = feedList(await html("/?q=memindai"));
  assert.match(bySolution, /Warung Antre/);
  assert.doesNotMatch(bySolution, /Swegrowth/);

  const byAudience = feedList(await html("/?q=kedai%20kopi"));
  assert.match(byAudience, /Warung Antre/);
  assert.doesNotMatch(byAudience, /Swegrowth/);

  // "keselamatan" hanya ada di kalimat "sekarang" Main Aman.
  const byNow = feedList(await html("/?q=keselamatan%20pertama"));
  assert.match(byNow, /Main Aman/);
  assert.doesNotMatch(byNow, /Swegrowth/);
});

test("direktori orang menampilkan tiap profil dan tautannya", async () => {
  const page = await html("/orang");
  assert.match(page, /<title>Orang — Ahsan Project<\/title>/i);
  assert.match(page, /Cari orang, bukan sekadar profil/);
  assert.match(page, /Cari nama, profesi, skill, atau project/);
  assert.match(page, /Semua profesi/);
  assert.match(page, /Semua pengalaman/);
  assert.match(page, /Zikrul Ihsan/);
  assert.match(page, /Product Builder/);
  assert.match(page, /Next\.js/);
  assert.match(page, /href="\/u\/zikrulihsan"/);
});

test("direktori orang menggabungkan pencarian dan filter profil", async () => {
  const matched = await html(
    "/orang?q=invoice&skill=Next.js&pengalaman=6-10&bidang=Civic%20Tech&kerja=building",
  );
  assert.match(matched, /Zikrul Ihsan/);
  assert.match(matched, /Pencarian/);
  assert.match(matched, /Skill/);
  assert.match(matched, /Pengalaman/);
  assert.match(matched, /Bidang/);

  const empty = await html("/orang?skill=Figma");
  assert.match(empty, /Belum ada orang yang cocok/);
  assert.doesNotMatch(empty, /class="people-card"/);
});

test("sitemap memuat proyek dan orang, bukan cuma beranda", async () => {
  const response = await fetch(`${BASE}/sitemap.xml`);
  assert.equal(response.status, 200);
  const xml = await response.text();
  assert.match(xml, /<loc>https:\/\/ahsanproject-id\.netlify\.app\/<\/loc>/);
  assert.match(xml, /projects\/warung-antre/);
  assert.match(xml, /u\/zikrulihsan/);
  assert.match(xml, /\/orang/);
  // Yang di balik pintu masuk tidak diundang masuk sitemap.
  assert.doesNotMatch(xml, /\/inbox/);
});

test("halaman project memuat cerita, tahap, dan ajakan membantu", async () => {
  const page = await html("/projects/warung-antre");
  assert.match(page, /<title>Warung Antre — Ahsan Project<\/title>/i);
  assert.match(page, /Tentang project ini/);
  assert.match(page, /Masalah yang ingin dibereskan/);
  assert.match(page, /Sejauh ini/);
  assert.match(page, /Mau ikut bantu\?/);
  assert.match(page, /Researcher/);
  assert.match(page, /Masuk untuk ikut/);
});

test("halaman project bercerita sebelum meminta bantuan", async () => {
  const page = await html("/projects/main-aman");
  // Understand, then contribute: the brief has to come before the invitation.
  assert.ok(
    page.indexOf("Tentang project ini") < page.indexOf("Mau ikut bantu?"),
    "ceritanya dulu, ajakannya belakangan",
  );
  assert.ok(
    page.indexOf("Sedang dikerjakan") < page.indexOf("Mau ikut bantu?"),
    "yang sedang dikerjakan sebelum ajakan",
  );
});

test("perjalanan project ditampilkan dari yang terbaru sampai hari pertamanya", async () => {
  const page = await html("/projects/main-aman");
  assert.match(page, /Perjalanan project/);
  assert.match(page, /Draft materi pertama selesai/);
  assert.match(page, /Mulai riset/);
  assert.match(page, /Project dimulai/, "hari pertamanya selalu jadi baris terakhir");
  assert.ok(
    page.indexOf("Draft materi pertama selesai") < page.indexOf("Mulai riset"),
    "yang terbaru di atas",
  );
});

test("tamu ditawari mengikuti project, bukan cuma mendukungnya", async () => {
  const page = await html("/projects/main-aman");
  assert.match(page, /Ikuti project/);
});

test("bantuan yang dicari menyebut berapa waktunya", async () => {
  const page = await html("/projects/tap-tap-dzikr");
  assert.match(page, /3 jam per minggu/);
});

test("halaman orang memimpin dengan yang sedang dia kerjakan", async () => {
  const page = await html("/u/zikrulihsan");
  assert.match(page, /Zikrul Ihsan/);
  assert.match(page, /Sedang dikerjakan/);
  assert.match(page, /Tap Tap Dzikr/);
  assert.ok(
    page.indexOf("Sedang dikerjakan") < page.indexOf("Jejak kerja"),
    "karyanya dulu, jejaknya belakangan",
  );
});

test("profil punya kartu bagikan sendiri, bukan gambar bawaan", async () => {
  const page = await html("/u/zikrulihsan");
  assert.match(page, /property="og:title" content="Zikrul Ihsan/);
  assert.match(page, /name="twitter:card" content="summary_large_image"/);
  assert.match(page, /property="og:image"[^>]*u\/zikrulihsan\/opengraph-image/);
});

test("kartu bagikan profil benar-benar tergambar", async () => {
  const response = await fetch(`${BASE}/u/zikrulihsan/opengraph-image`);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "image/png");
});

test("proyek juga punya kartu bagikannya sendiri", async () => {
  const page = await html("/projects/warung-antre");
  assert.match(page, /property="og:title" content="Warung Antre/);
  assert.match(page, /property="og:image"[^>]*projects\/warung-antre\/opengraph-image/);

  const image = await fetch(`${BASE}/projects/warung-antre/opengraph-image`);
  assert.equal(image.status, 200);
  assert.equal(image.headers.get("content-type"), "image/png");
});

test("papan membawa gambar bagikan bawaan", async () => {
  const page = await html("/");
  assert.match(page, /property="og:image"[^>]*og\.png/);
});

test("halaman cerita tersedia dalam dua bahasa", async () => {
  const id = await html("/about");
  assert.match(id, /Nama saya Ihsan/);
  const en = await html("/en/about");
  assert.match(en, /My name is Ihsan/);
  assert.match(en, /lang="en"/);

  // Menyebut judul sendiri tidak boleh menghapus gambar bagikannya — lihat
  // shareCard() di app/content.ts.
  for (const page of [id, en]) assert.match(page, /property="og:image"[^>]*og\.png/);
});

test("halaman masuk dan daftar bisa dibuka tamu", async () => {
  const masuk = await html("/signin");
  assert.match(masuk, /Selamat datang lagi/);
  const daftar = await html("/signup");
  assert.match(daftar, /Bikin akun dulu/);
});

test("yang lupa kata sandi punya jalan keluar dari halaman masuk", async () => {
  const masuk = await html("/signin");
  assert.match(masuk, /href="\/lupa-password"/);

  // Tanpa Supabase formnya memang tidak muncul — yang diuji di sini halamannya
  // ada dan menjelaskan diri, sama seperti halaman masuk.
  const lupa = await html("/lupa-password");
  assert.match(lupa, /Lupa kata sandi/);
  assert.match(lupa, /belum tersambung ke Supabase/);
});

test("setel kata sandi tanpa tautan sah menjelaskan, bukan diam", async () => {
  const page = await html("/akun/password");
  assert.match(page, /kedaluwarsa|belum tersambung/);
  assert.doesNotMatch(page, /name="password"/);
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

test("daftar tugas tetap ada di halaman project", async () => {
  const page = await html("/projects/warung-antre");
  assert.match(page, /Tulis brief-nya/);
  assert.match(page, /Belum jalan/);
});

test("project yang belum menulis kabar tidak berpura-pura", async () => {
  const page = await html("/projects/warung-antre");
  assert.match(page, /Sedang dikerjakan/);
  assert.match(page, /Belum ada yang ditulis/);
});

test("profil menampilkan jejak, bukan cuma daftar project", async () => {
  const page = await html("/u/zikrulihsan");
  assert.match(page, /Jejak kerja/);
  assert.match(page, /menaruh ide/);
  assert.match(page, /membereskan tugas/);
});

test("jejak menyorot yang berbobot dulu, sisanya di balik semua", async () => {
  const page = await html("/u/zikrulihsan");
  assert.match(page, /membereskan tugas/);
  assert.doesNotMatch(page, /kebagian tugas/);
  assert.match(page, /Semua jejak/);
});

test("mode semua jejak memuat entri yang bukan sorotan", async () => {
  const page = await html("/u/zikrulihsan?jejak=semua");
  assert.match(page, /kebagian tugas/);
});

test("profil menghitung pencapaiannya dari jejak", async () => {
  const page = await html("/u/zikrulihsan");
  assert.match(page, /tugas dibereskan/);
  assert.match(page, /aktif sejak/);
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
