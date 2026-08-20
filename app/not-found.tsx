import Link from "next/link";
import { SiteFooter, SiteHeader, Arrow } from "./components/shell";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="notfound">
        <h1>Tidak ketemu.</h1>
        <p className="muted">Halamannya mungkin sudah pindah, atau tautannya keliru.</p>
        <p style={{ marginTop: 24 }}>
          <Link className="primary-button" href="/">
            Kembali ke papan ide <Arrow />
          </Link>
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
