import type { MetadataRoute } from 'next'

const SITE_URL =
  process.env.NEXTAUTH_URL?.replace(/\/$/, '') || 'https://lernioai.vercel.app'

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date('2026-06-27T00:00:00.000Z')
  const routes = [
    '',
    '/privacy',
    '/terms',
    '/support',
  ]
  return routes.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified,
    changeFrequency: path === '' ? 'weekly' : 'yearly',
    priority: path === '' ? 1 : 0.5,
  }))
}
