# Lernio production-stability checklist

## Release target

- Canonical student website: https://lernioai.vercel.app
- Vercel project: `lernio-ai` (`prj_Fxoq746ddfh4piIMmraZSB9jN8iK`)
- The separate `lernioai` project owns `lernioai-sigma.vercel.app` and must not be used as evidence that the canonical site is healthy.
- Deploy `main` only after GitHub checks pass and validate the **canonical** domain after promotion.

## Build/database safety

- Preview builds never mutate the production database.
- Production builds require `DATABASE_URL` and run **only** `prisma migrate deploy`. A failed migration blocks the release.
- No automated `prisma db push`, `--accept-data-loss`, password reset, or unreviewed seed operation.
- For an intentionally empty production database, a maintainer may set `LERNIO_BOOTSTRAP_SEEDS=true` for one controlled release and remove it afterwards. The seed-check query must succeed before writing.
- Account bootstrap is a separate opt-in: `LERNIO_UPSERT_ADMIN_ON_DEPLOY=true`. Existing admin passwords are not changed unless `LERNIO_ROTATE_ADMIN_PASSWORD=true` is deliberately set for a single rotation. Remove both flags after use.
- Never paste database credentials, environment values, or passwords into issues and build logs.

## Functional release gate

1. Run `npm ci`, `npm run check`, and `npm run build` against the intended environment.
2. Run `npm run test:e2e` and exercise **real** student sign-up, sign-in, redirect to dashboard, refresh/session persistence, and sign-out.
3. Verify incorrect credentials report an error but cannot alter an account; test lockout and password recovery.
4. In a fresh browser with cleared cookies, open home, sign-in, dashboard, Materials, a lesson, tutor, and settings on desktop and mobile.
5. Repeat with an old `lernio-theme` cookie, a corrupted cookie, and an older service-worker registration. Look for black/blank pages, failed assets, reload loops, and CSP errors.
6. Check navigation/back/forward, keyboard interaction, lesson-to-lesson reader reset, PDF resources, and broken links.
7. Test network throttling and failed API/database requests. User-visible fallback screens should appear without losing saved work.
8. Verify the canonical Vercel project production deployment references the tested `main` commit and the canonical host serves it.
9. After deployment, inspect runtime errors and confirm user session flows. If logging is forbidden/unavailable, mark it as **not verified**, not as clean.

## Content completion gate (after stability)

Audit every lesson against the curriculum manifest: objectives, approachable explanations, examples, practice questions, revision, and PDFs where available. Approved lesson videos require a verified direct URL and curriculum match; external YouTube searches are discovery only. Do not publish an unreviewed or invented video mapping. Keep a public count of complete vs incomplete lessons.

Do not declare Lernio complete while any of these gates remain unverified.
