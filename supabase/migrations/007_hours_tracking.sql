-- 007_hours_tracking.sql
-- Nieuwe urenregistratie per opdrachtgever (los van bestaande timer-gebaseerde kk_time_entries)
-- Tabellen: kk_clients (opdrachtgevers met target) + kk_hour_entries (decimal-uren per dag)

CREATE TABLE IF NOT EXISTS kk_clients (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          text NOT NULL,
  target_hours  numeric NOT NULL DEFAULT 0,
  target_period text NOT NULL DEFAULT 'month'
    CHECK (target_period IN ('week','month','total')),
  archived      boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS kk_hour_entries (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id   uuid NOT NULL REFERENCES kk_clients(id) ON DELETE CASCADE,
  entry_date  date NOT NULL,
  hours       numeric(5,2) NOT NULL CHECK (hours > 0),
  description text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kk_clients_user_id ON kk_clients(user_id);
CREATE INDEX IF NOT EXISTS idx_kk_hour_entries_user_date ON kk_hour_entries(user_id, entry_date);
CREATE INDEX IF NOT EXISTS idx_kk_hour_entries_user_client ON kk_hour_entries(user_id, client_id);

ALTER TABLE kk_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE kk_hour_entries ENABLE ROW LEVEL SECURITY;

-- kk_clients policies
DROP POLICY IF EXISTS "Users can view own clients" ON kk_clients;
CREATE POLICY "Users can view own clients" ON kk_clients
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create own clients" ON kk_clients;
CREATE POLICY "Users can create own clients" ON kk_clients
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own clients" ON kk_clients;
CREATE POLICY "Users can update own clients" ON kk_clients
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own clients" ON kk_clients;
CREATE POLICY "Users can delete own clients" ON kk_clients
  FOR DELETE USING (user_id = auth.uid());

-- kk_hour_entries policies
DROP POLICY IF EXISTS "Users can view own hour entries" ON kk_hour_entries;
CREATE POLICY "Users can view own hour entries" ON kk_hour_entries
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create own hour entries" ON kk_hour_entries;
CREATE POLICY "Users can create own hour entries" ON kk_hour_entries
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own hour entries" ON kk_hour_entries;
CREATE POLICY "Users can update own hour entries" ON kk_hour_entries
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own hour entries" ON kk_hour_entries;
CREATE POLICY "Users can delete own hour entries" ON kk_hour_entries
  FOR DELETE USING (user_id = auth.uid());

-- updated_at triggers (hergebruik bestaande update_updated_at() functie uit 001)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at' AND tgrelid = 'kk_clients'::regclass) THEN
    CREATE TRIGGER set_updated_at BEFORE UPDATE ON kk_clients
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at' AND tgrelid = 'kk_hour_entries'::regclass) THEN
    CREATE TRIGGER set_updated_at BEFORE UPDATE ON kk_hour_entries
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;