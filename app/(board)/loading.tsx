import { HeaderShell } from "../components/shell";
import { LoadingNote, Skeleton } from "../components/skeleton";

/** The board's skeleton: the level rail, the opening, then the card grid. */
export default function Loading() {
  return (
    <>
      <HeaderShell active="jelajah" />
      <main id="main-content">
        <LoadingNote />
        <div className="section-tabs">
          <ul>
            <li style={{ padding: "17px 0 15px" }}>
              <Skeleton height={14} width={340} />
            </li>
          </ul>
        </div>

        <div className="board-layout">
          <div className="board-head">
            <div>
              <Skeleton height={40} width={280} style={{ marginBottom: 12 }} />
              <Skeleton height={13} width={220} />
            </div>
            <Skeleton height={44} width={190} />
          </div>

          <div className="skeleton-panel" style={{ marginBottom: 26 }}>
            <Skeleton height={18} width={170} style={{ marginBottom: 18 }} />
            <Skeleton height={52} />
          </div>

          <div className="feed-header" style={{ marginBottom: 16 }}>
            <Skeleton height={19} width={160} />
            <Skeleton height={13} width={60} />
          </div>

          <div className="board-grid">
            {[0, 1, 2, 3, 4, 5].map((slot) => (
              <div className="skeleton-row" key={slot}>
                <Skeleton height={21} width="55%" style={{ marginBottom: 14 }} />
                <Skeleton height={14} style={{ marginBottom: 8 }} />
                <Skeleton height={14} width="70%" style={{ marginBottom: 18 }} />
                <Skeleton height={28} width="60%" />
              </div>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
