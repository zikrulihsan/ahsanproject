import type { Metadata } from "next";
import Link from "next/link";
import { homeMeta } from "./content";
import { SiteFooter, SiteHeader, Arrow } from "./components/shell";
import { ProjectCard } from "./components/pieces";
import { listProjects, listTags, type FeedQuery } from "./lib/data";
import { STAGES, stageMeta } from "./lib/stages";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: homeMeta.title,
  description: homeMeta.description,
  alternates: { canonical: "/" },
};

const SORTS: { key: NonNullable<FeedQuery["sort"]>; label: string }[] = [
  { key: "terbaru", label: "Terbaru" },
  { key: "didukung", label: "Paling didukung" },
  { key: "dibutuhkan", label: "Paling butuh orang" },
];

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function one(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

export default async function Feed({ searchParams }: { searchParams?: SearchParams }) {
  const params = (await searchParams) ?? {};
  const stage = one(params.stage);
  const tag = one(params.tag);
  const q = one(params.q);
  const sort = (SORTS.find((option) => option.key === one(params.sort))?.key ?? "terbaru") as FeedQuery["sort"];

  const [projects, tags] = await Promise.all([
    listProjects({ stage, tag, q, sort }),
    listTags(),
  ]);

  const openSeats = projects.reduce((total, project) => total + project.openSeatCount, 0);

  return (
    <>
      <SiteHeader returnTo="/" />

      <main>
        <section className="feed-hero">
          <div>
            <p className="eyebrow">
              <span /> Papan ide terbuka
            </p>
            <h1>
              Ide kecil.
              <br />
              <em>Dikerjakan bareng.</em>
            </h1>
            <p className="hero-description">
              Taruh idemu di sini lengkap dengan briefnya, lalu buka peran untuk siapa pun yang mau ikut
              menggarap — PM, designer, engineer, peneliti. Yang sudah jalan juga tinggal di sini, jadi
              satu halaman ini sekalian jadi portofolio orangnya.
            </p>
            <div className="hero-actions">
              <Link className="primary-button" href="/new">
                Taruh ide <Arrow />
              </Link>
              <Link className="ghost-button" href="/about">
                Cara kerjanya
              </Link>
            </div>
          </div>

          <aside className="feed-stats" aria-label="Ringkasan papan">
            <div>
              <strong>{projects.length}</strong>
              <span>proyek di papan</span>
            </div>
            <div>
              <strong>{openSeats}</strong>
              <span>peran menunggu diisi</span>
            </div>
            <div>
              <strong>{tags.length}</strong>
              <span>topik dibahas</span>
            </div>
          </aside>
        </section>

        <section className="feed" aria-label="Daftar ide dan proyek">
          <div className="filter-bar">
            <ul className="stage-filter">
              <li>
                <Link className={stage ? "" : "is-active"} href={linkTo({ tag, q, sort })}>
                  Semua
                </Link>
              </li>
              {STAGES.map((key) => (
                <li key={key}>
                  <Link
                    className={stage === key ? "is-active" : ""}
                    href={linkTo({ stage: key, tag, q, sort })}
                    title={stageMeta[key].blurb}
                  >
                    {stageMeta[key].label}
                  </Link>
                </li>
              ))}
            </ul>

            <form className="search" method="get" action="/">
              {stage ? <input type="hidden" name="stage" value={stage} /> : null}
              {tag ? <input type="hidden" name="tag" value={tag} /> : null}
              {sort ? <input type="hidden" name="sort" value={sort} /> : null}
              <input
                type="search"
                name="q"
                defaultValue={q}
                placeholder="Cari ide atau masalah…"
                aria-label="Cari ide atau masalah"
              />
              <button type="submit">Cari</button>
            </form>
          </div>

          <div className="sort-bar">
            <span>Urutkan</span>
            <ul>
              {SORTS.map((option) => (
                <li key={option.key}>
                  <Link
                    className={sort === option.key ? "is-active" : ""}
                    href={linkTo({ stage, tag, q, sort: option.key })}
                  >
                    {option.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {tags.length > 0 ? (
            <ul className="tag-rail" aria-label="Topik">
              {tag ? (
                <li>
                  <Link className="is-active" href={linkTo({ stage, q, sort })}>
                    #{tag} ✕
                  </Link>
                </li>
              ) : null}
              {tags
                .filter((entry) => entry.tag !== tag)
                .slice(0, 12)
                .map((entry) => (
                  <li key={entry.tag}>
                    <Link href={linkTo({ stage, tag: entry.tag, q, sort })}>
                      #{entry.tag} <small>{entry.count}</small>
                    </Link>
                  </li>
                ))}
            </ul>
          ) : null}

          {projects.length === 0 ? (
            <p className="empty">
              Belum ada yang cocok dengan saringan ini.{" "}
              <Link href="/new">Taruh ide pertamanya</Link>.
            </p>
          ) : (
            <div className="project-grid">
              {projects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          )}
        </section>
      </main>

      <SiteFooter />
    </>
  );
}

function linkTo(query: { stage?: string; tag?: string; q?: string; sort?: string }): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value && !(key === "sort" && value === "terbaru")) params.set(key, value);
  }
  const search = params.toString();
  return search ? `/?${search}` : "/";
}
