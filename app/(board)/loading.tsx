import { HeaderShell } from "../components/shell";
import { LoadingNote, Skeleton } from "../components/skeleton";

export default function Loading() {
  return (
    <>
      <HeaderShell active="jelajah" />
      <main id="main-content" className="discovery-page">
        <LoadingNote />

        <section className="discovery-hero">
          <div className="discovery-hero-copy" style={{ width: "100%" }}>
            <Skeleton height={11} width={210} style={{ marginBottom: 18 }} />
            <Skeleton height={58} width="72%" style={{ marginBottom: 10 }} />
            <Skeleton height={58} width="46%" style={{ marginBottom: 24 }} />
            <Skeleton height={15} width="66%" />
          </div>
        </section>

        <div className="discovery-controls">
          <Skeleton height={55} />
          <Skeleton height={55} />
        </div>

        <div className="discovery-content">
          <section>
            <div className="home-list-head">
              <div>
                <Skeleton height={24} width={170} style={{ marginBottom: 8 }} />
                <Skeleton height={11} width={210} />
              </div>
              <Skeleton height={42} width={220} />
            </div>
            {[0, 1, 2, 3].map((slot) => (
              <div className="home-project-card" key={slot}>
                <Skeleton height={57} />
                <Skeleton height={64} />
                <div>
                  <Skeleton height={20} width="42%" style={{ marginBottom: 10 }} />
                  <Skeleton height={13} width="78%" style={{ marginBottom: 18 }} />
                  <Skeleton height={62} />
                </div>
              </div>
            ))}
          </section>
          <aside className="discovery-sidebar">
            <div className="skeleton-panel"><Skeleton height={360} /></div>
            <div className="skeleton-panel"><Skeleton height={260} /></div>
          </aside>
        </div>
      </main>
    </>
  );
}
