import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { siteUrl } from "./content";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = { themeColor: "#f8f6f0" };

// Each page sets its own title, description and canonical. The share metadata
// here is the fallback: pages with an opengraph-image file (profiles,
// projects) get their own card image, everything else shares og.png.
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Ahsan Project", template: "%s" },
  openGraph: {
    siteName: "Ahsan Project",
    type: "website",
    locale: "id_ID",
    images: [{ url: "/og.png", width: 1731, height: 909 }],
  },
  twitter: { card: "summary_large_image" },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Indonesian is the document default; the English story page sets lang="en"
  // on its own <main>, since only the root layout may render <html>.
  return (
    <html lang="id">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>{children}</body>
    </html>
  );
}
