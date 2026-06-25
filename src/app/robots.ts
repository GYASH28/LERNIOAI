import type { MetadataRoute } from 'next'

const SITE_URL =
  process.env.NEXTAUTH_URL?.replace(/\/$/, '') || 'https://lernioai.vercel.app'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/dashboard', '/learn', '/practice', '/tutor', '/labs', '/coding', '/exams', '/revision', '/materials', '/planner', '/analytics', '/profile', '/complete-profile'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
