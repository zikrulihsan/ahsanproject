import { HeaderShell } from "../components/shell";
import { LoadingNote, Skeleton } from "../components/skeleton";

/** The board's skeleton: hero, filter row, then a grid of card-shaped blocks. */
export default function Loading() {
  return (
    <>
      <HeaderShell />
      <main>
        <LoadingNote />
        <section className="feed-hero">
          <div>
            <Skeleton height={11} width={180} style={{ marginBottom: 34 }} />
            <Skeleton height={72} width="70%" style={{ marginBottom: 14 }} />
            <Skeleton height={72} width="55%" style={{ marginBottom: 30 }} />
            <Skeleton height={17} width="85%" style={{ marginBottom: 10 }} />
            <Skeleton height={17} width="60%" />
          </div>
        </section>
        <section className="feed">
          <div className="filter-bar">
            <Skeleton height={38} width={420} />
          </div>
          <div className="project-grid">
            {[0, 1, 2, 3, 4, 5].map((slot) => (
              <div className="skeleton-card" key={slot}>
                <Skeleton height={24} width={90} style={{ marginBottom: 26 }} />
                <Skeleton height={27} width="75%" style={{ marginBottom: 12 }} />
                <Skeleton height={14} style={{ marginBottom: 8 }} />
                <Skeleton height={14} width="85%" style={{ marginBottom: 8 }} />
                <Skeleton height={14} width="60%" />
              </div>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
