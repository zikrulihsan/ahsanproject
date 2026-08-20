import type { NextConfig } from "next";

// Every route reads request identity or the database, so there is no static
// export target any more — the site is served by the Cloudflare Worker in
// `worker/index.ts`.
const nextConfig: NextConfig = {};

export default nextConfig;
