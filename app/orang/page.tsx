import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "../components/shell";
import { initials } from "../components/pieces";
import { LoadingNote, Skeleton } from "../components/skeleton";
import { listPeopleAtWork, type PersonAtWork } from "../lib/data";
import { readPublicly } from "../lib/public-read";
import {
  EXPERIENCE_BANDS,
  experienceBandLabel,
  filterAndRankPeople,
  isExperienceBand,
  isTalentPoolMember,
  peopleFacets,
  peoplePage,
  primaryProfession,
  type PeopleFilters,
} from "../lib/people";
import { shareCard } from "../content";

const title = "People — Ahsan Project";
const description =
  "Find people by profession, skills, experience, field, and the projects they work on at Ahsan Project.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/orang" },
  openGraph: shareCard({ title, description, url: "/orang" }),
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
type DirectoryParam = "q" | "profesi" | "skill" | "pengalaman" | "bidang" | "kerja" | "halaman";

/** The filters and page number this URL asks for. */
function readDirectoryQuery(query: Record<string, string | string[] | undefined>) {
  const involvementValue = one(query.kerja);
  const experienceValue = one(query.pengalaman);
  const filters: PeopleFilters = {
    q: one(query.q).slice(0, 100),
    profession: one(query.profesi).slice(0, 80),
    skill: one(query.skill).slice(0, 50),
    experience: isExperienceBand(experienceValue) ? experienceValue : "",
    field: one(query.bidang).slice(0, 50),
    involvement:
      involvementValue === "building" || involvementValue === "helping" ? involvementValue : "",
  };

  const rawPage = Number(one(query.halaman));
  return { filters, requestedPage: Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1 };
}

/**
 * The directory's frame, which is the same whatever is being searched for.
 *
 * Nothing here reads the URL, so it prerenders once and is served from the
 * edge. The results below it depend on `searchParams` — a different answer per
 * visitor — so they stream in behind a skeleton instead of holding the page.
 */
export default function PeoplePage({ searchParams }: { searchParams?: SearchParams }) {
  const query = searchParams ?? Promise.resolve({});

  return (
    <>
      <SiteHeader returnTo={query.then(hrefForQuery)} active="people" />

      <main id="main-content" className="people-page">
        <header className="people-directory-head">
          <h1>Find people</h1>
          <p>Discover people by profession, skills, experience, field, or project.</p>
        </header>

        <Suspense fallback={<DirectorySkeleton />}>
          <Directory query={query} />
        </Suspense>
      </main>

      <SiteFooter />
    </>
  );
}

/** The address of the directory as this URL currently has it. */
async function hrefForQuery(
  query: Record<string, string | string[] | undefined>,
): Promise<string> {
  const { filters, requestedPage } = readDirectoryQuery(query);
  return directoryPath(filters, requestedPage > 1 ? requestedPage : 1, {});
}

function directoryPath(
  filters: PeopleFilters,
  page: number,
  patch: Partial<Record<DirectoryParam, string | number | null>>,
): string {
  const base: Partial<Record<DirectoryParam, string>> = {
    q: filters.q,
    profesi: filters.profession,
    skill: filters.skill,
    pengalaman: filters.experience,
    bidang: filters.field,
    kerja: filters.involvement,
    halaman: page > 1 ? String(page) : "",
  };

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(base)) {
    if (value) params.set(key, value);
  }
  for (const [key, value] of Object.entries(patch)) {
    if (value === null || value === "" || value === 1) params.delete(key);
    else params.set(key, String(value));
  }

  const search = params.toString();
  return `/orang${search ? `?${search}` : ""}`;
}

async function Directory({ query }: { query: SearchParams }) {
  const { filters, requestedPage } = readDirectoryQuery(await query);
  const peopleResult = await readPublicly<PersonAtWork[]>(
    "direktori orang",
    () => listPeopleAtWork(1000),
    [],
  );
  const allPeople = peopleResult.value;
  const talentPoolPeople = allPeople.filter(isTalentPoolMember);
  const facets = peopleFacets(talentPoolPeople);
  const matched = filterAndRankPeople(talentPoolPeople, filters);
  const pagination = peoplePage(matched, requestedPage);
  const { items: people, page, pageCount } = pagination;
  const activeFilterCount = [
    filters.q,
    filters.profession,
    filters.skill,
    filters.experience,
    filters.field,
    filters.involvement,
  ].filter(Boolean).length;

  const directoryHref = (patch: Partial<Record<DirectoryParam, string | number | null>>) =>
    directoryPath(filters, page, patch);

  const topContributors = [...talentPoolPeople]
    .filter((entry) => entry.helping.length > 0)
    .sort(
      (a, b) =>
        b.helping.length - a.helping.length ||
        b.building.length - a.building.length ||
        a.person.name.localeCompare(b.person.name, "id"),
    )
    .slice(0, 5);
  const returnTo = directoryHref({});

  return (
    <>
        {peopleResult.unavailable ? (
          <p className="public-data-notice" role="status">
            People data could not load. <Link href={returnTo}>Try again</Link>.
          </p>
        ) : null}

        <section className="people-search-panel" aria-label="Cari dan filter orang">
          <form action="/orang" method="get">
            {filters.involvement ? <input type="hidden" name="kerja" value={filters.involvement} /> : null}
            <div className="people-search-row">
              <label className="people-search-field">
                <span className="sr-only">Search people</span>
                <SearchIcon />
                <input
                  type="search"
                  name="q"
                  maxLength={100}
                  defaultValue={filters.q}
                  placeholder="Search name, profession, skill, or project…"
                />
              </label>
              <button type="submit">Show results</button>
            </div>

            <div className="people-filter-grid">
              <FilterSelect name="profesi" label="Profesi" value={filters.profession}>
                <option value="">All professions</option>
                {filters.profession && !hasFacet(facets.professions, filters.profession) ? (
                  <option value={filters.profession}>{filters.profession} (0)</option>
                ) : null}
                {facets.professions.map((facet) => (
                  <option key={facet.value} value={facet.value}>
                    {facet.value} ({facet.count})
                  </option>
                ))}
              </FilterSelect>

              <FilterSelect name="skill" label="Skill" value={filters.skill}>
                <option value="">All skills</option>
                {filters.skill && !hasFacet(facets.skills, filters.skill) ? (
                  <option value={filters.skill}>{filters.skill} (0)</option>
                ) : null}
                {facets.skills.map((facet) => (
                  <option key={facet.value} value={facet.value}>
                    {facet.value} ({facet.count})
                  </option>
                ))}
              </FilterSelect>

              <FilterSelect name="pengalaman" label="Pengalaman" value={filters.experience}>
                <option value="">All experience levels</option>
                {EXPERIENCE_BANDS.map((band) => (
                  <option key={band} value={band}>{experienceBandLabel[band]}</option>
                ))}
              </FilterSelect>

              <FilterSelect name="bidang" label="Bidang" value={filters.field}>
                <option value="">All fields</option>
                {filters.field && !hasFacet(facets.fields, filters.field) ? (
                  <option value={filters.field}>{filters.field} (0)</option>
                ) : null}
                {facets.fields.map((facet) => (
                  <option key={facet.value} value={facet.value}>
                    {facet.value} ({facet.count})
                  </option>
                ))}
              </FilterSelect>
            </div>
            <button className="people-filter-submit" type="submit">Show results</button>
          </form>

          <div className="people-work-filters" aria-label="Filter keterlibatan">
            <Link
              className={filters.involvement === "" ? "is-active" : ""}
              href={directoryHref({ kerja: null, halaman: null })}
            >
              Semua
            </Link>
            <Link
              className={filters.involvement === "building" ? "is-active" : ""}
              href={directoryHref({ kerja: "building", halaman: null })}
            >
              Sedang membangun
            </Link>
            <Link
              className={filters.involvement === "helping" ? "is-active" : ""}
              href={directoryHref({ kerja: "helping", halaman: null })}
            >
              Ikut membantu
            </Link>
          </div>
        </section>

        {activeFilterCount > 0 ? (
          <div className="people-active-filters" aria-label="Filter aktif">
            <ul>
              {filters.q ? (
                <ActiveFilter label="Pencarian" value={filters.q} href={directoryHref({ q: null, halaman: null })} />
              ) : null}
              {filters.profession ? (
                <ActiveFilter label="Profesi" value={filters.profession} href={directoryHref({ profesi: null, halaman: null })} />
              ) : null}
              {filters.skill ? (
                <ActiveFilter label="Skill" value={filters.skill} href={directoryHref({ skill: null, halaman: null })} />
              ) : null}
              {filters.experience ? (
                <ActiveFilter
                  label="Pengalaman"
                  value={experienceBandLabel[filters.experience]}
                  href={directoryHref({ pengalaman: null, halaman: null })}
                />
              ) : null}
              {filters.field ? (
                <ActiveFilter label="Bidang" value={filters.field} href={directoryHref({ bidang: null, halaman: null })} />
              ) : null}
              {filters.involvement ? (
                <ActiveFilter
                  label="Keterlibatan"
                  value={filters.involvement === "building" ? "Sedang membangun" : "Ikut membantu"}
                  href={directoryHref({ kerja: null, halaman: null })}
                />
              ) : null}
            </ul>
            <Link href="/orang">Clear all</Link>
          </div>
        ) : null}

        <section className="people-results" aria-labelledby="people-results-heading" aria-live="polite">
          <div className="people-results-layout">
            <div className="people-results-main">
              <div className="people-results-head">
                <h2 id="people-results-heading">{matched.length} orang ditemukan</h2>
                {matched.length > 0 ? (
                  <p>
                    Menampilkan {pagination.from}–{pagination.to} dari {matched.length}
                  </p>
                ) : null}
              </div>

              {people.length === 0 ? (
                <div className="people-empty">
                  <span aria-hidden="true">⌕</span>
                  <h3>No matching people yet.</h3>
                  <p>Try a broader term or remove a filter to expand the results.</p>
                  <Link className="ghost-button" href="/orang">View all people</Link>
                </div>
              ) : (
                <ul className="people-list">
                  {people.map((entry) => (
                    <PersonRow key={entry.person.id} entry={entry} />
                  ))}
                </ul>
              )}

              {pageCount > 1 ? (
                <nav className="people-pagination" aria-label="Halaman hasil pencarian">
                  {page > 1 ? (
                    <Link className="pagination-direction" href={directoryHref({ halaman: page - 1 })} rel="prev">
                      ← Sebelumnya
                    </Link>
                  ) : (
                    <span className="pagination-direction is-disabled">← Sebelumnya</span>
                  )}
                  <div>
                    {paginationItems(page, pageCount).map((item) =>
                      typeof item === "number" ? (
                        <Link
                          key={item}
                          className={item === page ? "is-active" : ""}
                          aria-current={item === page ? "page" : undefined}
                          aria-label={`Halaman ${item}`}
                          href={directoryHref({ halaman: item })}
                        >
                          {item}
                        </Link>
                      ) : (
                        <span key={item} aria-hidden="true">…</span>
                      ),
                    )}
                  </div>
                  {page < pageCount ? (
                    <Link className="pagination-direction" href={directoryHref({ halaman: page + 1 })} rel="next">
                      Berikutnya →
                    </Link>
                  ) : (
                    <span className="pagination-direction is-disabled">Next →</span>
                  )}
                </nav>
              ) : null}
            </div>

            <ContributorRail people={topContributors} />
          </div>
        </section>
    </>
  );
}

/** The frame of the results, drawn while the real ones are on their way. */
function DirectorySkeleton() {
  return (
    <>
      <LoadingNote />
      <section className="people-search-panel">
        <Skeleton height={52} style={{ marginBottom: 12 }} />
        <Skeleton height={44} />
      </section>
      <section className="people-results">
        <div className="people-results-layout">
          <div className="people-results-main">
            <Skeleton height={24} width={220} style={{ marginBottom: 16 }} />
            {[0, 1, 2, 3, 4].map((slot) => (
              <Skeleton key={slot} height={168} style={{ marginTop: 12 }} />
            ))}
          </div>
          <aside className="people-contributor-rail">
            <Skeleton height={320} />
          </aside>
        </div>
      </section>
    </>
  );
}

function PersonRow({ entry }: { entry: PersonAtWork }) {
  const { person, building, helping } = entry;
  const profession = primaryProfession(entry);
  const evidence = [
    ...building.map((project) => ({ project, label: "Building" })),
    ...helping.map((project) => ({ project, label: "Helping" })),
  ].slice(0, 2);
  const headline = person.headline.trim() !== profession.trim() ? person.headline : "";

  return (
    <li>
      <article className="people-row">
        <Link className="people-row-avatar" href={`/u/${person.username}`} aria-label={`${person.name}'s profile`}>
          <span className="people-avatar" aria-hidden="true">{initials(person.name)}</span>
        </Link>

        <div className="people-row-body">
          <header className="people-row-heading">
            <Link href={`/u/${person.username}`}>{person.name}</Link>
            <span>·</span>
            <small>@{person.username}</small>
          </header>
          <p className={profession ? "people-profession" : "people-profession is-empty"}>
            {profession || "Profession not added"}
          </p>
          {headline ? <p className="people-headline">{headline}</p> : null}

          <ul className="people-meta">
            {person.yearsExperience !== null ? <li>{person.yearsExperience} th pengalaman</li> : null}
            {person.fields.slice(0, 2).map((field) => <li key={field}>{field}</li>)}
            {building.length > 0 ? <li>{building.length} projects built</li> : null}
            {helping.length > 0 ? <li>{helping.length} kontribusi</li> : null}
          </ul>

          {person.skills.length > 0 ? (
            <ul className="people-skills" aria-label={`Skill ${person.name}`}>
              {person.skills.slice(0, 4).map((skill) => (
                <li key={skill}><Link href={`/orang?skill=${encodeURIComponent(skill)}`}>{skill}</Link></li>
              ))}
              {person.skills.length > 4 ? <li className="people-more">+{person.skills.length - 4}</li> : null}
            </ul>
          ) : null}

          <div className="people-proof">
            <strong>Proof of work</strong>
            {evidence.length > 0 ? (
              <ul>
                {evidence.map(({ project, label }) => (
                  <li key={`${label}-${project.id}`}>
                    <span>{label}</span>
                    <Link href={`/projects/${project.slug}`}>{project.title}</Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="people-no-proof">No public projects shown yet.</p>
            )}
          </div>
        </div>

        <div className="people-row-action">
          <Link href={`/u/${person.username}`}>
            View profile <span aria-hidden="true">→</span>
          </Link>
        </div>
      </article>
    </li>
  );
}

function ContributorRail({ people }: { people: PersonAtWork[] }) {
  return (
    <aside className="people-contributor-rail" aria-labelledby="contributors-heading">
      <div className="people-contributor-card">
        <p className="section-label">Contributors</p>
        <h2 id="contributors-heading">Most active contributors</h2>
        <p className="people-contributor-note">
          Diurutkan dari jumlah project berbeda yang pernah dibantu.
        </p>

        {people.length > 0 ? (
          <ol>
            {people.map((entry, index) => (
              <li key={entry.person.id}>
                <span className="people-contributor-rank">{String(index + 1).padStart(2, "0")}</span>
                <Link className="people-contributor-person" href={`/u/${entry.person.username}`}>
                  <span className="people-mini-avatar" aria-hidden="true">{initials(entry.person.name)}</span>
                  <span>
                    <strong>{entry.person.name}</strong>
                    <small>{primaryProfession(entry) || `@${entry.person.username}`}</small>
                  </span>
                </Link>
                <strong className="people-contributor-count">{entry.helping.length}</strong>
              </li>
            ))}
          </ol>
        ) : (
          <p className="people-contributor-empty">No cross-project contributions recorded yet.</p>
        )}

        <Link className="people-contributor-all" href="/orang?kerja=helping">
          Lihat semua kontributor <span aria-hidden="true">→</span>
        </Link>
      </div>
    </aside>
  );
}

function FilterSelect({
  name,
  label,
  value,
  children,
}: {
  name: string;
  label: string;
  value: string;
  children: React.ReactNode;
}) {
  return (
    <label>
      <span>{label}</span>
      <select name={name} defaultValue={value}>{children}</select>
    </label>
  );
}

function ActiveFilter({ label, value, href }: { label: string; value: string; href: string }) {
  return (
    <li>
      <Link href={href} aria-label={`Hapus filter ${label}: ${value}`}>
        <small>{label}</small> {value} <span aria-hidden="true">×</span>
      </Link>
    </li>
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

function paginationItems(current: number, total: number): (number | string)[] {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);

  const pages = [...new Set([1, current - 1, current, current + 1, total])]
    .filter((value) => value >= 1 && value <= total)
    .sort((a, b) => a - b);
  const result: (number | string)[] = [];
  for (const value of pages) {
    const previous = result.at(-1);
    if (typeof previous === "number" && value - previous > 1) result.push(`gap-${previous}`);
    result.push(value);
  }
  return result;
}

function one(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value ?? "").trim();
}

function hasFacet(facets: { value: string }[], value: string): boolean {
  return facets.some((facet) => facet.value.localeCompare(value, "id", { sensitivity: "base" }) === 0);
}
