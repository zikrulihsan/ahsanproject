export type Lang = "id" | "en";

export const siteUrl = "https://ahsanproject-id.netlify.app";

/** Route each language lives on. Indonesian is the default and owns "/". */
export const paths: Record<Lang, string> = { id: "/", en: "/en" };

type Localised<T> = Record<Lang, T>;

export const projects = [
  {
    number: "01",
    name: "Tap Tap Dzikr",
    glyph: "○○○",
    url: "https://dzikir-harian.netlify.app/",
    domain: "dzikir-harian.netlify.app",
    accent: "mint",
    label: { id: "Untuk ibadah", en: "For worship" },
    description: {
      id: "Ganti kebiasaan tap tap medsos dengan tap tap dzikir. Penghitung dzikir harian yang sederhana.",
      en: "Swap the habit of tapping through social media for tapping through dzikir. A simple daily counter.",
    },
  },
  {
    number: "02",
    name: "Wecard",
    glyph: "▱",
    url: "https://wecard-app.netlify.app/",
    domain: "wecard-app.netlify.app",
    accent: "yellow",
    label: { id: "Untuk obrolan", en: "For conversation" },
    description: {
      id: "Kartu-kartu berisi pertanyaan untuk memancing obrolan yang lebih dalam bersama teman, keluarga, atau pasangan.",
      en: "Cards full of questions that pull out the deeper conversations with friends, family, or your partner.",
    },
  },
  {
    number: "03",
    name: "CariKontak",
    glyph: "⌖",
    url: "https://carikontak.com/",
    domain: "carikontak.com",
    accent: "blue",
    label: { id: "Untuk sekitar", en: "For your area" },
    description: {
      id: "Simpan dan cari kontak penting di sekitarmu, supaya tidak bingung mencari saat sedang butuh.",
      en: "Save and look up the important numbers near you, so you are not scrambling when you actually need one.",
    },
  },
  {
    number: "04",
    name: "Invoice Cepat",
    glyph: "≡",
    url: "https://umkmproject-invoice.netlify.app/",
    domain: "umkmproject-invoice.netlify.app",
    accent: "coral",
    label: { id: "Untuk usaha", en: "For business" },
    description: {
      id: "Bikin invoice sederhana untuk jasa atau produkmu, tanpa proses yang berbelit.",
      en: "Put together a simple invoice for your service or product, without the drawn-out process.",
    },
  },
  {
    number: "05",
    name: "Main Aman",
    glyph: "✦",
    url: "https://mainaman.netlify.app/",
    domain: "mainaman.netlify.app",
    accent: "purple",
    label: { id: "Untuk anak", en: "For kids" },
    description: {
      id: "Tempat belajar untuk anak supaya lebih siap menjaga diri di lingkungan sekitarnya.",
      en: "A place for children to learn how to look after themselves in the world around them.",
    },
  },
  {
    number: "06",
    name: "Swegrowth",
    glyph: "↗",
    url: "https://swegrowth.id/",
    domain: "swegrowth.id",
    accent: "green",
    label: { id: "Untuk komunitas", en: "For community" },
    description: {
      id: "Portal komunitas software engineer Indonesia. Tempat belajar dan berbagi pengalaman.",
      en: "A portal for Indonesia's software engineering community — somewhere to learn and trade experience.",
    },
  },
] as const;

export const meta: Localised<{ title: string; description: string; ogDescription: string }> = {
  id: {
    title: "Ahsan Project — Ide kecil, manfaat nyata",
    description:
      "Kumpulan proyek digital buatan Zikrul Ihsan. Dari penghitung dzikir dan kartu obrolan sampai pembuat invoice.",
    ogDescription:
      "Kumpulan proyek digital buatan Zikrul Ihsan, dikerjakan satu per satu di waktu luang.",
  },
  en: {
    title: "Ahsan Project — Small ideas, actually useful",
    description:
      "A collection of digital projects by Zikrul Ihsan. From a dzikir counter and conversation cards to an invoice maker.",
    ogDescription:
      "A collection of digital projects by Zikrul Ihsan, built one at a time in whatever spare time there is.",
  },
};

export const copy: Localised<{
  brandLabel: string;
  nav: { projects: string; about: string };
  langSwitch: { label: string; title: string };
  hero: {
    eyebrow: string;
    titleTop: string;
    titleEm: string;
    /** [before, name in bold, after] */
    lead: [string, string, string];
    cta: string;
    definition: string;
  };
  work: { eyebrow: string; titleTop: string; titleBottom: string; intro: string; cardHint: string };
  about: {
    eyebrow: string;
    titleTop: string;
    titleBefore: string;
    titleEm: string;
    /** [term in bold, rest of the sentence] */
    bodyLead: [string, string];
    body: string;
    marquee: [string, string, string];
  };
  footer: { credit: string };
}> = {
  id: {
    brandLabel: "Ahsan Project, kembali ke atas",
    nav: { projects: "Semua proyek", about: "Tentang" },
    langSwitch: { label: "EN", title: "Read this page in English" },
    hero: {
      eyebrow: "Kumpulan proyek pribadi",
      titleTop: "Ide kecil.",
      titleEm: "Manfaat nyata.",
      lead: [
        "Ahsan Project adalah kumpulan proyek digital buatan ",
        "Zikrul Ihsan",
        ". Sebagian besar berangkat dari kebutuhan saya sendiri, lalu saya rapikan supaya bisa dipakai orang lain.",
      ],
      cta: "Lihat proyek",
      definition: "/aḥ·san/ — lakukan yang terbaik",
    },
    work: {
      eyebrow: "Yang sedang saya kerjakan",
      titleTop: "Sudah jalan,",
      titleBottom: "bukan pajangan.",
      intro: "Semuanya sudah bisa dipakai sekarang. Silakan dicoba yang menurutmu berguna.",
      cardHint: "Buka {name} di tab baru",
    },
    about: {
      eyebrow: "Tentang nama ini",
      titleTop: "Nama saya Ihsan.",
      titleBefore: "Semoga kerjanya juga ",
      titleEm: "ihsan.",
      bodyLead: [
        "Ahsan",
        " artinya melakukan sesuatu sebaik mungkin. Itu yang saya usahakan di sini, sekecil apa pun yang sedang saya kerjakan.",
      ],
      body: "Semuanya saya kerjakan satu per satu di waktu luang. Kalau ada yang ternyata berguna buat kamu, buat saya itu sudah cukup.",
      marquee: ["mulai dari kecil", "jalan pelan-pelan", "do ahsan"],
    },
    footer: { credit: "Dibuat oleh Zikrul Ihsan." },
  },
  en: {
    brandLabel: "Ahsan Project, back to top",
    nav: { projects: "All projects", about: "About" },
    langSwitch: { label: "ID", title: "Baca halaman ini dalam Bahasa Indonesia" },
    hero: {
      eyebrow: "A shelf of personal projects",
      titleTop: "Small ideas.",
      titleEm: "Actually useful.",
      lead: [
        "Ahsan Project is a collection of digital projects by ",
        "Zikrul Ihsan",
        ". Most of them started as something I needed myself, then got tidied up enough for other people to use.",
      ],
      cta: "See the projects",
      definition: "/aḥ·san/ — do it as well as you can",
    },
    work: {
      eyebrow: "What I'm working on",
      titleTop: "Live, not",
      titleBottom: "just demos.",
      intro: "Every one of them is up and running. Try whichever looks useful to you.",
      cardHint: "Open {name} in a new tab",
    },
    about: {
      eyebrow: "About the name",
      titleTop: "My name is Ihsan.",
      titleBefore: "I hope the work is ",
      titleEm: "ihsan.",
      bodyLead: [
        "Ahsan",
        " means doing something as well as you possibly can. That is what I aim for here, however small the thing I am working on.",
      ],
      body: "I build them one at a time, in whatever spare time there is. If one of them turns out to be useful to you, that is enough for me.",
      marquee: ["start small", "go slowly", "do ahsan"],
    },
    footer: { credit: "Built by Zikrul Ihsan." },
  },
};
