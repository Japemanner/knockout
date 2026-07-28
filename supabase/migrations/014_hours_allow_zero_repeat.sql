-- 014_hours_allow_zero_repeat.sql
-- Herhaal de constraint fix uit 012 voor productiedatabases waar 012 niet is gedraaid.
-- Vervangt CHECK (hours > 0) door CHECK (hours >= 0) zodat lopende urenregels (hours = 0) opgeslagen kunnen worden.

ALTER TABLE kk_hour_entries DROP CONSTRAINT IF EXISTS kk_hour_entries_hours_check;
ALTER TABLE kk_hour_entries ADD CONSTRAINT kk_hour_entries_hours_check CHECK (hours >= 0);