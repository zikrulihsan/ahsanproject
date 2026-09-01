"use client";

import NextLink, { useLinkStatus, type LinkProps } from "next/link";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { useLanguage } from "./language-provider";

type Props = LinkProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps> & {
    children: ReactNode;
  };

/**
 * The app's internal link, with feedback for the short gap before a route's
 * loading boundary takes over.
 *
 * Next already prefetches these destinations. `useLinkStatus` covers the case
 * where that prefetch is not ready yet (cold route, slow network, or a fresh
 * dynamic URL), so a click never looks ignored while the current page remains
 * on screen.
 */
export default function ResponsiveLink({ children, ...props }: Props) {
  return (
    <NextLink {...props}>
      {children}
      <PendingRouteHint />
    </NextLink>
  );
}

function PendingRouteHint() {
  const { pending } = useLinkStatus();
  const { tx } = useLanguage();

  return (
    <span
      className={`route-pending-indicator ${pending ? "is-pending" : ""}`}
      aria-hidden={!pending}
    >
      {pending ? (
        <span className="sr-only" role="status" aria-live="polite">
          {tx("Memuat halaman…", "Loading page…")}
        </span>
      ) : null}
    </span>
  );
}
