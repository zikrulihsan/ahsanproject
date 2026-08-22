import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "../components/shell";
import { initials } from "../components/pieces";
import { listPeople, listProjects } from "../lib/data";
import { shareCard } from "../content";

export const dynamic = "force-dynamic";

const title = "Orang — Ahsan Project";
const description =
  "Siapa saja yang menaruh ide dan ikut menggarapnya di Ahsan Project. Tiap profil sekaligus portofolionya.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/orang" },
  openGraph: shareCard({ title, description, url: "/orang" }),
};

export default async function PeoplePage() {
  const [people, projects] = await Promise.all([listPeople(), listProjects()]);

  // One pass over the board rather than a portfolio query each: this page only
  // needs the counts, and a directory should not cost N round trips.
  const ownedCount = new Map<string, number>();
  for (const project of projects) {
    ownedCount.set(project.owner.id, (ownedCount.get(project.owner.id) ?? 0) + 1);
  }

  return (
    <>
      <SiteHeader returnTo="/orang" />

      <main className="page-narrow">
        <p className="eyebrow">
          <span /> Orang
        </p>
        <h1>Yang mengerjakan.</h1>
        <p className="lede">
          Tiap profil di sini sekaligus portofolionya: proyek yang ditaruh, peran yang dijalani, dan
          jejak yang ditulis sistem saat kejadiannya.
        </p>

        {people.length === 0 ? (
          <p className="muted">Belum ada orang di sini.</p>
        ) : (
          <ul className="people-list">
            {people.map((person) => {
              const owned = ownedCount.get(person.id) ?? 0;

              return (
                <li key={person.id}>
                  <Link href={`/u/${person.username}`}>
                    <span className="avatar" aria-hidden="true">
                      {initials(person.name)}
                    </span>
                    <span className="person-text">
                      <strong>{person.name}</strong>
                      {person.headline ? <small>{person.headline}</small> : null}
                    </span>
                  </Link>
                  <span className="person-count">
                    {owned > 0 ? `${owned} proyek` : "Belum menaruh proyek"}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </main>

      <SiteFooter />
    </>
  );
}
