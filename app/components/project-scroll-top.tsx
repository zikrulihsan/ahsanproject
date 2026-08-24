"use client";

import { useLayoutEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * A destination page is a new reading context, so it starts at its top before
 * the browser paints it. Mount this in loading.tsx too when the reset should
 * happen as soon as navigation begins rather than after server data arrives.
 */
export function PageScrollTop() {
  const pathname = usePathname();

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

/** Kept as the project-page API while other destination pages share the behavior. */
export function ProjectScrollTop() {
  return <PageScrollTop />;
}
