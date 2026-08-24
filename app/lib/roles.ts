/**
 * Canonical roles that may be opened on a project.
 *
 * Store the key, never the label. That keeps one role filterable across many
 * projects while the Indonesian copy can still change without rewriting data.
 */
export const ROLES = [
  "product-manager",
  "ui-ux-designer",
  "frontend-developer",
  "backend-developer",
  "mobile-developer",
  "software-engineer",
  "data-ml-engineer",
  "qa-engineer",
  "researcher",
  "content-writer",
  "content-designer",
  "social-media",
  "growth-marketing",
  "partnership",
  "community-manager",
  "mentor",
  "teacher",
  "legal-researcher",
  "other",
] as const;

export type Role = (typeof ROLES)[number];

export type RoleGroup =
  | "Produk & Desain"
  | "Teknologi"
  | "Riset & Konten"
  | "Komunitas & Bisnis"
  | "Lainnya";

export const roleMeta: Record<Role, { label: string; blurb: string; group: RoleGroup }> = {
  "product-manager": {
    label: "Product Manager",
    blurb: "Menajamkan masalah, menyusun prioritas, dan menjaga arah.",
    group: "Produk & Desain",
  },
  "ui-ux-designer": {
    label: "UI/UX Designer",
    blurb: "Merancang alur, antarmuka, dan pengalaman pengguna.",
    group: "Produk & Desain",
  },
  "frontend-developer": {
    label: "Frontend Developer",
    blurb: "Membangun antarmuka web yang rapi dan mudah dipakai.",
    group: "Teknologi",
  },
  "backend-developer": {
    label: "Backend Developer",
    blurb: "Membangun API, basis data, dan layanan di belakang layar.",
    group: "Teknologi",
  },
  "mobile-developer": {
    label: "Mobile Developer",
    blurb: "Membangun aplikasi Android, iOS, atau lintas platform.",
    group: "Teknologi",
  },
  "software-engineer": {
    label: "Software Engineer",
    blurb: "Membangun dan merawat solusi perangkat lunak secara menyeluruh.",
    group: "Teknologi",
  },
  "data-ml-engineer": {
    label: "Data & ML Engineer",
    blurb: "Mengolah data dan membangun fitur berbasis machine learning.",
    group: "Teknologi",
  },
  "qa-engineer": {
    label: "QA Engineer",
    blurb: "Menguji kualitas produk dan menjaga rilis tetap dapat diandalkan.",
    group: "Teknologi",
  },
  researcher: {
    label: "Researcher",
    blurb: "Menguji asumsi dan memahami kebutuhan calon pengguna.",
    group: "Riset & Konten",
  },
  "content-writer": {
    label: "Content Writer",
    blurb: "Menulis copy, artikel, dokumentasi, dan cerita produk.",
    group: "Riset & Konten",
  },
  "content-designer": {
    label: "Content Designer",
    blurb: "Merancang struktur dan bahasa agar produk mudah dipahami.",
    group: "Riset & Konten",
  },
  "social-media": {
    label: "Social Media",
    blurb: "Menyusun dan menjalankan komunikasi di media sosial.",
    group: "Riset & Konten",
  },
  "growth-marketing": {
    label: "Growth & Marketing",
    blurb: "Membawa project ke orang yang paling membutuhkannya.",
    group: "Komunitas & Bisnis",
  },
  partnership: {
    label: "Partnership",
    blurb: "Membangun kerja sama dengan komunitas dan organisasi lain.",
    group: "Komunitas & Bisnis",
  },
  "community-manager": {
    label: "Community Manager",
    blurb: "Merawat anggota, program, dan ritme sebuah komunitas.",
    group: "Komunitas & Bisnis",
  },
  mentor: {
    label: "Mentor",
    blurb: "Mendampingi peserta dengan pengalaman dan umpan balik.",
    group: "Komunitas & Bisnis",
  },
  teacher: {
    label: "Pengajar",
    blurb: "Menyusun dan membawakan kegiatan belajar.",
    group: "Komunitas & Bisnis",
  },
  "legal-researcher": {
    label: "Legal Researcher",
    blurb: "Meneliti aturan dan menjelaskan konteks hukum dengan jernih.",
    group: "Riset & Konten",
  },
  other: {
    label: "Role lainnya",
    blurb: "Gunakan nama role yang lebih sesuai dengan kebutuhan projectmu.",
    group: "Lainnya",
  },
};

export const ROLE_GROUPS: RoleGroup[] = [
  "Produk & Desain",
  "Teknologi",
  "Riset & Konten",
  "Komunitas & Bisnis",
  "Lainnya",
];

/** Values stored before the canonical catalogue was introduced. */
const LEGACY_ROLE_MAP: Record<string, Role> = {
  pm: "product-manager",
  design: "ui-ux-designer",
  engineering: "software-engineer",
  research: "researcher",
  content: "content-writer",
  growth: "growth-marketing",
};

export function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}

/** Accept old links and old rows while deployments roll through the migration. */
export function normaliseRole(value: string): Role | null {
  return isRole(value) ? value : LEGACY_ROLE_MAP[value] ?? null;
}

/** Postgres aliases that can represent the same canonical role during rollout. */
export function roleAliases(role: Role): string[] {
  const legacy = Object.entries(LEGACY_ROLE_MAP)
    .filter(([, canonical]) => canonical === role)
    .map(([value]) => value);
  return [role, ...legacy];
}

export function roleLabel(value: string, customTitle = ""): string {
  const role = normaliseRole(value);
  if (role === "other") return customTitle.trim() || roleMeta.other.label;
  if (role) return roleMeta[role].label;
  return "Peran";
}
