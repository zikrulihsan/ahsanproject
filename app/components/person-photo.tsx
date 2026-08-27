"use client";

import { useState } from "react";
import { publicImageUrl } from "../lib/urls";

type PersonPhotoProps = {
  name: string;
  photoUrl?: string;
  /** The avatar class that already sizes and shapes this spot on the page. */
  className?: string;
};

/**
 * Somebody's face where the site has one — the picture their login handed
 * over, or the URL they typed in — and their initials where it does not.
 *
 * A photo that fails to load falls back to the initials as well, so a picture
 * the person deleted somewhere else leaves a name behind, not a broken image.
 */
export function PersonPhoto({ name, photoUrl, className = "" }: PersonPhotoProps) {
  const src = publicImageUrl(photoUrl);
  const [failed, setFailed] = useState(false);
  const showPhoto = Boolean(src) && !failed;

  return (
    <span className={`person-photo ${className}`.trim()} aria-hidden="true">
      {showPhoto ? (
        // A regular image is intentional here: the URL comes from a login
        // provider or from what somebody typed, so it cannot be part of Next
        // Image's static host list.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" onError={() => setFailed(true)} />
      ) : (
        initials(name)
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
