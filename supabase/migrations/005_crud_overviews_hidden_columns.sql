-- Add hidden_columns array to kk_crud_overviews
-- Run this migration in the Supabase SQL Editor

ALTER TABLE kk_crud_overviews
  ADD COLUMN IF NOT EXISTS hidden_columns TEXT[] NOT NULL DEFAULT '{}';
