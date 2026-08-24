"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * A project detail is a new reading context, so it always starts at its top.
 * This lives on the destination page instead of the board so browser Back can
 * still restore the visitor's old position in the project list.
 */
export function ProjectScrollTop() {
  const pathname = usePathname();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
