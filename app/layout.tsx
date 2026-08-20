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

export const viewport: Viewport = { themeColor: "#f3f0e8" };

// Each page sets its own title, description and canonical.
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Ahsan Project", template: "%s" },
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
