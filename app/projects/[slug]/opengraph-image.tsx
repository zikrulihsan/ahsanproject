import { ImageResponse } from "next/og";
import { getProject } from "../../lib/data";
import { roleLabel } from "../../lib/roles";
import { stageMeta, type Stage } from "../../lib/stages";

/**
 * The share card for a project — what somebody sees before they decide to
 * open the link. Leads with the problem, and names the roles still open,
 * because "butuh designer" is the line that makes a stranger click.
 */
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Project on Ahsan Project";

const PAPER = "#f8f6f0";
const INK = "#183d34";
const MUTED = "#68746d";
const ORANGE = "#ed714b";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = await getProject(slug);

  if (!project) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: PAPER,
            color: INK,
            fontSize: 64,
            fontWeight: 700,
          }}
        >
          Ahsan Project
        </div>
      ),
      size,
    );
  }

  const stage = stageMeta[project.stage as Stage] ?? stageMeta.idea;
  const openRoles = [
    ...new Set(
      project.seats
        .filter((seat) => seat.status === "open")
        .map((seat) => roleLabel(seat.role, seat.roleTitle)),
    ),
  ];

  return (
    new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            background: PAPER,
            color: INK,
            padding: "64px 72px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: 26,
              letterSpacing: 6,
              color: MUTED,
            }}
          >
            <div style={{ display: "flex" }}>AHSAN PROJECT</div>
            <div
              style={{
                display: "flex",
                background: INK,
                color: PAPER,
                borderRadius: 100,
                fontSize: 24,
                letterSpacing: 2,
                padding: "10px 26px",
              }}
            >
              {stage.label.toUpperCase()}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "flex", fontSize: 76, fontWeight: 700, lineHeight: 1.05 }}>
              {project.title}
            </div>
            <div style={{ display: "flex", fontSize: 34, color: MUTED, lineHeight: 1.35 }}>
              {(() => {
                // What it is doing beats what it is: a shared link should say
                // the project is alive, not only what it is called.
                const line = project.nowText ? `Now: ${project.nowText}` : project.tagline;
                return line.length > 150 ? `${line.slice(0, 150)}…` : line;
              })()}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 18,
              borderTop: `3px solid ${ORANGE}`,
              paddingTop: 28,
            }}
          >
            {openRoles.length > 0 ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                {openRoles.slice(0, 4).map((role) => (
                  <div
                    key={role}
                    style={{
                      display: "flex",
                      border: `2px solid ${INK}`,
                      borderRadius: 100,
                      fontSize: 26,
                      padding: "8px 22px",
                    }}
                  >
                    {`Needs ${role}`}
                  </div>
                ))}
              </div>
            ) : null}
            <div style={{ display: "flex", fontSize: 24, color: MUTED }}>
              {`by ${project.owner.name}`}
            </div>
          </div>
        </div>
      ),
      size,
    )
  );
}
