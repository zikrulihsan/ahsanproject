import { HeaderShell } from "../components/shell";
import { LoadingNote, Skeleton } from "../components/skeleton";

export default function Loading() {
  return (
    <>
      <HeaderShell active="explore" />
      <main id="main-content" className="discovery-page collaboration-page">
        <LoadingNote />
        <section className="collaboration-hero">
          <div style={{ width: "100%" }}>
            <Skeleton height={11} width={240} style={{ marginBottom: 16 }} />
            <Skeleton height={44} width="48%" style={{ marginBottom: 16 }} />
            <Skeleton height={14} width="62%" />
          </div>
        </section>
        <section className="collaboration-panel">
          <Skeleton height={55} />
          <Skeleton height={44} style={{ marginTop: 10 }} />
        </section>
        <div className="discovery-content collaboration-content">
          <section>
            <div className="home-list-head">
              <Skeleton height={24} width={220} />
            </div>
            {[0, 1, 2, 3].map((slot) => <Skeleton key={slot} height={190} style={{ marginTop: 12 }} />)}
          </section>
          <aside className="discovery-sidebar">
            <Skeleton height={260} />
            <Skeleton height={360} />
          </aside>
        </div>
      </main>
    </>
  );
}
