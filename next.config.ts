import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Build must fail on TypeScript errors — never ignore them.
  reactStrictMode: true,
  allowedDevOrigins: ['127.0.0.1'],
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion', 'recharts', 'date-fns'],
  },
  async headers() {
    return [
      {
        source: '/:path*.:ext',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=604800',
          },
        ],
      },
    ]
  },
  turbopack: {
    root: process.cwd(),
  },
  devIndicators: false,
};

export default nextConfig;
