-- 022_content_calendar.sql
-- LinkedIn content-kalender (feature 023): contentsoorten met vaste weekslots + posts
-- Tabellen: kk_content_pillars (soorten) + kk_content_slots (weekslots) + kk_content_posts (posts)
-- Idempotent, stijl conform 007_hours_tracking.sql. Wordt handmatig gedraaid in de Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS kk_content_pillars (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text NOT NULL,
  audience    text,
  description text,
  color       text NOT NULL DEFAULT 'blue'
    CHECK (color IN ('blue','green','orange','purple','pink','yellow','teal','gray')),
  archived    boolean NOT NULL DEFAULT false,
  position    int NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS kk_content_slots (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pillar_id   uuid NOT NULL REFERENCES kk_content_pillars(id) ON DELETE CASCADE,
  weekday     smallint NOT NULL CHECK (weekday BETWEEN 1 AND 7),  -- ISO: 1 = maandag
  post_time   time NOT NULL DEFAULT '08:00',
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pillar_id, weekday)  -- maximaal één slot per weekdag per soort
);

CREATE TABLE IF NOT EXISTS kk_content_posts (
  id                        uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id                   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pillar_id                 uuid REFERENCES kk_content_pillars(id) ON DELETE SET NULL,
  title                     text NOT NULL,
  body                      text NOT NULL DEFAULT '',
  format                    text NOT NULL DEFAULT 'tekst'
    CHECK (format IN ('tekst','afbeelding','carrousel','video','poll')),
  status                    text NOT NULL DEFAULT 'idee'
    CHECK (status IN ('idee','concept','klaar','gepland','live')),
  planned_date              date,             -- null = ideeënbak
  planned_time              time,
  source_url                text,
  linkedin_url              text,
  notes                     text,
  scheduled_on_linkedin_at  timestamptz,      -- moment van inplannen in LinkedIn (bij status gepland)
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now(),
  -- Gepland en Live vereisen altijd een datum en tijd (vangnet; de applicatie
  -- weigert ongeldige combinaties eerst met een NL-melding).
  CONSTRAINT kk_content_posts_datetime_required
    CHECK (status NOT IN ('gepland','live') OR (planned_date IS NOT NULL AND planned_time IS NOT NULL))
);

-- Geen DB-constraint op de lengte van body: een concept mag tijdelijk langer
-- zijn dan 3.000 tekens; de grens bewaakt de applicatie bij statusovergangen.

CREATE INDEX IF NOT EXISTS idx_kk_content_posts_user_date ON kk_content_posts(user_id, planned_date);
CREATE INDEX IF NOT EXISTS idx_kk_content_slots_user ON kk_content_slots(user_id);
CREATE INDEX IF NOT EXISTS idx_kk_content_pillars_user ON kk_content_pillars(user_id);

ALTER TABLE kk_content_pillars ENABLE ROW LEVEL SECURITY;
ALTER TABLE kk_content_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE kk_content_posts ENABLE ROW LEVEL SECURITY;

-- kk_content_pillars policies
DROP POLICY IF EXISTS "Users can view own content pillars" ON kk_content_pillars;
CREATE POLICY "Users can view own content pillars" ON kk_content_pillars
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create own content pillars" ON kk_content_pillars;
CREATE POLICY "Users can create own content pillars" ON kk_content_pillars
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own content pillars" ON kk_content_pillars;
CREATE POLICY "Users can update own content pillars" ON kk_content_pillars
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own content pillars" ON kk_content_pillars;
CREATE POLICY "Users can delete own content pillars" ON kk_content_pillars
  FOR DELETE USING (user_id = auth.uid());

-- kk_content_slots policies
DROP POLICY IF EXISTS "Users can view own content slots" ON kk_content_slots;
CREATE POLICY "Users can view own content slots" ON kk_content_slots
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create own content slots" ON kk_content_slots;
CREATE POLICY "Users can create own content slots" ON kk_content_slots
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own content slots" ON kk_content_slots;
CREATE POLICY "Users can update own content slots" ON kk_content_slots
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own content slots" ON kk_content_slots;
CREATE POLICY "Users can delete own content slots" ON kk_content_slots
  FOR DELETE USING (user_id = auth.uid());

-- kk_content_posts policies
DROP POLICY IF EXISTS "Users can view own content posts" ON kk_content_posts;
CREATE POLICY "Users can view own content posts" ON kk_content_posts
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create own content posts" ON kk_content_posts;
CREATE POLICY "Users can create own content posts" ON kk_content_posts
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own content posts" ON kk_content_posts;
CREATE POLICY "Users can update own content posts" ON kk_content_posts
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own content posts" ON kk_content_posts;
CREATE POLICY "Users can delete own content posts" ON kk_content_posts
  FOR DELETE USING (user_id = auth.uid());

-- updated_at triggers (hergebruik bestaande update_updated_at() functie uit 001)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at' AND tgrelid = 'kk_content_pillars'::regclass) THEN
    CREATE TRIGGER set_updated_at BEFORE UPDATE ON kk_content_pillars
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at' AND tgrelid = 'kk_content_slots'::regclass) THEN
    CREATE TRIGGER set_updated_at BEFORE UPDATE ON kk_content_slots
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at' AND tgrelid = 'kk_content_posts'::regclass) THEN
    CREATE TRIGGER set_updated_at BEFORE UPDATE ON kk_content_posts
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;