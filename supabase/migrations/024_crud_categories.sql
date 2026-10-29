-- CRUD categories: horizontal category tabs on the CRUD tab (feature 025)
-- Run this migration in the Supabase SQL Editor

CREATE TABLE IF NOT EXISTS kk_crud_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crud_categories_user_position ON kk_crud_categories(user_id, position);

ALTER TABLE kk_crud_categories ENABLE ROW LEVEL SECURITY;

-- RLS policies: users can only see/manage their own CRUD categories
DROP POLICY IF EXISTS "Users can view their own CRUD categories" ON kk_crud_categories;
CREATE POLICY "Users can view their own CRUD categories" ON kk_crud_categories FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create their own CRUD categories" ON kk_crud_categories;
CREATE POLICY "Users can create their own CRUD categories" ON kk_crud_categories FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own CRUD categories" ON kk_crud_categories;
CREATE POLICY "Users can update their own CRUD categories" ON kk_crud_categories FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own CRUD categories" ON kk_crud_categories;
CREATE POLICY "Users can delete their own CRUD categories" ON kk_crud_categories FOR DELETE USING (user_id = auth.uid());

-- Link overviews to categories; deleting a category uncategorizes its overviews
ALTER TABLE kk_crud_overviews ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES kk_crud_categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_crud_overviews_category ON kk_crud_overviews(user_id, category_id);

-- Updated_at trigger
DROP TRIGGER IF EXISTS set_updated_at ON kk_crud_categories;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON kk_crud_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at();