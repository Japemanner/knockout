-- Add column_filters JSONB to kk_crud_overviews for stateful per-column filtering
-- Each overview is bound to exactly one table (table_name), so storing filters
-- on the overview gives per-user per-table filter state.
-- Shape: { "column_name": { "op": "contains", "value": "..." }, ... }
-- Run this migration in the Supabase SQL Editor

ALTER TABLE kk_crud_overviews
  ADD COLUMN IF NOT EXISTS column_filters JSONB NOT NULL DEFAULT '{}';

COMMENT ON COLUMN kk_crud_overviews.column_filters IS 'Stateful per-column filter conditions, keyed by column name';