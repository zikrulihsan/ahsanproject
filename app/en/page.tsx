import type { Metadata } from "next";
import { Site } from "../site";
import { localeMetadata } from "../locale-metadata";

export const metadata: Metadata = localeMetadata("en");

export default function EnglishHome() {
  return <Site lang="en" />;
}
