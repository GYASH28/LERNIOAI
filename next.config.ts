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
    allowUnsafeInlineScript: false,
    nodeEnv: process.env.NODE_ENV,
    storagePublicBaseUrl: process.env.STORAGE_PUBLIC_BASE_URL,
  })
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ['127.0.0.1'],
  experimental: {
    // Audit fix #24 (CVSS 2.5): expanded from 4 libs to cover all heavy barrel-import
    // packages. Each omitted lib was adding 3-8 KB to chunks that use only one symbol.
    optimizePackageImports: [
      'lucide-react',
      'framer-motion',
      'recharts',
      'date-fns',
      'react-markdown',
      'react-hook-form',
      'react-day-picker',
      'cmdk',
      'sonner',
      'vaul',
      'embla-carousel-react',
      'input-otp',
      '@radix-ui/react-accordion',
      '@radix-ui/react-alert-dialog',
      '@radix-ui/react-aspect-ratio',
      '@radix-ui/react-avatar',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-collapsible',
      '@radix-ui/react-context-menu',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-hover-card',
      '@radix-ui/react-label',
      '@radix-ui/react-menubar',
      '@radix-ui/react-navigation-menu',
      '@radix-ui/react-popover',
      '@radix-ui/react-progress',
      '@radix-ui/react-radio-group',
      '@radix-ui/react-scroll-area',
      '@radix-ui/react-select',
      '@radix-ui/react-separator',
      '@radix-ui/react-slider',
      '@radix-ui/react-slot',
      '@radix-ui/react-switch',
      '@radix-ui/react-tabs',
      '@radix-ui/react-toggle',
      '@radix-ui/react-toggle-group',
      '@radix-ui/react-tooltip',
    ],
  },
  async redirects() {
    return [
      { source: '/games', destination: '/practice', permanent: true },
      { source: '/leaderboard', destination: '/analytics', permanent: true },
      { source: '/achievements', destination: '/profile', permanent: true },
    ]
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
  devIndicators: false,
};

export default nextConfig;
