-- RPC functions voor CRUD table metadata introspectie via PostgREST.
-- Vervangt de directe pg.Pool queries uit src/lib/db/introspect.ts voor de
-- local-db (eigen project) flow. Werkt over HTTPS (poort 443) i.p.v. directe
-- TCP naar Supavisor — compatibel met Netlify serverless.
--
-- SECURITY DEFINER is nodig omdat information_schema voor authenticated users
-- alleen hun eigen schema's laat zien; met SECURITY DEFINER (su postgres) zien
-- we alle public-schema tabellen. De functions zijn read-only en retourneren
-- geen user-geprivate data — alleen schema-metadata.

CREATE OR REPLACE FUNCTION get_table_columns(p_schema text, p_table text)
RETURNS TABLE(
  column_name text,
  data_type text,
  is_nullable boolean,
  column_default text,
  character_maximum_length integer,
  is_primary_key boolean,
  is_identity text,
  is_generated text
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    c.column_name::text,
    c.data_type::text,
    (c.is_nullable = 'YES') AS is_nullable,
    c.column_default::text,
    c.character_maximum_length::integer,
    COALESCE(tc.constraint_type = 'PRIMARY KEY', false) AS is_primary_key,
    c.is_identity::text,
    c.is_generated::text
  FROM information_schema.columns c
  LEFT JOIN information_schema.key_column_usage kcu
    ON c.table_schema = kcu.table_schema
    AND c.table_name = kcu.table_name
    AND c.column_name = kcu.column_name
  LEFT JOIN information_schema.table_constraints tc
    ON kcu.constraint_name = tc.constraint_name
    AND tc.constraint_type = 'PRIMARY KEY'
  WHERE c.table_schema = p_schema AND c.table_name = p_table
  ORDER BY c.ordinal_position;
$$;

CREATE OR REPLACE FUNCTION get_table_foreign_keys(p_schema text, p_table text)
RETURNS TABLE(
  column_name text,
  referenced_table_name text,
  referenced_column_name text
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    kcu.column_name::text,
    ccu.table_name::text AS referenced_table_name,
    ccu.column_name::text AS referenced_column_name
  FROM information_schema.key_column_usage kcu
  JOIN information_schema.referential_constraints rc
    ON kcu.constraint_name = rc.constraint_name
  JOIN information_schema.constraint_column_usage ccu
    ON rc.unique_constraint_name = ccu.constraint_name
  WHERE kcu.table_schema = p_schema AND kcu.table_name = p_table;
$$;

GRANT EXECUTE ON FUNCTION get_table_columns(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_table_foreign_keys(text, text) TO authenticated;