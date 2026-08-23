import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "../components/shell";
import { initials } from "../components/pieces";
import { listPeopleAtWork } from "../lib/data";
import { shareCard } from "../content";

export const dynamic = "force-dynamic";

const title = "Orang — Ahsan Project";
const description =
  "Siapa saja yang sedang membangun sesuatu di Ahsan Project, dan project apa yang mereka bantu.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/orang" },
  openGraph: shareCard({ title, description, url: "/orang" }),
};

export default async function PeoplePage() {
  const people = await listPeopleAtWork();

  return (
    <>
      <SiteHeader returnTo="/orang" active="orang" />

      <main id="main-content" className="page-narrow">
        <p className="eyebrow">
          <span /> Orang
        </p>
        <h1>Yang sedang berkarya di sini.</h1>
        <p className="lede">
          Bukan daftar CV. Yang menerangkan seseorang di sini adalah project yang dia bangun dan
          yang dia bantu — dan keduanya bisa dibuka dan dicek.
        </p>

        {people.length === 0 ? (
          <p className="muted">Belum ada orang di sini.</p>
        ) : (
          <ul className="people-index">
            {people.map(({ person, building, helping }) => (
              <li key={person.id}>
                <div className="person-head">
                  <Link href={`/u/${person.username}`}>
                    <span className="avatar" aria-hidden="true">
                      {initials(person.name)}
                    </span>
                    <span className="person-text">
                      <strong>{person.name}</strong>
                      {person.headline ? <small>{person.headline}</small> : null}
                    </span>
                  </Link>
                  <Link className="person-open" href={`/u/${person.username}`}>
                    Lihat profil
                  </Link>
                </div>

                {building.length > 0 || helping.length > 0 ? (
                  <dl className="person-work">
                    {building.length > 0 ? (
                      <>
                        <dt>Sedang mengerjakan</dt>
                        <dd>
                          <WorkList
                            projects={building.map((project) => ({
                              slug: project.slug,
                              title: project.title,
                            }))}
                          />
                        </dd>
                      </>
                    ) : null}
                    {helping.length > 0 ? (
                      <>
                        <dt>Ikut membantu</dt>
                        <dd>
                          <WorkList
                            projects={helping.map((project) => ({
                              slug: project.slug,
                              title: project.title,
                            }))}
                          />
                        </dd>
                      </>
                    ) : null}
                  </dl>
                ) : (
                  <p className="muted person-work-empty">Belum menunjukkan project apa pun.</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </main>

      <SiteFooter />
    </>
  );
}

function WorkList({ projects }: { projects: { slug: string; title: string }[] }) {
  return (
    <ul className="work-list">
      {projects.slice(0, 4).map((project) => (
        <li key={project.slug}>
          <Link href={`/projects/${project.slug}`}>{project.title}</Link>
        </li>
      ))}
      {projects.length > 4 ? <li className="muted">+{projects.length - 4} lagi</li> : null}
    </ul>
  );
}
