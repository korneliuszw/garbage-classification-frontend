import type { NextConfig } from "next";

const apiUrl = process.env.RECOGNITION_URL;

const nextConfig: NextConfig = {
  /* config options here */
  async rewrites() {
    return [
      {
        source: "/api/recognize",
        destination: `${apiUrl}/recognize`
      }
    ]
  },
  output: 'standalone'
};

export default nextConfig;
