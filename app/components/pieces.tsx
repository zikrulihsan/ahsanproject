import Link from "next/link";
import { roleLabel } from "../lib/roles";
import { stageMeta, type Stage } from "../lib/stages";
import type { ActivityEvent, ProjectSummary } from "../lib/data";
import { activityParts } from "../lib/activity";
import { Arrow } from "./shell";

export function StageBadge({ stage }: { stage: Stage }) {
  const meta = stageMeta[stage] ?? stageMeta.idea;
  return (
    <span className={`stage-badge ${meta.tone}`} title={meta.blurb}>
      {meta.label}
    </span>
  );
}

export function TagRow({ tags, linked = true }: { tags: string[]; linked?: boolean }) {
  if (tags.length === 0) return null;

  return (
    <ul className="tag-row">
      {tags.map((tag) =>
        linked ? (
          <li key={tag}>
            <Link href={`/?tag=${encodeURIComponent(tag)}`}>#{tag}</Link>
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
 * The order is deliberate (see research.md, "progress before promotion"): what
 * the project is, how far it has got, who is on it, and what help it is asking
 * for — support count sits to the side rather than leading.
 */
export function ProjectRow({
  project,
  rank,
  ribbon,
}: {
  project: ProjectSummary;
  rank: number;
  /** Only the leading row carries one, and it says what the sort actually did. */
  ribbon?: string;
}) {
  const progress = stageProgress(project.stage);
  const helpers = project.activeMemberCount;

  return (
    <li>
      <article className={`project-item ${ribbon ? "is-lead" : ""}`}>
        {ribbon ? <span className="ribbon">{ribbon}</span> : null}
        <div className="rank" aria-hidden="true">
          {String(rank).padStart(2, "0")}
        </div>
        <span className={`project-logo level-${project.stage}`} aria-hidden="true">
          {project.glyph || initials(project.title)}
        </span>

        <div className="project-main">
          <div className="project-title-row">
            <div>
              <h3>
                <Link href={`/projects/${project.slug}`}>{project.title}</Link>
              </h3>
              <StageBadge stage={project.stage} />
            </div>
            <Link
              className="support-count"
              href={`/projects/${project.slug}`}
              aria-label={`${project.boostCount} dukungan untuk ${project.title}`}
            >
              <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
                <path d="m12 5 7 8H5l7-8Z" />
              </svg>
              <span>{project.boostCount}</span>
            </Link>
          </div>

          <p className="tagline">{project.tagline}</p>

          <ul className="project-meta">
            {project.tags.slice(0, 3).map((tag) => (
              <li key={tag}>
                <Link href={`/?tag=${encodeURIComponent(tag)}`}>#{tag}</Link>
              </li>
            ))}
            <li className="updated">
              <i aria-hidden="true" /> Ditaruh {timeAgo(project.createdAt)}
            </li>
          </ul>

          <div className="progress-block">
            <div className="progress-copy">
              <span>Progres</span>
              <strong>{progress.label}</strong>
            </div>
            <ul className={`progress-track ${project.stage === "resting" ? "is-resting" : ""}`}>
              {[0, 1, 2, 3].map((step) => (
                <li key={step} className={step < progress.done ? "is-done" : ""} />
              ))}
            </ul>
          </div>

          {/* The ask comes before the applause: each seat is its own link, so
              "who needs a designer?" is one click from any row. */}
          <div className="need-summary">
            <span className="role-icon" aria-hidden="true">
              <svg className="icon" viewBox="0 0 24 24">
                <path d="M16 20v-2a4 4 0 0 0-8 0v2M12 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
              </svg>
            </span>
            <div>
              <small>
                {project.openSeatCount > 0
                  ? `Mencari ${project.openSeatCount} peran`
                  : "Belum buka peran — diskusinya tetap terbuka"}
              </small>
              <SeatChips roles={project.openRoles} />
            </div>
          </div>

          <div className="project-bottom">
            <Link className="contributors" href={`/u/${project.owner.username}`}>
              <span className="avatar" aria-hidden="true">
                {initials(project.owner.name)}
              </span>
              <small>
                {project.owner.name}
                {helpers > 0 ? ` · ${helpers} orang menggarap` : ""}
              </small>
            </Link>

            <span className="row-activity">{workingNote(project)}</span>

            <Link className="detail-link" href={`/projects/${project.slug}`}>
              Lihat proyek <Arrow />
            </Link>
          </div>
        </div>
      </article>
    </li>
  );
}

/** What is moving on a project, in one phrase. */
function workingNote(project: ProjectSummary): string {
  if (project.openTaskCount > 0) return `${project.openTaskCount} tugas jalan`;
  if (project.doneTaskCount > 0) return `${project.doneTaskCount} tugas beres`;
  if (project.commentCount > 0) return `${project.commentCount} komentar`;
  return "Belum ada tugas";
}

/**
 * How far along a project's four working levels it has got.
 *
 * "Diistirahatkan" is a decision rather than a rung, so it keeps whatever the
 * track showed and says so in words instead of pretending to be step five.
 */
export function stageProgress(stage: Stage): { done: number; label: string } {
  const rungs: Stage[] = ["idea", "validating", "building", "live"];
  const index = rungs.indexOf(stage);
  if (index < 0) return { done: 0, label: `${stageMeta[stage].label} · sedang tidak digarap` };

  return {
    done: index + 1,
    label: `${stageMeta[stage].label} · ${index + 1} dari ${rungs.length} tahap`,
  };
}

export function ProjectCard({
  project,
  contributionRole,
}: {
  project: ProjectSummary;
  /** Set on a portfolio's "ikut menggarap" card: the role held there. */
  contributionRole?: string;
}) {
  return (
    <article className="project-card">
      <div className="card-topline">
        <span className={`project-glyph level-${project.stage}`} aria-hidden="true">
          {project.glyph || initials(project.title)}
        </span>
        <StageBadge stage={project.stage} />
      </div>

      <h3>
        {/* Covers the whole card (see `.card-cover-link` in globals.css) so a
            tap anywhere that isn't one of the more specific links below still
            opens the project — the usual "clickable card" pattern. */}
        <Link className="card-cover-link" href={`/projects/${project.slug}`}>
          {project.title}
        </Link>
      </h3>
      {contributionRole ? (
        <p className="card-role">Sebagai {roleLabel(contributionRole)}</p>
      ) : null}
      <p className="card-tagline">{project.tagline}</p>

      <dl className="card-brief">
        <dt>Masalah</dt>
        <dd>{project.problem}</dd>
      </dl>

      <SeatChips roles={project.openRoles} />
      <TagRow tags={project.tags} />

      <div className="card-meta">
        <Link className="card-owner" href={`/u/${project.owner.username}`}>
          <span className="avatar" aria-hidden="true">
            {initials(project.owner.name)}
          </span>
          {project.owner.name}
        </Link>
        <span className="card-stats">
          <span title="Dukungan">▲ {project.boostCount}</span>
          <span title="Diskusi">💬 {project.commentCount}</span>
        </span>
      </div>

      <div className="card-footer">
        <span>
          {/* What is moving beats what is wanted, which beats what is finished. */}
          {project.openTaskCount > 0
            ? `${project.openTaskCount} tugas jalan`
            : project.openSeatCount > 0
              ? `${project.openSeatCount} peran terbuka`
              : project.doneTaskCount > 0
                ? `${project.doneTaskCount} tugas beres`
                : project.activeMemberCount > 0
                  ? `${project.activeMemberCount} orang menggarap`
                  : "Belum buka peran"}
        </span>
        <Link className="round-arrow" href={`/projects/${project.slug}`} aria-label={`Buka ${project.title}`}>
          <Arrow diagonal />
        </Link>
      </div>
    </article>
  );
}

export function SeatChips({ roles, linked = true }: { roles: string[]; linked?: boolean }) {
  if (roles.length === 0) return null;
  return (
    <ul className="seat-chips" aria-label="Peran yang dibuka">
      {roles.map((role, index) => (
        <li key={`${role}-${index}`}>
          {linked ? (
            <Link className="seat-chip" href={`/?role=${encodeURIComponent(role)}`}>
              {`Butuh ${roleLabel(role)}`}
            </Link>
          ) : (
            <span className="seat-chip">{`Butuh ${roleLabel(role)}`}</span>
          )}
        </li>
      ))}
    </ul>
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
export function monthYear(value: string): string {
  const then = Date.parse(value.includes("T") ? value : value.replace(" ", "T") + "Z");
  if (Number.isNaN(then)) return "";
  return new Intl.DateTimeFormat("id-ID", { month: "short", year: "numeric" }).format(then);
}

export function timeAgo(value: string): string {
  const then = Date.parse(value.includes("T") ? value : value.replace(" ", "T") + "Z");
  if (Number.isNaN(then)) return "";

  const days = Math.floor((Date.now() - then) / 86_400_000);
  if (days < 1) return "hari ini";
  if (days < 30) return `${days} hari lalu`;
  if (days < 365) return `${Math.floor(days / 30)} bulan lalu`;
  return `${Math.floor(days / 365)} tahun lalu`;
}

/**
 * A trail of what somebody, or a project, has actually done.
 *
 * `hidden` is only ever passed when somebody is looking at their own profile:
 * the SELECT policy on `events` shows them their hidden entries and nobody
 * else's, so this marks them rather than dropping them.
 */
export function ActivityList({
  events,
  hidden = [],
  showActor = false,
}: {
  events: ActivityEvent[];
  hidden?: string[];
  showActor?: boolean;
}) {
  return (
    <ol className="activity-list">
      {events.map((event) => {
        const { lead, trail } = activityParts(event);
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
              {timeAgo(event.createdAt)}
              {gone ? " · proyeknya sudah dihapus" : ""}
              {isHidden ? " · cuma kamu yang lihat" : ""}
            </small>
          </li>
        );
      })}
    </ol>
  );
}
