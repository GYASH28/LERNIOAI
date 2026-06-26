# Deployment

## Database

Lernio now expects PostgreSQL.

Required environment variables:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public"
NEXTAUTH_URL="https://your-domain.example"
NEXTAUTH_SECRET="a-random-32-byte-secret"
LERNIO_DEMO_MODE="false"
```

Optional:

```bash
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
GROQ_API_KEY=""
GROQ_MODEL="llama-3.3-70b-versatile"
GROQ_FAST_MODEL="llama-3.1-8b-instant"
RESEND_API_KEY=""
EMAIL_FROM="Lernio <no-reply@your-domain.example>"
LERNIO_ADMIN_EMAIL="ultimatebracegaming@gmail.com"
LERNIO_ADMIN_PASSWORD="" # required only when running npm run db:admin or destructive seed bootstrap
NEXT_PUBLIC_LERNIO_ROLL_NUMBER_PATTERN="^[A-Za-z0-9/-]{1,32}$"
```

## Build

```bash
npm ci
npm run vercel-build
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
- Runtime: Node.js 24.x
- Production branch: `main`
- `DATABASE_URL` must point at the production PostgreSQL database; migrations run during `npm run vercel-build`
- If your production database uses pooling, set `DATABASE_URL_UNPOOLED` or `POSTGRES_URL_NON_POOLING` for migration deploys.

## Smoke Tests

After deployment verify:

- landing page
- signup without invite
- login
- Google button behavior when configured/unconfigured
- profile completion and complete-later path
- dashboard
- curriculum route refresh
- `/api/ready`
- `/api/ready` reports `ready` or `degraded` with database, auth, AI, and email configuration
- AI tutor fallback when Groq credentials are missing
- password reset email delivery when Resend is configured
- logout/login state isolation

## Admin Bootstrap

To create or repair the first admin without seeding demo data:

```bash
LERNIO_ADMIN_EMAIL="admin@example.com"
LERNIO_ADMIN_PASSWORD="use-a-long-temporary-password"
npm run db:admin
```

On PowerShell:

```powershell
$env:LERNIO_ADMIN_EMAIL="admin@example.com"
$env:LERNIO_ADMIN_PASSWORD="use-a-long-temporary-password"
npm run db:admin
```

Run this against the intended production `DATABASE_URL`. Clear the temporary password from the shell after use and rotate any credential that was exposed in screenshots, logs, or chat.
