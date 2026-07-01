import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Lernio AI',
    short_name: 'Lernio',
    description:
      'An adaptive learning workspace for diploma engineering students. Learn, practise, revise and prepare for exams.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#5b3df5',
    icons: [
      {
        src: '/brand/lernio-logo-symbol.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/brand/lernio-logo-symbol.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
    categories: ['education', 'productivity'],
  }
}
