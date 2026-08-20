export type Lang = "id" | "en";

/** Canonical origin. Update this when the site moves to its own domain. */
export const siteUrl = "https://ahsanproject-id.netlify.app";

/** Where the story page lives in each language. */
export const aboutPaths: Record<Lang, string> = { id: "/about", en: "/en/about" };

export const homeMeta = {
  title: "Ahsan Project — Tempat ide dikerjakan bareng",
  description:
    "Papan ide dan proyek terbuka. Tulis idemu lengkap dengan briefnya, buka peran untuk PM, designer, engineer, dan siapa pun yang mau ikut menggarap.",
};

export const about: Record<
  Lang,
  {
    title: string;
    description: string;
    eyebrow: string;
    headingTop: string;
    headingBefore: string;
    headingEm: string;
    lead: [string, string];
    body: string[];
    marquee: [string, string, string];
    switchLabel: string;
    switchTitle: string;
    howHeading: string;
    how: { step: string; title: string; body: string }[];
  }
> = {
  id: {
    title: "Tentang — Ahsan Project",
    description:
      "Ahsan artinya melakukan sesuatu sebaik mungkin. Ahsan Project adalah tempat ide ditulis terbuka lalu dikerjakan bersama.",
    eyebrow: "Tentang nama ini",
    headingTop: "Nama saya Ihsan.",
    headingBefore: "Semoga kerjanya juga ",
    headingEm: "ihsan.",
    lead: [
      "Ahsan",
      " artinya melakukan sesuatu sebaik mungkin. Itu yang saya usahakan di sini, sekecil apa pun yang sedang dikerjakan.",
    ],
    body: [
      "Awalnya tempat ini cuma rak buat proyek saya sendiri. Ternyata bagian yang paling sering bikin ide berhenti bukan idenya, tapi tidak adanya teman mengerjakan — dan tidak adanya tempat menaruh ide itu supaya orang lain bisa melihatnya.",
      "Jadi sekarang siapa pun bisa menaruh ide di sini, asal ditulis serius: apa masalahnya, kira-kira solusinya seperti apa, dan buat siapa. Dari situ orang lain bisa ikut membahas, atau langsung mengambil peran yang dibuka.",
    ],
    marquee: ["mulai dari kecil", "jalan pelan-pelan", "do ahsan"],
    switchLabel: "EN",
    switchTitle: "Read this page in English",
    howHeading: "Cara kerjanya",
    how: [
      {
        step: "01",
        title: "Tulis idenya, jangan setengah",
        body: "Setiap proyek wajib punya brief: masalah, gambaran solusi, dan untuk siapa. Yang kosongan tidak bisa dibuat.",
      },
      {
        step: "02",
        title: "Buka peran yang kamu butuh",
        body: "PM, designer, engineer, peneliti, penulis. Tulis apa yang perlu dibantu, biar yang tertarik tahu harus mulai dari mana.",
      },
      {
        step: "03",
        title: "Naik level pelan-pelan",
        body: "Dari ide, divalidasi, dikerjakan, sampai sudah jalan. Levelnya cuma naik kalau syaratnya benar-benar terpenuhi.",
      },
    ],
  },
  en: {
    title: "About — Ahsan Project",
    description:
      "Ahsan means doing something as well as you can. Ahsan Project is where ideas get written down in the open and worked on together.",
    eyebrow: "About the name",
    headingTop: "My name is Ihsan.",
    headingBefore: "I hope the work is ",
    headingEm: "ihsan.",
    lead: [
      "Ahsan",
      " means doing something as well as you possibly can. That is what I aim for here, however small the thing being worked on.",
    ],
    body: [
      "This started as a shelf for my own projects. It turned out the thing that stops most ideas is not the idea — it is having nobody to build it with, and nowhere to put it where other people can see it.",
      "So now anyone can leave an idea here, as long as it is written down properly: what the problem is, roughly how it might be solved, and who it is for. From there other people can discuss it, or take one of the open roles.",
    ],
    marquee: ["start small", "go slowly", "do ahsan"],
    switchLabel: "ID",
    switchTitle: "Baca halaman ini dalam Bahasa Indonesia",
    howHeading: "How it works",
    how: [
      {
        step: "01",
        title: "Write the idea down properly",
        body: "Every project carries a brief: the problem, a guess at the solution, and who it is for. Empty ones cannot be created.",
      },
      {
        step: "02",
        title: "Open the roles you need",
        body: "PM, designer, engineer, researcher, writer. Say what you need help with, so whoever is interested knows where to start.",
      },
      {
        step: "03",
        title: "Level up slowly",
        body: "From idea, to validating, to building, to live. A project only levels up once it actually meets the requirements.",
      },
    ],
  },
};
