# Lernio production release target (verified 10 October 2026)

## Canonical target — do not confuse the two Vercel projects

| | Production app | Duplicate project |
|---|---|---|
| Domain | **https://lernioai.vercel.app** | https://lernioai-sigma.vercel.app |
| Project name | **`lernio-ai`** | `lernioai` |
| Project ID | **`prj_Fxoq746ddfh4piIMmraZSB9jN8iK`** | `prj_kFKy66tIU3mUt7Pz5oYJ7J51H17p` |
| Team | `gyash28s-projects` | `gyash28s-projects` |

Verified using both Vercel's **get alias** and **list project domains** APIs, not guessed from similar names.

## Current release blocker

Main commit `665b41eae459833806845c271292ca7e46870b8a` contains the sign-in, theme, service-worker and black-screen fixes from PR #64. Its GitHub CI was green. At the time of this document, Vercel's canonical domain still points to an older deployment based on `0193b332abeed4664cda8a39b67c04a209f731d6`.

A correctly scoped request to create a production deployment through the Vercel integration was rejected with HTTP **403**, specifically "You don't have permission to create a Production Deployment for this project." Don't workaround the problem by deploying to project `lernioai` or reassigning the canonical domain to its unrelated preview/production build.

### Action by the Vercel project owner

Using an account with deployment rights on the team:

1. Open **Vercel → gyash28s-projects → lernio-ai** (exact project); inspect **Git / Production Branch = main** and any ignored-build or deployment protection setting.
2. If Git auto-deployment was skipped, use the project's *Deployments* interface to redeploy the correct latest **`main`** SHA. Verify `665b41...` or a reviewed descendant — never a stale PR branch preview.
3. Alternatively, from a local clone at the verified production commit and signed in to the proper Vercel team:

   ```bash
   git fetch origin
   git checkout main
   git pull --ff-only origin main
   # Confirm this prints the commit to release, including PR #64.
   git rev-parse HEAD
   vercel link --yes --scope gyash28s-projects --project lernio-ai
   # Confirm .vercel/project.json matches project ID prj_Fxoq746ddfh4piIMmraZSB9jN8iK.
   vercel deploy --prod --yes --scope gyash28s-projects
   ```

   Do **not** paste or commit Vercel tokens. Keep local `.env` and `.vercel` credentials private.

4. Check `lernioai.vercel.app` alias mapping equals that deployment ID and the deployment is **READY**.

## Production smoke / QA gate

CI now runs `npm run test:production` against `next build` + `next start`, in addition to the normal dev E2E suite.

After the canonical deployment has changed, verify the **actual public domain** in a real, unprotected browser session:
- Sign up a dedicated non-admin test account, sign out, sign back in, check persistent session after refresh and browser reopen.
- Test invalid login, password reset, and redirect to `/dashboard` without redirecting to `lernioai-sigma.vercel.app` or a random generated Vercel hostname.
- Check browser console, hydration warnings, CSP violations, unexpected page reloads, and service worker registrations.
- Check desktop and mobile, both new and returning visitors. Confirm route navigation, Notes, Materials, Tutor, Practice, and settings, including empty states.
- Inspect runtime error logs for real-world failures. **The current integration also receives 403 for runtime log access**, so request read access or use the dashboard.
- Do not call this app bug-free from green CI alone. Keep unfinished 238 lessons and unreviewed videos blocked until the public release is genuinely stable.

See GitHub issue #65 for release tracking.
