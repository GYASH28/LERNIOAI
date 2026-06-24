# Lernio AI 2.0

An adaptive, mascot-led learning platform for diploma engineering students (CWIT Pune). Built with Next.js 16, React 19, TypeScript, Tailwind CSS 4, shadcn/ui, Prisma 6, and the z-ai-web-dev-sdk.

The app covers four Semester-3 subjects — Data Structures (CS201), OOP with C++ (CS202), Microprocessors & Programming (CS203), and Data Communication (CS204) — across twelve student-facing views: Dashboard, Learn, Practice, AI Tutor, Labs, Coding Lab, Exams, Revision, Materials, Planner, Analytics, and Profile.

---

## Quick start

### Prerequisites
- [Node.js](https://nodejs.org/) 18+ (or [Bun](https://bun.sh/) 1.3+)
- PostgreSQL 14+ for local and production data

### Install & run
```bash
# 1. Install dependencies
bun install            # or: npm install / pnpm install

# 2. Configure environment
cp .env.example .env   # then edit .env if needed (DATABASE_URL, LERNIO_DEMO_MODE)

# 3. Set up the database
bun run db:generate    # generates the Prisma Client
bun run db:deploy      # applies committed PostgreSQL migrations
# (optional) seed demo content:
bunx tsx scripts/seed.ts
bunx tsx scripts/seed-coding.ts
bunx tsx scripts/upsert-achievements.ts

# 4. Start the dev server
bun run dev            # http://localhost:3000
```

### Useful scripts
| Script | Description |
|---|---|
| `bun run dev` | Start the Next.js dev server on port 3000 |
| `bun run build` | Production build (standalone output) |
| `bun run start` | Run the production standalone server |
| `bun run lint` | ESLint (strict rules restored) |
| `bun run typecheck` | `tsc --noEmit` (TypeScript strict) |
| `bun run check` | lint + typecheck |
| `bun run db:push` | Local-only schema sync; do not use as production migration strategy |
| `bun run db:generate` | Regenerate the Prisma Client |
| `bun run db:migrate` | Create + apply a migration |
| `bun run db:reset` | Reset the database (destroys all data) |

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
- **Validation**: Zod on every API request body
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
- **Do not** ship mutable SQLite files as production state. Use PostgreSQL (`DATABASE_URL` and `DIRECT_URL` must be `postgresql://` URLs).
- Run `bun run db:deploy` on deploy.
- Back up the database regularly; test restore procedures.

---

## Project structure
```
prisma/
  schema.prisma           # 30 models, indexes, XpEvent ledger
  seed scripts in scripts/
src/
  app/
    api/                  # 30+ route handlers (all use requireUser + Zod + withApi)
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
- **Coding Lab**: no real C++ execution in the sandbox (honestly labelled). A production runner is required for real grading.
- **Tests**: not yet present. The recommended next step is Vitest for unit tests (mastery, SM-2, scoring, XP idempotency) + Playwright for critical student journeys.
- **Onboarding**: ordinary students can enter Lernio immediately; missing academic details can be completed later.

---

## Troubleshooting
- **`prisma generate` errors**: ensure `DATABASE_URL` and `DIRECT_URL` are valid PostgreSQL URLs.
- **Blank page after schema changes**: restart the dev server (`pkill -f 'next dev'` then `bun run dev`) so the Prisma Client cache is refreshed.
- **Port 3000 in use**: `bun run dev` uses port 3000 exclusively in this environment.
- **Demo user not found**: run `bunx tsx scripts/seed.ts` to seed the demo student + academic content.
