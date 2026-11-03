-- tests/fixtures/legacy-content.sql
-- Deterministische preservatiefixture voor feature 026 (FR-023/FR-024/SC-005).
--
-- Vervang 'vervang@example.com' door het e-mailadres van de testgebruiker.
-- De fixture is idempotent op de vaste titel. Zonder toepassing faalt de
-- preservatietest in tests/e2e/content-ideas.spec.ts bewust: zo kan SC-005
-- niet leeg groen worden.

INSERT INTO kk_content_posts (
  user_id,
  pillar_id,
  title,
  body,
  format,
  status,
  planned_date,
  planned_time,
  linkedin_url,
  scheduled_on_linkedin_at,
  notes
)
SELECT
  u.id,
  NULL,
  'LEGACY-FIXTURE-026',
  'Bestaand idee met legacy-planning.',
  'tekst',
  'gepland',
  DATE '2026-11-04',
  TIME '08:00',
  'https://www.linkedin.com/feed/update/legacy-fixture-026',
  NOW(),
  'Niet verwijderen: testfixture voor feature 026.'
FROM auth.users u
WHERE u.email = 'vervang@example.com'
  AND NOT EXISTS (
    SELECT 1
    FROM kk_content_posts p
    WHERE p.user_id = u.id
      AND p.title = 'LEGACY-FIXTURE-026'
  );

-- Cleanup (na de test):
-- DELETE FROM kk_content_posts WHERE title = 'LEGACY-FIXTURE-026';
