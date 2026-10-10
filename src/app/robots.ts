import type { MetadataRoute } from 'next'
import { resolveRuntimeAuthUrl } from '@/lib/auth-policy'

export default function robots(): MetadataRoute.Robots {
  const baseUrl =
    resolveRuntimeAuthUrl({
      configuredUrl: process.env.NEXTAUTH_URL,
      appUrl: process.env.LERNIO_APP_URL,
      vercelEnv: process.env.VERCEL_ENV,
      vercelUrl: process.env.VERCEL_URL,
      vercelProjectProductionUrl: process.env.VERCEL_PROJECT_PRODUCTION_URL,
    }) ?? 'https://lernioai.vercel.app'

  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/support', '/privacy', '/terms'],
      disallow: [
        '/api/',
        '/admin/',
        '/dashboard',
        '/learn',
        '/practice',
        '/tutor',
        '/planner',
        '/analytics',
        '/exams',
        '/revision',
        '/coding',
        '/labs',
        '/materials',
        '/profile',
        '/settings',
        '/class',
        '/attendance',
        '/community',
        '/notifications',
        '/sign-in',
        '/sign-up',
        '/forgot-password',
        '/reset-password',
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
