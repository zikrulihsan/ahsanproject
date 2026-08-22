import Link from "next/link";
import { Logo } from "../logo";
import { signOut } from "../auth-actions";
import { signInPath } from "../lib/urls";
import { currentViewer } from "../lib/session";
import { countIncomingApplications, countUnseenNotices } from "../lib/data";

export function Arrow({ diagonal = false }: { diagonal?: boolean }) {
  return (
    <span className={`arrow ${diagonal ? "arrow-diagonal" : ""}`} aria-hidden="true">
      →
    </span>
  );
}

export function Brand({ footer = false }: { footer?: boolean }) {
  return (
    <Link className={`brand ${footer ? "footer-brand" : ""}`} href="/" aria-label="Ahsan Project, ke beranda">
      <Logo className="brand-mark" />
      <span>
        Ahsan <span className="brand-alt">Project</span>
      </span>
    </Link>
  );
}

/**
 * The header's static frame — same brand and links, no visitor yet.
 *
 * Every loading.tsx renders this so a navigation answers instantly with the
 * page's skeleton instead of a blank strip where the header will be. The real
 * SiteHeader streams in over it once the visitor is known.
 */
export function HeaderShell() {
  return (
    <header className="site-header">
      <Brand />
      <nav aria-label="Navigasi utama">
        <Link href="/">Jelajah</Link>
        <Link href="/orang">Orang</Link>
        <Link href="/about">Tentang</Link>
      </nav>
    </header>
  );
}

export async function SiteHeader({ returnTo = "/" }: { returnTo?: string }) {
  const viewer = await currentViewer();
  // An application nobody sees is an application nobody answers, and a
  // decision nobody sees is the same — so both counts ride along in the header
  // rather than waiting to be found.
  const [incoming, unseen] = viewer
    ? await Promise.all([countIncomingApplications(viewer.id), countUnseenNotices(viewer.id)])
    : [0, 0];
  const waiting = incoming + unseen;

  return (
    <header className="site-header">
      <Brand />
      <nav aria-label="Navigasi utama">
        <Link href="/">Jelajah</Link>
        <Link href="/orang">Orang</Link>
        <Link href="/about">Tentang</Link>
        {viewer ? (
          <>
            <Link className="nav-inbox" href="/inbox">
              Kotak masuk
              {waiting > 0 ? (
                <span className="badge" aria-label={badgeLabel(incoming, unseen)}>
                  {waiting}
                </span>
              ) : null}
            </Link>
            <Link className="nav-person" href={`/u/${viewer.username}`}>
              {viewer.name}
            </Link>
            <form action={signOut}>
              <button className="nav-quiet" type="submit">
                Keluar
              </button>
            </form>
            <Link className="nav-cta" href="/new">
              Taruh ide <Arrow />
            </Link>
          </>
        ) : (
          <Link className="nav-cta" href={signInPath(returnTo)}>
            Masuk <Arrow />
          </Link>
        )}
      </nav>
    </header>
  );
}

/** One badge, two meanings — the label says which, rather than just a number. */
function badgeLabel(incoming: number, unseen: number): string {
  const parts = [
    incoming > 0 ? `${incoming} lamaran menunggu jawaban` : "",
    unseen > 0 ? `${unseen} kabar baru` : "",
  ].filter(Boolean);

  return parts.join(", ");
}

export function SiteFooter() {
  return (
    <footer>
      <Brand footer />
      <p>Ahsan Project — ide kecil, dikerjakan bareng.</p>
      <a href="https://github.com/zikrulihsan/ahsanproject" target="_blank" rel="noreferrer">
        GitHub <Arrow diagonal />
      </a>
    </footer>
  );
}
