import Link from "@/app/components/responsive-link";
import { RelativeTime } from "./relative-time";
import { projectTypeBlurb, projectTypeLabel, projectTypeTone, isProjectType } from "../lib/project-types";
import { projectBlurb } from "../lib/brief";
import { roleLabel } from "../lib/roles";
import { RUNGS, rungIndex, stageBlurb, stageLabel, stageMeta, type Stage } from "../lib/stages";
import type { ActivityEvent, ProjectSummary, UpdateView } from "../lib/data";
import { activityParts } from "../lib/activity";
import { journeyDate } from "../lib/updates";
import { Arrow } from "./shell";
import { ProjectLogo } from "./project-logo";
import { LinkIcon } from "./link-icons";
import { currentLocale } from "../lib/locale-server";
import { tx, type Locale } from "../lib/locale";

const PROFILE_DESCRIPTION_LIMIT = 150;

export async function StageBadge({ stage }: { stage: Stage }) {
  const locale = await currentLocale();
  const meta = stageMeta[stage] ?? stageMeta.idea;
  return (
    <span className={`stage-badge ${meta.tone}`} title={stageBlurb(stage, locale)}>
      <i aria-hidden="true" />
      {stageLabel(stage, locale)}
    </span>
  );
}

/**
 * What kind of project this is, as a pill beside the status badge.
 *
 * Renders nothing at all for a project that has not said. A grey "not stated"
 * chip on every older card would be noise standing in for an answer, and the
 * board already reads as "no badge means nothing was claimed".
 */
export async function TypeBadge({ type }: { type: string }) {
  if (!isProjectType(type)) return null;
  const locale = await currentLocale();

  return (
    <span className={`type-badge ${projectTypeTone(type)}`} title={projectTypeBlurb(type, locale)}>
      {projectTypeLabel(type, locale)}
    </span>
  );
}

/** A maintainer's explicit invitation, kept visually distinct from a stage. */
export async function GitHubContributeBadge({ repoUrl }: { repoUrl: string }) {
  const locale = await currentLocale();
  return (
    <a
      className="github-contribute-badge"
      href={repoUrl}
      target="_blank"
      rel="noreferrer"
      title={tx(locale, "Proyek ini terbuka untuk kontribusi melalui GitHub", "This project is open to contributions through GitHub")}
    >
      {tx(locale, "Terbuka untuk kontribusi GitHub", "Open to GitHub contributions")} <Arrow diagonal />
    </a>
  );
}

export function TagRow({ tags, linked = true }: { tags: string[]; linked?: boolean }) {
  if (tags.length === 0) return null;

  return (
    <ul className="tag-row">
      {tags.map((tag) =>
        linked ? (
          <li key={tag}>
            <Link href={`/explore?tag=${encodeURIComponent(tag)}`}>#{tag}</Link>
          </li>
        ) : (
          <li key={tag}>#{tag}</li>
        ),
      )}
    </ul>
  );
}

/**
 * A project as a row on the board.
 *
 * The order answers the three questions somebody arriving actually has, in the
 * order they have them: what is this, what are they doing about it right now,
 * and could I help. Everything that only measures the project — support count,
 * task tallies, how many stages of four — is either further down or gone.
 * There is no rank number: the board is a place to look around, not a chart.
 */
export async function ProjectRow({ project }: { project: ProjectSummary }) {
  const locale = await currentLocale();
  const helpers = project.activeMemberCount;

  return (
    <li>
      <article className="project-item">
        <div className="project-head">
          <span className={`project-logo level-${project.stage}`} aria-hidden="true">
            {project.glyph || initials(project.title)}
          </span>
          <div>
            <h3>
              {/* Stretched over the whole row — see `.card-cover-link` in
                  globals.css — so a tap anywhere that isn't one of the more
                  specific links below still opens the project. */}
              <Link className="card-cover-link" href={`/projects/${project.slug}`}>
                {project.title}
              </Link>
            </h3>
            <p className="tagline">{projectBlurb(project)}</p>
          </div>
          <div className="project-head-badges">
            <StageBadge stage={project.stage} />
            <TypeBadge type={project.projectType} />
            {project.openForGitHubContributions ? <GitHubContributeBadge repoUrl={project.repoUrl} /> : null}
          </div>
        </div>

        <NowLine project={project} />

        {project.openRoles.length > 0 ? (
          <div className="open-call">
            <p className="open-call-head">
              <span className="dot" aria-hidden="true" /> {tx(locale, "Terbuka untuk kontribusi", "Open to contributions")}
            </p>
            <SeatChips roles={project.openRoles} />
          </div>
        ) : null}

        <div className="project-foot">
          <Link className="contributors" href={`/u/${project.owner.username}`}>
            <span className="avatar" aria-hidden="true">
              {initials(project.owner.name)}
            </span>
            <small>
              {project.owner.name}
              {helpers > 0 ? tx(locale, ` + ${helpers} orang`, ` + ${helpers} people`) : ""}
            </small>
          </Link>

          <span className="row-freshness"><Freshness project={project} locale={locale} /></span>

          <Link className="detail-link" href={`/projects/${project.slug}`}>
            {tx(locale, "Lihat", "View")} <Arrow />
          </Link>
        </div>
      </article>
    </li>
  );
}

/**
 * The line that makes a project look alive.
 *
 * A project started a year ago but touched last week is active; one started
 * last week and untouched since is not. Neither of those is something a
 * "created 1 year ago" line can tell you, which is why that line is gone.
 */
export async function NowLine({ project }: { project: ProjectSummary }) {
  if (!project.nowText) return null;
  const locale = await currentLocale();

  return (
    <div className="now-line">
      <p className="now-label">{tx(locale, "Sekarang", "Now")}</p>
      <p className="now-text">{project.nowText}</p>
    </div>
  );
}

/** "Last update 3 days ago" — freshness, which beats any percentage done. */
export function Freshness({ project, locale = "en" }: { project: ProjectSummary; locale?: Locale }) {
  return (
    <>
      {tx(locale, "Pembaruan terakhir ", "Last update ")}
      <RelativeTime value={project.lastActivityAt || project.createdAt} locale={locale} />
    </>
  );
}

/**
 * Where the project is, as three dots.
 *
 * Not a bar and not a percentage: a project is not 68% finished, and drawing it
 * that way is what made this look like a tracker. "Diistirahatkan" is a
 * decision rather than a rung, so it says so in words instead of pretending to
 * be a fourth dot.
 */
export async function RungRail({ stage }: { stage: Stage }) {
  const locale = await currentLocale();
  const here = rungIndex(stage);

  if (here < 0) {
    return <p className="rung-resting">{stageBlurb(stage, locale)}</p>;
  }

  return (
    <ol className="rung-rail" aria-label={tx(locale, "Perjalanan proyek", "Project journey")}>
      {RUNGS.map((rung, index) => (
        <li
          key={rung}
          className={index < here ? "is-passed" : index === here ? "is-here" : ""}
          aria-current={index === here ? "step" : undefined}
        >
          <span className="rung-dot" aria-hidden="true" />
          <span>{stageLabel(rung, locale)}</span>
        </li>
      ))}
    </ol>
  );
}

export async function ProjectCard({
  project,
  categoryPosition = "top",
  roleCounts,
  className,
}: {
  project: ProjectSummary;
  categoryPosition?: "top" | "below";
  roleCounts?: Record<string, number>;
  className?: string;
}) {
  const locale = await currentLocale();
  const category = project.tags[0] || stageLabel(project.stage, locale);

  return (
    <article className={`profile-project-card${className ? ` ${className}` : ""}`}>
      <div className="profile-project-head">
        <ProjectLogo
          title={project.title}
          website={project.liveUrl}
          logoUrl={project.logoUrl}
          className="profile-project-logo"
        />
        <div className="profile-project-heading">
          {categoryPosition === "top" ? <p className="project-kind">{category}</p> : null}
          <h3>
            <Link className="card-cover-link" href={`/projects/${project.slug}`}>
              {project.title}
            </Link>
          </h3>
          <p className="profile-project-tagline">{projectBlurb(project)}</p>
          {categoryPosition === "below" ? (
            <p className="profile-project-category">{category}</p>
          ) : null}
        </div>
        <div className="project-head-badges">
          <StageBadge stage={project.stage} />
          <TypeBadge type={project.projectType} />
        </div>
      </div>

      <div className="profile-project-description">
        <span>{tx(locale, "Deskripsi singkat", "Short description")}</span>
        <p>{shortText(project.problem, PROFILE_DESCRIPTION_LIMIT)}</p>
      </div>

      {project.openForGitHubContributions ? <GitHubContributeBadge repoUrl={project.repoUrl} /> : null}

      {project.nowText ? (
        <div className="profile-project-now">
          <span>{tx(locale, "Sekarang", "Now")}</span>
          <p>{project.nowText}</p>
        </div>
      ) : null}

      <div className={`profile-project-roles${project.openRoles.length === 0 ? " profile-project-roles-empty" : ""}`}>
        <small>{tx(locale, "Mencari", "Looking for")}</small>
        {project.openRoles.length > 0 ? (
          <SeatChips roles={project.openRoles} counts={roleCounts} maxVisible={2} />
        ) : (
          <span className="profile-project-roles-none">{tx(locale, "Belum ada peran terbuka", "No open roles yet")}</span>
        )}
      </div>

      <div className="profile-project-footer">
        <span><Freshness project={project} locale={locale} /></span>
        <nav className="profile-project-actions" aria-label={tx(locale, `Tautan ${project.title}`, `${project.title} links`)}>
          {project.liveUrl ? (
            <a href={project.liveUrl} target="_blank" rel="noreferrer" aria-label={tx(locale, `Buka situs web ${project.title}`, `Open ${project.title} website`)}>
              <LinkIcon kind="website" />
              <span>{tx(locale, "Situs web", "Website")}</span>
            </a>
          ) : null}
          {project.repoUrl ? (
            <a href={project.repoUrl} target="_blank" rel="noreferrer" aria-label={tx(locale, `Buka ${project.title} di GitHub`, `Open ${project.title} on GitHub`)}>
              <LinkIcon kind="github" />
              <span>GitHub</span>
            </a>
          ) : null}
          <Link className="profile-project-detail" href={`/projects/${project.slug}`}>
            Detail <Arrow />
          </Link>
        </nav>
      </div>
    </article>
  );
}

/** A project logo is enough evidence here; its page carries the full context. */
export async function ProjectIconLink({ project }: { project: ProjectSummary }) {
  const locale = await currentLocale();
  return (
    <li>
      <Link className="profile-project-icon-link" href={`/projects/${project.slug}`} aria-label={tx(locale, `Buka ${project.title}`, `Open ${project.title}`)}>
        <ProjectLogo
          title={project.title}
          website={project.liveUrl}
          logoUrl={project.logoUrl}
          className="profile-project-icon"
        />
      </Link>
    </li>
  );
}

export async function SeatChips({
  roles,
  linked = true,
  counts,
  maxVisible,
}: {
  roles: string[];
  linked?: boolean;
  /** Open seats per role. Given one, a chip says how many hands are wanted. */
  counts?: Record<string, number>;
  /** Keep dense contexts readable while still disclosing additional roles. */
  maxVisible?: number;
}) {
  if (roles.length === 0) return null;
  const locale = await currentLocale();
  const shownRoles = maxVisible ? roles.slice(0, maxVisible) : roles;
  const remaining = roles.length - shownRoles.length;

  return (
    <ul className="seat-chips" aria-label={tx(locale, "Bantuan yang dibutuhkan", "Help needed")}>
      {shownRoles.map((role, index) => {
        const many = counts?.[role] ?? 0;
        const label = (
          <>
            {roleLabel(role, "", locale)}
            {many > 0 ? <b> · {many}</b> : null}
          </>
        );

        return (
          <li key={`${role}-${index}`}>
            {linked ? (
              <Link className="seat-chip" href={`/explore?searchBy=role&q=${encodeURIComponent(roleLabel(role, "", locale))}`}>
                {label}
              </Link>
            ) : (
              <span className="seat-chip">{label}</span>
            )}
          </li>
        );
      })}
      {remaining > 0 ? (
        <li>
          <span className="seat-chip seat-chip-more" aria-label={tx(locale, `${remaining} peran lainnya tersedia`, `${remaining} more roles available`)}>+{remaining}</span>
        </li>
      ) : null}
    </ul>
  );
}

function shortText(text: string, limit: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= limit) return clean;

  const lastSpace = clean.lastIndexOf(" ", limit - 1);
  return `${clean.slice(0, lastSpace > 0 ? lastSpace : limit).trimEnd()}…`;
}

/**
 * A project as a card on the board.
 *
 * The four things somebody scanning a grid actually reads, in the order the
 * question arrives: what is this called and how far has it got, what is it for,
 * what is it about, and — under a rule of its own, because it is the reason
 * most people are here — which hands it is short of.
 */
export async function BoardCard({
  project,
  roleCounts,
  appearance = "board",
}: {
  project: ProjectSummary;
  roleCounts?: Record<string, number>;
  appearance?: "board" | "profile";
}) {
  const locale = await currentLocale();
  if (appearance === "profile") {
    return (
      <li className="project-list-entry home-profile-project-entry">
        <ProjectCard
          project={project}
          categoryPosition="below"
          roleCounts={roleCounts}
          className="home-profile-project-card"
        />
      </li>
    );
  }

  const roleEntries = project.openRoles.map((role) => ({
    role,
    count: roleCounts?.[role] ?? 1,
  }));

  return (
    <li className="project-list-entry">
      <article className="home-project-card">
        <div className="home-project-copy">
          <div className="home-project-title-row">
            <div className="home-project-identity">
              <ProjectLogo title={project.title} website={project.liveUrl} logoUrl={project.logoUrl} />
              <div className="home-project-heading">
                <h3>
                  <Link className="card-cover-link" href={`/projects/${project.slug}`}>
                    {project.title}
                  </Link>
                </h3>
                <p className="home-project-tagline">{projectBlurb(project)}</p>
                <p className="home-project-meta">
                  <span>{stageLabel(project.stage, locale)}</span>
                  {projectTypeLabel(project.projectType, locale) ? (
                    <span className="home-project-type">{projectTypeLabel(project.projectType, locale)}</span>
                  ) : null}
                  <span><Freshness project={project} locale={locale} /></span>
                  <span>{tx(locale, `${project.commentCount} diskusi`, `${project.commentCount} discussions`)}</span>
                </p>
              </div>
            </div>
            <div className="home-project-vote" aria-label={tx(locale, `${project.boostCount} dukungan`, `${project.boostCount} supports`)}>
              <span aria-hidden="true">▲</span>
              <strong>{project.boostCount}</strong>
            </div>
          </div>

          {project.openRoles.length > 0 ? (
            <div className="home-open-call">
              <div className="home-open-label">
                <p><PeopleIcon /> {tx(locale, "Peran yang dibutuhkan", "Roles needed")}</p>
                <small>{tx(locale, `${project.openSeatCount} posisi terbuka`, `${project.openSeatCount} open positions`)}</small>
              </div>
              <ul className="home-role-chips" aria-label={tx(locale, "Peran terbuka", "Open roles")}>
                {roleEntries.slice(0, 3).map(({ role, count }) => (
                  <li key={role}>
                    <Link href={`/explore?searchBy=role&q=${encodeURIComponent(roleLabel(role, "", locale))}`}>
                      {roleLabel(role, "", locale)} · {count}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="home-open-call home-open-call-empty">
              <div className="home-open-label">
                <p><PeopleIcon /> {tx(locale, "Peran yang dibutuhkan", "Roles needed")}</p>
                <small>{tx(locale, "Tidak ada peran", "No roles")}</small>
              </div>
              <p>{tx(locale, "Belum ada peran kontribusi yang dibuka", "No contribution roles open yet")}</p>
            </div>
          )}

          {project.tags.length > 0 ? (
            <ul className="home-category-chips" aria-label={tx(locale, "Kategori proyek", "Project categories")}>
              {project.tags.map((tag) => (
                <li key={tag}>
                  <Link href={`/explore?tag=${encodeURIComponent(tag)}`}>{tag}</Link>
                </li>
              ))}
            </ul>
          ) : null}

          <div className="home-project-footer">
            <Link className="home-project-owner" href={`/u/${project.owner.username}`}>
              <span className="avatar" aria-hidden="true">
                {initials(project.owner.name)}
              </span>
              <small>{tx(locale, "Dimulai oleh", "Started by")} <strong>{project.owner.name}</strong></small>
            </Link>
            <Link className="home-project-link" href={`/projects/${project.slug}`}>
              {tx(locale, "Lihat proyek", "View project")} <Arrow />
            </Link>
          </div>
        </div>
      </article>
    </li>
  );
}

function PeopleIcon() {
  return (
    <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 19c.4-4 2.2-6 5.5-6s5.1 2 5.5 6M16 5.5a3 3 0 0 1 0 5.8M17.5 13.5c2 .7 3 2.5 3 5" />
    </svg>
  );
}

/**
 * A project's journey, newest first.
 *
 * The entries people wrote, and — as the last line, always — the day the
 * project started. That closing line is drawn from the project itself rather
 * than stored, because "this began" is true of every project and nobody should
 * have to type it.
 */
export async function JourneyList({
  updates,
  startedAt,
  slug,
  onDelete,
}: {
  updates: UpdateView[];
  startedAt: string;
  slug: string;
  /** Rendered under each entry when the viewer may remove it. */
  onDelete?: (update: UpdateView) => React.ReactNode;
}) {
  const locale = await currentLocale();
  return (
    <ol className="journey">
      {updates.map((update) => (
        <li key={update.id}>
          <p className="journey-when">{journeyDate(update.createdAt, locale)}</p>
          <div>
            <h3>{update.title}</h3>
            {update.body ? <p>{update.body}</p> : null}
            <p className="journey-by">
              {update.author ? (
                <Link href={`/u/${update.author.username}`}>{update.author.name}</Link>
              ) : (
                tx(locale, "Seseorang", "Someone")
              )}{" "}
              · <RelativeTime value={update.createdAt} locale={locale} />
            </p>
            {onDelete?.(update)}
          </div>
        </li>
      ))}
      <li className="journey-start">
        <p className="journey-when">{journeyDate(startedAt, locale)}</p>
        <div>
          <h3>{tx(locale, "Proyek dimulai", "Project started")}</h3>
          <p>
            <Link href={`/projects/${slug}`}>{tx(locale, "Ditampilkan di sini", "Shown here")}</Link>{" "}<RelativeTime value={startedAt} locale={locale} />.
          </p>
        </div>
      </li>
    </ol>
  );
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/** "Mar 2025" — for "aktif sejak" on a profile. */
export function monthYear(value: string, locale: Locale = "en"): string {
  const then = Date.parse(value.includes("T") ? value : value.replace(" ", "T") + "Z");
  if (Number.isNaN(then)) return "";
  return new Intl.DateTimeFormat(locale === "id" ? "id-ID" : "en-US", { month: "short", year: "numeric" }).format(then);
}

/**
 * A trail of what somebody, or a project, has actually done.
 *
 * `hidden` is only ever passed when somebody is looking at their own profile:
 * the SELECT policy on `events` shows them their hidden entries and nobody
 * else's, so this marks them rather than dropping them.
 */
export async function ActivityList({
  events,
  hidden = [],
  showActor = false,
}: {
  events: ActivityEvent[];
  hidden?: string[];
  showActor?: boolean;
}) {
  const locale = await currentLocale();
  return (
    <ol className="activity-list">
      {events.map((event) => {
        const { lead, trail } = activityParts(event, locale);
        const isHidden = hidden.includes(event.kind);
        const gone = event.projectId === null || !event.projectSlug;

        return (
          <li key={event.id} className={isHidden ? "is-hidden" : ""}>
            <p>
              {showActor && event.actor ? (
                <>
                  <Link href={`/u/${event.actor.username}`}>{event.actor.name}</Link>{" "}
                </>
              ) : null}
              {lead}
              {gone ? (
                <strong>{event.projectTitle}</strong>
              ) : (
                <Link href={`/projects/${event.projectSlug}`}>{event.projectTitle}</Link>
              )}
              {trail}
            </p>
            <small>
              <RelativeTime value={event.createdAt} locale={locale} />
              {gone ? tx(locale, " · proyek dihapus", " · project deleted") : ""}
              {isHidden ? tx(locale, " · hanya terlihat olehmu", " · only visible to you") : ""}
            </small>
          </li>
        );
      })}
    </ol>
  );
}
