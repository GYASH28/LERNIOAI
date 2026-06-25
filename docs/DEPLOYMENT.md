# Deployment

## Database

Lernio now expects PostgreSQL.

Required environment variables:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public"
NEXTAUTH_URL="https://your-domain.example"
NEXTAUTH_SECRET="a-random-32-byte-secret"
LERNIO_DEMO_MODE="false"
RESEND_API_KEY="re_..."
EMAIL_FROM="Lernio AI <noreply@your-domain.example>"
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
npm run vercel-build
```

`npm run vercel-build` generates Prisma Client and builds Next.js. It does not run migrations, so Preview builds do not mutate a database or fail because a preview database is absent.

Apply migrations as a controlled production step:

```bash
npm run ci:migrate
```

For local checks before deployment, run:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

## Vercel Checklist

- Framework preset: Next.js
- Install command: `npm ci`
- Build command: `npm run vercel-build`
- Output directory: default Next.js output
- Root directory: repository root
- Runtime: Node.js 22.x recommended, or Node.js 20.19+
- Production branch: `main`
- `DATABASE_URL` must point at the intended PostgreSQL database before running `npm run ci:migrate`
- `RESEND_API_KEY` and `EMAIL_FROM` are required for password reset and verification email delivery in production

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
- `/api/ready` reports `checks.email: "configured"` in production
- AI tutor fallback when provider credentials are missing
- logout/login state isolation
