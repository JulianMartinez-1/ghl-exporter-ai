import type { NextConfig } from "next";
import type { Configuration } from "webpack";

const NODE_BROWSER_FALLBACKS: Record<string, false> = {
  net: false,
  tls: false,
  dns: false,
  fs: false,
  child_process: false,
  readline: false,
};

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.gohighlevel.com" },
      { protocol: "https", hostname: "**.leadconnectorhq.com" },
      { protocol: "https", hostname: "storage.googleapis.com" },
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
  serverExternalPackages: [
    "playwright",
    "playwright-extra",
    "puppeteer-extra-plugin-stealth",
    "puppeteer-extra",
    "sharp",
    "bullmq",
    "ioredis",
    "winston",
    "@prisma/client",
    "prisma",
  ],
  experimental: {
    optimizePackageImports: ["framer-motion", "lucide-react"],
    turbopack: {
      resolveAlias: NODE_BROWSER_FALLBACKS,
    },
  },
  // webpack fallbacks preserved for `next build` (production uses webpack, not Turbopack)
  webpack(config: Configuration, { isServer }: { isServer: boolean }) {
    if (!isServer) {
      config.resolve = {
        ...config.resolve,
        fallback: {
          ...((config.resolve as { fallback?: Record<string, false> }).fallback ?? {}),
          ...NODE_BROWSER_FALLBACKS,
        },
      };
    }
    return config;
  },
};

export default nextConfig;
