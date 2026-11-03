-- 025_content_ideas.sql
-- Content-ideeën (feature 026): status is een vrij label geworden, dus de
-- datum/tijd-eis voor gepland/live vervalt. De DELETE-policy op soorten
-- vervalt zodat archiveren de enige weg is. Niet-destructief: geen data weg.

ALTER TABLE kk_content_posts
  DROP CONSTRAINT IF EXISTS kk_content_posts_datetime_required;

DROP POLICY IF EXISTS "Users can delete own content pillars" ON kk_content_pillars;

CREATE INDEX IF NOT EXISTS idx_kk_content_posts_user_created
  ON kk_content_posts (user_id, created_at DESC);
