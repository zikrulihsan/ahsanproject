import { HeaderShell } from "../components/shell";
import { LoadingNote, Skeleton } from "../components/skeleton";

export default function Loading() {
  return (
    <>
      <HeaderShell active="beranda" />
      <main id="main-content" className="landing-page">
        <LoadingNote />

        <section className="landing-hero">
          <div className="landing-hero-copy" style={{ width: "100%" }}>
            <Skeleton height={11} width={230} style={{ marginBottom: 20 }} />
            <Skeleton height={63} width="94%" style={{ marginBottom: 11 }} />
            <Skeleton height={63} width="78%" style={{ marginBottom: 27 }} />
            <Skeleton height={15} width="88%" style={{ marginBottom: 10 }} />
            <Skeleton height={15} width="72%" />
            <div className="home-hero-actions">
              <Skeleton height={50} width={180} />
              <Skeleton height={50} width={225} />
            </div>
          </div>

          <aside className="ecosystem-card">
            <Skeleton height={12} width="48%" style={{ marginBottom: 30 }} />
            <Skeleton height={66} width="70%" style={{ marginBottom: 22 }} />
            <Skeleton height={58} style={{ marginBottom: 20 }} />
            <Skeleton height={128} />
          </aside>
        </section>

        <section className="landing-purpose">
          <div className="landing-section-intro">
            <Skeleton height={11} width={210} style={{ marginBottom: 18 }} />
            <Skeleton height={50} width="72%" />
          </div>
          <div className="purpose-grid">
            {[0, 1, 2].map((slot) => (
              <div className="purpose-card" key={slot}>
                <Skeleton height={49} width={49} style={{ marginBottom: 42 }} />
                <Skeleton height={9} width="38%" style={{ marginBottom: 18 }} />
                <Skeleton height={24} width="88%" style={{ marginBottom: 9 }} />
                <Skeleton height={24} width="70%" />
              </div>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
