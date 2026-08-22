import { HeaderShell } from "../../components/shell";
import { LoadingNote, Skeleton } from "../../components/skeleton";

/** A profile's skeleton: the hero with its avatar, then the project grid. */
export default function Loading() {
  return (
    <>
      <HeaderShell />
      <main className="profile-page">
        <LoadingNote />
        <div className="profile-hero">
          <Skeleton height={96} width={96} round />
          <div>
            <Skeleton height={11} width={110} style={{ marginBottom: 26 }} />
            <Skeleton height={48} width={320} style={{ marginBottom: 16 }} />
            <Skeleton height={16} width={420} style={{ marginBottom: 10 }} />
            <Skeleton height={16} width={300} />
          </div>
        </div>
        <Skeleton height={24} width={90} style={{ margin: "40px 0 20px" }} />
        <div className="project-grid">
          {[0, 1, 2].map((slot) => (
            <div className="skeleton-card" key={slot}>
              <Skeleton height={24} width={90} style={{ marginBottom: 26 }} />
              <Skeleton height={27} width="75%" style={{ marginBottom: 12 }} />
              <Skeleton height={14} style={{ marginBottom: 8 }} />
              <Skeleton height={14} width="70%" />
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
