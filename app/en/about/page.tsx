import type { Metadata } from "next";
import { AboutPage } from "../../components/about-page";
import { about, aboutPaths } from "../../content";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: about.en.title,
  description: about.en.description,
  alternates: {
    canonical: aboutPaths.en,
    languages: { id: aboutPaths.id, en: aboutPaths.en, "x-default": aboutPaths.id },
  },
};

export default function EnglishAbout() {
  return <AboutPage lang="en" />;
}
