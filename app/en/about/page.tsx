import type { Metadata } from "next";
import { AboutPage } from "../../components/about-page";
import { about, aboutPaths, shareCard } from "../../content";

export const metadata: Metadata = {
  title: about.en.title,
  description: about.en.description,
  alternates: {
    canonical: aboutPaths.en,
    languages: { id: aboutPaths.id, en: aboutPaths.en, "x-default": aboutPaths.id },
  },
  openGraph: shareCard({
    title: about.en.title,
    description: about.en.description,
    url: aboutPaths.en,
    locale: "en_US",
  }),
};

export default function EnglishAbout() {
  return <AboutPage lang="en" />;
}
