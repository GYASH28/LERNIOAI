# CWIT Learning OS Runbook

This runbook covers the first deployable slice of the CWIT Learning OS implementation: verified syllabus source registration, import queueing, resource governance, and the additive database foundation required for deeper curriculum tooling.

## Data Foundation

The migration `20260626143000_add_cwit_learning_os_foundation` adds additive tables and metadata fields for:

- syllabus documents, source snapshots, import jobs, and import findings
- curriculum versions, course catalogs, elective groups, outcomes, practicals, and references
- resource providers, topic mappings, resource reviews, and review decisions
- assessment blueprints, formal assessments, assignments, notices, saved views, export jobs, integration health, feature flags, and job runs
- expanded audit, role, invite, department, programme, scheme, subject, unit, topic, lesson, question, and resource metadata

The migration is additive so existing student, tutor, authority, and content flows continue to run while the new admin workflows are filled in.

## Source Registry

Seed or refresh CWIT hierarchy first:

```bash
npm run db:departments
```

Register the official CWIT source manifest:

```bash
npm run db:cwit:sources
```

The manifest lives at `data/cwit/source-registry.json`. It stores public CWIT source URLs and metadata only. The import script resolves the existing `CWIT` institution and department codes, then upserts `SyllabusDocument` and `SourceSnapshot` rows.

## Admin Workflows

Routes:

- `/admin/syllabus/sources`: register official PDFs, department pages, circulars, uploaded object keys, or internally verified documents
- `/admin/syllabus/imports`: queue a source for human-reviewed parsing/import
- `/admin/resources/queue`: manage provider policy and review pending resources

All three pages currently require active admin authority. That is deliberate until scoped coordinator/reviewer filtering is implemented end to end.

## API Workflows

- `GET /api/syllabus/sources`: list registered syllabus sources
- `POST /api/syllabus/sources`: register a source and snapshot
- `GET /api/syllabus/imports`: list import jobs
- `POST /api/syllabus/imports`: queue a source import
- `GET /api/resources/providers`: list resource providers
- `POST /api/resources/providers`: create/update provider policy
- `POST /api/resources/review`: record a resource review decision

Every endpoint is admin-only and writes audit events for mutating actions.

## Safety Notes

- Source registration accepts `https`/`http` public URLs or an uploaded object key.
- Localhost and private network URLs are rejected to reduce SSRF risk before fetch workers exist.
- Import queueing is a workflow marker, not a blind parser. The current parser version defaults to `manual-review-v1`.
- Resource review decisions are explicit: `approved`, `rejected`, `changes_requested`, or `held`.
- Do not store database URLs, credentials, API keys, or private upload URLs in the source manifest.

## Vercel

Use the normal production build command:

```bash
npm run vercel-build
```

The committed migration is applied by `prisma migrate deploy` when database environment variables exist. For pooled production Postgres, provide a direct/non-pooled URL through `DATABASE_URL_UNPOOLED`, `POSTGRES_URL_NON_POOLING`, or `DIRECT_URL`.
