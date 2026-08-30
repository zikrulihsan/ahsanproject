export const PROJECT_TABS = [
  { id: "about", labelId: "Tentang", labelEn: "About" },
  { id: "collaboration", labelId: "Kolaborasi", labelEn: "Collaboration" },
  { id: "journey", labelId: "Perjalanan", labelEn: "Journey" },
  { id: "tasks", labelId: "Tugas", labelEn: "Tasks" },
  { id: "discussion", labelId: "Diskusi", labelEn: "Discussion" },
] as const;

export type ProjectTab = (typeof PROJECT_TABS)[number]["id"];

export function isProjectTab(value: string): value is ProjectTab {
  return PROJECT_TABS.some((tab) => tab.id === value);
}
