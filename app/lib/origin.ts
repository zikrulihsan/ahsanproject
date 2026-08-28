import { headers } from "next/headers";

/**
 * Absolute origin for a round trip that leaves the app and comes back — the
 * OAuth callback, the address in a confirmation email, the password reset link.
 *
 * **The request's own origin wins, and that is the whole point.** Every one of
 * these journeys leaves a cookie behind on the origin it started from and needs
 * to find it again on the way back. Sign-in on `ahsanproject.id` writes the
 * PKCE code verifier there; if the callback is sent to a second name for the
 * same site, `exchangeCodeForSession` looks for that verifier on an origin that
 * never had it, and the login dies with nothing to show for itself. A site with
 * more than one name — a custom domain and the deploy URL behind it — cannot
 * have one of them pinned into every link.
 *
 * `NEXT_PUBLIC_SITE_URL` stays as the fallback for when there is no request to
 * ask. Canonical and Open Graph URLs do not come through here; those are
 * `siteUrl` in `app/content.ts`, which should stay pinned.
 *
 * The forwarded host comes from outside, but it cannot send anybody anywhere
 * new: Supabase refuses a `redirectTo` that is not on its allow list, so that
 * list is the guard, not this header. Every origin people actually use has to
 * be on it — see the README.
 */
export async function siteOrigin(): Promise<string> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");

  if (host) {
    const proto = requestHeaders.get("x-forwarded-proto") ?? (isLocal(host) ? "http" : "https");
    return `${proto}://${host}`;
  }

  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");

  return "http://localhost:3000";
}

function isLocal(host: string): boolean {
  return host.startsWith("localhost") || host.startsWith("127.0.0.1");
}
