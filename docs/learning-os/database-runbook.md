# Learning OS Database Runbook

Date: 2026-06-29

## Local PostgreSQL

Start a local development database:

```bash
docker compose -f docker-compose.dev.yml up -d
```

The local service uses:

```text
DATABASE_URL=postgresql://lernio:lernio_password@localhost:5432/lernio?schema=public
DIRECT_URL=postgresql://lernio:lernio_password@localhost:5432/lernio?schema=public
```

These credentials are for local development only. Production credentials must be configured only in Vercel or the target secret manager.

## Health

```bash
docker compose -f docker-compose.dev.yml ps
npx prisma validate
npx prisma migrate status
```

Application probes:

```bash
curl http://localhost:3000/api/health
curl http://localhost:3000/api/ready
```

`/api/health` is a process health check. `/api/ready` must be used before deployment promotion because it checks critical dependencies such as PostgreSQL.

## Migrate

For local development:

```bash
npx prisma generate
npx prisma migrate deploy
npm run db:departments
npm run db:departments:scope -- --dry-run
npm run curriculum:import
```

Use `npm run db:reset` only for disposable local/demo data. Do not run destructive reset or seed commands during normal Vercel builds.

## Backup

Example local backup:

```bash
docker exec lernio-postgres-dev pg_dump -U lernio -d lernio --format=custom --file=/tmp/lernio.dump
docker cp lernio-postgres-dev:/tmp/lernio.dump ./tmp/lernio.dump
```

## Restore

For a disposable local database:

```bash
docker cp ./tmp/lernio.dump lernio-postgres-dev:/tmp/lernio.dump
docker exec lernio-postgres-dev pg_restore -U lernio -d lernio --clean --if-exists /tmp/lernio.dump
```

## Production Order

1. Confirm `DATABASE_URL`, `DIRECT_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, storage, email, AI and YouTube variables are configured in Vercel.
2. Backup the production database.
3. Deploy committed migrations with `npx prisma migrate deploy` or the production deployment command that runs it.
4. Deploy the app build.
5. Verify `/api/health` and `/api/ready`.
6. Run post-deploy smoke tests.
7. Promote only after readiness is healthy.

## Current Local Blocker

As of 2026-06-29, this Windows environment does not have Docker installed and PostgreSQL at `localhost:5432` is unreachable, so migration status and `/api/ready` cannot pass locally until a database is available.
