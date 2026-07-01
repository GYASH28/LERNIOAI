# Deployment

## Database

Lernio expects PostgreSQL.

Required:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public"
NEXTAUTH_URL="https://your-domain.example"
NEXTAUTH_SECRET="a-random-32-byte-secret"
LERNIO_DEMO_MODE="false"
```

Optional:

```bash
DATABASE_URL_UNPOOLED=""
POSTGRES_URL_NON_POOLING=""
DIRECT_URL=""
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
GROQ_API_KEY=""
GROQ_MODEL="llama-3.3-70b-versatile"
GROQ_FAST_MODEL="llama-3.1-8b-instant"
RESEND_API_KEY=""
EMAIL_FROM="Lernio <no-reply@your-domain.example>"
LERNIO_ADMIN_EMAIL="admin@lernio.ai"
LERNIO_ADMIN_PASSWORD=""
```

`LERNIO_ADMIN_PASSWORD` is required only when running `npm run db:admin`.

## Build

```bash
npm ci
npm run vercel-build
```

Local release checks:

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
- `DATABASE_URL` points at production PostgreSQL
- For pooled production URLs, set `DATABASE_URL_UNPOOLED`, `POSTGRES_URL_NON_POOLING`, or `DIRECT_URL`

`npm run vercel-build` runs Prisma generate, deploys committed migrations when database env vars are available, then runs the Next.js build.

## Authority Migration

Apply committed migrations:

```bash
npm run db:deploy
```

Run a dry-run authority backfill:

```bash
npm run db:authority:backfill
```

After reviewing the report:

```bash
npm run db:authority:backfill -- --write
```

The backfill creates missing institution memberships, class groups, class memberships, role assignments, teaching assignments, and audit events when the source data is unambiguous. Ambiguous legacy rows are reported and skipped.

## Admin Bootstrap

PowerShell:

```powershell
$env:DATABASE_URL="postgresql://..."
$env:LERNIO_ADMIN_EMAIL="admin@example.com"
$env:LERNIO_ADMIN_PASSWORD="use-a-long-temporary-password"
npm run db:admin
Remove-Item Env:\LERNIO_ADMIN_PASSWORD
```

The script creates or repairs the admin user without seeding demo data. Rotate any credential exposed in screenshots, shell history, or chat.

## Smoke Tests

After deployment verify:

- `/`
- `/sign-up`
- `/sign-in`
- `/dashboard`
- `/admin` after admin login
- `/api/ready`
- AI tutor fallback when Groq is not configured
- password reset email when Resend is configured
- role revocation updates after re-login or JWT refresh

## Rollback Notes

- Take a database backup before applying migrations.
- The authority migration is additive and does not drop legacy fields.
- If a workspace needs to be hidden temporarily, remove links or gate route access, but do not drop the authority tables.
- Recover first admin with `npm run db:admin`.
