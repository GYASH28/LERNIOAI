# Lernio AI

**An AI-powered Learning OS for Class 11, Class 12 and JEE preparation.**

Lernio brings learning, question practice, revision, tests, study planning, tutoring and academic analytics into one connected student workspace.

> Product principle: **Know what to study next.**

## Overview

Lernio is not designed as an online coaching storefront. It is a personal study system that organizes the student's academic life around a simple loop:

**Learn → Practice → Analyze → Revise → Test → Improve**

The initial curriculum layer is CBSE / NCERT for Classes 11 and 12. The academic architecture separates board, class, stream, subjects and target exams so additional boards and exams can be introduced without rebuilding the product around a new hardcoded hierarchy.

### Student profiles

- Class 11
- Class 12
- JEE Dropper
- Boards-focused
- JEE Main
- JEE Main + Advanced
- Boards + JEE
- PCM / PCB / PCMB with architecture for Commerce and Humanities

JEE features are profile-aware and shown only where they are relevant.

## Core Features

### Personalized onboarding

Students choose class, preparation goal, stream, board, daily study target and weak subjects. Lernio creates an academic profile instead of relying on institution, department or semester fields.

### Learn

Curriculum navigation follows:

`Board → Class → Subject → Chapter → Topic → Learning resources`

Class 11/12 subject and chapter routes are separate from the retired diploma curriculum routes. Learning content is verification-first: unavailable notes, topics, videos or resources are not replaced with fabricated content.

### Practice engine

The academic practice system supports a dedicated question model with metadata for:

- class, subject, chapter, topic and concept
- difficulty and exam type
- question type, marks and negative marks
- source type and source year
- solution, explanation and hint

Question attempts are recorded server-side. Incorrect answers feed the Mistake Notebook and topic mastery system.

### PYQ integrity

Question sources are explicit:

- `ORIGINAL`
- `PYQ`
- `AI_GENERATED`
- `IMPORTED`

JEE PYQ mode only returns published records explicitly stored as `PYQ`. An AI-generated JEE-style question is never presented as an official previous-year question.

### Revision OS

The new academic revision layer includes:

- Revision Queue
- Mistake Notebook
- Formula Vault architecture
- repeated-mistake tracking
- due-date scheduling
- mastery-linked revision data

### Study Planner

Study plans are generated from the student's academic profile, weak subjects, published curriculum and daily time target. Tasks link directly into Learn, Practice or Revision instead of being generic todo strings.

Available plan intensities:

- Lighter
- Balanced
- Intensive

### Analytics

Analytics use real stored activity. The current academic overview can report:

- questions attempted
- accuracy
- average solve time
- open mistakes
- revision due
- chapter/topic mastery records

When evidence does not exist, Lernio shows an empty state rather than invented percentages.

### AI Tutor

The existing streaming conversation and session infrastructure is being preserved while diploma subject scope is retired. The tutor page now requires the new academic profile and no longer injects diploma subjects into the student-facing tutor UI.

### Tests

The test area is organized around:

- chapter and subject checkpoints
- custom test entry
- Boards mode
- guarded JEE mode

JEE mock patterns are intended to be versioned/configuration-driven rather than permanently hardcoded to one year's examination rules.

### Resource Library

Resources are organized around the Class 11/12 curriculum. The previous R23 six-semester PDF catalogue is not exposed in the new student Resource Library.

## Academic Data Architecture

The transformation introduces an academic data layer independent of the historical diploma hierarchy.

Key entities include:

- `StudentAcademicProfile`
- `AcademicQuestion`
- `AcademicQuestionAttempt`
- `AcademicMistake`
- `AcademicMasteryRecord`
- `AcademicRevisionItem`
- `AcademicExam`
- `AcademicStudyPlan`
- `AcademicStudyTask`

The existing authentication, security, theme and generic user infrastructure is preserved while student academic workflows migrate to the new layer.

## Curriculum

Initial structured curriculum metadata lives under the academic domain code and currently covers the primary CBSE Class 11/12 PCM chapter structure.

Rules for curriculum/content data:

- do not copy copyrighted textbook passages
- write original educational explanations
- do not invent YouTube IDs or resource URLs
- do not ship placeholder lessons as real content
- keep exam/source metadata honest
- gracefully hide unavailable content

The architecture is designed to expand to additional subjects, boards and exams without reintroducing college-semester assumptions.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 App Router |
| Language | TypeScript 5 |
| UI | React 19, Tailwind CSS 4, Radix/shadcn primitives |
| Database | PostgreSQL + Prisma 6 |
| Authentication | NextAuth.js v4 |
| AI | Provider-backed streaming tutor infrastructure |
| Charts | Recharts |
| Motion | Framer Motion + CSS |
| Testing | Vitest + Playwright + Axe |
| Deployment | Vercel |

## Student Routes

Primary product navigation:

- `/dashboard`
- `/learn`
- `/practice`
- `/exams`
- `/tutor`
- `/revision`
- `/planner`
- `/analytics`
- `/materials`
- `/profile`
- `/settings`

Legacy student routes such as attendance, college class, diploma coding lab and diploma labs are retired from the new product experience.

## Development

### Requirements

- Node.js 24.x
- PostgreSQL
- npm

### Setup

```bash
git clone https://github.com/GYASH28/LERNIOAI.git
cd LERNIOAI
npm install
cp .env.example .env
npm run db:generate
npm run db:migrate:deploy
npm run dev
```

### Important environment variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection |
| `DIRECT_URL` | Direct PostgreSQL connection where required |
| `NEXTAUTH_URL` | Application URL |
| `NEXTAUTH_SECRET` | Authentication signing secret |
| `GROQ_API_KEY` | AI provider key when Groq-backed features are enabled |
| `GOOGLE_CLIENT_ID` | Optional Google OAuth |
| `GOOGLE_CLIENT_SECRET` | Optional Google OAuth |

Never commit secrets to Git.

## Quality Gates

The repository CI is expected to run:

```text
npm ci
npm run db:generate
npm run check:migrations
npm run db:migrate:deploy
npm run lint
npm run typecheck
npm run test
npm run build
npm run test:e2e
npm audit --audit-level=high
```

A transformation PR should not be merged simply because the UI looks correct. Migration validation, linting, type checking, tests, production build and E2E checks must pass.

## Security and Privacy

The transformation must preserve existing security controls including authentication, server authorization, validation, secure session handling and secret management. Student academic activity, tutor conversations and analytics are private user data and must not be exposed publicly.

## Product Quality Rules

- No fake analytics.
- No fake videos.
- No fake PYQs.
- No dead primary buttons.
- No hidden fallback to diploma semester data in the new student experience.
- No unsupported claims about exam probabilities.
- No hardcoded future exam dates.
- Empty states are preferable to deceptive demo content.
- Integration and student outcomes matter more than the number of cards on a page.

## Deployment

Production deployment is handled through Vercel after changes reach the deployment branch. A successful Git push is not considered a successful deployment: the deployed application must be checked separately after CI and Vercel complete.

## License

Proprietary. All rights reserved.
