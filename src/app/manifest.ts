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
    // Make sure the app feels native on mobile — full screen, no selection UI
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
