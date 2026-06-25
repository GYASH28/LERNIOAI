import type { MetadataRoute } from 'next'

const SITE_URL =
  process.env.NEXTAUTH_URL?.replace(/\/$/, '') || 'https://lernioai.vercel.app'

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  const routes = [
    '',
    '/sign-in',
    '/sign-up',
    '/privacy',
    '/terms',
    '/support',
  ]
  return routes.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency: path === '' ? 'weekly' : 'yearly',
    priority: path === '' ? 1 : 0.5,
  }))
}
