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

import { tx, type Locale } from "./locale";

export type RoleGroup =
  | "Produk & Desain"
  | "Teknologi"
  | "Riset & Konten"
  | "Komunitas & Bisnis"
  | "Lainnya";

export const roleMeta: Record<Role, { label: string; blurb: string; group: RoleGroup }> = {
  "product-manager": {
    label: "Manajer Produk",
    blurb: "Memperjelas masalah, menetapkan prioritas, dan menjaga pekerjaan tetap terarah.",
    group: "Produk & Desain",
  },
  "ui-ux-designer": {
    label: "Desainer UI/UX",
    blurb: "Merancang alur, antarmuka, dan pengalaman pengguna.",
    group: "Produk & Desain",
  },
  "frontend-developer": {
    label: "Pengembang Frontend",
    blurb: "Membangun antarmuka web yang rapi dan mudah digunakan.",
    group: "Teknologi",
  },
  "backend-developer": {
    label: "Pengembang Backend",
    blurb: "Membangun API, basis data, dan layanan backend.",
    group: "Teknologi",
  },
  "mobile-developer": {
    label: "Pengembang Aplikasi Seluler",
    blurb: "Membangun aplikasi Android, iOS, atau lintas platform.",
    group: "Teknologi",
  },
  "software-engineer": {
    label: "Insinyur Perangkat Lunak",
    blurb: "Membangun dan memelihara solusi perangkat lunak secara menyeluruh.",
    group: "Teknologi",
  },
  "data-ml-engineer": {
    label: "Insinyur Data & ML",
    blurb: "Mengolah data dan membangun fitur pembelajaran mesin.",
    group: "Teknologi",
  },
  "qa-engineer": {
    label: "Insinyur QA",
    blurb: "Menguji kualitas produk dan menjaga setiap rilis tetap andal.",
    group: "Teknologi",
  },
  researcher: {
    label: "Peneliti",
    blurb: "Menguji asumsi dan memahami kebutuhan calon pengguna.",
    group: "Riset & Konten",
  },
  "content-writer": {
    label: "Penulis Konten",
    blurb: "Menulis copy, artikel, dokumentasi, dan cerita produk.",
    group: "Riset & Konten",
  },
  "content-designer": {
    label: "Desainer Konten",
    blurb: "Merancang struktur dan bahasa agar produk mudah dipahami.",
    group: "Riset & Konten",
  },
  "social-media": {
    label: "Media Sosial",
    blurb: "Merencanakan dan menjalankan komunikasi di media sosial.",
    group: "Riset & Konten",
  },
  "growth-marketing": {
    label: "Pertumbuhan & Pemasaran",
    blurb: "Menghubungkan proyek dengan orang-orang yang paling membutuhkannya.",
    group: "Komunitas & Bisnis",
  },
  partnership: {
    label: "Kemitraan",
    blurb: "Membangun kemitraan dengan komunitas dan organisasi lain.",
    group: "Komunitas & Bisnis",
  },
  "community-manager": {
    label: "Manajer Komunitas",
    blurb: "Mendukung anggota, program, dan ritme kegiatan komunitas.",
    group: "Komunitas & Bisnis",
  },
  mentor: {
    label: "Mentor",
    blurb: "Membimbing peserta melalui pengalaman dan umpan balik.",
    group: "Komunitas & Bisnis",
  },
  teacher: {
    label: "Pengajar",
    blurb: "Merencanakan dan memimpin kegiatan pembelajaran.",
    group: "Komunitas & Bisnis",
  },
  "legal-researcher": {
    label: "Peneliti Hukum",
    blurb: "Meneliti peraturan dan menjelaskan konteks hukum dengan jelas.",
    group: "Riset & Konten",
  },
  other: {
    label: "Peran lainnya",
    blurb: "Gunakan nama peran yang lebih sesuai dengan kebutuhan proyekmu.",
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

const ROLE_LABEL_EN: Record<Role, string> = {
  "product-manager": "Product Manager",
  "ui-ux-designer": "UI/UX Designer",
  "frontend-developer": "Frontend Developer",
  "backend-developer": "Backend Developer",
  "mobile-developer": "Mobile Developer",
  "software-engineer": "Software Engineer",
  "data-ml-engineer": "Data & ML Engineer",
  "qa-engineer": "QA Engineer",
  researcher: "Researcher",
  "content-writer": "Content Writer",
  "content-designer": "Content Designer",
  "social-media": "Social Media",
  "growth-marketing": "Growth & Marketing",
  partnership: "Partnership",
  "community-manager": "Community Manager",
  mentor: "Mentor",
  teacher: "Teacher",
  "legal-researcher": "Legal Researcher",
  other: "Other role",
};

const ROLE_BLURB_EN: Record<Role, string> = {
  "product-manager": "Clarifies the problem, sets priorities, and keeps the work on course.",
  "ui-ux-designer": "Designs flows, interfaces, and user experiences.",
  "frontend-developer": "Builds clean, usable web interfaces.",
  "backend-developer": "Builds APIs, databases, and backend services.",
  "mobile-developer": "Builds Android, iOS, or cross-platform applications.",
  "software-engineer": "Builds and maintains software solutions end to end.",
  "data-ml-engineer": "Works with data and builds machine-learning features.",
  "qa-engineer": "Tests product quality and keeps releases reliable.",
  researcher: "Tests assumptions and understands prospective users' needs.",
  "content-writer": "Writes copy, articles, documentation, and product stories.",
  "content-designer": "Designs structure and language that make products easy to understand.",
  "social-media": "Plans and runs social-media communications.",
  "growth-marketing": "Connects the project with the people who need it most.",
  partnership: "Builds partnerships with communities and other organizations.",
  "community-manager": "Supports members, programs, and the rhythm of a community.",
  mentor: "Guides participants with experience and feedback.",
  teacher: "Plans and leads learning activities.",
  "legal-researcher": "Researches regulations and explains legal context clearly.",
  other: "Use a role name that better fits your project's needs.",
};

const ROLE_GROUP_EN: Record<RoleGroup, string> = {
  "Produk & Desain": "Product & Design",
  Teknologi: "Technology",
  "Riset & Konten": "Research & Content",
  "Komunitas & Bisnis": "Community & Business",
  Lainnya: "Other",
};

export function roleGroupLabel(group: RoleGroup, locale: Locale): string {
  return tx(locale, group, ROLE_GROUP_EN[group]);
}

export function roleBlurb(value: string, locale: Locale): string {
  const role = normaliseRole(value);
  if (!role) return "";
  return tx(locale, roleMeta[role].blurb, ROLE_BLURB_EN[role]);
}

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

export function roleLabel(value: string, customTitle = "", locale: Locale = "en"): string {
  const role = normaliseRole(value);
  if (role === "other") return customTitle.trim() || tx(locale, roleMeta.other.label, ROLE_LABEL_EN.other);
  if (role) return tx(locale, roleMeta[role].label, ROLE_LABEL_EN[role]);
  return tx(locale, "Peran", "Role");
}

/** Translate a catalogue label that was resolved earlier without changing custom role names. */
export function localizeRoleLabel(value: string, locale: Locale): string {
  const label = value.trim();
  const role = ROLES.find((candidate) =>
    [roleMeta[candidate].label, ROLE_LABEL_EN[candidate]].some(
      (candidateLabel) => candidateLabel.localeCompare(label, "id", { sensitivity: "base" }) === 0,
    ),
  );
  return role ? roleLabel(role, "", locale) : value;
}

/**
 * Match what somebody types in Explore against the readable role catalogue.
 * Punctuation is deliberately treated like a space, so searches such as
 * "ui ux", "UI/UX", and the stored key "ui-ux-designer" agree.
 */
export function roleMatchesQuery(value: string, customTitle: string, query: string): boolean {
  const needle = searchableRoleText(query);
  if (!needle) return true;
  return searchableRoleText(
    `${value} ${roleLabel(value, customTitle, "id")} ${roleLabel(value, customTitle, "en")}`,
  ).includes(needle);
}

/** Canonical catalogue roles whose key or visible label contains the query. */
export function rolesMatchingQuery(query: string): Role[] {
  return ROLES.filter((role) => roleMatchesQuery(role, "", query));
}

function searchableRoleText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("id")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
