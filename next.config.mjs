/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" }
    ]
  },
  experimental: {
    serverActions: { bodySizeLimit: "10mb" },
    // Keep dynamic pages in the client-side router cache for 30s,
    // static pages for 5 min. Makes browser back/forward instant.
    staleTimes: {
      dynamic: 30,
      static: 300,
    },
  },
  // Strong HTTP caching for uploaded files — they're immutable once written
  async headers() {
    return [
      {
        source: "/uploads/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};
export default nextConfig;
