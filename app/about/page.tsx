import type { Metadata } from "next";
import { AboutPage } from "../components/about-page";
import { about, aboutPaths, shareCard } from "../content";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: about.id.title,
  description: about.id.description,
  alternates: {
    canonical: aboutPaths.id,
    languages: { id: aboutPaths.id, en: aboutPaths.en, "x-default": aboutPaths.id },
  },
  openGraph: shareCard({
    title: about.id.title,
    description: about.id.description,
    url: aboutPaths.id,
  }),
};

export default function IndonesianAbout() {
  return <AboutPage lang="id" />;
}
