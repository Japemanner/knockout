-- CRUD overviews table
-- Run this migration in the Supabase SQL Editor

CREATE TABLE IF NOT EXISTS kk_crud_overviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  connection_id UUID REFERENCES kk_db_connections(id) ON DELETE SET NULL,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE kk_crud_overviews ENABLE ROW LEVEL SECURITY;

-- RLS policies: users can only see/manage their own CRUD overviews
DROP POLICY IF EXISTS "Users can view their own CRUD overviews" ON kk_crud_overviews;
CREATE POLICY "Users can view their own CRUD overviews" ON kk_crud_overviews FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create their own CRUD overviews" ON kk_crud_overviews;
CREATE POLICY "Users can create their own CRUD overviews" ON kk_crud_overviews FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own CRUD overviews" ON kk_crud_overviews;
CREATE POLICY "Users can update their own CRUD overviews" ON kk_crud_overviews FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own CRUD overviews" ON kk_crud_overviews;
CREATE POLICY "Users can delete their own CRUD overviews" ON kk_crud_overviews FOR DELETE USING (user_id = auth.uid());

-- Updated_at trigger
DROP TRIGGER IF EXISTS set_updated_at ON kk_crud_overviews;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON kk_crud_overviews FOR EACH ROW EXECUTE FUNCTION update_updated_at();