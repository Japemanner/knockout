-- 012_hours_allow_zero.sql
-- Sta urenregels toe met hours = 0 (voor regels zonder eindtijd / "lopende" regels).
-- De originele constraint CHECK (hours > 0) uit 007 wordt vervangen door CHECK (hours >= 0).

ALTER TABLE kk_hour_entries DROP CONSTRAINT IF EXISTS kk_hour_entries_hours_check;
ALTER TABLE kk_hour_entries ADD CONSTRAINT kk_hour_entries_hours_check CHECK (hours >= 0);