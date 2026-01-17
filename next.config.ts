import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  // Security Headers are handled by Cloudflare Pages _headers or configuration,
  // BUT Next.js local dev server needs this. 
  // NOTE: 'output: export' does not support headers() in next.config.js for production builds usually.
  // We need to create a `public/_headers` file for Cloudflare Pages instead.
};

export default nextConfig;
