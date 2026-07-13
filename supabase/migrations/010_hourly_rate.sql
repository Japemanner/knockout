-- 010_hourly_rate.sql
-- Voeg uurtarief (hourly_rate) toe aan kk_clients en kk_hour_entries.
-- kk_clients.hourly_rate: het standaard tarief dat de gebruiker per opdrachtgever invult.
-- kk_hour_entries.hourly_rate: snapshot van het tarief op het moment van opschrijven,
--   zodat historische regels niet veranderen als het tarief later wijzigt.

ALTER TABLE kk_clients ADD COLUMN IF NOT EXISTS hourly_rate numeric(8,2) NOT NULL DEFAULT 0
  CHECK (hourly_rate >= 0);

ALTER TABLE kk_hour_entries ADD COLUMN IF NOT EXISTS hourly_rate numeric(8,2) NOT NULL DEFAULT 0
  CHECK (hourly_rate >= 0);