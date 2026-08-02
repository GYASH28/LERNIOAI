-- Lernio accesses PostgreSQL through server-side Prisma. The browser does not
-- use Supabase PostgREST for application tables, so anon/authenticated roles
-- must not have direct access to the public schema.
--
-- This migration is intentionally role-aware so it also succeeds in local CI
-- databases where Supabase roles do not exist.

DO $$
DECLARE
  target_role text;
  target_table record;
BEGIN
  -- RLS is defense in depth. The application database owner and the dedicated
  -- lernio_runtime role (when provisioned with BYPASSRLS) continue to use
  -- server-side Prisma normally.
  FOR target_table IN
    SELECT n.nspname AS schema_name, c.relname AS table_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind IN ('r', 'p')
  LOOP
    EXECUTE format(
      'ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY',
      target_table.schema_name,
      target_table.table_name
    );
  END LOOP;

  FOREACH target_role IN ARRAY ARRAY['anon', 'authenticated']
  LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = target_role) THEN
      EXECUTE format('REVOKE USAGE ON SCHEMA public FROM %I', target_role);
      EXECUTE format(
        'REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM %I',
        target_role
      );
      EXECUTE format(
        'REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM %I',
        target_role
      );
      EXECUTE format(
        'REVOKE ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public FROM %I',
        target_role
      );
      EXECUTE format(
        'ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM %I',
        target_role
      );
      EXECUTE format(
        'ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON SEQUENCES FROM %I',
        target_role
      );
      EXECUTE format(
        'ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM %I',
        target_role
      );
    END IF;
  END LOOP;
END
$$;
