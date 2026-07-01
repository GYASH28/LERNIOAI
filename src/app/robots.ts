import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXTAUTH_URL?.replace(/\/$/, '') || 'https://lernioai.vercel.app'
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/admin/', '/settings/', '/profile/'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
