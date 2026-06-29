import type { NextConfig } from "next";
import { buildContentSecurityPolicy } from "./src/lib/security/content-security-policy";

if (
  process.env.LERNIO_DEMO_MODE === 'true' &&
  process.env.VERCEL_ENV === 'production'
) {
  throw new Error('LERNIO_DEMO_MODE must never be enabled for a production build.')
}

const isProduction = process.env.NODE_ENV === 'production'

function contentSecurityPolicy() {
  return buildContentSecurityPolicy({
    allowUnsafeInlineScript: true,
    nodeEnv: process.env.NODE_ENV,
    storagePublicBaseUrl: process.env.STORAGE_PUBLIC_BASE_URL,
  })
}

const nextConfig: NextConfig = {
  // Build must fail on TypeScript errors — never ignore them.
  reactStrictMode: true,
  allowedDevOrigins: ['127.0.0.1'],
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion', 'recharts', 'date-fns'],
  },
  async headers() {
    const securityHeaders = [
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Content-Security-Policy', value: contentSecurityPolicy() },
      {
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(self), geolocation=(), payment=(), usb=()',
      },
      ...(isProduction
        ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }]
        : []),
    ]
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
      {
        source: '/:path(sign-in|sign-up|forgot-password|reset-password|complete-profile)',
        headers: [
          {
            key: 'X-Robots-Tag',
            value: 'noindex, nofollow',
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/brand/:path*',
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
