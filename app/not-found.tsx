import Link from "next/link";
import { SiteFooter, SiteHeader, Arrow } from "./components/shell";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="main-content" className="notfound">
        <h1>Page not found.</h1>
        <p className="muted">This page may have moved, or the link may be incorrect.</p>
        <p style={{ marginTop: 24 }}>
          <Link className="primary-button" href="/">
            Back to the board <Arrow />
          </Link>
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
