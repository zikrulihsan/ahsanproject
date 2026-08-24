export type Lang = "id" | "en";

/** Canonical origin. Update this when the site moves to its own domain. */
export const siteUrl = "https://ahsanproject-id.netlify.app";

/** Where the story page lives in each language. */
export const aboutPaths: Record<Lang, string> = { id: "/about", en: "/en/about" };

export const homeMeta = {
  title: "Ahsan Project — Tempat karya tumbuh bersama",
  description:
    "Rumah untuk menunjukkan project, menemukan teman kolaborasi, dan membangun portfolio dari jejak kerja nyata.",
};

/** The shared picture, for pages that do not draw a card of their own. */
export const defaultShareImage = { url: "/og.png", width: 1731, height: 909 };

/**
 * Share-card fields for a page with no `opengraph-image` file beside it.
 *
 * Next.js replaces the whole `openGraph` object rather than merging into the
 * one on the layout, so a page that names its own title has to re-state the
 * image too — otherwise it quietly ships a card with no picture at all.
 * Pages that do have an `opengraph-image` file (profiles, projects) get their
 * image from that file and should not call this.
 */
export function shareCard(fields: {
  title: string;
  description: string;
  url: string;
  locale?: string;
}) {
  return { ...fields, images: [defaultShareImage] };
}

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
        title: "Tunjukkan yang sedang kamu bangun",
        body: "Ide, setengah jadi, atau sudah dipakai orang — semuanya boleh. Yang wajib cuma briefnya: masalahnya apa, buatnya apa, buat siapa.",
      },
      {
        step: "02",
        title: "Ceritakan perjalanannya",
        body: "Satu kalimat tentang yang sedang dikerjakan sekarang, dan kabar tiap ada yang selesai atau berubah arah. Itu yang bikin projectmu terlihat hidup.",
      },
      {
        step: "03",
        title: "Sebutkan bantuan yang kamu cari",
        body: "Bukan lowongan — cukup bilang apa yang perlu dibantu dan kira-kira berapa waktunya, biar yang tertarik tahu mulai dari mana.",
      },
      {
        step: "04",
        title: "Jejaknya jadi bukti kerja",
        body: "Yang kamu bangun dan yang kamu bantu tercatat sendiri saat kejadiannya — bukan diketik belakangan, jadi bisa dicek ke projectnya.",
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
        title: "Show what you are building",
        body: "An idea, a half-built thing, or something people already use — all of it belongs. The only requirement is the brief: the problem, what you are making, who it is for.",
      },
      {
        step: "02",
        title: "Tell its journey",
        body: "One line about what you are working on right now, and a note whenever something lands or changes direction. That is what makes a project look alive.",
      },
      {
        step: "03",
        title: "Say what help you need",
        body: "Not a vacancy — just what needs doing and roughly how much time it takes, so whoever is interested knows where to start.",
      },
      {
        step: "04",
        title: "The trail becomes proof of work",
        body: "What you build and what you help with are recorded as they happen — not typed up afterwards, so anyone can check them against the project.",
      },
    ],
  },
};
