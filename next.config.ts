import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // output: 'export', // Removed to enable SSR/Edge Runtime
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
