import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = "https://ahsanproject-id.netlify.app";
const title = "Ahsan Project — Ide kecil, dampak baik";
const description =
  "Kumpulan proyek digital buatan Zikrul Ihsan untuk membantu orang melakukan hal-hal baik.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title,
  description,
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  openGraph: {
    title,
    description: "Satu rumah untuk proyek-proyek digital yang berguna bagi sesama.",
    type: "website",
    locale: "id_ID",
    url: siteUrl,
    images: [{ url: "/og.png", width: 1200, height: 630, alt: title }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description: "Satu rumah untuk proyek-proyek digital yang berguna bagi sesama.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>{children}</body>
    </html>
  );
}
