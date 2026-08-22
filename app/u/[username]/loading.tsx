import { HeaderShell } from "../../components/shell";
import { LoadingNote, Skeleton } from "../../components/skeleton";

/** A profile's skeleton: the dark band, then the card that carries the evidence. */
export default function Loading() {
  return (
    <>
      <HeaderShell />
      <section className="profile-band">
        <div className="profile-band-inner">
          <Skeleton height={11} width={110} style={{ marginBottom: 26, opacity: .35 }} />
          <Skeleton height={54} width={340} style={{ marginBottom: 16, opacity: .35 }} />
          <Skeleton height={18} width={420} style={{ opacity: .35 }} />
        </div>
      </section>
      <main id="main-content" className="profile-page">
        <LoadingNote />
        <div className="profile-card">
          <div className="profile-sidebar">
            <Skeleton height={88} width={88} style={{ borderRadius: 26, marginBottom: 20 }} />
            <Skeleton height={22} width={160} style={{ marginBottom: 10 }} />
            <Skeleton height={12} width={110} style={{ marginBottom: 22 }} />
            <Skeleton height={14} style={{ marginBottom: 9 }} />
            <Skeleton height={14} width="80%" />
          </div>
          <div className="profile-content">
            <Skeleton height={22} width={90} style={{ marginBottom: 20 }} />
            <Skeleton height={14} style={{ marginBottom: 10 }} />
            <Skeleton height={14} width="88%" style={{ marginBottom: 10 }} />
            <Skeleton height={14} width="66%" style={{ marginBottom: 34 }} />
            <div className="project-grid">
              {[0, 1].map((slot) => (
                <div className="skeleton-card" key={slot}>
                  <Skeleton height={42} width={42} style={{ borderRadius: 12, marginBottom: 20 }} />
                  <Skeleton height={22} width="70%" style={{ marginBottom: 12 }} />
                  <Skeleton height={14} style={{ marginBottom: 8 }} />
                  <Skeleton height={14} width="70%" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
