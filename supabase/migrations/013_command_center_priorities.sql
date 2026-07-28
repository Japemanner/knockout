-- 013_command_center_priorities.sql
-- Top 3 bewerkbare prioriteiten per gebruiker op het command center.
-- Eén rij per gebruiker met drie vrije-tekst velden.

CREATE TABLE IF NOT EXISTS kk_priorities (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_1      text NOT NULL DEFAULT '',
  item_2      text NOT NULL DEFAULT '',
  item_3      text NOT NULL DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Eén set per gebruiker
CREATE UNIQUE INDEX IF NOT EXISTS idx_kk_priorities_user_id ON kk_priorities(user_id);

ALTER TABLE kk_priorities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own priorities" ON kk_priorities;
CREATE POLICY "Users can view own priorities"
  ON kk_priorities FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can upsert own priorities" ON kk_priorities;
CREATE POLICY "Users can upsert own priorities"
  ON kk_priorities FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own priorities" ON kk_priorities;
CREATE POLICY "Users can update own priorities"
  ON kk_priorities FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own priorities" ON kk_priorities;
CREATE POLICY "Users can delete own priorities"
  ON kk_priorities FOR DELETE USING (user_id = auth.uid());

-- updated_at trigger
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at' AND tgrelid = 'kk_priorities'::regclass) THEN
    CREATE TRIGGER set_updated_at BEFORE UPDATE ON kk_priorities
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;