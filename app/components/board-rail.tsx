import Link from "next/link";
import type { Lane, ProjectSummary } from "../lib/data";
import { ROLES, roleMeta } from "../lib/roles";
import { STAGES, stageMeta, type Stage } from "../lib/stages";

type LinkTo = (query: {
  lane?: string;
  stage?: string;
  tag?: string;
  role?: string;
  q?: string;
}) => string;

export function BoardRail({
  topics,
  scoped,
  helpBoard,
  lane,
  stage,
  tag,
  role,
  q,
  linkTo,
}: {
  topics: { tag: string; count: number }[];
  scoped: ProjectSummary[];
  helpBoard: ProjectSummary[];
  lane: Lane;
  stage: "" | Stage;
  tag: string;
  role: string;
  q: string;
  linkTo: LinkTo;
}) {
  const roleCounts = new Map<string, number>();
  for (const project of helpBoard) {
    for (const openRole of project.openRoles) {
      roleCounts.set(openRole, (roleCounts.get(openRole) ?? 0) + 1);
    }
  }

  const countedTopics = tag && !topics.some((topic) => topic.tag === tag)
    ? [...topics, { tag, count: 0 }]
    : topics;
  const activeTopicIndex = countedTopics.findIndex((topic) => topic.tag === tag);
  const visibleTopics = activeTopicIndex >= 6
    ? [countedTopics[activeTopicIndex], ...countedTopics.slice(0, 5)]
    : countedTopics.slice(0, 6);
  const visibleTopicNames = new Set(visibleTopics.map((topic) => topic.tag));
  const moreTopics = countedTopics.filter((topic) => !visibleTopicNames.has(topic.tag));
  const activeFilters = [stage, role].filter(Boolean).length;

  const topicList = (items: { tag: string; count: number }[]) => (
    <ul aria-label="Categories">
      {items.map((topic) => {
        const active = tag === topic.tag;
        return (
          <li key={topic.tag}>
            <Link
              className={`rail-row ${active ? "is-active" : ""}`}
              aria-current={active ? "page" : undefined}
              href={
                active
                  ? linkTo({ lane, stage, role, q })
                  : linkTo({ lane, stage, tag: topic.tag, role, q })
              }
            >
              <span>{topic.tag}</span>
              <small>{topic.count}</small>
            </Link>
          </li>
        );
      })}
    </ul>
  );

  const filterSections = (keyPrefix: string) => (
    <div className="rail-more-content">
      <section className="rail-section">
        <h2>Stage</h2>
        <ul aria-label="Stages">
          {STAGES.map((key) => {
            const count = scoped.filter((project) => project.stage === key).length;
            if (count === 0 && stage !== key) return null;
            const active = stage === key;
            return (
              <li key={`${keyPrefix}-${key}`}>
                <Link
                  className={`rail-row ${active ? "is-active" : ""}`}
                  aria-current={active ? "page" : undefined}
                  title={stageMeta[key].blurb}
                  href={
                    active
                      ? linkTo({ lane, tag, role, q })
                      : linkTo({ lane, stage: key, tag, role, q })
                  }
                >
                  <span>{stageMeta[key].label}</span>
                  <small>{count}</small>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="rail-section">
        <h2>Needs help with</h2>
        <ul aria-label="Roles being sought">
          {ROLES.map((key) => {
            const count = roleCounts.get(key) ?? 0;
            if (count === 0 && role !== key) return null;
            const active = role === key;
            return (
              <li key={`${keyPrefix}-${key}`}>
                <Link
                  className={`rail-row ${active ? "is-active" : ""}`}
                  aria-current={active ? "page" : undefined}
                  title={roleMeta[key].blurb}
                  href={
                    active
                      ? linkTo({ lane, stage, tag, q })
                      : linkTo({ lane, stage, tag, role: key, q })
                  }
                >
                  <span>{roleMeta[key].label}</span>
                  <small>{count}</small>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );

  return (
    <nav className="board-rail" aria-label="Filters">
      <section className="rail-section rail-topics" aria-labelledby="rail-topics-title">
        <h2 id="rail-topics-title">Topics</h2>
        {visibleTopics.length > 0 ? topicList(visibleTopics) : <p className="rail-empty">No topics yet.</p>}
        {moreTopics.length > 0 ? (
          <details className="rail-disclosure">
            <summary>+ {moreTopics.length} more</summary>
            {topicList(moreTopics)}
          </details>
        ) : null}
      </section>

      <div className="rail-more-desktop">{filterSections("desktop")}</div>

      <details className="rail-more-mobile">
        <summary>Filters · {activeFilters} active</summary>
        {filterSections("mobile")}
      </details>
    </nav>
  );
}
