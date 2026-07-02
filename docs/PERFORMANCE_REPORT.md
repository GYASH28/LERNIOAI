# Performance Report

## Baseline

The previous bootstrap loaded full lesson rows inside subject/unit trees. Lesson rows include large content fields such as `learnContent`, `simplifyContent`, `visualiseContent`, `practiseContent`, and `reviseContent`.

## Changes

- Initial bootstrap now selects subject, unit, topic, and lesson summary fields only.
- Dashboard lesson completions now include compact lesson metadata instead of full lesson content.
- XP/streak and learning context are no longer restored from global persisted Zustand state before server reconciliation.

## Measured Commands

Current verification in this pass:

```bash
npm run db:generate
npm run typecheck
npm run test
npm run lint
npm run build
npm run test:e2e
npm run test:a11y
```

Build result:

- Next.js production build completed successfully.
- Static/dynamic route map was generated successfully.
- E2E visual and accessibility smoke specs passed on desktop and mobile Chromium.

Full bundle-size before/after and Lighthouse mobile measurements still need a deployed or locally served production build with a reachable PostgreSQL database.
