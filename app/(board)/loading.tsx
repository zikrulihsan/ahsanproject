import { HeaderShell } from "../components/shell";
import { LoadingNote, Skeleton } from "../components/skeleton";

export default function Loading() {
  return (
    <>
      <HeaderShell active="beranda" />
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

        <div className="home-hero-actions">
          <Skeleton height={50} width={170} />
          <Skeleton height={50} width={220} />
        </div>

        <div className="discovery-content">
          <section>
            <div className="home-list-head">
              <div>
                <Skeleton height={24} width={170} style={{ marginBottom: 8 }} />
                <Skeleton height={11} width={210} />
              </div>
            </div>
            <div className="home-project-loading-grid">
              {[0, 1, 2, 3].map((slot) => (
                <div className="profile-project-card profile-project-skeleton home-profile-project-card" key={slot}>
                  <div className="profile-project-head">
                    <Skeleton height={62} width={62} style={{ borderRadius: 12 }} />
                    <div>
                      <Skeleton height={20} width="68%" style={{ marginBottom: 8 }} />
                      <Skeleton height={12} width="90%" style={{ marginBottom: 7 }} />
                      <Skeleton height={9} width="30%" />
                    </div>
                  </div>
                  <Skeleton height={1} style={{ marginTop: 16, marginBottom: 12 }} />
                  <Skeleton height={12} style={{ marginBottom: 7 }} />
                  <Skeleton height={12} width="78%" style={{ marginBottom: 16 }} />
                  <Skeleton height={56} style={{ marginBottom: 14 }} />
                  <Skeleton height={28} width="72%" style={{ marginBottom: 14 }} />
                  <Skeleton height={1} style={{ marginBottom: 12 }} />
                  <Skeleton height={30} width="56%" />
                </div>
              ))}
            </div>
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
