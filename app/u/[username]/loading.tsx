import { HeaderShell } from "../../components/shell";
import { LoadingNote, Skeleton } from "../../components/skeleton";

/** A profile's skeleton keeps the identity-to-project hierarchy stable while loading. */
export default function Loading() {
  return (
    <>
      <HeaderShell />
      <section className="profile-band">
        <div className="profile-band-inner profile-hero">
          <div>
            <Skeleton height={11} width={160} style={{ marginBottom: 26, opacity: .35 }} />
            <Skeleton height={60} width={340} style={{ marginBottom: 18, opacity: .35 }} />
            <Skeleton height={19} width={420} style={{ marginBottom: 28, opacity: .35 }} />
            <Skeleton height={34} width={260} style={{ opacity: .35 }} />
          </div>
          <aside className="profile-summary">
            <div className="profile-summary-head">
              <Skeleton height={64} width={64} style={{ borderRadius: 18, opacity: .35 }} />
              <Skeleton height={12} width={120} style={{ opacity: .35 }} />
            </div>
            <Skeleton height={13} style={{ marginTop: 20, marginBottom: 9, opacity: .35 }} />
            <Skeleton height={13} width="78%" style={{ opacity: .35 }} />
          </aside>
        </div>
      </section>
      <main id="main-content" className="profile-page">
        <LoadingNote />
        <div className="profile-content">
          <Skeleton height={22} width={180} style={{ marginBottom: 20 }} />
          <div className="profile-project-grid">
            {[0, 1].map((slot) => (
              <div className="skeleton-card" key={slot}>
                <Skeleton height={62} width={62} style={{ borderRadius: 12, marginBottom: 20 }} />
                <Skeleton height={22} width="70%" style={{ marginBottom: 12 }} />
                <Skeleton height={14} style={{ marginBottom: 8 }} />
                <Skeleton height={14} width="70%" />
              </div>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
