# Authentication And Roles

## Student Access

Students can create their own Lernio account with name, email, and password. No college-generated username, password, administrator approval, or invite code is required for the ordinary `student` role.

Academic details are optional at signup:

- department/programme
- semester
- division
- roll number

Missing fields can be completed later from onboarding/profile completion.

## Google OAuth

Google sign-in is available when `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are configured. New OAuth users are created as active students and marked as needing profile completion.

## Elevated Roles

Elevated roles are protected:

- `cr`
- `teacher`
- `coordinator`
- `moderator`
- `reviewer`
- `admin`

Self-service signup cannot assign these roles. Elevated access requires an invite or admin approval workflow. Invite records support active/revoked state, expiry, email binding, max-use/use-count fields, and audit logging.

Students can create a pending role request through `POST /api/roles/request`. Admin/coordinator review UI and approval routes are still pending.

## Permissions

The canonical permission matrix lives in `src/lib/roles.ts`. Server routes should check roles or permissions server-side and never trust role fields from the browser.

## Administrator Bootstrap

No personal email address is promoted to administrator by runtime source-code fallback. The seed/bootstrap script can create an initial admin account for `LERNIO_ADMIN_EMAIL` (default `ultimatebracegaming@gmail.com`) only when an explicit `LERNIO_ADMIN_PASSWORD` is available. Treat `npm run db:seed` as destructive: it deletes and recreates demo academic data.
