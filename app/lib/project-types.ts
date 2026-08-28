/**
 * What kind of thing a project is.
 *
 * A different question from `stages.ts` and from the topic tags, and it has to
 * stay that way or the three collapse into one muddled label. A stage says how
 * far the work has got; a topic says what it is about; the type here says why
 * it exists — and, because of that, what joining it actually means for whoever
 * offers to help.
 *
 * That last part is the whole reason this exists. Somebody scanning the board
 * is not only asking "can I do this work"; they are asking "do I want this kind
 * of arrangement". A weekend experiment where nothing is expected of you and a
 * product with paying customers can want the very same role and be completely
 * different things to say yes to. Without this, the only way to find that out
 * was to read the brief and guess.
 *
 * Store the key, never the label — the same rule as `roles.ts`. The Indonesian
 * copy can be rewritten without touching a single row.
 */
export const PROJECT_TYPES = ["pet", "community", "product", "commercial"] as const;

export type ProjectType = (typeof PROJECT_TYPES)[number];

export const projectTypeMeta: Record<
  ProjectType,
  {
    label: string;
    /** What the project is. */
    blurb: string;
    /** What contributing to it is like — the part people are really choosing. */
    contribution: string;
    tone: string;
  }
> = {
  pet: {
    label: "Pet project",
    blurb: "Dibangun sendiri untuk belajar, mencoba, dan senang-senang.",
    contribution:
      "Santai dan bebas bereksperimen. Tidak ada tenggat, tidak ada bayaran — yang dibawa pulang pengalaman dan karyanya.",
    tone: "type-pet",
  },
  community: {
    label: "Project komunitas",
    blurb: "Dikerjakan terbuka untuk kepentingan bersama, bukan untuk keuntungan.",
    contribution:
      "Kerja bareng banyak orang dan hasilnya jadi milik bersama. Cocok kalau kamu ingin karyanya dipakai luas.",
    tone: "type-community",
  },
  product: {
    label: "Produk berpengguna",
    blurb: "Sudah dipakai orang di luar tim, dan belum atau tidak dimonetisasi.",
    contribution:
      "Yang kamu kerjakan langsung dipakai pengguna yang sudah ada. Ada ritme rilis dan tanggung jawab yang mengikutinya.",
    tone: "type-product",
  },
  commercial: {
    label: "Project komersial",
    blurb: "Sudah menghasilkan uang, atau memang diarahkan ke sana.",
    contribution:
      "Ada uang di dalamnya. Sepakati dulu bentuk imbalannya — bayaran, bagi hasil, atau kepemilikan — sebelum mulai.",
    tone: "type-commercial",
  },
};

/**
 * A project that has not said which it is.
 *
 * Every project made before this existed is one, and an empty value is the only
 * honest thing to store for them: guessing would put a claim on somebody's row
 * that they never made. New projects have to pick — see `createProject` — so
 * the gap closes on its own rather than being papered over.
 */
export const PROJECT_TYPE_UNSET = "";

export function isProjectType(value: string): value is ProjectType {
  return (PROJECT_TYPES as readonly string[]).includes(value);
}

/** The visible name, or an empty string when the project has not said. */
export function projectTypeLabel(value: string): string {
  return isProjectType(value) ? projectTypeMeta[value].label : "";
}

/** The badge's colour class, or an empty string when there is no badge to draw. */
export function projectTypeTone(value: string): string {
  return isProjectType(value) ? projectTypeMeta[value].tone : "";
}

/** What joining this kind of project means, for the project page to say out loud. */
export function projectTypeContribution(value: string): string {
  return isProjectType(value) ? projectTypeMeta[value].contribution : "";
}
