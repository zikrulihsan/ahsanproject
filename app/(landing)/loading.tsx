import { HeaderShell } from "../components/shell";
import { LoadingNote, Skeleton } from "../components/skeleton";

/** The landing page's skeleton: the pitch, then the strip of live projects. */
export default function Loading() {
  return (
    <>
      <HeaderShell />
      <main id="main-content">
        <LoadingNote />
        <section className="landing-hero">
          <div className="landing-hero-inner">
            <Skeleton height={16} width={160} style={{ marginBottom: 28 }} />
            <Skeleton height={64} width="80%" style={{ marginBottom: 14 }} />
            <Skeleton height={64} width="46%" style={{ marginBottom: 30 }} />
            <Skeleton height={17} width="60%" style={{ marginBottom: 10 }} />
            <Skeleton height={17} width="42%" />
          </div>
        </section>
        <div className="landing-board">
          <ul className="project-list">
            {[0, 1, 2].map((slot) => (
              <li className="skeleton-row" key={slot}>
                <Skeleton height={19} width="45%" style={{ marginBottom: 12 }} />
                <Skeleton height={14} width="80%" style={{ marginBottom: 18 }} />
                <Skeleton height={14} width="55%" />
              </li>
            ))}
          </ul>
        </div>
      </main>
    </>
  );
}
