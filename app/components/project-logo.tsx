"use client";

import { useState } from "react";
import { faviconUrl, publicImageUrl } from "../lib/urls";

type ProjectLogoProps = {
  title: string;
  website: string;
  logoUrl?: string;
  className?: string;
  fallback?: string;
};

/**
 * A project's own visual identity when it has one, with initials as the safe
 * fallback for ideas that do not have a website yet (or a favicon that fails
 * to load).
 */
export function ProjectLogo({ title, website, logoUrl, className = "", fallback }: ProjectLogoProps) {
  const sources = [...new Set([publicImageUrl(logoUrl), faviconUrl(website)].filter(Boolean))];
  const [failedSources, setFailedSources] = useState<string[]>([]);
  const src = sources.find((candidate) => !failedSources.includes(candidate)) ?? "";

  return (
    <span className={`home-project-logo ${className}`.trim()} aria-hidden="true">
      {src ? (
        // A regular image is intentional here: the URL is generated at runtime
        // from the project's domain and is not part of Next Image's static host list.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" onError={() => setFailedSources((failed) => [...failed, src])} />
      ) : (
        <span className="home-project-initials">{fallback || initials(title)}</span>
      )}
    </span>
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
