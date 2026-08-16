import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Lernio AI',
    short_name: 'Lernio',
    description:
      'Adaptive learning OS for CBSE Class 11, Class 12, board exams and JEE preparation.',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#5b3df5',
    orientation: 'portrait-primary',
    icons: [
      {
        src: '/brand/lernio-logo-symbol.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/brand/lernio-logo-symbol.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    categories: ['education', 'productivity'],
  }
}
