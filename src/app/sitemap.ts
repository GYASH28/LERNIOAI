import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXTAUTH_URL?.replace(/\/$/, '') || 'https://lernioai.vercel.app'
  const routes = [
    '',
    '/sign-in',
    '/sign-up',
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
    '/support',
    '/privacy',
  ]

  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: route === '' ? 1 : route === '/learn' ? 0.9 : 0.6,
  }))
}
