import { headers } from "next/headers";

/**
 * Absolute origin for links that leave the app and come back — the address in a
 * confirmation email, for instance. `NEXT_PUBLIC_SITE_URL` wins when it is set;
 * otherwise the current request is asked.
 */
export async function siteOrigin(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");

  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const proto = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");

  return `${proto}://${host}`;
}
