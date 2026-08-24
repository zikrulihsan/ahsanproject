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
                <div className="home-project-copy">
                  <div className="home-project-title-row">
                    <div className="home-project-identity" style={{ width: "100%" }}>
                      <Skeleton height={48} />
                      <div>
                        <Skeleton height={9} width="24%" style={{ marginBottom: 7 }} />
                        <Skeleton height={20} width="45%" style={{ marginBottom: 8 }} />
                        <Skeleton height={12} width="78%" />
                      </div>
                    </div>
                    <Skeleton height={30} width={42} />
                  </div>
                  <Skeleton height={56} style={{ marginTop: 12 }} />
                  <div className="home-project-footer">
                    <Skeleton height={21} width={145} />
                    <Skeleton height={32} width={105} />
                  </div>
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
