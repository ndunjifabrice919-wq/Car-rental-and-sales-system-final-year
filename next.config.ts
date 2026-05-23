import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ── Image optimisation ────────────────────────────────────────────────
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "hjyvbyirlbjfdawwcvfj.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/**",
      },
    ],
    // Serve modern formats (WebP / AVIF) automatically
    formats: ["image/avif", "image/webp"],
    // Aggressive caching: 1 year
    minimumCacheTTL: 31536000,
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // ── Turbopack (Next.js 16 default) ───────────────────────────────────
  turbopack: {},

  // ── Compression & security ───────────────────────────────────────────
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,

  // ── Cache headers for static assets ──────────────────────────────────
  async headers() {
    return [
      {
        source: "/_next/static/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};

export default nextConfig;
