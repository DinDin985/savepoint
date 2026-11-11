import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // libSQL ships native bindings for local `file:` databases — keep it out of the bundle.
  serverExternalPackages: ["@libsql/client", "libsql"],
  images: {
    // Steam / Wikimedia / Epic CDNs already serve optimized images.
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "**.steamstatic.com" },
      { protocol: "https", hostname: "**.akamaihd.net" },
      { protocol: "https", hostname: "upload.wikimedia.org" },
      { protocol: "https", hostname: "**.epicgames.com" },
      { protocol: "https", hostname: "avatars.steamstatic.com" },
      { protocol: "https", hostname: "i.ytimg.com" },
    ],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
