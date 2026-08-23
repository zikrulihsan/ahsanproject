-- Seed data for Ahsan Project.
--
-- Generated from app/lib/seed.ts — run `npm run db:seed` after editing that
-- file rather than editing this one.
--
-- Before running: sign up through the site with the email below, so the account
-- exists. Then run this whole file once, in the Supabase SQL editor or with
-- psql. Re-running it is safe; projects that already exist are left alone.

do $$
declare
  -- Who should own these projects. Change this to your own address.
  owner_email text := 'ganti@dengan-emailmu.com';
  owner       uuid;
  new_project bigint;
begin
  select id into owner from auth.users where lower(email) = lower(owner_email);

  if owner is null then
    raise exception
      'Tidak ada akun dengan email %. Daftar dulu lewat situsnya, baru jalankan berkas ini.',
      owner_email;
  end if;

  -- Tap Tap Dzikr
  insert into public.projects
    (slug, title, tagline, owner_id, stage, problem, solution, audience,
     now_text, now_updated_at, doc_url, live_url, repo_url, tags, glyph,
     created_at, updated_at)
  values
    ('tap-tap-dzikr', 'Tap Tap Dzikr', 'Ganti kebiasaan tap tap medsos dengan tap tap dzikir.', owner,
     'live', 'Jempol kita sudah terlatih untuk tap dan scroll tanpa sadar, dan medsos yang paling gampang diraih. Niat berdzikir sering kalah cepat dari kebiasaan itu, apalagi kalau harus cari tasbih dulu atau menghitung di kepala sambil mengerjakan hal lain.', 'Penghitung dzikir harian yang sesederhana mungkin: buka, tap, selesai. Tidak ada akun, tidak ada notifikasi yang mengejar, tidak ada angka yang bikin merasa bersaing. Hitungannya tersimpan di perangkat sendiri supaya bisa dilanjutkan besok.',
     'Siapa pun yang ingin memindahkan kebiasaan tap tap-nya ke hal yang lebih menenangkan.', 'Menyiapkan mode gelap dan tata letak yang nyaman dipakai satu tangan.',
     '2026-08-11 09:00:00',
     '', 'https://dzikir-harian.netlify.app/',
     '', array['ibadah', 'kebiasaan', 'mobile']::text[], '○○○',
     '2024-05-04 09:00:00', '2026-08-11 09:00:00')
  on conflict (slug) do nothing
  returning id into new_project;

    insert into public.seats (project_id, role, brief, commitment, access)
    select new_project, 'design', 'Menata ulang tampilan penghitungnya supaya nyaman dipakai satu tangan, termasuk mode gelap.',
           '± 3 jam per minggu, santai', 'member'
    where new_project is not null;
    insert into public.updates (project_id, author_id, title, body, created_at)
    select new_project, owner, 'Hitungannya sekarang bertahan setelah aplikasi ditutup', 'Sebelumnya hitungan hilang begitu tab ditutup, dan itu keluhan yang paling sering masuk. Sekarang tersimpan di perangkat sendiri, tanpa perlu akun.', '2026-08-11 09:00:00'
    where new_project is not null;
    insert into public.updates (project_id, author_id, title, body, created_at)
    select new_project, owner, 'Dipakai rutin oleh sebelas orang', 'Sebelas orang memakainya lebih dari seminggu berturut-turut. Cukup untuk tahu bentuk dasarnya sudah benar.', '2026-05-02 09:00:00'
    where new_project is not null;

  -- Wecard
  insert into public.projects
    (slug, title, tagline, owner_id, stage, problem, solution, audience,
     now_text, now_updated_at, doc_url, live_url, repo_url, tags, glyph,
     created_at, updated_at)
  values
    ('wecard', 'Wecard', 'Kartu pertanyaan untuk obrolan yang tidak berhenti di basa-basi.', owner,
     'live', 'Ngobrol sama orang terdekat sering mentok di pertanyaan yang itu-itu saja: sudah makan, gimana kerjaan, kapan nikah. Yang ingin ditanyakan sebenarnya lebih dalam dari itu, tapi tidak ada yang mau memulai duluan karena takut kaku.', 'Kumpulan kartu berisi pertanyaan yang sudah disusun per situasi — teman, keluarga, pasangan. Tinggal buka satu kartu dan biarkan pertanyaannya yang memulai, jadi tidak ada yang perlu merasa canggung sebagai orang pertama.',
     'Teman, keluarga, atau pasangan yang ingin ngobrol lebih dalam tanpa harus tahu cara memulainya.', 'Menyusun dek pertanyaan untuk obrolan rekan kerja, sekitar 40 kartu.',
     '2026-07-28 09:00:00',
     '', 'https://wecard-app.netlify.app/',
     '', array['obrolan', 'relasi', 'kartu']::text[], '▱',
     '2024-07-18 09:00:00', '2026-07-28 09:00:00')
  on conflict (slug) do nothing
  returning id into new_project;

    insert into public.seats (project_id, role, brief, commitment, access)
    select new_project, 'content', 'Menulis satu dek baru untuk obrolan rekan kerja, sekitar 40 pertanyaan.',
           '± 2 jam per minggu', 'member'
    where new_project is not null;
    insert into public.updates (project_id, author_id, title, body, created_at)
    select new_project, owner, 'Dek keluarga selesai, tinggal diuji', 'Empat puluh kartu untuk obrolan keluarga sudah rampung dan sedang dicoba di beberapa rumah sebelum dirapikan.', '2026-07-28 09:00:00'
    where new_project is not null;

  -- CariKontak
  insert into public.projects
    (slug, title, tagline, owner_id, stage, problem, solution, audience,
     now_text, now_updated_at, doc_url, live_url, repo_url, tags, glyph,
     created_at, updated_at)
  values
    ('carikontak', 'CariKontak', 'Nomor penting di sekitarmu, siap saat benar-benar dibutuhkan.', owner,
     'live', 'Saat ada yang mendesak — genteng bocor, motor mogok, butuh ambulans — waktu justru habis untuk mencari nomor. Kontak tukang, bengkel, atau layanan darurat biasanya tersebar di chat lama, catatan, atau ingatan orang lain.', 'Tempat menyimpan dan mencari kontak penting berdasarkan wilayah, jadi nomornya sudah ada sebelum dibutuhkan. Datanya bisa ditambah bersama-sama supaya satu daerah saling menolong lewat daftar yang sama.',
     'Warga yang ingin punya daftar nomor penting daerahnya di satu tempat.', 'Merapikan kontak per kecamatan sebelum dibuka ke daerah lain.',
     '2026-06-19 09:00:00',
     '', 'https://carikontak.com/',
     '', array['warga', 'direktori', 'lokal']::text[], '⌖',
     '2024-09-02 09:00:00', '2026-06-19 09:00:00')
  on conflict (slug) do nothing
  returning id into new_project;

    insert into public.updates (project_id, author_id, title, body, created_at)
    select new_project, owner, 'Satu kecamatan pertama terisi penuh', 'Nomor tukang, bengkel, dan layanan darurat untuk satu kecamatan sudah lengkap. Dari sini baru masuk akal menambah daerah berikutnya.', '2026-06-19 09:00:00'
    where new_project is not null;

  -- Invoice Cepat
  insert into public.projects
    (slug, title, tagline, owner_id, stage, problem, solution, audience,
     now_text, now_updated_at, doc_url, live_url, repo_url, tags, glyph,
     created_at, updated_at)
  values
    ('invoice-cepat', 'Invoice Cepat', 'Bikin invoice untuk jasa atau produkmu tanpa proses berbelit.', owner,
     'live', 'Pelaku usaha kecil sering menagih lewat chat karena aplikasi invoice yang ada terasa berat: harus daftar, isi profil perusahaan, pilih paket. Untuk satu tagihan sederhana, semua itu terlalu banyak langkah.', 'Formulir singkat yang langsung menghasilkan invoice rapi dan bisa dibagikan. Tanpa akun, tanpa langganan, cukup isi yang perlu lalu kirim ke pelanggan.',
     'Freelancer dan pemilik usaha kecil yang menagih beberapa kali sebulan.', 'Menguji cetak ke printer termal yang paling umum dipakai penjual.',
     '2026-04-30 09:00:00',
     '', 'https://umkmproject-invoice.netlify.app/',
     '', array['umkm', 'keuangan', 'tools']::text[], '≡',
     '2024-11-11 09:00:00', '2026-04-30 09:00:00')
  on conflict (slug) do nothing
  returning id into new_project;

    insert into public.seats (project_id, role, brief, commitment, access)
    select new_project, 'pm', 'Menentukan fitur berikutnya dari keluhan pengguna yang sudah masuk.',
           '', 'member'
    where new_project is not null;

  -- Main Aman
  insert into public.projects
    (slug, title, tagline, owner_id, stage, problem, solution, audience,
     now_text, now_updated_at, doc_url, live_url, repo_url, tags, glyph,
     created_at, updated_at)
  values
    ('main-aman', 'Main Aman', 'Tempat belajar anak supaya lebih siap menjaga diri.', owner,
     'live', 'Anak-anak diminta hati-hati, tapi jarang diberi contoh situasinya seperti apa. Orang tua juga sering bingung memulai obrolan soal batas tubuh, orang asing, atau situasi yang bikin tidak nyaman.', 'Materi belajar yang dikemas ringan dan bisa dibuka bersama orang tua, berisi situasi sehari-hari beserta apa yang sebaiknya dilakukan anak. Bahasanya dibuat sederhana supaya anak bisa mengulang sendiri.',
     'Anak usia sekolah dasar bersama orang tua atau gurunya.', 'Menyusun materi keselamatan pertama untuk anak usia 5–8 tahun.',
     '2026-08-18 09:00:00',
     '', 'https://mainaman.netlify.app/',
     '', array['anak', 'edukasi', 'keamanan']::text[], '✦',
     '2025-01-20 09:00:00', '2026-08-18 09:00:00')
  on conflict (slug) do nothing
  returning id into new_project;

    insert into public.seats (project_id, role, brief, commitment, access)
    select new_project, 'research', 'Menguji materinya ke satu kelas dan merapikan bagian yang belum kena.',
           '', 'member'
    where new_project is not null;
    insert into public.updates (project_id, author_id, title, body, created_at)
    select new_project, owner, 'Draft materi pertama selesai', 'Dua puluh topik keselamatan dasar sudah dikumpulkan dan dirapikan. Berikutnya diuji ke beberapa orang tua sebelum ditulis ulang.', '2026-08-18 09:00:00'
    where new_project is not null;
    insert into public.updates (project_id, author_id, title, body, created_at)
    select new_project, owner, 'Mulai riset', 'Sedang mencari pendekatan yang paling cocok untuk anak usia 5–8 tahun: yang mudah dipahami, dan tidak menakutkan.', '2026-06-03 09:00:00'
    where new_project is not null;

  -- Swegrowth
  insert into public.projects
    (slug, title, tagline, owner_id, stage, problem, solution, audience,
     now_text, now_updated_at, doc_url, live_url, repo_url, tags, glyph,
     created_at, updated_at)
  values
    ('swegrowth', 'Swegrowth', 'Portal komunitas software engineer Indonesia.', owner,
     'live', 'Pengalaman berharga teman-teman engineer di Indonesia berserak di utas media sosial dan grup chat yang tenggelam dalam hitungan hari. Yang baru mulai kesulitan menemukannya lagi saat benar-benar butuh.', 'Satu portal tempat cerita, materi belajar, dan pengalaman kerja dikumpulkan supaya bisa dibaca ulang kapan pun. Isinya datang dari komunitas, bukan dari satu orang saja.',
     'Software engineer Indonesia, terutama yang sedang di tahun-tahun awal.', 'Membangun portal tempat program dan materi komunitas dikumpulkan.',
     '2026-08-05 09:00:00',
     '', 'https://swegrowth.id/',
     '', array['komunitas', 'karier', 'belajar']::text[], '↗',
     '2025-03-08 09:00:00', '2026-08-05 09:00:00')
  on conflict (slug) do nothing
  returning id into new_project;

    insert into public.seats (project_id, role, brief, commitment, access)
    select new_project, 'content', 'Mengurasi dan menyunting tulisan kiriman komunitas tiap bulan.',
           '', 'member'
    where new_project is not null;
    insert into public.updates (project_id, author_id, title, body, created_at)
    select new_project, owner, 'Struktur portal disepakati', 'Program, materi, dan aktivitas jadi tiga bagian utama. Bagian materi yang paling banyak isinya, jadi itu yang dikerjakan duluan.', '2026-08-05 09:00:00'
    where new_project is not null;

  -- Warung Antre
  insert into public.projects
    (slug, title, tagline, owner_id, stage, problem, solution, audience,
     now_text, now_updated_at, doc_url, live_url, repo_url, tags, glyph,
     created_at, updated_at)
  values
    ('warung-antre', 'Warung Antre', 'Antrean digital untuk warung dan kedai kecil yang ramai di jam makan.', owner,
     'idea', 'Di jam makan siang, warung kecil ramai dan pesanan diingat di kepala. Pembeli menunggu tanpa tahu urutannya di mana, penjual repot menghafal, dan yang datang belakangan kadang malah dilayani duluan. Ributnya kecil tapi terjadi setiap hari.', 'Nomor antrean yang dibuat cukup lewat satu layar di warung: pembeli memindai kode, penjual menggeser antrean saat pesanan siap. Tidak perlu perangkat tambahan, tidak perlu pelatihan, dan tetap jalan kalau sinyalnya jelek.',
     'Warung, kedai kopi, dan gerai kecil yang ramai pada jam tertentu.', '',
     null,
     '', '',
     '', array['umkm', 'operasional', 'ide']::text[], '◔',
     '2025-06-14 09:00:00', '2025-06-14 09:00:00')
  on conflict (slug) do nothing
  returning id into new_project;

    insert into public.seats (project_id, role, brief, commitment, access)
    select new_project, 'research', 'Ngobrol dengan lima pemilik warung untuk memastikan masalahnya memang terasa.',
           '', 'member'
    where new_project is not null;
    insert into public.seats (project_id, role, brief, commitment, access)
    select new_project, 'design', 'Membuat alur layar penjual yang bisa dipakai sambil tangan sibuk.',
           '', 'member'
    where new_project is not null;
    insert into public.seats (project_id, role, brief, commitment, access)
    select new_project, 'engineering', 'Prototipe antrean yang tetap jalan saat koneksi putus.',
           '', 'member'
    where new_project is not null;
    insert into public.tasks (project_id, title, detail, status, assignee_id, created_by)
    select new_project, 'Ngobrol dengan lima pemilik warung', 'Cari tahu apakah antreannya benar-benar terasa mengganggu, atau cuma kelihatan begitu dari luar.', 'doing',
           owner, owner
    where new_project is not null;
    insert into public.tasks (project_id, title, detail, status, assignee_id, created_by)
    select new_project, 'Sketsa layar penjual', 'Satu layar saja, harus kebaca sambil tangan sibuk.', 'todo',
           null, owner
    where new_project is not null;
    insert into public.tasks (project_id, title, detail, status, assignee_id, created_by)
    select new_project, 'Tulis brief-nya', 'Masalah, gambaran solusi, dan untuk siapa.', 'done',
           owner, owner
    where new_project is not null;

  -- Titip Jemput
  insert into public.projects
    (slug, title, tagline, owner_id, stage, problem, solution, audience,
     now_text, now_updated_at, doc_url, live_url, repo_url, tags, glyph,
     created_at, updated_at)
  values
    ('titip-jemput', 'Titip Jemput', 'Papan koordinasi antar-jemput sekolah antar orang tua satu kompleks.', owner,
     'building', 'Orang tua di satu kompleks sering menjemput ke sekolah yang sama pada jam yang sama, tapi tetap berangkat sendiri-sendiri. Koordinasinya nyangkut di grup chat: pesan tenggelam, yang butuh tumpangan sungkan minta, yang punya kursi kosong tidak tahu siapa yang butuh.', 'Papan sederhana berisi jadwal jemput mingguan: siapa berangkat jam berapa, ke sekolah mana, ada berapa kursi kosong. Orang tua tinggal menandai butuh atau menawarkan, tanpa perlu menawar di grup ramai.',
     'Orang tua di satu kompleks atau perumahan dengan sekolah tujuan yang sama.', 'Menghitung berapa orang tua yang sekolah tujuannya benar-benar searah.',
     '2026-08-14 09:00:00',
     '', '',
     '', array['keluarga', 'komunitas', 'ide']::text[], '⌁',
     '2025-08-01 09:00:00', '2026-08-14 09:00:00')
  on conflict (slug) do nothing
  returning id into new_project;

    insert into public.seats (project_id, role, brief, commitment, access)
    select new_project, 'pm', 'Merapikan alurnya jadi sesederhana mungkin supaya tidak kalah praktis dari grup chat.',
           '± 2 jam per minggu', 'member'
    where new_project is not null;
    insert into public.seats (project_id, role, brief, commitment, access)
    select new_project, 'design', 'Menyusun tampilan papan mingguan yang kebaca sekali lihat.',
           'Fleksibel, borongan juga boleh', 'member'
    where new_project is not null;
    insert into public.tasks (project_id, title, detail, status, assignee_id, created_by)
    select new_project, 'Hitung berapa orang tua yang sekolahnya searah', 'Pakai data satu kompleks dulu, jangan langsung sekota.', 'todo',
           null, owner
    where new_project is not null;
    insert into public.updates (project_id, author_id, title, body, created_at)
    select new_project, owner, 'Mulai dari satu kompleks dulu', 'Daripada langsung sekota, datanya dikumpulkan dari satu kompleks saja. Kalau di sana pun tidak cukup banyak yang searah, idenya memang tidak jalan.', '2026-08-14 09:00:00'
    where new_project is not null;
end
$$;
