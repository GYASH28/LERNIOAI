# Contributing to Lernio AI

Thanks for your interest in contributing! This document covers the basics.

## Prerequisites

- **Node.js 24.x** (use [nvm](https://github.com/nvm-sh/nvm) or [fnm](https://github.com/Schniz/fnm))
- **PostgreSQL 14+** (or use `docker compose -f docker-compose.dev.yml up -d`)
- **npm 10+** (ships with Node 24)

## Setup

```bash
git clone https://github.com/GYASH28/LERNIOAI.git
cd LERNIOAI
npm ci
cp .env.example .env
# Fill in .env with your local values
npm run db:push
npm run dev
```

## Common scripts

| Script | What it does |
|--------|--------------|
| `npm run dev` | Start the dev server (port 3000) |
| `npm run build` | Production build |
| `npm run lint` | ESLint check |
| `npm run typecheck` | TypeScript check |
| `npm run test` | Run vitest once |
| `npm run test:e2e` | Run Playwright e2e tests |
| `npm run check` | Lint + typecheck + test |
| `npm run db:deploy` | Apply migrations + seed (production-safe) |

## Commit message convention

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `ci`, `security`

## Pull request process

1. Create a branch from `main`: `git checkout -b feat/your-feature`
2. Make your changes. Keep commits focused.
3. Run `npm run check` locally.
4. Add tests for new functionality.
5. Update documentation if your change affects public APIs or env vars.
6. Open a PR using the pull request template.
7. Request review from CODEOWNERS (GitHub auto-suggests).
8. Squash-merge once approved.

## Security-sensitive changes

If your PR touches any of these, request explicit review and mention `security` in the PR description:

- `src/lib/auth.ts`, `src/lib/authority/`, `src/lib/security/`
- `src/middleware.ts`
- `prisma/schema.prisma` or `prisma/migrations/`
- Any file in `src/app/api/auth/`, `src/app/api/admin/`, or `src/app/api/tutor/`
- `next.config.ts` (especially CSP, headers)

## Reporting a security vulnerability

**Do NOT open a public GitHub issue.** See [SECURITY.md](./SECURITY.md) for the responsible disclosure process.

## License

By contributing, you agree that your contributions will be licensed under the MIT License (see [LICENSE](./LICENSE)).
