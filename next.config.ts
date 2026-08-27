import type { NextConfig } from "next";

// Every route reads request identity or the database, so there is no static
// export target — the site needs a server. Netlify runs it through
// `@netlify/plugin-nextjs`; Cloudflare runs it as a Worker built by
// `@opennextjs/cloudflare` (see `open-next.config.ts` and `wrangler.jsonc`).
const nextConfig: NextConfig = {
  // Set here rather than in a host's config file so both deploy targets — and
  // `next start` locally — send the same headers.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};

export default nextConfig;
