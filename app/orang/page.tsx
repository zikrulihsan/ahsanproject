import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "../components/shell";
import { initials } from "../components/pieces";
import { listPeopleAtWork, type PersonAtWork } from "../lib/data";
import {
  EXPERIENCE_BANDS,
  experienceBandLabel,
  filterAndRankPeople,
  isExperienceBand,
  peopleFacets,
  peoplePage,
  primaryProfession,
  type PeopleFilters,
} from "../lib/people";
import { shareCard } from "../content";

export const dynamic = "force-dynamic";

const title = "Orang — Ahsan Project";
const description =
  "Cari orang berdasarkan profesi, skill, pengalaman, bidang, dan project yang mereka kerjakan di Ahsan Project.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/orang" },
  openGraph: shareCard({ title, description, url: "/orang" }),
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
type DirectoryParam = "q" | "profesi" | "skill" | "pengalaman" | "bidang" | "kerja" | "halaman";

export default async function PeoplePage({ searchParams }: { searchParams?: SearchParams }) {
  const query = (await searchParams) ?? {};
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
  const requestedPage = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const allPeople = await listPeopleAtWork(1000);
  const facets = peopleFacets(allPeople);
  const matched = filterAndRankPeople(allPeople, filters);
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

  const baseParams: Partial<Record<DirectoryParam, string>> = {
    q: filters.q,
    profesi: filters.profession,
    skill: filters.skill,
    pengalaman: filters.experience,
    bidang: filters.field,
    kerja: filters.involvement,
    halaman: page > 1 ? String(page) : "",
  };
  const directoryHref = (patch: Partial<Record<DirectoryParam, string | number | null>>) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(baseParams)) {
      if (value) params.set(key, value);
    }
    for (const [key, value] of Object.entries(patch)) {
      if (value === null || value === "" || value === 1) params.delete(key);
      else params.set(key, String(value));
    }
    const search = params.toString();
    return `/orang${search ? `?${search}` : ""}`;
  };

  const projectCount = new Set(
    allPeople.flatMap((entry) => [...entry.building, ...entry.helping].map((project) => project.id)),
  ).size;
  const topContributors = [...allPeople]
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
      <SiteHeader returnTo={returnTo} active="orang" />

      <main id="main-content" className="people-page">
        <section className="people-hero" aria-labelledby="people-heading">
          <div>
            <p className="eyebrow">
              <span /> Direktori talenta
            </p>
            <h1 id="people-heading">Cari orang, bukan sekadar profil.</h1>
            <p className="lede">
              Temukan orang dari profesi dan keahliannya, lalu cek project yang dia bangun atau bantu
              sebagai bukti kerja yang nyata.
            </p>
          </div>
          <dl className="people-overview" aria-label="Ringkasan direktori">
            <div>
              <dt>Orang</dt>
              <dd>{allPeople.length}</dd>
            </div>
            <div>
              <dt>Project terhubung</dt>
              <dd>{projectCount}</dd>
            </div>
          </dl>
        </section>

        <section className="people-search-panel" aria-label="Cari dan filter orang">
          <form action="/orang" method="get">
            {filters.involvement ? <input type="hidden" name="kerja" value={filters.involvement} /> : null}
            <div className="people-search-row">
              <label className="people-search-field">
                <span className="sr-only">Cari orang</span>
                <SearchIcon />
                <input
                  type="search"
                  name="q"
                  maxLength={100}
                  defaultValue={filters.q}
                  placeholder="Cari nama, profesi, skill, atau project…"
                />
              </label>
              <button type="submit">Cari orang</button>
            </div>

            <div className="people-filter-grid">
              <FilterSelect name="profesi" label="Profesi" value={filters.profession}>
                <option value="">Semua profesi</option>
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
                <option value="">Semua skill</option>
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
                <option value="">Semua pengalaman</option>
                {EXPERIENCE_BANDS.map((band) => (
                  <option key={band} value={band}>{experienceBandLabel[band]}</option>
                ))}
              </FilterSelect>

              <FilterSelect name="bidang" label="Bidang" value={filters.field}>
                <option value="">Semua bidang</option>
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
            <button className="people-filter-submit" type="submit">Terapkan filter</button>
          </form>

          <div className="people-work-filters" aria-label="Filter keterlibatan">
            <span>Lihat yang</span>
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
            <Link href="/orang">Hapus semua</Link>
          </div>
        ) : null}

        <section className="people-results" aria-labelledby="people-results-heading" aria-live="polite">
          <div className="people-results-layout">
            <div className="people-results-main">
              <div className="people-results-head">
                <div>
                  <p className="section-label">Hasil pencarian</p>
                  <h2 id="people-results-heading">{matched.length} orang ditemukan</h2>
                </div>
                {matched.length > 0 ? (
                  <p>
                    Menampilkan {pagination.from}–{pagination.to} dari {matched.length}
                  </p>
                ) : null}
              </div>

              {people.length === 0 ? (
                <div className="people-empty">
                  <span aria-hidden="true">⌕</span>
                  <h3>Belum ada orang yang cocok.</h3>
                  <p>Coba kata yang lebih umum atau lepaskan satu filter untuk memperluas hasil.</p>
                  <Link className="ghost-button" href="/orang">Lihat semua orang</Link>
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
                    <span className="pagination-direction is-disabled">Berikutnya →</span>
                  )}
                </nav>
              ) : null}
            </div>

            <ContributorRail people={topContributors} />
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}

function PersonRow({ entry }: { entry: PersonAtWork }) {
  const { person, building, helping } = entry;
  const profession = primaryProfession(entry);
  const evidence = [
    ...building.map((project) => ({ project, label: "Membangun" })),
    ...helping.map((project) => ({ project, label: "Membantu" })),
  ].slice(0, 2);
  const headline = person.headline.trim() !== profession.trim() ? person.headline : "";

  return (
    <li>
      <article className="people-row">
        <Link className="people-row-avatar" href={`/u/${person.username}`} aria-label={`Profil ${person.name}`}>
          <span className="people-avatar" aria-hidden="true">{initials(person.name)}</span>
        </Link>

        <div className="people-row-body">
          <header className="people-row-heading">
            <Link href={`/u/${person.username}`}>{person.name}</Link>
            <span>·</span>
            <small>@{person.username}</small>
          </header>
          <p className={profession ? "people-profession" : "people-profession is-empty"}>
            {profession || "Profesi belum diisi"}
          </p>
          {headline ? <p className="people-headline">{headline}</p> : null}

          <ul className="people-meta">
            {person.yearsExperience !== null ? <li>{person.yearsExperience} th pengalaman</li> : null}
            {person.fields.slice(0, 2).map((field) => <li key={field}>{field}</li>)}
            {building.length > 0 ? <li>{building.length} project dibangun</li> : null}
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
            <strong>Bukti kerja</strong>
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
              <p className="people-no-proof">Belum menunjukkan project publik.</p>
            )}
          </div>
        </div>

        <div className="people-row-action">
          <Link href={`/u/${person.username}`}>
            Lihat profil <span aria-hidden="true">→</span>
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
        <p className="section-label">Kontributor</p>
        <h2 id="contributors-heading">Paling banyak membantu</h2>
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
          <p className="people-contributor-empty">Belum ada kontribusi lintas project yang tercatat.</p>
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
