import Link from "next/link";
import { roleLabel } from "../lib/roles";
import { stageMeta, type Stage } from "../lib/stages";
import type { ProjectSummary } from "../lib/data";
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

export function ProjectCard({ project }: { project: ProjectSummary }) {
  return (
    <article className={`project-card ${project.accent}`}>
      <div className="card-topline">
        <StageBadge stage={project.stage} />
        <span className="project-glyph" aria-hidden="true">
          {project.glyph}
        </span>
      </div>

      <h3>
        <Link href={`/projects/${project.slug}`}>{project.title}</Link>
      </h3>
      <p className="card-tagline">{project.tagline}</p>

      <dl className="card-brief">
        <dt>Masalah</dt>
        <dd>{project.problem}</dd>
      </dl>

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

export function SeatChips({ roles }: { roles: string[] }) {
  if (roles.length === 0) return null;
  return (
    <ul className="seat-chips">
      {roles.map((role, index) => (
        <li key={`${role}-${index}`}>{roleLabel(role)}</li>
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

export function timeAgo(value: string): string {
  const then = Date.parse(value.includes("T") ? value : value.replace(" ", "T") + "Z");
  if (Number.isNaN(then)) return "";

  const days = Math.floor((Date.now() - then) / 86_400_000);
  if (days < 1) return "hari ini";
  if (days < 30) return `${days} hari lalu`;
  if (days < 365) return `${Math.floor(days / 30)} bulan lalu`;
  return `${Math.floor(days / 365)} tahun lalu`;
}
