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
  | "Product & Design"
  | "Technology"
  | "Research & Content"
  | "Community & Business"
  | "Other";

export const roleMeta: Record<Role, { label: string; blurb: string; group: RoleGroup }> = {
  "product-manager": {
    label: "Product Manager",
    blurb: "Clarifies the problem, sets priorities, and keeps the work on course.",
    group: "Product & Design",
  },
  "ui-ux-designer": {
    label: "UI/UX Designer",
    blurb: "Designs flows, interfaces, and user experiences.",
    group: "Product & Design",
  },
  "frontend-developer": {
    label: "Frontend Developer",
    blurb: "Builds clean, usable web interfaces.",
    group: "Technology",
  },
  "backend-developer": {
    label: "Backend Developer",
    blurb: "Builds APIs, databases, and backend services.",
    group: "Technology",
  },
  "mobile-developer": {
    label: "Mobile Developer",
    blurb: "Builds Android, iOS, or cross-platform applications.",
    group: "Technology",
  },
  "software-engineer": {
    label: "Software Engineer",
    blurb: "Builds and maintains software solutions end to end.",
    group: "Technology",
  },
  "data-ml-engineer": {
    label: "Data & ML Engineer",
    blurb: "Works with data and builds machine-learning features.",
    group: "Technology",
  },
  "qa-engineer": {
    label: "QA Engineer",
    blurb: "Tests product quality and keeps releases reliable.",
    group: "Technology",
  },
  researcher: {
    label: "Researcher",
    blurb: "Tests assumptions and understands prospective users' needs.",
    group: "Research & Content",
  },
  "content-writer": {
    label: "Content Writer",
    blurb: "Writes copy, articles, documentation, and product stories.",
    group: "Research & Content",
  },
  "content-designer": {
    label: "Content Designer",
    blurb: "Designs structure and language that make products easy to understand.",
    group: "Research & Content",
  },
  "social-media": {
    label: "Social Media",
    blurb: "Plans and runs social-media communications.",
    group: "Research & Content",
  },
  "growth-marketing": {
    label: "Growth & Marketing",
    blurb: "Connects the project with the people who need it most.",
    group: "Community & Business",
  },
  partnership: {
    label: "Partnership",
    blurb: "Builds partnerships with communities and other organizations.",
    group: "Community & Business",
  },
  "community-manager": {
    label: "Community Manager",
    blurb: "Supports members, programs, and the rhythm of a community.",
    group: "Community & Business",
  },
  mentor: {
    label: "Mentor",
    blurb: "Guides participants with experience and feedback.",
    group: "Community & Business",
  },
  teacher: {
    label: "Teacher",
    blurb: "Plans and leads learning activities.",
    group: "Community & Business",
  },
  "legal-researcher": {
    label: "Legal Researcher",
    blurb: "Researches regulations and explains legal context clearly.",
    group: "Research & Content",
  },
  other: {
    label: "Other role",
    blurb: "Use a role name that better fits your project's needs.",
    group: "Other",
  },
};

export const ROLE_GROUPS: RoleGroup[] = [
  "Product & Design",
  "Technology",
  "Research & Content",
  "Community & Business",
  "Other",
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

/**
 * Match what somebody types in Explore against the readable role catalogue.
 * Punctuation is deliberately treated like a space, so searches such as
 * "ui ux", "UI/UX", and the stored key "ui-ux-designer" agree.
 */
export function roleMatchesQuery(value: string, customTitle: string, query: string): boolean {
  const needle = searchableRoleText(query);
  if (!needle) return true;
  return searchableRoleText(`${value} ${roleLabel(value, customTitle)}`).includes(needle);
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
