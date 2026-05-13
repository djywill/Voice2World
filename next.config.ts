import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.blockadelabs.com",
      },
    ],
  },
};

export default nextConfig;
