# Deployment

## Database

Lernio now expects PostgreSQL.

Required environment variables:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public"
DIRECT_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public"
NEXTAUTH_URL="https://your-domain.example"
NEXTAUTH_SECRET="a-random-32-byte-secret"
LERNIO_DEMO_MODE="false"
```

Optional:

```bash
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
ZAI_API_KEY=""
NEXT_PUBLIC_LERNIO_ROLL_NUMBER_PATTERN="^[A-Za-z0-9/-]{1,32}$"
```

## Build

```bash
npm ci
npm run db:generate
npm run db:deploy
npm run lint
npm run typecheck
npm run test
npm run build
```

## Vercel Checklist

- Framework preset: Next.js
- Install command: `npm ci`
- Build command: `npm run build`
- Output directory: default Next.js output
- Install command: `npm ci`
- Build command: `npm run build`
- Root directory: repository root
- Runtime: Node.js 20 or newer
- Production branch: `main`
- Run migrations before production release with `npm run db:deploy`

## Smoke Tests

After deployment verify:

- landing page
- signup without invite
- login
- Google button behavior when configured/unconfigured
- profile completion and complete-later path
- dashboard
- curriculum route refresh
- `/api/route`
- AI tutor fallback when provider credentials are missing
- logout/login state isolation
