import { HeaderShell } from "../components/shell";
import { LoadingNote, Skeleton } from "../components/skeleton";

/** The board's skeleton: hero, level rail, then feed rows beside the sidebar. */
export default function Loading() {
  return (
    <>
      <HeaderShell active="jelajah" />
      <main id="main-content">
        <LoadingNote />
        <section className="feed-hero">
          <div>
            <Skeleton height={11} width={180} style={{ marginBottom: 30 }} />
            <Skeleton height={70} width="70%" style={{ marginBottom: 14 }} />
            <Skeleton height={70} width="55%" style={{ marginBottom: 28 }} />
            <Skeleton height={17} width="85%" style={{ marginBottom: 10 }} />
            <Skeleton height={17} width="60%" />
          </div>
        </section>

        <div className="section-tabs">
          <ul>
            <li style={{ padding: "17px 0 15px" }}>
              <Skeleton height={14} width={340} />
            </li>
          </ul>
        </div>

        <div className="app-layout">
          <section className="feed">
            <Skeleton height={26} width={220} style={{ marginBottom: 24 }} />
            <Skeleton height={34} width="70%" style={{ marginBottom: 20 }} />
            {[0, 1, 2, 3, 4].map((slot) => (
              <div className="skeleton-row" key={slot}>
                <Skeleton height={19} width="45%" style={{ marginBottom: 12 }} />
                <Skeleton height={14} width="80%" style={{ marginBottom: 18 }} />
                <Skeleton height={5} style={{ marginBottom: 18 }} />
                <Skeleton height={14} width="55%" />
              </div>
            ))}
          </section>
          <aside className="sidebar">
            {[0, 1].map((slot) => (
              <div className="skeleton-panel" key={slot} style={{ minHeight: 230 }}>
                <Skeleton height={18} width={140} style={{ marginBottom: 20 }} />
                <Skeleton height={14} style={{ marginBottom: 12 }} />
                <Skeleton height={14} width="75%" style={{ marginBottom: 12 }} />
                <Skeleton height={14} width="60%" />
              </div>
            ))}
          </aside>
        </div>
      </main>
    </>
  );
}
