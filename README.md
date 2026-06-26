# Lernio AI 2.0

An adaptive, mascot-led learning platform for diploma engineering students at CWIT Pune. Built with Next.js 16, React 19, TypeScript, Tailwind CSS 4, shadcn/ui, Prisma 6, PostgreSQL, and Groq-backed AI services.

The app covers the student learning flow across dashboard, lessons, practice, AI tutor, labs, coding, exams, revision, materials, planner, analytics, and profile.

Lernio also has the first production authority layer for a Learning OS: normalized role assignments, class groups, teaching assignments, class memberships, audited admin APIs, and role workspaces for Admin, Coordinator, Teacher, Reviewer, Moderator, and CR.

## Quick Start

### Prerequisites

- Node.js 24.x
- PostgreSQL 14+

### Install And Run

```bash
npm install
cp .env.example .env

npm run db:generate
npm run db:deploy
npm run db:authority:backfill

# Optional demo/bootstrap data. This is destructive.
npm run db:seed
npx tsx scripts/seed-coding.ts
npx tsx scripts/upsert-achievements.ts

npm run dev
```

Local app URL: `http://localhost:3000`

## Important Environment Variables

- `DATABASE_URL`: PostgreSQL connection URL.
- `DATABASE_URL_UNPOOLED`: optional direct URL for Prisma migrations on Vercel.
- `NEXTAUTH_URL` and `NEXTAUTH_SECRET`: required for auth.
- `LERNIO_DEMO_MODE`: use `false` in production.
- `GROQ_API_KEY`: enables LEO tutor chat, ASR, and TTS.
- `RESEND_API_KEY` and `EMAIL_FROM`: enable password reset and verification emails.
- `LERNIO_ADMIN_EMAIL`: defaults to `ultimatebracegaming@gmail.com`.
- `LERNIO_ADMIN_PASSWORD`: required when running the seed bootstrap in production.

See `.env.example` for the full list.

## Useful Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start Next.js on port 3000 |
| `npm run build` | Production build |
| `npm run vercel-build` | Generate Prisma, deploy migrations when DB env exists, then build Next.js |
| `npm run start` | Run the production server |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript check |
| `npm run test` | Vitest suite |
| `npm run check` | lint + typecheck + tests |
| `npm run db:generate` | Regenerate Prisma Client |
| `npm run db:migrate` | Create and apply a migration locally |
| `npm run db:deploy` | Apply committed migrations |
| `npm run db:admin` | Non-destructively create/update the admin user from `LERNIO_ADMIN_EMAIL` and `LERNIO_ADMIN_PASSWORD` |
| `npm run db:authority:backfill` | Dry-run legacy role/profile migration into normalized authority tables |
| `npm run db:departments` | Upsert the verified CWIT department and programme hierarchy |
| `npm run db:cwit:sources` | Register official CWIT syllabus/resource source evidence |
| `npm run db:seed` | Destructive demo/admin seed |

## Architecture

- Framework: Next.js App Router + React 19
- Styling: Tailwind CSS 4 + shadcn/ui + Radix UI
- Database: PostgreSQL through Prisma migrations
- Auth: NextAuth credentials and optional Google OAuth
- AI: Groq provider behind `src/lib/ai/provider.ts`
- Email: Resend HTTP API through `src/lib/email.ts`
- Validation: Zod schemas in `src/lib/schemas.ts`
- Server trust boundary: `requireUser`, `requireRole`, and `requirePermission`
- Authority kernel: `src/lib/authority`, backed by `RoleAssignment`, `TeachingAssignment`, `ClassGroup`, `ClassMembership`, and `AuditEvent`
- CWIT Learning OS foundation: source registry, syllabus import queue, resource governance, curriculum metadata, and assessment-ready schema extensions

## Authority Workspaces

Public signup remains student-only. Elevated access comes from server-side admin bootstrap, approved role requests, or normalized role assignments.

Current workspace routes:

- `/admin`
- `/admin/syllabus/sources`
- `/admin/syllabus/imports`
- `/admin/resources/queue`
- `/coordinator`
- `/teacher`
- `/reviewer`
- `/moderator`
- `/cr`

Every workspace is server-rendered and protected by `requireActiveRole()`. Navigation visibility is only UX; APIs still enforce server-side authority and scope.

## AI Tutor

LEO retrieves real lesson rows from Prisma through `src/lib/ai/retrieval.ts`, injects citable course context into `/api/tutor/chat`, and stores grounded tutor messages. The tutor prompt is designed for short, human, structured explanations with clear examples, exam tips, and safe high-level reasoning without exposing hidden chain-of-thought.

## Deployment

Vercel should use:

- Install command: `npm ci`
- Build command: `npm run vercel-build`
- Framework preset: Next.js
- Node runtime: 24.x

`npm run vercel-build` generates Prisma, deploys committed migrations when database env vars are present, and then runs the Next.js build. If your production Postgres uses pooling, provide `DATABASE_URL_UNPOOLED`, `POSTGRES_URL_NON_POOLING`, or `DIRECT_URL` for migrations.

## Operations

- Health probe: `GET /api/health`
- Readiness probe: `GET /api/ready`
- Public pages: `/`, `/sign-in`, `/sign-up`, `/forgot-password`, `/privacy`, `/terms`, `/support`
- PWA/SEO assets: `/manifest.webmanifest`, `/robots.txt`, `/sitemap.xml`

## Troubleshooting

- Prisma errors: verify `DATABASE_URL` is a valid PostgreSQL URL and run `npm run db:generate`.
- Local database unavailable: start PostgreSQL, apply migrations with `npm run db:deploy`, then restart `npm run dev`.
- Password reset emails not sent in production: set `RESEND_API_KEY` and `EMAIL_FROM`.
- LEO tutor fallback responses: set `GROQ_API_KEY`.
- Admin user missing: set `LERNIO_ADMIN_EMAIL` and `LERNIO_ADMIN_PASSWORD`, then run `npm run db:admin`.
- Authority pages show empty scope: run `npm run db:authority:backfill -- --write` after reviewing the dry-run report, or create scoped role assignments from the admin API.
- Demo data missing: run `npm run db:seed`; this is destructive and recreates the demo academic dataset.
