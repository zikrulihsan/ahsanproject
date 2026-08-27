import { defineCloudflareConfig } from "@opennextjs/cloudflare";

/**
 * Adapts the Next.js build for Cloudflare Workers.
 *
 * Every route is `force-dynamic` and reads the visitor's session or Supabase,
 * so nothing is ever served from an incremental cache. The defaults — a dummy
 * cache, tag cache and revalidation queue — are what that shape wants: no R2
 * bucket, no KV namespace, no self-referencing service binding to maintain.
 * Add `incrementalCache` here the day a route starts caching.
 */
export default defineCloudflareConfig();
