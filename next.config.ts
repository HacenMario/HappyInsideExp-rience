import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  // Note: the old `eslint: { ignoreDuringBuilds: true }` key was removed —
  // Next.js 16 no longer recognizes it (build warning) and no longer runs
  // ESLint during builds at all. Lint separately with `npm run lint`.
  reactStrictMode: false,
  poweredByHeader: false,
};

export default nextConfig;
