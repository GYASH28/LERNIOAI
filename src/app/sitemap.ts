import type { MetadataRoute } from 'next'
import { resolveRuntimeAuthUrl } from '@/lib/auth-policy'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl =
    resolveRuntimeAuthUrl({
      configuredUrl: process.env.NEXTAUTH_URL,
      appUrl: process.env.LERNIO_APP_URL,
      vercelEnv: process.env.VERCEL_ENV,
      vercelUrl: process.env.VERCEL_URL,
      vercelProjectProductionUrl: process.env.VERCEL_PROJECT_PRODUCTION_URL,
    }) ?? 'https://lernioai.vercel.app'

  const routes = ['', '/support', '/privacy', '/terms']

  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === '' ? 'weekly' : 'monthly',
    priority: route === '' ? 1 : 0.5,
  }))
}
