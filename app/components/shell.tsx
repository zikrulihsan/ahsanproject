import Link from "next/link";
import { Logo } from "../logo";
import { signOut } from "../auth-actions";
import { signInPath } from "../lib/urls";
import { currentViewer } from "../lib/session";
import { countIncomingApplications, countUnseenNotices } from "../lib/data";

/** Which top-level section the current page belongs to. */
export type Section = "jelajah" | "orang" | "tentang" | "";

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

function SearchIcon() {
  return (
    <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </svg>
  );
}

/**
 * Search that lives in the header rather than only on the board.
 *
 * A plain GET form, not a command palette: it works before any JavaScript
 * arrives, and what it produces is a URL somebody can share.
 */
function HeaderSearch() {
  return (
    <form className="header-search" method="get" action="/" role="search">
      <label>
        <SearchIcon />
        <span className="sr-only">Cari project, topik, atau sesuatu yang ingin kamu bantu</span>
        <input type="search" name="q" placeholder="Cari project, topik, atau sesuatu yang ingin kamu bantu…" autoComplete="off" />
      </label>
    </form>
  );
}

const LINKS: { href: string; label: string; key: Section }[] = [
  { href: "/", label: "Jelajah", key: "jelajah" },
  { href: "/orang", label: "Orang", key: "orang" },
  { href: "/about", label: "Tentang", key: "tentang" },
];

function MainNav({ active }: { active: Section }) {
  return (
    <nav className="desktop-nav" aria-label="Navigasi utama">
      {LINKS.map((link) => (
        <Link key={link.href} className={active === link.key ? "is-active" : ""} href={link.href}>
          {link.label}
        </Link>
      ))}
    </nav>
  );
}

/**
 * The header's static frame — same brand and links, no visitor yet.
 *
 * Every loading.tsx renders this so a navigation answers instantly with the
 * page's skeleton instead of a blank strip where the header will be. The real
 * SiteHeader streams in over it once the visitor is known.
 */
export function HeaderShell({ active = "" }: { active?: Section }) {
  return (
    <header className="site-header">
      <a className="skip-link" href="#main-content">
        Lewati ke konten
      </a>
      <div className="topbar-inner">
        <Brand />
        <HeaderSearch />
        <MainNav active={active} />
      </div>
    </header>
  );
}

export async function SiteHeader({
  returnTo = "/",
  active = "",
}: {
  returnTo?: string;
  active?: Section;
}) {
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
      <a className="skip-link" href="#main-content">
        Lewati ke konten
      </a>

      <div className="topbar-inner">
        <Brand />
        <HeaderSearch />
        <MainNav active={active} />

        <div className="header-actions">
          {viewer ? (
            <>
              <Link className="icon-button" href="/inbox" aria-label={inboxLabel(incoming, unseen)}>
                <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 8h18c0-1-3-1-3-8M10 21h4" />
                </svg>
                {waiting > 0 ? <span className="notification-dot">{waiting}</span> : null}
              </Link>
              <Link
                className="avatar-button"
                href={`/u/${viewer.username}`}
                aria-label={`Buka profil ${viewer.name}`}
                title={viewer.name}
              >
                {initialsOf(viewer.name)}
              </Link>
              <form action={signOut}>
                <button className="nav-quiet" type="submit">
                  Keluar
                </button>
              </form>
              <Link className="primary-action" href="/new">
                Tunjukkan project <Arrow />
              </Link>
            </>
          ) : (
            <Link className="primary-action" href={signInPath(returnTo)}>
              Masuk <Arrow />
            </Link>
          )}

          {/* A details menu, so the small-screen nav opens with no JavaScript. */}
          <details className="mobile-menu">
            <summary aria-label="Buka menu">
              <i aria-hidden="true" />
              <i aria-hidden="true" />
            </summary>
            <nav className="mobile-nav" aria-label="Navigasi mobile">
              {LINKS.map((link) => (
                <Link key={link.href} href={link.href}>
                  {link.label}
                </Link>
              ))}
              {viewer ? (
                <>
                  <Link href="/inbox">
                    Kotak masuk{waiting > 0 ? ` (${waiting})` : ""}
                  </Link>
                  <Link href={`/u/${viewer.username}`}>{viewer.name}</Link>
                  <Link href="/new">Tunjukkan project</Link>
                  <form action={signOut}>
                    <button type="submit">Keluar</button>
                  </form>
                </>
              ) : (
                <Link href={signInPath(returnTo)}>Masuk</Link>
              )}
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}

/** One badge, two meanings — the label says which, rather than just a number. */
function inboxLabel(incoming: number, unseen: number): string {
  const parts = [
    incoming > 0 ? `${incoming} orang menunggu jawaban` : "",
    unseen > 0 ? `${unseen} kabar baru` : "",
  ].filter(Boolean);

  return parts.length > 0 ? `Kotak masuk — ${parts.join(", ")}` : "Kotak masuk";
}

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function SiteFooter() {
  return (
    <footer>
      <Brand footer />
      <p>Tunjukkan yang sedang kamu bangun. Temukan yang mau ikut membantu.</p>
      <nav aria-label="Navigasi footer">
        <Link href="/">Jelajah</Link>
        <Link href="/orang">Orang</Link>
        <Link href="/about">Tentang</Link>
        <a href="https://github.com/zikrulihsan/ahsanproject" target="_blank" rel="noreferrer">
          GitHub <Arrow diagonal />
        </a>
      </nav>
      <small>© {new Date().getFullYear()} Ahsan Project</small>
    </footer>
  );
}
