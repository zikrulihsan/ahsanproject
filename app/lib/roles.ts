/** The kinds of help a project can ask for. */
export const ROLES = ["pm", "design", "engineering", "research", "content", "growth", "other"] as const;

export type Role = (typeof ROLES)[number];

export const roleMeta: Record<Role, { label: string; blurb: string }> = {
  pm: { label: "Product Manager", blurb: "Menajamkan masalah, menyusun prioritas, menjaga arah." },
  design: { label: "Designer", blurb: "Alur, tampilan, dan rasa saat dipakai." },
  engineering: { label: "Engineer", blurb: "Membangun dan merawat produknya." },
  research: { label: "Researcher", blurb: "Bicara dengan calon pengguna, menguji asumsi." },
  content: { label: "Penulis", blurb: "Copy, dokumentasi, dan cerita produknya." },
  growth: { label: "Growth", blurb: "Membawa produknya ke orang yang membutuhkan." },
  other: { label: "Lainnya", blurb: "Bantuan lain yang belum masuk kategori di atas." },
};

export function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}

export function roleLabel(value: string): string {
  return isRole(value) ? roleMeta[value].label : roleMeta.other.label;
}
