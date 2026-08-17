import type { Metadata } from "next";
import { Site } from "./site";
import { localeMetadata } from "./locale-metadata";

export const metadata: Metadata = localeMetadata("id");

export default function Home() {
  return <Site lang="id" />;
}
