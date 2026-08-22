import { ImageResponse } from "next/og";
import { getPerson, getPersonStats, getPortfolio } from "../../lib/data";
import { monthYear } from "../../components/pieces";

/**
 * The share card for a profile — the page doing the actual promoting when a
 * portfolio link lands in a chat or a feed. Name, headline, and the numbers
 * the trail can back up.
 */
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Portofolio di Ahsan Project";

const PAPER = "#f8f6f0";
const INK = "#183d34";
const MUTED = "#68746d";
const ORANGE = "#ed714b";

export default async function Image({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const person = await getPerson(username);

  if (!person) {
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

  const [{ owned, contributing }, stats] = await Promise.all([
    getPortfolio(person),
    getPersonStats(person.id),
  ]);
  const live = owned.filter((project) => project.stage === "live").length;

  const numbers = [
    `${owned.length} proyek`,
    live > 0 ? `${live} sudah jalan` : "",
    contributing.length > 0 ? `${contributing.length} ikut menggarap` : "",
    stats.rolesTaken > 0 ? `${stats.rolesTaken} peran dijalani` : "",
    stats.tasksDone > 0 ? `${stats.tasksDone} tugas beres` : "",
  ]
    .filter(Boolean)
    .join("  ·  ");

  return new ImageResponse(
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
          <div style={{ display: "flex" }}>PORTOFOLIO</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", fontSize: 84, fontWeight: 700, lineHeight: 1.05 }}>
            {person.name}
          </div>
          {person.headline ? (
            <div style={{ display: "flex", fontSize: 36, color: MUTED, lineHeight: 1.3 }}>
              {person.headline}
            </div>
          ) : null}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
            borderTop: `3px solid ${ORANGE}`,
            paddingTop: 28,
          }}
        >
          {numbers ? <div style={{ display: "flex", fontSize: 32 }}>{numbers}</div> : null}
          <div style={{ display: "flex", fontSize: 24, color: MUTED }}>
            {stats.since
              ? `Aktif sejak ${monthYear(stats.since)} — jejaknya ditulis sistem, bukan diketik.`
              : "Jejaknya ditulis sistem, bukan diketik."}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
