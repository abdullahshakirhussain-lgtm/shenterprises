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
