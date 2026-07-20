/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // R2 / any https host is allowed; local /uploads paths need no pattern.
    remotePatterns: [
      { protocol: "https", hostname: "**" }
    ],
    // Serve modern formats — much smaller than JPEG/PNG for the same quality.
    formats: ["image/avif", "image/webp"],
    // Small widths our thumbnails actually use (keeps the optimizer cache lean).
    imageSizes: [48, 64, 96, 128, 180, 240, 300],
    deviceSizes: [360, 480, 640, 828, 1080, 1200],
    // Optimized variants are immutable once generated — cache them for a year.
    minimumCacheTTL: 31536000,
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
  // Note: per-file Cache-Control headers are set inside the /uploads/[...path]
  // route handler so 404s aren't cached as immutable (which previously caused
  // failed image loads to stick across reloads).
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Stop the site being framed by other origins (clickjacking)
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          // Stop MIME-sniffing of responses
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Don't leak full URLs to third-party sites
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Lock down powerful browser features we don't use
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};
export default nextConfig;
