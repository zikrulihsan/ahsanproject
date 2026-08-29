import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { defaultShareImage, siteUrl } from "./content";
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
// projects) get their own card image, everything else shares the generated root card.
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Ahsan Project", template: "%s" },
  openGraph: {
    siteName: "Ahsan Project",
    type: "website",
    locale: "en_US",
    images: [defaultShareImage],
  },
  twitter: { card: "summary_large_image", images: [defaultShareImage.url] },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32", type: "image/x-icon" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>{children}</body>
    </html>
  );
}
