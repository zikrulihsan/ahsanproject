import Link from "next/link";
import type { Lane, ProjectSummary } from "../lib/data";
import { ROLES, roleBlurb, roleLabel } from "../lib/roles";
import { STAGES, stageBlurb, stageLabel, type Stage } from "../lib/stages";
import { currentLocale } from "../lib/locale-server";
import { tx } from "../lib/locale";

type LinkTo = (query: {
  lane?: string;
  stage?: string;
  tag?: string;
  role?: string;
  q?: string;
}) => string;

export async function BoardRail({
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
  const locale = await currentLocale();
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
    <ul aria-label={tx(locale, "Kategori", "Categories")}>
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
        <h2>{tx(locale, "Tahap", "Stage")}</h2>
        <ul aria-label={tx(locale, "Tahap", "Stages")}>
          {STAGES.map((key) => {
            const count = scoped.filter((project) => project.stage === key).length;
            if (count === 0 && stage !== key) return null;
            const active = stage === key;
            return (
              <li key={`${keyPrefix}-${key}`}>
                <Link
                  className={`rail-row ${active ? "is-active" : ""}`}
                  aria-current={active ? "page" : undefined}
                  title={stageBlurb(key, locale)}
                  href={
                    active
                      ? linkTo({ lane, tag, role, q })
                      : linkTo({ lane, stage: key, tag, role, q })
                  }
                >
                  <span>{stageLabel(key, locale)}</span>
                  <small>{count}</small>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="rail-section">
        <h2>{tx(locale, "Butuh bantuan untuk", "Needs help with")}</h2>
        <ul aria-label={tx(locale, "Peran yang dicari", "Roles being sought")}>
          {ROLES.map((key) => {
            const count = roleCounts.get(key) ?? 0;
            if (count === 0 && role !== key) return null;
            const active = role === key;
            return (
              <li key={`${keyPrefix}-${key}`}>
                <Link
                  className={`rail-row ${active ? "is-active" : ""}`}
                  aria-current={active ? "page" : undefined}
                  title={roleBlurb(key, locale)}
                  href={
                    active
                      ? linkTo({ lane, stage, tag, q })
                      : linkTo({ lane, stage, tag, role: key, q })
                  }
                >
                  <span>{roleLabel(key, "", locale)}</span>
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
    <nav className="board-rail" aria-label={tx(locale, "Filter", "Filters")}>
      <section className="rail-section rail-topics" aria-labelledby="rail-topics-title">
        <h2 id="rail-topics-title">{tx(locale, "Topik", "Topics")}</h2>
        {visibleTopics.length > 0 ? topicList(visibleTopics) : <p className="rail-empty">{tx(locale, "Belum ada topik.", "No topics yet.")}</p>}
        {moreTopics.length > 0 ? (
          <details className="rail-disclosure">
            <summary>+ {tx(locale, `${moreTopics.length} lainnya`, `${moreTopics.length} more`)}</summary>
            {topicList(moreTopics)}
          </details>
        ) : null}
      </section>

      <div className="rail-more-desktop">{filterSections("desktop")}</div>

      <details className="rail-more-mobile">
        <summary>{tx(locale, "Filter", "Filters")} · {tx(locale, `${activeFilters} aktif`, `${activeFilters} active`)}</summary>
        {filterSections("mobile")}
      </details>
    </nav>
  );
}
