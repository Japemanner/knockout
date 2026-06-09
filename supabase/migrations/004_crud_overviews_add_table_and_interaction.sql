-- Add table_name and interaction_type columns to kk_crud_overviews
-- Run this migration in the Supabase SQL Editor

ALTER TABLE kk_crud_overviews
  ADD COLUMN IF NOT EXISTS table_name TEXT,
  ADD COLUMN IF NOT EXISTS interaction_type TEXT NOT NULL DEFAULT 'crud'
    CHECK (interaction_type IN ('crud', 'formulier'));