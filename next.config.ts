import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      { hostname: "**.convex.cloud", protocol: "https" },
      { hostname: "**.convex.site", protocol: "https" },
    ],
  },
};

export default nextConfig;
