# Lernio AI 2.0

An adaptive, mascot-led learning platform for diploma engineering students (CWIT Pune). Built with Next.js 16, React 19, TypeScript, Tailwind CSS 4, shadcn/ui, Prisma 6, and the z-ai-web-dev-sdk.

The app covers four Semester-3 subjects — Data Structures (CS201), OOP with C++ (CS202), Microprocessors & Programming (CS203), and Data Communication (CS204) — across twelve student-facing views: Dashboard, Learn, Practice, AI Tutor, Labs, Coding Lab, Exams, Revision, Materials, Planner, Analytics, and Profile.

---

## Quick start

### Prerequisites
- [Node.js](https://nodejs.org/) 22.x recommended, or 20.19+
- npm 10+
- PostgreSQL 14+ for local and production data

### Install & run
```bash
# 1. Install dependencies
npm ci

# 2. Configure environment
cp .env.example .env   # then edit .env if needed (DATABASE_URL, auth, email)

# 3. Set up the database
npm run db:generate    # generates the Prisma Client
npm run db:deploy      # applies committed PostgreSQL migrations
# (optional) seed demo content:
npm run db:seed
npx tsx scripts/seed-coding.ts
npx tsx scripts/upsert-achievements.ts

# 4. Start the dev server
npm run dev            # http://localhost:3000
```

### Useful scripts
| Script | Description |
|---|---|
| `npm run dev` | Start the Next.js dev server on port 3000 |
| `npm run build` | Production build |
| `npm run start` | Run the production Next.js server |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` (TypeScript strict) |
| `npm run check` | lint + typecheck + unit tests |
| `npm run vercel-build` | Vercel-safe build: Prisma generate + Next build |
| `npm run ci:migrate` | Apply committed Prisma migrations in a controlled production step |
| `npm run db:push` | Local-only schema sync; do not use as production migration strategy |
| `npm run db:generate` | Regenerate the Prisma Client |
| `npm run db:migrate` | Create + apply a migration |
| `npm run db:reset` | Reset the database (destroys all data) |

---

## Architecture

### Stack
- **Framework**: Next.js 16 (App Router) + React 19
- **Language**: TypeScript 5 (strict, `noImplicitAny`)
- **Styling**: Tailwind CSS 4 + shadcn/ui (New York) + Radix UI
- **Database**: Prisma 6 ORM with PostgreSQL migrations
- **State**: Zustand (client) — server state is fetched per-view
- **Animation**: Framer Motion (respects `prefers-reduced-motion`)
- **Charts**: Recharts (lazy-loaded on Analytics/Exams)
- **AI**: `z-ai-web-dev-sdk` (LLM chat, VLM, TTS, ASR, image gen) — server-only
- **Validation**: Zod on API request bodies, with shared schemas for auth and learning workflows
- **Toasts**: Sonner (single system)

### Security model
- **Authentication**: students can self-register with email/password, and Google OAuth works when configured. Ordinary students never need invite codes; elevated roles require invite/admin approval. `requireUser()` / `requireRole()` are the server trust boundary.
- **Server-authoritative integrity**: correctness, scores, XP, streaks, and achievements are all computed server-side. The browser cannot set `xp`, `level`, `streak`, `role`, or `isCorrect`. XP flows through a central idempotent ledger (`XpEvent` with `idempotencyKey @unique`).
- **Safe question DTOs**: `toPracticeDTO` / `toExamDTO` strip `correctAnswer`, `explanation`, and `hint` before sending questions to the browser. The review DTO (with answers) is only returned after a valid scored submission.
- **Ownership**: every user-owned resource (tasks, revision schedules, tutor sessions, attempts, contributions) is queried by `id AND userId` — no cross-user access.
- **Exam attempt lifecycle**: `create → autosave → submit → lock` with a `status` field prevents double-submission.

### Routing
The app exposes real App Router pages for dashboard, learn, practice, tutor, labs, coding, exams, revision, materials, planner, analytics, and profile. Shared route pages wrap the existing view components so direct refresh and browser URLs stay meaningful.

### AI grounding
The AI Tutor (`/api/tutor/chat`) retrieves **real** `Lesson` rows from the database via `src/lib/ai/retrieval.ts`, expands them into citable chunks, and injects them into the LLM prompt. `groundingStatus` is evidence-based (`'grounded'` only when chunks were retrieved; never inferred from a subject name). Citations reference genuine `Lesson.id`s with snippets.

### Coding Lab
Honestly labelled as a **syntax-learning playground**: the sandbox has no isolated C++ runner, so "Run" performs local syntax checks only (brace matching, `int main(`, `return 0;`) and never claims to compile or execute. No fake test passes, no XP for drafts. Ten real `CodingChallenge` rows are seeded. For production, wire a real isolated runner (containerised judge) into `src/app/api/coding/route.ts`.

---

## Database

### Schema
30 Prisma models cover the academic hierarchy (Institution → Department → Programme → AcademicScheme → Semester → Subject → Unit → Topic → Lesson) plus all learning-state tables (User, XpEvent, UserTopicMastery, LessonCompletion, QuestionAttempt, QuizAttempt, RevisionSchedule, RevisionAttempt, StudyTask, StudySession, TutorSession, TutorMessage, CodingChallenge, CodingSubmission, LabProgress, Resource, Contribution, Bookmark, Achievement, UserAchievement, QuestionPaper). See `prisma/schema.prisma`.

### Production deployment
- **Do not** ship mutable SQLite files as production state. Use PostgreSQL (`DATABASE_URL` must be a `postgresql://` URL).
- Vercel runs `npm run vercel-build`, which generates Prisma and builds Next.js. Apply committed migrations separately with `npm run ci:migrate` against the intended production database.
- Back up the database regularly; test restore procedures.

---

## Project structure
```
prisma/
  schema.prisma           # 30 models, indexes, XpEvent ledger
  seed scripts in scripts/
src/
  app/
    api/                  # 30+ route handlers using shared auth, validation, and API helpers
    layout.tsx            # ThemeProvider + SonnerToaster + AchievementUnlockToaster
    page.tsx              # landing page and route-specific App Router pages
  components/
    ui/                   # shadcn/ui primitives + custom widgets
    views/                # 12 view components + labs/
    layout/               # sidebar, footer, mobile nav
    mascots/              # LEO + subject mascots
  lib/
    auth.ts               # requireUser / requireRole / ApiError / withApi
    xp.ts                 # idempotent awardXp ledger
    schemas.ts            # Zod schemas + parseBody
    achievements.ts       # evaluateAchievements (returns UnlockedAchievement[])
    ai/
      retrieval.ts        # real lesson-content retrieval → citations
      provider.ts         # AI provider abstraction
      evaluator.ts        # rubric-based answer evaluation
    questions.ts          # safe DTOs + evaluateAnswer
    db.ts                 # PrismaClient singleton
```

---

## Known limitations
- **Lesson coverage**: 11 of 64 topics have full 5-mode lessons; the remaining 53 show an honest "No lesson yet" empty-state. Expanding content is an ongoing effort.
- **Coding Lab**: no real C++ execution in the sandbox (honestly labelled as a syntax-learning playground). A production isolated runner is required for real grading.
- **Tests**: Vitest unit tests exist for auth policy, rate limiting, roles, user DTOs, motion, and the card component. Playwright is configured for E2E, accessibility and visual tests. Coverage is expanding — see `tests/` and `*.test.ts` files across `src/`.
- **Onboarding**: ordinary students can enter Lernio immediately; missing academic details can be completed later through the complete-profile flow.
- **Production deployment**: the public URL `lernioai.vercel.app` must be linked to this repository's `main` branch with PostgreSQL `DATABASE_URL`, `NEXTAUTH_SECRET`, and the required environment variables configured in Vercel. See `.env.example` for the full list.

---

## Operations
- **Health probe**: `GET /api/health` — returns 200 if the process is alive (no DB check).
- **Readiness probe**: `GET /api/ready` — verifies the database is reachable and reports provider configuration. Returns 503 if the database is unavailable.
- **SEO**: `sitemap.xml` is generated at `/sitemap.xml`, robots at `/robots.txt`, and a PWA manifest at `/manifest.webmanifest`. The landing page includes `SoftwareApplication` JSON-LD structured data.
- **Public pages**: `/privacy`, `/terms`, `/support` share the public chrome (header + footer) with the landing page.
- **Security headers**: `next.config.ts` sets `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, and HSTS in production.

---

## Troubleshooting
- **`prisma generate` errors**: ensure `DATABASE_URL` is a valid PostgreSQL URL.
- **Blank page after schema changes**: restart the dev server, then run `npm run dev` so the Prisma Client cache is refreshed.
- **Port 3000 in use**: `npm run dev` uses port 3000 in this environment.
- **Demo user not found**: run `npm run db:seed` to seed the demo student + academic content.
- **`/api/ready` returns 503 locally**: start a PostgreSQL server that matches `DATABASE_URL`, then run `npm run db:deploy`. `/api/health` can still be 200 when the process is alive but the database is unavailable.
