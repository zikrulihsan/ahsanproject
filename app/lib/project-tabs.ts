export const PROJECT_TABS = [
  { id: "about", label: "About" },
  { id: "collaboration", label: "Collaboration" },
  { id: "journey", label: "Journey" },
  { id: "tasks", label: "Tasks" },
  { id: "discussion", label: "Discussion" },
] as const;

export type ProjectTab = (typeof PROJECT_TABS)[number]["id"];

export function isProjectTab(value: string): value is ProjectTab {
  return PROJECT_TABS.some((tab) => tab.id === value);
}
