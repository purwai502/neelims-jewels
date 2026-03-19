import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: false,
  images: {
    remotePatterns: [
      { protocol: "http",  hostname: "localhost" },
      { protocol: "https", hostname: "*.railway.app" },
    ],
  },
};

export default nextConfig;