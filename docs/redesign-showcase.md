# Redesign: dari papan ide jadi tempat menunjukkan karya

> Dokumen kerja: apa yang berubah, kenapa, dan apa konsekuensinya.
> Ditulis 2026-08-23, dikerjakan di branch
> `claude/review-project-collaboration-usecase-5yxu94`.

## Positioning

Sebelumnya: papan ide yang bisa dikerjakan bareng, plus portofolio.
Sekarang satu kalimat saja:

> **Tempat project bertemu orang yang ingin membantu mewujudkannya.**

Bukan job board, bukan project management tool, bukan galeri portofolio.
Alurnya: **temukan → pahami → tertarik → ikut → ikuti perkembangannya.**

Satu pertanyaan dipakai untuk memutuskan tiap elemen: *apakah ini membuat
seseorang lebih tertarik memahami project ini atau membantunya?* Yang jawabannya
tidak, jadi sekunder atau dibuang.

## Yang berubah, per bagian

### Papan (`/`)

- **Pembuka kecil, bukan dasbor.** "Temukan sesuatu yang layak dibantu",
  dua tombol, dan dua angka. Bukan hero landing page — orang yang membuka ini
  sudah ada di dalam produknya.
- **Lajur, bukan sortir.** Untuk kamu · Terbaru · Butuh bantuan · Sedang
  dibangun · Sudah berjalan. Tiap lajur adalah pertanyaan yang benar-benar
  dibawa orang, bukan `order by boost_count desc`. Tahap turun jadi saringan
  lanjutan; chip peran hanya muncul di lajur yang memang soal peran.
- **"Untuk kamu" punya aturan yang bisa dibaca**, bukan skor rahasia:
  project yang membuka peran yang pernah kamu jalani dulu, lalu yang membuka
  peran apa pun, lalu sisanya — masing-masing tetap urut menurut yang paling
  baru bergerak. Ada di `app/lib/feed.ts`, murni, dan ada unit test-nya.
- **Sidebar berhenti terasa seperti papan lowongan.** "Lagi butuh tangan":
  maksimal empat, tiap baris menyebut projectnya, bantuannya sebagai apa, dan
  apa yang sedang dikerjakan — bukan kolom berisi nama peran.

### Kartu project

Urutannya sekarang: identitas → satu kalimat → **sekarang sedang apa** →
bantuan yang dicari → siapa + kapan terakhir bergerak.

Dibuang: nomor 01/02, rel progres empat ruas, angka dukungan di kartu, jumlah
komentar, "ditaruh 1 tahun lalu", dan "belum ada tugas". Semuanya mengukur
project alih-alih memperkenalkannya, dan pengukuran itulah yang membuat papan
ini terasa seperti panel admin.

### Halaman project

Urutan barunya persis urutan orang memahami sesuatu:

1. **Identitas** — nama, satu kalimat, tahap, siapa di baliknya, dan dua
   tindakan: *Ikuti project* (utama) dan dukungan (kecil, di sampingnya).
2. **Tentang project ini** — masalah, yang sedang dibuat, untuk siapa.
3. **Sedang dikerjakan** — satu kalimat, dengan kapan ditulisnya.
4. **Mau ikut bantu?** — baru di sini, setelah orang paham. Tiap bantuan
   menyebut apa yang dikerjakan dan kira-kira berapa waktunya.
5. **Perjalanan project** — kabar yang ditulis pengurusnya, dari terbaru,
   ditutup baris "Project dimulai" yang selalu ada.
6. **Orang di balik project**, lalu tugas, diskusi, dan jejak sistem.

Meter "kelengkapan brief" dibuang. Persentase pada sebuah cerita adalah rasa
dasbor yang justru sedang dihilangkan, dan tidak ada lagi yang membacanya.

Ada satu test yang menjaga urutannya: cerita harus muncul sebelum ajakan.

### Orang & profil

- `/orang` bukan direktori CV. Tiap orang ditampilkan lewat **project yang dia
  bangun dan yang dia bantu** — dua-duanya bisa diklik dan dicek.
- Profil dibuka dengan **Sedang dikerjakan**, lalu **Ikut membantu**, baru
  **Jejak kerja**. Statistiknya dipangkas jadi yang menerangkan, bukan yang
  memeringkat.

### Membuat project

Empat langkah bernomor, tetap satu halaman: apa yang kamu buat → ceritakan
sedikit → sekarang di tahap mana (termasuk kalimat "sekarang sedang…") → ada
yang bisa dibantu. Bukan wizard: wizard membuang yang sudah diketik begitu ada
yang salah, dan yang ini tetap jalan tanpa JavaScript.

### Bahasa

"Tunjukkan project", bukan "Taruh ide" — sebuah project boleh sudah jadi dan
tetap layak ada di sini. "Bantu sebagai", "Saya tertarik", "Terbuka untuk
kontribusi", "Lagi butuh tangan". Tidak ada lowongan, pelamar, atau rekrutmen.

## Yang ditambahkan ke database (`0010_showcase.sql`)

| | Apa | Kenapa |
|---|---|---|
| `projects.now_text` | Satu kalimat "sekarang sedang…" | Yang membuat project terlihat hidup |
| `projects.now_updated_at` | Kapan kalimat itu berubah | **Ditulis trigger.** Kalau bisa dikirim aplikasi, kesegaran jadi angka yang bisa dikarang |
| `updates` | Perjalanan yang ditulis pengurusnya | Cerita, pelengkap `events` yang cuma bukti |
| `follows` | Mengikuti tanpa ikut mengerjakan | Dukungan itu penilaian; mengikuti itu niat menyimak |
| `seats.commitment` | "± 2 jam per minggu" | Bantuan tanpa ukuran tidak bisa dinilai orang yang mau ikut |
| `project_overview.last_activity_at` | Kapan terakhir bergerak | Kesegaran mengalahkan persentase progres |

Tiga keputusan yang perlu diketahui sebelum mengubah berkas itu:

1. **`updates` tidak punya UPDATE policy dan tidak punya update grant.** Kabar
   boleh ditulis dan dihapus, tidak boleh diam-diam diganti kata-katanya
   setelah dibaca orang. Menghapus dan mengganti diam-diam adalah dua
   kebohongan yang berbeda, dan cuma satu yang jujur.
2. **`last_activity_at` tidak pernah membaca `events`.** Policy SELECT pada
   `events` menyaring menurut pilihan privasi pelakunya, jadi kesegaran sebuah
   project akan berubah-ubah tergantung siapa yang membacanya. Yang dibaca
   hanya tabel yang policy-nya `using (true)`.
3. **`set_now()` adalah fungsi, bukan policy** — bentuk yang sama dengan
   `move_task()`, dan alasannya sama: RLS itu per-baris, bukan per-kolom, jadi
   policy yang mengizinkan admin menulis kalimat "sekarang" juga akan
   mengizinkannya menulis ulang brief dan memindahkan level. Admin boleh
   menulisnya karena kalimat inilah yang paling sering berubah, dan menguncinya
   di pemilik adalah cara tercepat membuatnya basi.
4. **Level tinggal empat.** `validating` dilepas; barisnya dipindahkan menurut
   bukti yang sudah ada, bukan diseragamkan. Dan `building` sekarang boleh
   bersandar pada kalimat "sekarang" — orang yang baru mulai belum punya apa
   pun untuk ditautkan, dan itu bisa dicek satu baris, yang penting karena
   CHECK constraint tidak bisa melihat tabel lain.

## Rollout

Jalankan **`0010_showcase.sql` sebelum men-deploy kode ini**. Berkasnya
mengganti view `project_overview`, memindahkan baris `validating`, dan menambah
dua tabel. Pembacaan biasa tetap aman kalau urutannya terbalik sebentar
(`toSummary` memberi nilai bawaan untuk kolom baru, dan `isMissingTable`
menutup `updates`/`follows` yang belum ada) — tapi lajur dan saringan baru butuh
kolomnya.

`supabase/seed.sql` sudah ikut diperbarui: jalankan ulang `npm run db:seed`
kalau `app/lib/seed.ts` diubah.

## Yang sengaja belum dikerjakan

- **Notifikasi keluar situs.** Mengikuti sekarang berbuah di `/inbox`; email
  masih catatan di `docs/review-kolaborasi.md`.
- **`boost_given` di jejak.** Menekan ♡ tetap bukan pekerjaan, dan masih
  tercatat sebagai jejak. Membuangnya butuh migrasi tersendiri.
- **Gap kolaborasi di `docs/review-kolaborasi.md`** — ambil tugas sendiri,
  tarik lamaran, tutup peran, hapus komentar sendiri, moderasi. Redesign ini
  tidak menyentuhnya; daftarnya masih berlaku.
