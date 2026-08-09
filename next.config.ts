import type { NextConfig } from "next";
import type { Configuration } from "webpack";

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
  },
  webpack(config: Configuration, { isServer }: { isServer: boolean }) {
    if (!isServer) {
      config.resolve = {
        ...config.resolve,
        fallback: {
          ...((config.resolve as { fallback?: Record<string, false> }).fallback ?? {}),
          net: false,
          tls: false,
          dns: false,
          fs: false,
          child_process: false,
          readline: false,
        },
      };
    }
    return config;
  },
};

export default nextConfig;
