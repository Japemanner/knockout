-- 008_hours_start_end_time.sql
-- Voeg start_time en end_time toe aan kk_hour_entries
-- hours wordt afgeleid uit (end_time - start_time); beide nullable voor backwards compat

ALTER TABLE kk_hour_entries ADD COLUMN IF NOT EXISTS start_time timestamptz;
ALTER TABLE kk_hour_entries ADD COLUMN IF NOT EXISTS end_time timestamptz;

CREATE INDEX IF NOT EXISTS idx_kk_hour_entries_user_start ON kk_hour_entries(user_id, start_time);