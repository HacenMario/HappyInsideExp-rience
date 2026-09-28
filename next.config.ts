import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    // Lint is run separately (npm run lint) — never block cloud builds on it.
    ignoreDuringBuilds: true,
  },
  reactStrictMode: false,
  poweredByHeader: false,
};

export default nextConfig;
