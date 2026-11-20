-- 027_mileage.sql
-- Kilometerregistratie voor zakelijke ritten met de privéauto.
-- distance_km is ALTIJD het totaal aantal gereden kilometers; is_return is
-- alleen informatief (de UI verdubbelt de enkele afstand vóór opslaan).
-- rate_per_km is een snapshot per rit (zoals hourly_rate in 010); amount is een
-- generated column en mag nooit in insert/update-payloads worden meegestuurd.

CREATE TABLE IF NOT EXISTS kk_mileage_trips (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id      uuid REFERENCES kk_clients(id) ON DELETE SET NULL,
  trip_date      date NOT NULL,
  from_location  text NOT NULL CHECK (length(trim(from_location)) > 0),
  to_location    text NOT NULL CHECK (length(trim(to_location)) > 0),
  purpose        text NOT NULL CHECK (length(trim(purpose)) > 0),
  distance_km    numeric(7,1) NOT NULL CHECK (distance_km > 0),
  is_return      boolean NOT NULL DEFAULT false,
  rate_per_km    numeric(4,2) NOT NULL CHECK (rate_per_km >= 0),
  amount         numeric(10,2) GENERATED ALWAYS AS (round(distance_km * rate_per_km, 2)) STORED,
  reimbursed_at  date,
  notes          text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kk_mileage_trips_user_date
  ON kk_mileage_trips(user_id, trip_date DESC);
CREATE INDEX IF NOT EXISTS idx_kk_mileage_trips_user_reimbursed
  ON kk_mileage_trips(user_id, reimbursed_at);
CREATE INDEX IF NOT EXISTS idx_kk_mileage_trips_client
  ON kk_mileage_trips(client_id);

ALTER TABLE kk_mileage_trips ENABLE ROW LEVEL SECURITY;

-- RLS in de stijl van 026: auth.uid() eenmalig als (select ...) zodat Postgres
-- de functie niet per rij opnieuw hoeft te evalueren.
DROP POLICY IF EXISTS "Users can view own mileage trips" ON kk_mileage_trips;
CREATE POLICY "Users can view own mileage trips" ON kk_mileage_trips
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((user_id = (select auth.uid())));

DROP POLICY IF EXISTS "Users can create own mileage trips" ON kk_mileage_trips;
CREATE POLICY "Users can create own mileage trips" ON kk_mileage_trips
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK ((user_id = (select auth.uid())));

DROP POLICY IF EXISTS "Users can update own mileage trips" ON kk_mileage_trips;
CREATE POLICY "Users can update own mileage trips" ON kk_mileage_trips
  AS PERMISSIVE
  FOR UPDATE
  TO public
  USING ((user_id = (select auth.uid())))
  WITH CHECK ((user_id = (select auth.uid())));

DROP POLICY IF EXISTS "Users can delete own mileage trips" ON kk_mileage_trips;
CREATE POLICY "Users can delete own mileage trips" ON kk_mileage_trips
  AS PERMISSIVE
  FOR DELETE
  TO public
  USING ((user_id = (select auth.uid())));

-- updated_at trigger (hergebruik bestaande update_updated_at() functie uit 001)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'set_updated_at' AND tgrelid = 'kk_mileage_trips'::regclass
  ) THEN
    CREATE TRIGGER set_updated_at BEFORE UPDATE ON kk_mileage_trips
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;
