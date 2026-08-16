module.exports = {
  ci: {
    collect: {
      startServerCommand: 'node scripts/start-ci-https.mjs',
      startServerReadyPattern: 'Lernio CI HTTPS ready',
      startServerReadyTimeout: 120000,
      url: [
        'https://localhost:3443/',
        'https://localhost:3443/sign-in',
        'https://localhost:3443/sign-up',
      ],
      numberOfRuns: 2,
      settings: {
        chromeFlags: '--no-sandbox --headless=new --ignore-certificate-errors',
      },
    },
    assert: {
      preset: 'lighthouse:recommended',
      assertions: {
        'categories:performance': ['error', { minScore: 0.8 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],
        'categories:seo': ['error', { minScore: 0.9 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 3000 }],
        'total-blocking-time': ['error', { maxNumericValue: 300 }],
      },
    },
    upload: {
      target: 'filesystem',
      outputDir: '.lighthouseci',
    },
  },
}
