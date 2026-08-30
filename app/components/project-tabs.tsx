"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { PROJECT_TABS, isProjectTab, type ProjectTab } from "../lib/project-tabs";
import { useLanguage } from "./language-provider";

const ProjectTabContext = createContext<ProjectTab>("about");

export function ProjectTabSwitcher({
  children,
  initialTab,
}: {
  children: ReactNode;
  initialTab: ProjectTab;
}) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const { locale, tx } = useLanguage();

  useEffect(() => {
    const handleHistoryChange = () => {
      const requestedTab = new URL(window.location.href).searchParams.get("tab") ?? "about";
      setActiveTab(isProjectTab(requestedTab) ? requestedTab : "about");
    };

    window.addEventListener("popstate", handleHistoryChange);
    return () => window.removeEventListener("popstate", handleHistoryChange);
  }, []);

  function selectTab(tab: ProjectTab) {
    if (tab === activeTab) return;

    setActiveTab(tab);
    const url = new URL(window.location.href);
    if (tab === "about") url.searchParams.delete("tab");
    else url.searchParams.set("tab", tab);
    window.history.pushState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;

    event.preventDefault();
    const last = PROJECT_TABS.length - 1;
    const nextIndex =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? last
          : event.key === "ArrowRight"
            ? (index + 1) % PROJECT_TABS.length
            : (index - 1 + PROJECT_TABS.length) % PROJECT_TABS.length;
    const nextTab = PROJECT_TABS[nextIndex].id;

    selectTab(nextTab);
    document.getElementById(`project-tab-${nextTab}`)?.focus();
  }

  return (
    <ProjectTabContext.Provider value={activeTab}>
      <nav
        className="project-tabs"
        aria-label={tx("Bagian detail proyek", "Project detail sections")}
        role="tablist"
      >
        {PROJECT_TABS.map((tab, index) => (
          <button
            key={tab.id}
            id={`project-tab-${tab.id}`}
            type="button"
            role="tab"
            draggable={false}
            aria-selected={activeTab === tab.id}
            className={activeTab === tab.id ? "is-active" : undefined}
            tabIndex={activeTab === tab.id ? 0 : -1}
            onClick={() => selectTab(tab.id)}
            onKeyDown={(event) => handleKeyDown(event, index)}
          >
            {locale === "id" ? tab.labelId : tab.labelEn}
          </button>
        ))}
      </nav>

      <div className="project-body">{children}</div>
    </ProjectTabContext.Provider>
  );
}

export function ProjectTabContent({ children, tab }: { children: ReactNode; tab: ProjectTab }) {
  const activeTab = useContext(ProjectTabContext);
  return activeTab === tab ? children : null;
}
