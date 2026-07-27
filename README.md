# Lernio AI

**An adaptive, AI-powered learning platform for diploma engineering students at CWIT Pune.**

Built with Next.js 16, React 19, TypeScript, Tailwind CSS 4, shadcn/ui, Prisma 6, PostgreSQL, and Groq-backed AI services.

Live at **[lernioai.vercel.app](https://lernioai.vercel.app)**

---

## What is Lernio AI?

Lernio AI is a complete academic intelligence system that covers the entire student learning journey — from interactive video lessons and AI-powered tutoring to spaced-repetition revision, community Q&A, and exam preparation. It knows each student's programme, semester, subjects, and curriculum, and personalises the experience accordingly.

### Key Features

| Feature | Description |
|---|---|
| **Learn** | Curriculum-mapped video lectures with chapters, resume-where-you-left-off, alternate explanations, lesson notes, and a Quick Revision Hub for each subject |
| **Materials** | Premium presentation-style interactive textbook — each lesson opens as a slide deck with theory, code examples, diagrams, quizzes, flashcards, and AI tools |
| **AI Tutor (LEO)** | Groq-powered AI tutor with 15+ modes: explain, simplify, Hinglish, Marathi, ELI10, exam answers, viva practice, flashcard generation, and more |
| **Practice & Exams** | AI-generated quizzes with instant feedback, per-subject question banks, and exam-mode timed tests |
| **Revision** | SM-2 spaced-repetition flashcard system with 3D flip cards, due scheduling, and progress tracking |
| **Community** | Subject-scoped Q&A discussions with LEO auto-answer, best-answer marking, milestone feed, and study groups |
| **Coding Lab** | In-browser code execution for C, C++, Java, Python, and JavaScript |
| **Interactive Labs** | Hands-on simulation labs for algorithms and data structures |
| **Planner** | AI-powered study planner that auto-generates weekly schedules based on subjects and weak topics |
| **Analytics** | Readiness score, XP/streak tracking, subject-wise performance breakdown, and study heatmap |
| **Class & Attendance** | Class timetable, CR-managed attendance, announcements, and classmate directory |
| **Leaderboard** | Institution-wide XP rankings with streak badges |
| **Gamification** | XP, levels, streaks, achievements, and daily study goals |

### AI-Powered Features

- **LEO AI Tutor** — context-aware tutoring that knows your subject, unit, and lesson
- **AI Notes Toolbar** — 12 actions per lesson: Explain, Simplify, Hinglish, Marathi, ELI10, Examples, Coding Exercise, Quiz, Flashcards, Summary, Ask AI
- **AI Quiz Generation** — generates MCQs from any subject's curriculum
- **AI Study Planner** — auto-creates a personalised weekly study plan
- **AI Content Moderation** — pre-publish spam/harassment check on community posts (fail-open)
- **LEO Auto-Answer** — automatically provides a starting-point answer on every community discussion question

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript 5 |
| UI | React 19, Tailwind CSS 4, shadcn/ui (Radix UI) |
| Database | PostgreSQL 14+ via Prisma ORM 6 |
| AI | Groq (Llama 3.3 70B / Llama 3.1 8B) |
| Auth | NextAuth.js v4 (credentials + Google OAuth) |
| Hosting | Vercel |
| Fonts | Geist Sans + Geist Mono |
| Animations | Framer Motion 12, CSS keyframes |
| Code Highlighting | highlight.js |
| Diagrams | Native HTML/CSS (no Mermaid — eliminates syntax errors) |
| Markdown | react-markdown + remark-gfm + rehype-raw |

---

## Project Structure

```
src/
├── app/                        # Next.js App Router pages
│   ├── (public)/               # Landing, sign-in, sign-up, privacy, terms
│   ├── dashboard/              # Student dashboard
│   ├── learn/                  # Curriculum browser + lesson studio
│   ├── materials/              # Digital textbook (presentation-style slides)
│   ├── community/              # Discussions, feed, study groups
│   ├── moderator/              # Content moderation queue
│   ├── practice/               # AI-generated quizzes
│   ├── exams/                  # Timed exam-mode tests
│   ├── revision/               # Spaced-repetition flashcards
│   ├── tutor/                  # LEO AI tutor
│   ├── coding/                 # In-browser code playground
│   ├── labs/                   # Interactive simulation labs
│   ├── planner/                # AI study planner
│   ├── analytics/              # Performance analytics
│   ├── class/                  # Class directory + timetable
│   ├── attendance/             # Attendance tracking
│   ├── leaderboard/            # XP rankings
│   ├── settings/               # Preferences
│   ├── admin/                  # Admin panel (users, curriculum, resources)
│   ├── coordinator/            # Coordinator dashboard
│   ├── teacher-dashboard/      # Teacher overview
│   └── api/                    # API routes (80+ endpoints)
├── components/
│   ├── learning/               # Lesson players, notes renderers, flashcards
│   ├── marketing/              # Landing page hero (3D book), sections
│   ├── layout/                 # TopBar, Footer, navigation
│   ├── dashboard/              # Dashboard widgets
│   └── ui/                     # shadcn/ui primitives
├── lib/
│   ├── ai/                     # Groq provider, streaming, tutor runtime
│   ├── auth/                   # NextAuth config, role system
│   ├── curriculum/             # Manifest loader, lesson notes, coverage
│   └── resources/              # YouTube pipeline, resource governance
├── styles/                     # CSS design system (tokens, themes, motion)
└── content/
    └── lesson-notes/           # 44 subjects × 241 lessons (V3 interactive notes)
```

---

## Quick Start

### Prerequisites

- **Node.js** 24.x
- **PostgreSQL** 14+ (or use Docker: `docker compose -f docker-compose.dev.yml up -d`)
- **Groq API Key** (for AI features — [get one free](https://console.groq.com))

### Installation

```bash
# Clone
git clone https://github.com/GYASH28/LERNIOAI.git
cd LERNIOAI

# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env — set DATABASE_URL, NEXTAUTH_SECRET, GROQ_API_KEY at minimum

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate deploy
# Or for development: npx prisma db push

# (Optional) Seed curriculum data
npm run db:departments
npm run curriculum:import

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | ✅ | Random string (min 16 chars) |
| `NEXTAUTH_URL` | ✅ in prod | Your deployment URL |
| `GROQ_API_KEY` | Recommended | Enables AI tutor, quiz generation, planner |
| `GROQ_MODEL` | Optional | Default: `llama-3.3-70b-versatile` |
| `GROQ_FAST_MODEL` | Optional | Default: `llama-3.1-8b-instant` |
| `GOOGLE_CLIENT_ID` | Optional | Google OAuth sign-in |
| `GOOGLE_CLIENT_SECRET` | Optional | Google OAuth sign-in |
| `LERNIO_ADMIN_EMAIL` | Optional | Bootstrap admin account |
| `LERNIO_ADMIN_PASSWORD` | Optional | Bootstrap admin password |
| `LERNIO_DEMO_MODE` | Optional | Set to `true` for demo (never in production) |

---

## Content

Lernio AI includes comprehensive interactive notes for **44 subjects across 6 semesters** (241 lessons total), each with:

- Overview, objectives, prerequisites
- Detailed theory (markdown)
- Key concepts, real-life analogies
- Flowcharts and mind maps (native HTML/CSS)
- Comparison tables
- Syntax-highlighted code examples (C, C++, Java, Python, SQL)
- Complexity analysis
- Worked examples
- Common mistakes, callouts, exam tips
- Viva questions, interview questions, exam questions (2/5/10/15-mark)
- Revision summary, cheat sheet, mnemonics
- Interactive practice quiz
- 3D flashcards
- AI summaries
- AI toolbar (12 actions)

---

## Roles & Access

| Role | Access |
|---|---|
| **Student** | Dashboard, Learn, Materials, Practice, Exams, Revision, Tutor, Coding, Labs, Planner, Analytics, Community, Leaderboard |
| **CR (Class Representative)** | Student access + Take attendance, post announcements, manage class |
| **Teacher** | Student access + Teacher dashboard with student progress overview |
| **Coordinator** | Student access + Coordinator dashboard with class management shortcuts |
| **Moderator** | Student access + Community content moderation queue |
| **Admin** | Full access including admin panel (users, curriculum, resources, settings) |

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server (port 3000) |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript compiler check |
| `npm run test` | Run Vitest unit tests |
| `npm run test:e2e` | Run Playwright E2E tests |
| `npm run db:push` | Push schema changes to database |
| `npm run db:migrate` | Create and apply migration |
| `npm run curriculum:import` | Import CWIT R23 curriculum manifests |
| `npm run notes:generate-pdfs` | Generate PDF study notes for all subjects |

---

## Deployment

Lernio AI is deployed on **Vercel** with automatic deploys from `main`.

```bash
# Vercel build script (runs automatically)
npm run vercel-build
```

The build script:
1. Generates Prisma client
2. Runs database migrations (if `DATABASE_URL` is set)
3. Seeds curriculum data (first deploy only — skips if already seeded)
4. Upserts admin user
5. Builds Next.js

---

## Design System

Lernio AI uses a custom design system built on semantic tokens:

- **6 color palettes** (Aurora default, Nexus, Paper, Ocean, Forest, Sakura)
- **Light + dark mode** with system detection
- **8px spacing grid**
- **Custom typography scale** (display, h1-h3, body, meta)
- **Motion tokens** (fast 120ms, standard 200ms, slow 320ms)
- **Custom scrollbar + focus rings**
- **Glassmorphism** on floating elements
- **3D CSS transforms** (hero book, flashcard flips)

---

## License

This project is proprietary. All rights reserved.

---

## Acknowledgments

- **CWIT Pune** — Curriculum framework (R23 scheme)
- **Groq** — AI inference (Llama 3.3 70B, Llama 3.1 8B)
- **Vercel** — Hosting and deployment
- **shadcn/ui** — UI component primitives
- **Jenny's Lectures** — YouTube lecture curation
