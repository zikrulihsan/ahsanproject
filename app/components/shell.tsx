import { Suspense } from "react";
import { cacheLife } from "next/cache";
import Link from "next/link";
import { Logo } from "../logo";
import { signOut } from "../auth-actions";
import { signInPath } from "../lib/urls";
import { currentViewer, type Viewer } from "../lib/session";
import { countIncomingApplications, countUnseenNotices } from "../lib/data";
import { readPublicly } from "../lib/public-read";
import { HeaderMenu } from "./header-menu";
import { SignOutButton } from "./sign-out-button";

/** Which top-level section the current page belongs to. */
export type Section = "beranda" | "kolaborasi" | "orang" | "tentang" | "";

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
      <span><strong>ahsan</strong><span className="brand-alt">project</span></span>
    </Link>
  );
}

const LINKS: { href: string; label: string; key: Section; icon: HeaderIconName }[] = [
  { href: "/", label: "Beranda", key: "beranda", icon: "home" },
  { href: "/kolaborasi", label: "Kolaborasi", key: "kolaborasi", icon: "explore" },
  { href: "/orang", label: "Orang", key: "orang", icon: "people" },
  { href: "/about", label: "Tentang", key: "tentang", icon: "profile" },
];

type HeaderIconName =
  | "home"
  | "explore"
  | "people"
  | "profile"
  | "edit"
  | "steps"
  | "inbox"
  | "add"
  | "signout"
  | "signin";

function HeaderIcon({ name }: { name: HeaderIconName }) {
  const paths: Record<HeaderIconName, React.ReactNode> = {
    home: <><path d="m3 11 9-7 9 7" /><path d="M5.5 10v10h13V10M9 20v-6h6v6" /></>,
    explore: <><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" /></>,
    people: <><path d="M16 20v-1.5a4.5 4.5 0 0 0-4.5-4.5h-3A4.5 4.5 0 0 0 4 18.5V20" /><circle cx="10" cy="7" r="3.5" /><path d="M17 11a3 3 0 0 0 0-6M19 14.5a4 4 0 0 1 2 3.5v2" /></>,
    profile: <><circle cx="12" cy="8" r="3.5" /><path d="M5 20a7 7 0 0 1 14 0" /></>,
    inbox: <><path d="M4 5h16v13H4z" /><path d="M4 14h4l1.5 2h5l1.5-2h4" /></>,
    edit: <><path d="M4 20h4l10-10-4-4L4 16v4Z" /><path d="m14 6 4 4" /></>,
    steps: <><path d="M4 7h5v13H4zM9.5 12h5v8h-5zM15 4h5v16h-5z" /></>,
    add: <path d="M12 5v14M5 12h14" />,
    signout: <><path d="M10 5H5v14h5M14 8l4 4-4 4M9 12h9" /></>,
    signin: <><path d="M14 5h5v14h-5M10 8l-4 4 4 4M6 12h9" /></>,
  };

  return <svg className="menu-icon" viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>;
}

function MainNav({ active }: { active: Section }) {
  return (
    <nav className="desktop-nav" aria-label="Navigasi utama">
      {LINKS.map((link) => (
        <Link
          key={link.href}
          aria-current={active === link.key ? "page" : undefined}
          className={active === link.key ? "is-active" : ""}
          href={link.href}
        >
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
      <div className="topbar-inner">
        <Brand />
        <MainNav active={active} />
        <div className="header-actions header-shell-actions">
          <Link className="nav-login" href="/signin">Masuk</Link>
          <Link className="primary-action" href="/new"><span aria-hidden="true">+</span> Tambah project</Link>
          <MobileHeaderMenu active={active} returnTo="/" waiting={0} />
        </div>
      </div>
    </header>
  );
}

/**
 * The header, with the visitor streamed in.
 *
 * Who is looking is the one thing on most pages that cannot be cached or
 * prerendered — it comes from a cookie and a round trip to the auth server.
 * Holding the whole page open for it would make every route dynamic, which is
 * exactly what this site used to do. Behind this boundary the rest of the page
 * prerenders and ships immediately, and the header fills itself in.
 *
 * `HeaderShell` is the fallback because it is the same frame with the guest
 * actions already drawn: nothing moves when the visitor arrives except the
 * sign-in link becoming an account menu.
 */
export function SiteHeader({
  returnTo = "/",
  active = "",
}: {
  returnTo?: string | Promise<string>;
  active?: Section;
}) {
  return (
    <Suspense fallback={<HeaderShell active={active} />}>
      <VisitorHeader returnTo={returnTo} active={active} />
    </Suspense>
  );
}

async function VisitorHeader({
  returnTo = "/",
  active = "",
}: {
  returnTo?: string | Promise<string>;
  active?: Section;
}) {
  // `returnTo` may be a promise: on the pages whose address depends on the
  // filters in the URL, working it out means reading `searchParams`. Awaiting
  // it here rather than in the page keeps that read inside this boundary,
  // where the visitor is already being waited for, instead of holding up the
  // page's prerendered shell.
  const [viewer, destination] = await Promise.all([currentViewer(), returnTo]);
  // An application nobody sees is an application nobody answers, and a
  // decision nobody sees is the same — so both counts ride along in the header
  // rather than waiting to be found.
  const [incomingResult, unseenResult] = viewer
    ? await Promise.all([
        readPublicly("lamaran masuk di header", () => countIncomingApplications(viewer.id), 0),
        readPublicly("notifikasi di header", () => countUnseenNotices(viewer.id), 0),
      ])
    : [
        { value: 0, unavailable: false },
        { value: 0, unavailable: false },
      ];
  const incoming = incomingResult.value;
  const unseen = unseenResult.value;
  const waiting = incoming + unseen;

  return (
    <header className="site-header">
      <div className="topbar-inner">
        <Brand />
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
              <AccountMenu viewer={viewer} waiting={waiting} />
              <Link className="primary-action" href="/new">
                <span aria-hidden="true">+</span> Tambah project
              </Link>
            </>
          ) : (
            <>
              <Link className="nav-login" href={signInPath(destination)}>Masuk</Link>
              <Link className="primary-action" href="/new">
                <span aria-hidden="true">+</span> Tambah project
              </Link>
            </>
          )}

          <MobileHeaderMenu active={active} returnTo={destination} viewer={viewer} waiting={waiting} />
        </div>
      </div>
    </header>
  );
}

function AccountIdentity({ viewer }: { viewer: Viewer }) {
  return (
    <div className="account-identity">
      <span className="account-avatar" aria-hidden="true">{initialsOf(viewer.name)}</span>
      <span className="account-identity-copy">
        <strong>{viewer.name}</strong>
        <span>@{viewer.username}</span>
        {viewer.profession ? <small>{viewer.profession}</small> : null}
      </span>
    </div>
  );
}

function AccountMenu({ viewer, waiting }: { viewer: Viewer; waiting: number }) {
  return (
    <HeaderMenu
      className="account-menu"
      summaryClassName="avatar-button"
      summaryLabel={`Buka menu akun ${viewer.name}`}
      summary={<span aria-hidden="true">{initialsOf(viewer.name)}</span>}
    >
      <div className="account-popover">
        <AccountIdentity viewer={viewer} />
        <nav className="account-menu-links" aria-label="Menu akun">
          <Link href={`/u/${viewer.username}`}>
            <HeaderIcon name="profile" />
            <span>Profil profesional</span>
          </Link>
          <Link href="/akun/profil">
            <HeaderIcon name="edit" />
            <span>Ubah profil</span>
          </Link>
          <Link href="/mulai?semua=1">
            <HeaderIcon name="steps" />
            <span>Langkah berikutnya</span>
          </Link>
          <Link href="/inbox">
            <HeaderIcon name="inbox" />
            <span>Kotak masuk</span>
            {waiting > 0 ? <span className="menu-count">{waiting}</span> : null}
          </Link>
          <Link href="/new">
            <HeaderIcon name="add" />
            <span>Tambah project</span>
          </Link>
        </nav>
        <form className="account-signout" action={signOut}>
          <SignOutButton />
        </form>
      </div>
    </HeaderMenu>
  );
}

function MobileHeaderMenu({
  active,
  returnTo,
  viewer,
  waiting,
}: {
  active: Section;
  returnTo: string;
  viewer?: Viewer | null;
  waiting: number;
}) {
  return (
    <HeaderMenu
      className="mobile-menu"
      summaryLabel="Buka menu navigasi"
      summary={
        <>
          <i aria-hidden="true" />
          <i aria-hidden="true" />
        </>
      }
    >
      <div className="mobile-nav">
        <nav className="mobile-nav-primary" aria-label="Navigasi utama mobile">
          <p className="mobile-menu-label">Jelajahi</p>
          {LINKS.map((link) => (
            <Link
              key={link.href}
              aria-current={active === link.key ? "page" : undefined}
              className={active === link.key ? "is-active" : ""}
              href={link.href}
            >
              <HeaderIcon name={link.icon} />
              <span>{link.label}</span>
              {active === link.key ? <span className="mobile-active-dot" aria-hidden="true" /> : null}
            </Link>
          ))}
        </nav>

        <Link className="mobile-project-action" href="/new">
          <HeaderIcon name="add" />
          <span>Tambah project</span>
        </Link>

        {viewer ? (
          <section className="mobile-account-section" aria-label="Akun">
            <AccountIdentity viewer={viewer} />
            <nav className="mobile-account-links" aria-label="Menu akun mobile">
              <Link href={`/u/${viewer.username}`}>
                <HeaderIcon name="profile" />
                <span>Profil profesional</span>
              </Link>
              <Link href="/akun/profil">
                <HeaderIcon name="edit" />
                <span>Ubah profil</span>
              </Link>
              <Link href="/mulai?semua=1">
                <HeaderIcon name="steps" />
                <span>Langkah berikutnya</span>
              </Link>
              <Link href="/inbox">
                <HeaderIcon name="inbox" />
                <span>Kotak masuk</span>
                {waiting > 0 ? <span className="menu-count">{waiting}</span> : null}
              </Link>
            </nav>
            <form className="account-signout" action={signOut}>
              <SignOutButton />
            </form>
          </section>
        ) : (
          <div className="mobile-guest-actions">
            <Link href={signInPath(returnTo)}>
              <HeaderIcon name="signin" />
              <span>Masuk</span>
            </Link>
          </div>
        )}
      </div>
    </HeaderMenu>
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
      <p>A public place for real work, proof, and the people behind it.</p>
      <nav aria-label="Navigasi footer">
        <Link href="/">Beranda</Link>
        <Link href="/kolaborasi">Explore</Link>
        <Link href="/orang">Orang</Link>
        <Link href="/about">Tentang</Link>
        <a href="https://github.com/zikrulihsan/ahsanproject" target="_blank" rel="noreferrer">
          GitHub <Arrow diagonal />
        </a>
      </nav>
      <small>© <CopyrightYear /> Ahsan Project</small>
    </footer>
  );
}

/**
 * The year in the footer, cached.
 *
 * `new Date()` cannot be read while prerendering — it would freeze whatever
 * the build machine's clock said into the static shell. Caching it is the
 * honest fix: the year is the same for everybody, and re-reading it once a day
 * means the footer turns over within a day of New Year without any page here
 * having to be rendered per request to say so.
 */
async function CopyrightYear() {
  "use cache";
  cacheLife("days");

  return new Date().getFullYear();
}
