import Link from "next/link";
import { Logo } from "../logo";
import { chatGPTSignInPath, chatGPTSignOutPath } from "../chatgpt-auth";
import { currentViewer } from "../lib/session";

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
 * Sign-in and sign-out are platform routes outside this app's router, so those
 * two links stay plain anchors while everything else navigates with `Link`.
 */
export async function SiteHeader({ returnTo = "/" }: { returnTo?: string }) {
  const viewer = await currentViewer();

  return (
    <header className="site-header">
      <Brand />
      <nav aria-label="Navigasi utama">
        <Link href="/">Jelajah</Link>
        <Link href="/about">Tentang</Link>
        {viewer ? (
          <>
            <Link className="nav-person" href={`/u/${viewer.username}`}>
              {viewer.name}
            </Link>
            <a className="nav-quiet" href={chatGPTSignOutPath(returnTo)}>
              Keluar
            </a>
            <Link className="nav-cta" href="/new">
              Taruh ide <Arrow />
            </Link>
          </>
        ) : (
          <a className="nav-cta" href={chatGPTSignInPath(returnTo)}>
            Masuk <Arrow />
          </a>
        )}
      </nav>
    </header>
  );
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
