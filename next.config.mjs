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
};
export default nextConfig;
