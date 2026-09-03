-- Add column_order array to kk_crud_overviews for user-configurable column ordering
-- Run this migration in the Supabase SQL Editor

ALTER TABLE kk_crud_overviews
  ADD COLUMN IF NOT EXISTS column_order TEXT[] NOT NULL DEFAULT '{}';