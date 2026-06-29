import type { NextConfig } from "next";

if (
  process.env.LERNIO_DEMO_MODE === 'true' &&
  process.env.VERCEL_ENV === 'production'
) {
  throw new Error('LERNIO_DEMO_MODE must never be enabled for a production build.')
}

const storageOrigin = safeOrigin(process.env.STORAGE_PUBLIC_BASE_URL)
const isProduction = process.env.NODE_ENV === 'production'

function safeOrigin(value: string | undefined) {
  if (!value) return null
  try {
    return new URL(value).origin
  } catch {
    return null
  }
}

function contentSecurityPolicy() {
  const imageSources = ["'self'", 'data:', 'blob:', 'https://i.ytimg.com']
  const connectSources = ["'self'"]
  const mediaSources = ["'self'"]
  if (storageOrigin) {
    imageSources.push(storageOrigin)
    connectSources.push(storageOrigin)
    mediaSources.push(storageOrigin)
  }

  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${isProduction ? '' : " 'unsafe-eval'"} https://www.youtube.com`,
    "style-src 'self' 'unsafe-inline'",
    `img-src ${imageSources.join(' ')}`,
    "font-src 'self' data:",
    `connect-src ${connectSources.join(' ')}`,
    `media-src ${mediaSources.join(' ')}`,
    "frame-src https://www.youtube-nocookie.com https://www.youtube.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(isProduction ? ['upgrade-insecure-requests'] : []),
  ].join('; ')
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
