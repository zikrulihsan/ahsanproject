/**
 * The projects Ahsan Project opens with.
 *
 * This is the source of truth for two things: `supabase/seed.sql`, and the
 * read-only fallback `app/lib/data.ts` serves when no database is attached.
 * Keep the two in step — run `npm run db:seed` after editing here.
 */
export type SeedUser = {
  id: string;
  username: string;
  name: string;
  profession: string;
  headline: string;
  bio: string;
  skills: string[];
  yearsExperience: number | null;
  fields: string[];
  website: string;
  github: string;
  /** Trail kinds kept off the public profile. Empty means everything shows. */
  activityHidden: string[];
};

export type SeedEvent = {
  id: number;
  actorId: string;
  projectSlug: string;
  kind: string;
  payload: Record<string, string>;
  createdAt: string;
};

export type SeedSeat = {
  role: string;
  /** Specific label when role is `other`. */
  roleTitle?: string;
  brief: string;
  /** Roughly how much time it takes, in the owner's words. May be empty. */
  commitment: string;
  status: "open" | "pending" | "filled";
  /** Only a filled seat may be admin — see seats_admin_needs_holder. */
  access: "member" | "admin";
  userId: string | null;
  pitch: string;
};

export type SeedTask = {
  title: string;
  detail: string;
  status: "todo" | "doing" | "done";
  /** A seed user id, or null for a task nobody has picked up. */
  assigneeId: string | null;
};

/** One entry in a project's journey, written by whoever runs it. */
export type SeedUpdate = {
  title: string;
  body: string;
  createdAt: string;
};

export type SeedProject = {
  id: number;
  slug: string;
  title: string;
  tagline: string;
  ownerId: string;
  stage: string;
  problem: string;
  solution: string;
  audience: string;
  docUrl: string;
  liveUrl: string;
  repoUrl: string;
  tags: string[];
  glyph: string;
  /** What the project is working on right now. Empty means nobody has said. */
  now: string;
  /** When that line was last written. Empty when `now` is. */
  nowUpdatedAt: string;
  createdAt: string;
  seats: SeedSeat[];
  tasks: SeedTask[];
  updates: SeedUpdate[];
};

export const seedUsers: SeedUser[] = [
  {
    id: "seed-zikrul",
    username: "zikrulihsan",
    name: "Zikrul Ihsan",
    profession: "Product Builder",
    headline: "Bikin barang kecil yang kepakai",
    bio: "Mengerjakan project satu per satu di waktu luang. Ahsan artinya melakukan sesuatu sebaik mungkin — itu yang saya usahakan di sini, sekecil apa pun yang sedang dikerjakan.",
    skills: ["Product Strategy", "Next.js", "Prototyping"],
    yearsExperience: 6,
    fields: ["Civic Tech", "Productivity"],
    website: "https://ahsanproject-id.netlify.app",
    github: "https://github.com/zikrulihsan",
    activityHidden: [],
  },
];

/**
 * A few trail entries, so the profile has something to show when no database is
 * attached. On a real deployment the triggers write these; nothing here is
 * inserted by `supabase/seed.sql`, because a seeded trail would be history that
 * never happened.
 */
export const seedEvents: SeedEvent[] = [
  {
    id: 4,
    actorId: "seed-zikrul",
    projectSlug: "warung-antre",
    kind: "task_done",
    payload: { slug: "warung-antre", title: "Warung Antre", task_title: "Tulis brief-nya" },
    createdAt: "2025-06-16 10:00:00",
  },
  {
    id: 3,
    actorId: "seed-zikrul",
    projectSlug: "warung-antre",
    kind: "task_taken",
    payload: {
      slug: "warung-antre",
      title: "Warung Antre",
      task_title: "Ngobrol dengan lima pemilik warung",
    },
    createdAt: "2025-06-15 09:00:00",
  },
  {
    id: 2,
    actorId: "seed-zikrul",
    projectSlug: "warung-antre",
    kind: "seat_opened",
    payload: { slug: "warung-antre", title: "Warung Antre", role: "researcher" },
    createdAt: "2025-06-14 09:30:00",
  },
  {
    id: 1,
    actorId: "seed-zikrul",
    projectSlug: "warung-antre",
    kind: "project_created",
    payload: { slug: "warung-antre", title: "Warung Antre" },
    createdAt: "2025-06-14 09:00:00",
  },
];

export const seedProjects: SeedProject[] = [
  {
    id: 1,
    slug: "tap-tap-dzikr",
    title: "Tap Tap Dzikr",
    tagline: "Ganti kebiasaan tap tap medsos dengan tap tap dzikir.",
    ownerId: "seed-zikrul",
    stage: "live",
    problem:
      "Jempol kita sudah terlatih untuk tap dan scroll tanpa sadar, dan medsos yang paling gampang diraih. Niat berdzikir sering kalah cepat dari kebiasaan itu, apalagi kalau harus cari tasbih dulu atau menghitung di kepala sambil mengerjakan hal lain.",
    solution:
      "Penghitung dzikir harian yang sesederhana mungkin: buka, tap, selesai. Tidak ada akun, tidak ada notifikasi yang mengejar, tidak ada angka yang bikin merasa bersaing. Hitungannya tersimpan di perangkat sendiri supaya bisa dilanjutkan besok.",
    audience: "Siapa pun yang ingin memindahkan kebiasaan tap tap-nya ke hal yang lebih menenangkan.",
    docUrl: "",
    liveUrl: "https://dzikir-harian.netlify.app/",
    repoUrl: "",
    tags: ["ibadah", "kebiasaan", "mobile"],
    glyph: "○○○",
    createdAt: "2024-05-04 09:00:00",
    now: "Menyiapkan mode gelap dan tata letak yang nyaman dipakai satu tangan.",
    nowUpdatedAt: "2026-08-11 09:00:00",
    seats: [
      {
        role: "ui-ux-designer",
        brief: "Menata ulang tampilan penghitungnya supaya nyaman dipakai satu tangan, termasuk mode gelap.",
        commitment: "± 3 jam per minggu, santai",
        status: "open",
        access: "member",
        userId: null,
        pitch: "",
      },
    ],
    tasks: [],
    updates: [
      {
        title: "Hitungannya sekarang bertahan setelah aplikasi ditutup",
        body: "Sebelumnya hitungan hilang begitu tab ditutup, dan itu keluhan yang paling sering masuk. Sekarang tersimpan di perangkat sendiri, tanpa perlu akun.",
        createdAt: "2026-08-11 09:00:00",
      },
      {
        title: "Dipakai rutin oleh sebelas orang",
        body: "Sebelas orang memakainya lebih dari seminggu berturut-turut. Cukup untuk tahu bentuk dasarnya sudah benar.",
        createdAt: "2026-05-02 09:00:00",
      },
    ],
  },
  {
    id: 2,
    slug: "wecard",
    title: "Wecard",
    tagline: "Kartu pertanyaan untuk obrolan yang tidak berhenti di basa-basi.",
    ownerId: "seed-zikrul",
    stage: "live",
    problem:
      "Ngobrol sama orang terdekat sering mentok di pertanyaan yang itu-itu saja: sudah makan, gimana kerjaan, kapan nikah. Yang ingin ditanyakan sebenarnya lebih dalam dari itu, tapi tidak ada yang mau memulai duluan karena takut kaku.",
    solution:
      "Kumpulan kartu berisi pertanyaan yang sudah disusun per situasi — teman, keluarga, pasangan. Tinggal buka satu kartu dan biarkan pertanyaannya yang memulai, jadi tidak ada yang perlu merasa canggung sebagai orang pertama.",
    audience: "Teman, keluarga, atau pasangan yang ingin ngobrol lebih dalam tanpa harus tahu cara memulainya.",
    docUrl: "",
    liveUrl: "https://wecard-app.netlify.app/",
    repoUrl: "",
    tags: ["obrolan", "relasi", "kartu"],
    glyph: "▱",
    createdAt: "2024-07-18 09:00:00",
    now: "Menyusun dek pertanyaan untuk obrolan rekan kerja, sekitar 40 kartu.",
    nowUpdatedAt: "2026-07-28 09:00:00",
    seats: [
      {
        role: "content-writer",
        brief: "Menulis satu dek baru untuk obrolan rekan kerja, sekitar 40 pertanyaan.",
        commitment: "± 2 jam per minggu",
        status: "open",
        access: "member",
        userId: null,
        pitch: "",
      },
    ],
    tasks: [],
    updates: [
      {
        title: "Dek keluarga selesai, tinggal diuji",
        body: "Empat puluh kartu untuk obrolan keluarga sudah rampung dan sedang dicoba di beberapa rumah sebelum dirapikan.",
        createdAt: "2026-07-28 09:00:00",
      },
    ],
  },
  {
    id: 3,
    slug: "carikontak",
    title: "CariKontak",
    tagline: "Nomor penting di sekitarmu, siap saat benar-benar dibutuhkan.",
    ownerId: "seed-zikrul",
    stage: "live",
    problem:
      "Saat ada yang mendesak — genteng bocor, motor mogok, butuh ambulans — waktu justru habis untuk mencari nomor. Kontak tukang, bengkel, atau layanan darurat biasanya tersebar di chat lama, catatan, atau ingatan orang lain.",
    solution:
      "Tempat menyimpan dan mencari kontak penting berdasarkan wilayah, jadi nomornya sudah ada sebelum dibutuhkan. Datanya bisa ditambah bersama-sama supaya satu daerah saling menolong lewat daftar yang sama.",
    audience: "Warga yang ingin punya daftar nomor penting daerahnya di satu tempat.",
    docUrl: "",
    liveUrl: "https://carikontak.com/",
    repoUrl: "",
    tags: ["warga", "direktori", "lokal"],
    glyph: "⌖",
    createdAt: "2024-09-02 09:00:00",
    now: "Merapikan kontak per kecamatan sebelum dibuka ke daerah lain.",
    nowUpdatedAt: "2026-06-19 09:00:00",
    seats: [],
    tasks: [],
    updates: [
      {
        title: "Satu kecamatan pertama terisi penuh",
        body: "Nomor tukang, bengkel, dan layanan darurat untuk satu kecamatan sudah lengkap. Dari sini baru masuk akal menambah daerah berikutnya.",
        createdAt: "2026-06-19 09:00:00",
      },
    ],
  },
  {
    id: 4,
    slug: "invoice-cepat",
    title: "Invoice Cepat",
    tagline: "Bikin invoice untuk jasa atau produkmu tanpa proses berbelit.",
    ownerId: "seed-zikrul",
    stage: "live",
    problem:
      "Pelaku usaha kecil sering menagih lewat chat karena aplikasi invoice yang ada terasa berat: harus daftar, isi profil perusahaan, pilih paket. Untuk satu tagihan sederhana, semua itu terlalu banyak langkah.",
    solution:
      "Formulir singkat yang langsung menghasilkan invoice rapi dan bisa dibagikan. Tanpa akun, tanpa langganan, cukup isi yang perlu lalu kirim ke pelanggan.",
    audience: "Freelancer dan pemilik usaha kecil yang menagih beberapa kali sebulan.",
    docUrl: "",
    liveUrl: "https://umkmproject-invoice.netlify.app/",
    repoUrl: "",
    tags: ["umkm", "keuangan", "tools"],
    glyph: "≡",
    createdAt: "2024-11-11 09:00:00",
    now: "Menguji cetak ke printer termal yang paling umum dipakai penjual.",
    nowUpdatedAt: "2026-04-30 09:00:00",
    seats: [
      {
        role: "product-manager",
        brief: "Menentukan fitur berikutnya dari keluhan pengguna yang sudah masuk.",
        commitment: "",
        status: "open",
        access: "member",
        userId: null,
        pitch: "",
      },
    ],
    tasks: [],
    updates: [],
  },
  {
    id: 5,
    slug: "main-aman",
    title: "Main Aman",
    tagline: "Tempat belajar anak supaya lebih siap menjaga diri.",
    ownerId: "seed-zikrul",
    stage: "live",
    problem:
      "Anak-anak diminta hati-hati, tapi jarang diberi contoh situasinya seperti apa. Orang tua juga sering bingung memulai obrolan soal batas tubuh, orang asing, atau situasi yang bikin tidak nyaman.",
    solution:
      "Materi belajar yang dikemas ringan dan bisa dibuka bersama orang tua, berisi situasi sehari-hari beserta apa yang sebaiknya dilakukan anak. Bahasanya dibuat sederhana supaya anak bisa mengulang sendiri.",
    audience: "Anak usia sekolah dasar bersama orang tua atau gurunya.",
    docUrl: "",
    liveUrl: "https://mainaman.netlify.app/",
    repoUrl: "",
    tags: ["anak", "edukasi", "keamanan"],
    glyph: "✦",
    createdAt: "2025-01-20 09:00:00",
    now: "Menyusun materi keselamatan pertama untuk anak usia 5–8 tahun.",
    nowUpdatedAt: "2026-08-18 09:00:00",
    seats: [
      {
        role: "researcher",
        brief: "Menguji materinya ke satu kelas dan merapikan bagian yang belum kena.",
        commitment: "",
        status: "open",
        access: "member",
        userId: null,
        pitch: "",
      },
    ],
    tasks: [],
    updates: [
      {
        title: "Draft materi pertama selesai",
        body: "Dua puluh topik keselamatan dasar sudah dikumpulkan dan dirapikan. Berikutnya diuji ke beberapa orang tua sebelum ditulis ulang.",
        createdAt: "2026-08-18 09:00:00",
      },
      {
        title: "Mulai riset",
        body: "Sedang mencari pendekatan yang paling cocok untuk anak usia 5–8 tahun: yang mudah dipahami, dan tidak menakutkan.",
        createdAt: "2026-06-03 09:00:00",
      },
    ],
  },
  {
    id: 6,
    slug: "swegrowth",
    title: "Swegrowth",
    tagline: "Portal komunitas software engineer Indonesia.",
    ownerId: "seed-zikrul",
    stage: "live",
    problem:
      "Pengalaman berharga teman-teman engineer di Indonesia berserak di utas media sosial dan grup chat yang tenggelam dalam hitungan hari. Yang baru mulai kesulitan menemukannya lagi saat benar-benar butuh.",
    solution:
      "Satu portal tempat cerita, materi belajar, dan pengalaman kerja dikumpulkan supaya bisa dibaca ulang kapan pun. Isinya datang dari komunitas, bukan dari satu orang saja.",
    audience: "Software engineer Indonesia, terutama yang sedang di tahun-tahun awal.",
    docUrl: "",
    liveUrl: "https://swegrowth.id/",
    repoUrl: "",
    tags: ["komunitas", "karier", "belajar"],
    glyph: "↗",
    createdAt: "2025-03-08 09:00:00",
    now: "Membangun portal tempat program dan materi komunitas dikumpulkan.",
    nowUpdatedAt: "2026-08-05 09:00:00",
    seats: [
      {
        role: "content-writer",
        brief: "Mengurasi dan menyunting tulisan kiriman komunitas tiap bulan.",
        commitment: "",
        status: "open",
        access: "member",
        userId: null,
        pitch: "",
      },
    ],
    tasks: [],
    updates: [
      {
        title: "Struktur portal disepakati",
        body: "Program, materi, dan aktivitas jadi tiga bagian utama. Bagian materi yang paling banyak isinya, jadi itu yang dikerjakan duluan.",
        createdAt: "2026-08-05 09:00:00",
      },
    ],
  },
  {
    id: 7,
    slug: "warung-antre",
    title: "Warung Antre",
    tagline: "Antrean digital untuk warung dan kedai kecil yang ramai di jam makan.",
    ownerId: "seed-zikrul",
    stage: "idea",
    problem:
      "Di jam makan siang, warung kecil ramai dan pesanan diingat di kepala. Pembeli menunggu tanpa tahu urutannya di mana, penjual repot menghafal, dan yang datang belakangan kadang malah dilayani duluan. Ributnya kecil tapi terjadi setiap hari.",
    solution:
      "Nomor antrean yang dibuat cukup lewat satu layar di warung: pembeli memindai kode, penjual menggeser antrean saat pesanan siap. Tidak perlu perangkat tambahan, tidak perlu pelatihan, dan tetap jalan kalau sinyalnya jelek.",
    audience: "Warung, kedai kopi, dan gerai kecil yang ramai pada jam tertentu.",
    docUrl: "",
    liveUrl: "",
    repoUrl: "",
    tags: ["umkm", "operasional", "ide"],
    glyph: "◔",
    createdAt: "2025-06-14 09:00:00",
    now: "",
    nowUpdatedAt: "",
    seats: [
      {
        role: "researcher",
        brief: "Ngobrol dengan lima pemilik warung untuk memastikan masalahnya memang terasa.",
        commitment: "",
        status: "open",
        access: "member",
        userId: null,
        pitch: "",
      },
      {
        role: "ui-ux-designer",
        brief: "Membuat alur layar penjual yang bisa dipakai sambil tangan sibuk.",
        commitment: "",
        status: "open",
        access: "member",
        userId: null,
        pitch: "",
      },
      {
        role: "software-engineer",
        brief: "Prototipe antrean yang tetap jalan saat koneksi putus.",
        commitment: "",
        status: "open",
        access: "member",
        userId: null,
        pitch: "",
      },
    ],
    tasks: [
      {
        title: "Ngobrol dengan lima pemilik warung",
        detail: "Cari tahu apakah antreannya benar-benar terasa mengganggu, atau cuma kelihatan begitu dari luar.",
        status: "doing",
        assigneeId: "seed-zikrul",
      },
      {
        title: "Sketsa layar penjual",
        detail: "Satu layar saja, harus kebaca sambil tangan sibuk.",
        status: "todo",
        assigneeId: null,
      },
      {
        title: "Tulis brief-nya",
        detail: "Masalah, gambaran solusi, dan untuk siapa.",
        status: "done",
        assigneeId: "seed-zikrul",
      },
    ],
    updates: [],
  },
  {
    id: 8,
    slug: "titip-jemput",
    title: "Titip Jemput",
    tagline: "Papan koordinasi antar-jemput sekolah antar orang tua satu kompleks.",
    ownerId: "seed-zikrul",
    stage: "building",
    problem:
      "Orang tua di satu kompleks sering menjemput ke sekolah yang sama pada jam yang sama, tapi tetap berangkat sendiri-sendiri. Koordinasinya nyangkut di grup chat: pesan tenggelam, yang butuh tumpangan sungkan minta, yang punya kursi kosong tidak tahu siapa yang butuh.",
    solution:
      "Papan sederhana berisi jadwal jemput mingguan: siapa berangkat jam berapa, ke sekolah mana, ada berapa kursi kosong. Orang tua tinggal menandai butuh atau menawarkan, tanpa perlu menawar di grup ramai.",
    audience: "Orang tua di satu kompleks atau perumahan dengan sekolah tujuan yang sama.",
    docUrl: "",
    liveUrl: "",
    repoUrl: "",
    tags: ["keluarga", "komunitas", "ide"],
    glyph: "⌁",
    createdAt: "2025-08-01 09:00:00",
    now: "Menghitung berapa orang tua yang sekolah tujuannya benar-benar searah.",
    nowUpdatedAt: "2026-08-14 09:00:00",
    seats: [
      {
        role: "product-manager",
        brief: "Merapikan alurnya jadi sesederhana mungkin supaya tidak kalah praktis dari grup chat.",
        commitment: "± 2 jam per minggu",
        status: "open",
        access: "member",
        userId: null,
        pitch: "",
      },
      {
        role: "ui-ux-designer",
        brief: "Menyusun tampilan papan mingguan yang kebaca sekali lihat.",
        commitment: "Fleksibel, borongan juga boleh",
        status: "open",
        access: "member",
        userId: null,
        pitch: "",
      },
    ],
    tasks: [
      {
        title: "Hitung berapa orang tua yang sekolahnya searah",
        detail: "Pakai data satu kompleks dulu, jangan langsung sekota.",
        status: "todo",
        assigneeId: null,
      },
    ],
    updates: [
      {
        title: "Mulai dari satu kompleks dulu",
        body: "Daripada langsung sekota, datanya dikumpulkan dari satu kompleks saja. Kalau di sana pun tidak cukup banyak yang searah, idenya memang tidak jalan.",
        createdAt: "2026-08-14 09:00:00",
      },
    ],
  },
];
