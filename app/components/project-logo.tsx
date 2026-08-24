"use client";

import { useState } from "react";
import { faviconUrl } from "../lib/urls";

type ProjectLogoProps = {
  title: string;
  website: string;
  className?: string;
  fallback?: string;
};

/**
 * A project's own visual identity when it has one, with initials as the safe
 * fallback for ideas that do not have a website yet (or a favicon that fails
 * to load).
 */
export function ProjectLogo({
  title,
  website,
  className = "home-project-logo",
  fallback,
}: ProjectLogoProps) {
  const src = faviconUrl(website);
  const [failedSrc, setFailedSrc] = useState("");

  return (
    <span className={className} aria-hidden="true">
      {src && failedSrc !== src ? (
        // A regular image is intentional here: the URL is generated at runtime
        // from the project's domain and is not part of Next Image's static host list.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" onError={() => setFailedSrc(src)} />
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
