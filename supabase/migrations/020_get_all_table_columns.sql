-- Eén set-based call i.p.v. list_tables + N x get_table_columns.
-- Zelfde tabellen als list_tables(), zelfde kolomvelden als get_table_columns(),
-- één rij per kolom (PK via pg_index i.p.v. key_column_usage/table_constraints).
CREATE OR REPLACE FUNCTION public.get_all_table_columns()
RETURNS TABLE(
  table_schema text,
  table_name text,
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
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  with tbl as (
    select lt.table_schema, lt.table_name
    from public.list_tables() lt
  ),
  pk as (
    select n.nspname::text as table_schema,
           cl.relname::text as table_name,
           a.attname::text  as column_name
    from pg_catalog.pg_index i
    join pg_catalog.pg_class cl     on cl.oid = i.indrelid
    join pg_catalog.pg_namespace n  on n.oid = cl.relnamespace
    join pg_catalog.pg_attribute a  on a.attrelid = cl.oid and a.attnum = any (i.indkey)
    where i.indisprimary
  )
  select
    c.table_schema::text,
    c.table_name::text,
    c.column_name::text,
    c.data_type::text,
    (c.is_nullable = 'YES'),
    c.column_default::text,
    c.character_maximum_length::integer,
    (pk.column_name is not null),
    c.is_identity::text,
    c.is_generated::text
  from information_schema.columns c
  join tbl
    on tbl.table_schema = c.table_schema
   and tbl.table_name  = c.table_name
  left join pk
    on pk.table_schema = c.table_schema
   and pk.table_name   = c.table_name
   and pk.column_name  = c.column_name
  order by c.table_schema, c.table_name, c.ordinal_position;
$$;

REVOKE EXECUTE ON FUNCTION public.get_all_table_columns() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_all_table_columns() TO authenticated;