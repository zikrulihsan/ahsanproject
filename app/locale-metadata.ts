import type { Metadata } from "next";
import { meta, paths, siteUrl, type Lang } from "./content";

const ogLocale: Record<Lang, string> = { id: "id_ID", en: "en_US" };

/** Per-language title, description and hreflang wiring. Shared bits live in layout.tsx. */
export function localeMetadata(lang: Lang): Metadata {
  const { title, description, ogDescription } = meta[lang];

  return {
    title,
    description,
    alternates: {
      canonical: paths[lang],
      languages: { id: paths.id, en: paths.en, "x-default": paths.id },
    },
    openGraph: {
      title,
      description: ogDescription,
      type: "website",
      locale: ogLocale[lang],
      url: new URL(paths[lang], siteUrl).toString(),
      images: [{ url: "/og.png", width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: ogDescription,
      images: ["/og.png"],
    },
  };
}
