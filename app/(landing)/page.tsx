import type { Metadata } from "next";
import { homeMeta, shareCard } from "../content";
import { Landing } from "../components/landing";
import { listPeople, listProjects } from "../lib/data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: homeMeta.title,
  description: homeMeta.description,
  alternates: { canonical: "/" },
  openGraph: shareCard({
    title: homeMeta.title,
    description: homeMeta.description,
    url: "/",
  }),
};

/**
 * The front door: what this place is, for somebody who has never seen it.
 *
 * Only guests get this far. `middleware.ts` sends a signed-in visitor to the
 * board, and hands any `/?…` address on to it with its filters — both before
 * this page renders, so neither is a soft bounce.
 *
 * The projects are sorted by how badly they need people, because the point the
 * page is making is that there is somewhere to help right now.
 */
export default async function Home() {
  const [projects, people] = await Promise.all([
    listProjects({ sort: "dibutuhkan" }),
    listPeople(60),
  ]);

  return <Landing projects={projects} peopleCount={people.length} />;
}
