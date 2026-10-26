-- What Supabase provides that our migrations rely on, for local Postgres and CI only.
-- Never run this against a Supabase project.
-- Test files set up their databases in parallel and roles are shared by the whole server, so
-- one shim runs at a time (the lock lasts until this script's implicit transaction ends).
SELECT pg_advisory_xact_lock(4242);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role NOLOGIN BYPASSRLS; END IF;
EXCEPTION WHEN duplicate_object OR unique_violation THEN
  NULL; -- another setup created them first
END $$;

CREATE SCHEMA IF NOT EXISTS auth;
CREATE TABLE IF NOT EXISTS auth.users (
  id uuid PRIMARY KEY,
  email text,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Supabase reads the user id from the request's JWT claims.
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT nullif(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub', '')::uuid
$$;

GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated, service_role;
GRANT anon, authenticated, service_role TO CURRENT_USER;
