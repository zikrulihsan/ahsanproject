export const PROJECT_TABS = [
  { id: "tentang", label: "Tentang" },
  { id: "kolaborasi", label: "Kolaborasi" },
  { id: "perjalanan", label: "Perjalanan" },
  { id: "tugas", label: "Tugas" },
  { id: "diskusi", label: "Diskusi" },
] as const;

export type ProjectTab = (typeof PROJECT_TABS)[number]["id"];

export function isProjectTab(value: string): value is ProjectTab {
  return PROJECT_TABS.some((tab) => tab.id === value);
}
