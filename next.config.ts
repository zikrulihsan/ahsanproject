import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: process.env.NETLIFY ? "export" : undefined,
};

export default nextConfig;
