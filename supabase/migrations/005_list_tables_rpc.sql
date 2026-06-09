-- Supabase RPC function to list tables
-- Works via supabase.rpc('list_tables') — no direct pg connection needed
-- Run this migration in the Supabase SQL Editor

CREATE OR REPLACE FUNCTION list_tables()
RETURNS TABLE(table_name text, table_schema text)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT t.table_name::text, t.table_schema::text
  FROM information_schema.tables t
  WHERE t.table_schema NOT IN ('pg_catalog', 'information_schema', 'extensions', 'vault', 'storage', 'auth', 'realtime', '_realtime', 'supabase_functions', 'supabase_migrations', 'pgsodium', 'pgsodium_masks', 'pgbouncer', 'hooks')
    AND t.table_type = 'BASE TABLE'
    AND t.table_schema NOT LIKE 'supabase_%'
    AND t.table_schema NOT LIKE 'pg_%'
    AND t.table_schema NOT LIKE '_realtime%'
  ORDER BY t.table_schema, t.table_name;
$$;

GRANT EXECUTE ON FUNCTION list_tables() TO authenticated;
GRANT EXECUTE ON FUNCTION list_tables() TO anon;