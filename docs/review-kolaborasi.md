# Review use case kolaborasi

> Dokumen kerja: apa yang sudah benar di alur kolaborasi, apa yang dibuang, dan
> apa yang masih kurang. Ditulis 2026-08-23 dari pembacaan kode di branch
> `claude/review-project-collaboration-usecase-5yxu94`.
>
> Dibaca dari lima sudut pandang orang yang memakai papan ini, bukan dari daftar
> fitur. Yang dikerjakan di branch ini ada di [Yang dibuang](#yang-dibuang-sudah-dikerjakan-di-branch-ini);
> sisanya usulan yang sengaja belum disentuh karena butuh keputusan produk.

> **Menyusul (2026-08-23):** sebagian usulan di bagian "berlebihan" sudah
> dikerjakan oleh redesign di [`redesign-showcase.md`](./redesign-showcase.md) —
> sortir "paling didukung" hilang, chip peran pindah ke lajur yang memang soal
> peran, kartu papan dipangkas, dan `seat_applied` sudah keluar dari perjalanan
> project. Yang belum: `boost_given` sebagai jejak, dan default privasi
> `seat_applied` di profil. Seluruh bagian "kurang atau belum pas" masih berlaku
> apa adanya.

## Lima persona

| | Siapa | Yang dia cari di sini |
|---|---|---|
| **Rina** | Punya ide, tidak bisa menggarapnya sendirian | Orang yang mau ikut, dan cara membuat idenya terlihat serius |
| **Dimas** | Baru lulus, belum punya portofolio | Peran kecil yang jelas, dan bukti kerja yang bisa ditunjukkan |
| **Sari** | Kontributor senior, dipercaya jadi admin | Bisa ikut menjalankan proyek tanpa harus jadi pemilik |
| **Bayu** | Sudah jadi anggota tim | Tahu apa yang harus dikerjakan, dan bisa jalan tanpa menunggu |
| **Pak Hendra** | Mencari orang untuk direkrut | Menilai seseorang dari yang benar-benar dia kerjakan |

## Yang sudah benar — pertahankan

Ini yang membuat papan ini bukan sekadar forum ide, dan tidak boleh hilang saat
menambah apa pun di bawah.

1. **Jejak ditulis kejadiannya, bukan orangnya.** `events` tidak punya grant
   insert sama sekali; `record_event()` satu-satunya penulis, dan ia berhenti
   kalau `auth.uid()` kosong (`0005_activity.sql`). Untuk Pak Hendra ini
   perbedaan antara CV dan bukti — dan itu satu-satunya hal di sini yang tidak
   dipunyai platform portofolio lain. Jangan pernah menukarnya demi kemudahan.

2. **Otorisasi milik database, bukan halaman.** Policy yang memutuskan; cek di
   server action hanya menerjemahkan penolakan jadi kalimat yang terbaca. Efeknya
   nyata: `app/lib/access.ts` boleh salah menebak dan yang terjadi tetap benar.

3. **Tiga transisi jadi fungsi, bukan policy** — `apply_for_seat`,
   `decide_seat`, `move_task`. Alasannya ditulis di tempatnya: RLS itu per-baris,
   bukan per-kolom, jadi policy yang mengizinkan Bayu memindahkan tugasnya juga
   akan mengizinkannya menulis ulang judul tugas itu dan mengopernya ke orang
   lain.

4. **Tidak ada ide kosong.** Brief wajib sebelum proyek boleh ada
   (`app/lib/brief.ts`), dan CHECK-nya ada juga di database. Ini yang membuat
   Dimas bisa menilai sebuah peran tanpa harus bertanya dulu.

5. **Level tidak pernah meminta tim** (`app/lib/stages.ts`). Kerja sendirian
   bukan proyek kelas dua. Yang diminta tiap level adalah bukti pekerjaannya
   bergerak — dan `settleStage()` menurunkan level sendiri kalau buktinya
   dicabut, daripada memasang badge yang berbohong.

6. **Tugas sengaja tipis** — tiga status, satu orang, tanpa tanggal, tanpa
   urutan, tanpa label. Cukup untuk menjawab "lagi ngerjain apa" dan tetap
   terbaca oleh orang yang belum pernah memakai issue tracker. Godaan
   terbesar proyek ini nanti adalah menjadikannya Jira; jangan.

7. **Notice ditandai dibaca lewat tombol, bukan saat halaman dirender.** Halaman
   yang menghapus badge-nya sendiri bisa menghapus kabar yang belum sempat
   dibaca.

8. **Kontribusi jadi pintu masuk pertama di papan** — chip peran di atas, kartu
   "Mulai dari sini" di samping. Untuk Dimas, papan ini menjawab "aku bisa
   bantu apa" sebelum menjawab "apa yang lagi populer".

9. **Toleran terhadap migrasi yang belum jalan** (`isMissingTable`). Satu fitur
   hilang dengan peringatan di log, bukan seluruh halaman jatuh.

## Yang dibuang (sudah dikerjakan di branch ini)

### 1. Tombol yang tidak mungkin berhasil — dua buah

**Sari, admin.** Halaman proyek menawarkan Sari panel "Menunggu keputusanmu"
karena `canManage()` bilang admin mengurus lamaran, dan README menjanjikan hal
yang sama. Tapi `0008_notices.sql` menulis ulang `decide_seat` dari badan versi
`0002` — bukan dari versi `0004` yang sudah melebarkannya ke
`can_manage_project()`. Jadi sejak 0008: Sari melihat tombolnya, menekan Terima,
dan mendapat halaman error. Kotak masuknya juga tidak pernah menampilkan lamaran
itu, karena `listIncomingApplications` menyaring `project.owner_id`.

Tiga lapis — halaman, query, database — memberi tiga jawaban berbeda untuk satu
pertanyaan. Yang diperbaiki: `0009_admins_decide_again.sql` mengembalikan
`can_manage_project()`, dan kotak masuk ikut menghitung proyek yang diadmini.
Ujinya ada di `supabase/tests/policies.sql` — gagal di skema pra-0009 dengan
pesan aslinya, lolos setelahnya.

**Rina, di proyeknya sendiri.** Pemilik melihat "Ambil peran ini" di perannya
sendiri, padahal `apply_for_seat` menolak pemilik mentah-mentah. Formulirnya
sekarang tidak ditawarkan.

### 2. Cabang status lamaran yang sudah mati

`/inbox` masih menyiapkan kalimat untuk lamaran berstatus `open` ("Dibuka lagi
— pemiliknya membuka lagi peran ini"). Sejak 0008 itu tidak bisa terjadi:
menolak melepas `user_id`, jadi baris itu berhenti jadi lamaran siapa pun pada
detik yang sama, dan yang membawa kabarnya sekarang adalah notice. Kode
matinya dibuang; komentar di `listMyApplications` diperbaiki karena namanya
menjanjikan riwayat penuh yang tidak pernah ia berikan.

### 3. Riwayat proyek yang mengulang isi halamannya sendiri

Halaman proyek menampilkan tugas, diskusi, dan dukungan sebagai keadaan hidup —
lalu memutar ulang semuanya sebagai "Riwayat" di bawahnya. Untuk Rina itu berarti
"X ikut membahas Kelas Sore" persis di atas komentar X yang bisa dia baca sendiri.

Sekarang riwayat dipangkas ke `PROJECT_MEMORY_KINDS` — dibuat, pindah level,
membuka peran, ada yang gabung — hal-hal yang tidak bisa dilihat dari keadaan
halaman itu, dan diberi nama "Perjalanan proyek".

Efek samping yang disengaja: `seat_applied` ikut keluar dari sana. Siapa yang
melamar dan masih menunggu adalah urusan pelamar dengan orang yang mengurus
proyek — daftar "Menunggu keputusanmu" sudah menunjukkannya persis ke mereka,
sedangkan jejak itu dibaca semua orang.

### 4. Kartu "Orang di papan"

Papan menarik 60 profil setiap render untuk menampilkan empat, diurutkan
menurut berapa proyek yang mereka miliki **di hasil saringan saat itu** — saring
peran design, dan "komunitas"-nya berubah. Angka yang berubah karena filter bukan
sinyal. `/orang` sudah ada di navigasi utama dan melakukan tugas ini dengan jujur.

### 5. Rujukan ke `research.md`

Empat komentar menunjuk dokumen yang tidak ada di repo. Alasannya tetap ditulis
di tempatnya, rujukannya dibuang.

## Yang berlebihan — usul, belum dikerjakan

Ini butuh keputusan produk, sebagian butuh migrasi, jadi sengaja tidak disentuh.

1. **`boost_given` sebagai isi portofolio.** Menekan ▲ bukan pekerjaan.
   Ia sudah tidak masuk sorotan, tapi masih ada di "semua jejak" dan di daftar
   sepuluh checkbox privasi. Untuk Pak Hendra, "mendukung 30 proyek" mengencerkan
   justru klaim yang ingin dijual dokumen MVP: bahwa jejak di sini berbukti.
   Usul: buang jenisnya dari `EVENT_KINDS` dan trigger-nya; dukungan tetap hidup
   sebagai angka di proyek. Dukungannya sendiri layak dipertahankan — untuk Rina
   ia satu-satunya umpan balik murah sebelum ada yang melamar.

2. **Sepuluh jenis jejak, sepuluh checkbox.** Setelan privasi sebanyak itu untuk
   produk seumur ini lebih besar dari masalah yang dipecahkannya. Tiga kelompok
   (**karya**, **partisipasi**, **lamaran**) menutup semua kasus nyata yang ada
   sekarang, dan `hiddenFrom()` sudah dirancang menoleransi jenis yang tidak
   dikenal build ini.

3. **`seat_applied` publik di profil, dan menyala secara default.** Dimas
   melamar lima proyek, ditolak empat, dan keempatnya terbaca siapa saja di
   profilnya sampai ia tahu ada setelan untuk mematikannya. Melamar sebaiknya
   diam-diam sampai diterima: kalau jenis ini dipertahankan, defaultnya harus
   tersembunyi, bukan tampil.

4. **Tiga sortir di papan.** "Paling butuh orang" melayani kolaborasi,
   "Terbaru" melayani proyek baru; "Paling didukung" adalah papan peringkat yang
   memberi hadiah pada ide yang enak dibaca, bukan pada pekerjaan yang bergerak.
   Menghapusnya menghilangkan satu URL, bukan satu kemampuan.

5. **Satu baris proyek membawa lima sinyal sekaligus** — nomor urut, badge
   level, rel progres empat titik, angka dukungan, dan satu kalimat "yang lagi
   jalan". Rel progres mengulang badge level persis; nomor urut membaca seperti
   peringkat padahal sedang mengurut "terbaru". Dua sinyal cukup.

## Yang kurang atau belum pas — urut dampak

### 1. Bayu tidak bisa mengambil tugas

Gejala paling terasa dari seluruh alur kolaborasi. Anggota boleh **memindahkan**
tugas yang sudah dipegangnya (`move_task`), tapi tidak boleh **mengambil** tugas
yang belum ada pemiliknya: `assignTask` lewat policy `managers edit tasks`, jadi
hanya Rina atau Sari yang bisa menempelkan nama Bayu ke sebuah tugas.

Akibatnya papan tugas jadi alat penugasan satu arah, bukan alat kolaborasi:
Bayu yang punya waktu Sabtu pagi tetap harus menunggu seseorang menugaskannya.
Jenis jejak `task_taken` sudah ada dan sudah bernama "Kebagian tugas" — yang
belum ada justru "aku ambil ini".

Perbaikannya kecil dan sejalan dengan yang sudah ada: satu fungsi
`claim_task(task_id)` bergaya `move_task` — hanya boleh mengubah `assignee_id`,
hanya dari `null`, hanya ke diri sendiri, hanya kalau `is_project_person()`.

### 2. Melamar itu perjalanan satu arah

`apply_for_seat` menolak siapa pun yang sudah punya baris seat di proyek itu —
apa pun statusnya. Jadi satu lamaran yang menggantung mengunci Dimas dari
**seluruh** proyek itu, bukan cuma dari peran yang dia lamar, dan tidak ada cara
menariknya kembali. Kalau Rina tidak pernah menjawab, peran itu beku untuk
kedua pihak selamanya.

Yang dibutuhkan dua hal kecil: **tarik lamaran** (fungsi yang mengembalikan seat
ke `open` kalau pemanggilnya pelamarnya sendiri), dan izin melamar peran lain di
proyek yang sama selama belum diterima di salah satunya.

### 3. Beberapa izin sudah ada di database, tapi tidak punya tombol

Tiga hal ini sudah legal menurut policy dan tidak pernah ditawarkan halamannya:

- **Menutup peran.** ✅ Dikerjakan 2026-09-02, tapi bukan lewat DELETE.
  `managers close seats on their project` sudah legal sejak 0004, tapi
  menghapus baris seat ikut menghapus setiap proposal yang mengarah ke sana —
  termasuk yang masih menunggu keputusan. Tombol "Tutup peran" yang
  ditambahkan malah memindahkan status ke `closed`
  (`20260902000000_close_role_to_new_proposals.sql`): `submit_proposal` sudah
  menolak apa pun selain seat `open`, jadi pelamar baru berhenti di situ,
  sementara `decide_proposal` sekarang menerima dari `closed` juga, jadi
  siapa pun yang sudah melamar sebelum peran ditutup tetap diputuskan
  normal — diterima atau ditolak, bukan otomatis gugur.
- **Menghapus komentar sendiri.** `people delete their own comment` ada sejak
  0003.
- **Melepas anggota.** Owner boleh menghapus baris seat, dan
  `release_tasks_of_departed_seat()` sudah menunggu kejadian itu — tapi tidak
  ada tombolnya, dan tidak boleh ada sampai keputusan **D1** di `mvp-plan.md`
  dikerjakan: "Ikut menggarap" harus diturunkan dari event `seat_filled`, bukan
  dari seat yang sedang terisi, atau kontribusi lama Dimas lenyap dari
  portofolionya begitu ia keluar. Urutannya tidak boleh dibalik.

Dua yang pertama murah dan tidak menunggu apa pun.

### 4. Rina tidak bisa mengurus diskusi di proyeknya

Tidak ada hapus komentar orang lain, tidak ada pelaporan, tidak ada blokir.
`mvp-plan.md` sudah menandainya "sebelum promosi dibuka lebar" — catatan ini
hanya menegaskan: begitu papan ini dipromosikan ke luar lingkaran yang saling
kenal, ini yang pertama patah, dan patahnya menimpa pemilik proyek yang tidak
bisa berbuat apa-apa di halamannya sendiri.

### 5. Aksi yang gagal diam-diam

`openSeat`, `createTask`, `assignTask`, `deleteTask` dan `applyForSeat`
mengembalikan `void` dan `return` begitu saja saat validasinya gagal. Halaman
dirender ulang tanpa sepatah kata. Validasi browser (`required`, `maxLength`)
menutup sebagian besar, tapi tidak semuanya — judul tugas dua huruf lolos ke
server, ditolak `validateTask`, dan Rina melihat formulirnya tertutup tanpa
tugas baru dan tanpa alasan. `createProject` sudah punya pola yang benar
(`CreateState` dengan `errors.form`); lima aksi ini belum ikut.

### 6. Riwayat proyek disensor oleh setelan privasi orang lain

Policy SELECT pada `events` menyaring menurut `activity_hidden` **pelakunya**.
Itu tepat untuk profil. Tapi `listProjectActivity()` membaca tabel yang sama,
jadi Bayu yang menyembunyikan "Membereskan tugas" dari profilnya juga
menghapusnya dari perjalanan proyek Rina — riwayat proyek berlubang karena
pilihan pribadi seseorang.

Dua hal berbeda memakai satu aturan. Yang benar: privasi profil mengatur apa
yang muncul **di profil**; apa yang terjadi di sebuah proyek adalah catatan
proyek itu. Perlu policy terpisah untuk pembacaan per-proyek, bukan filter di
query — memfilter di query akan meninggalkan `GET /rest/v1/events?project_id=eq.…`
terbuka lebar, sama persis dengan alasan yang sudah ditulis untuk
`listPersonActivity()`.

### 7. Tidak ada apa pun yang keluar dari situs

Lamaran Dimas sampai ke Rina hanya kalau Rina membuka situsnya lagi dan melihat
badge. Keputusan Rina sampai ke Dimas dengan cara yang sama. Untuk papan yang
mengandalkan orang saling menunggu jawaban, satu email transaksional untuk dua
kejadian (**ada yang melamar**, **lamaranmu dijawab**) mungkin lebih menentukan
apakah loop kolaborasinya menutup daripada seluruh daftar di atas.
Tabel `notices` sudah jadi fondasi yang tepat untuk itu.

### 8. Lamaran menggantung tanpa batas

Tidak ada kedaluwarsa, tidak ada pengingat, tidak ada penanda "sudah lama tidak
dijawab" — di papan maupun di kotak masuk. Sebuah peran yang `pending` terlihat
sama saja dengan peran yang baru dilamar kemarin, dan tidak bisa dilamar orang
lain sementara itu. Paling murah: tampilkan umurnya, dan tandai proyek yang
lamarannya menua di kotak masuk pemiliknya.

## Kalau harus mengerjakan berurutan

Dependensi, bukan selera:

1. **Ambil tugas sendiri** (§1) — paling terasa, tidak bergantung apa pun.
2. **Tarik lamaran + boleh melamar peran lain** (§2) — sepasang, satu migrasi.
3. **Tutup peran & hapus komentar sendiri** (§3) — policy-nya sudah ada, tinggal
   tombolnya.
4. **Aksi tidak gagal diam-diam** (§5) — pola `CreateState` sudah ada.
5. **Moderasi** (§4) — sebelum promosi dibuka lebar, sesuai `mvp-plan.md`.
6. **Notifikasi email** (§7) — di atas `notices`.
7. **Pisahkan privasi profil dari catatan proyek** (§6) — sentuh policy, jadi
   terakhir di antara yang wajib.
8. **D1 dulu, baru fitur keluar proyek** (§3) — urutannya tidak boleh dibalik.

Yang berlebihan di bagian sebelumnya boleh dikerjakan kapan saja; semuanya
mengurangi kode, bukan menambah.
