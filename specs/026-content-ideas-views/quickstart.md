# Quickstart: Content-ideeën snel vastleggen en overzicht per soort

**Feature**: 026-content-ideas-views | **Date**: 2026-11-03

## Voorwaarden

1. Migratie `022_content_calendar.sql` is toegepast (de content-tabellen bestaan).
2. `.env.local` bevat de bestaande Supabase-URL en anon key.
3. `npm install` is uitgevoerd.
4. Pas daarna `025_content_ideas.sql` toe via de Supabase SQL Editor of Supabase MCP. De migratie is idempotent; opnieuw draaien is veilig.

## Lokaal starten

```bash
npm run dev
```

Open `http://localhost:3000/content` en log in.

## Handmatige verificatie

### 1. Twee views en geen kalender (FR-001/FR-002/FR-003)

- [ ] "Content" staat in de linkerbalk direct onder "Uren".
- [ ] De pagina opent standaard op de tab "Ideeën".
- [ ] Er is een tab "Overzicht"; beide zijn met één klik bereikbaar.
- [ ] Er is nergens een maandraster, maandnavigatie, "Vandaag", leeg/gemist slot, sleepbare kaart of verlopen-markering.

### 2. Snel een idee vastleggen (FR-004 t/m FR-010, SC-001)

- [ ] Typ alleen een titel en druk op Enter.
- [ ] Het idee staat direct bovenaan de lijst; het formulier is leeg en de cursor staat weer in het titelveld.
- [ ] Herhaal met een titel + contentsoort + idee-tekst; de kleur en soortnaam staan in de lijst.
- [ ] Open "Meer details" en vul bron-URL en notities in; opslaan werkt.
- [ ] Laat de titel leeg en probeer op te slaan: er verschijnt een inline melding en er wordt niets bewaard.
- [ ] Druk snel twee keer op Enter tijdens een opslag: er ontstaat precies één idee.

### 3. Verboden velden (FR-005, SC-004)

Controleer in de composer én in de detail-editor dat deze labels/velden niet voorkomen:

- [ ] Format
- [ ] Datum
- [ ] Tijd
- [ ] LinkedIn-URL

### 4. Detail bewerken en verwijderen (FR-011/FR-012)

- [ ] Klik op een idee; de detailweergave opent met titel, soort, status, idee-tekst, bron-URL en notities.
- [ ] Wijzig de titel, druk op Ctrl/Cmd+S of "Opslaan"; de lijst is direct bijgewerkt.
- [ ] Sluit met niet-opgeslagen wijzigingen: er volgt een in-app bevestiging.
- [ ] Verwijder een idee en bevestig; het verdwijnt uit de lijst en het aantal daalt.
- [ ] Wijzig de status naar Gepland of Live zonder datum/tijd; opslaan lukt (FR-012).

### 5. Overzicht per contentsoort (FR-013 t/m FR-017, SC-002/SC-003/SC-006)

- [ ] Maak via "Soorten" twee soorten aan, bijvoorbeeld "Test A" en "Test B".
- [ ] Voeg 2 ideeën aan Test A toe, 1 aan Test B en 1 zonder soort.
- [ ] Open "Overzicht": Test A = 2, Test B = 1, "Geen soort" = minstens 1, totaal = minstens 4 (plus eventuele bestaande data).
- [ ] Een soort zonder ideeën staat met 0 in het overzicht.
- [ ] Voeg in "Ideeën" nog een idee aan Test A toe en schakel terug: Test A = 3 zonder de pagina te verversen.
- [ ] Hernoem Test A naar "Test A gewijzigd": de lijst en het overzicht tonen direct de nieuwe naam.
- [ ] Archiveer Test A: de soort is niet meer kiesbaar in de composer, maar staat nog met het juiste aantal en "(gearchiveerd)" in het overzicht.

### 6. Bestaande content (FR-023 t/m FR-025, SC-005)

- [ ] Elk item dat vóór de wijziging in de content-omgeving stond, staat in de ideeënlijst.
- [ ] Pas `tests/fixtures/legacy-content.sql` toe via Supabase MCP of de SQL Editor. De fixture voegt één post met een vaste titel en legacy-velden (`planned_date`, `planned_time`, `format`, `linkedin_url`, `scheduled_on_linkedin_at`, status `gepland`) toe.
- [ ] Controleer dat de fixturetitel in de lijst staat, meetelt in het totaal en dat de vier verboden velden niet zichtbaar zijn.
- [ ] Bestaande items met een datum, tijd, format of LinkedIn-URL tonen die velden niet meer, maar zijn wel bewerkbaar.
- [ ] Het totaal in het overzicht is gelijk aan het aantal items in de lijst.
- [ ] Bestaande items met status Gepland/Live gedragen zich als gewone ideeën.
- [ ] Ruim de fixture daarna op met de cleanup-regels onderaan `tests/fixtures/legacy-content.sql`.

### 7. Mobiel (FR-026, SC-007)

- [ ] Zet de viewport op 375 px breed.
- [ ] De tabs, composer en lijst zijn bruikbaar zonder horizontaal scrollen.
- [ ] Het overzicht toont alle rijen leesbaar.

## Automatische checks

Voor de preservatietest in `tests/e2e/content-ideas.spec.ts`: pas eerst `tests/fixtures/legacy-content.sql` toe (zie stap 6) en ruim die na de test op.

```bash
npx tsc --noEmit
npm run lint
npx playwright test tests/e2e/content-ideas-logic.spec.ts
npx playwright test tests/e2e/content-ideas.spec.ts
npx playwright test
```

Verwacht:

- `tsc` en ESLint zonder fouten (`--max-warnings 0`).
- De logicatests draaien zonder login (pure functies).
- De E2E-tests slaan over zonder login en draaien groen met een geldige sessie.
- De volledige suite blijft groen; de oude kalendertests zijn verwijderd.

## Handige testdata

- Gebruik unieke namen met `Date.now()` in E2E-tests om botsingen bij parallelle runs te voorkomen.
- Ruim testsoorten niet handmatig op via delete (bestaat niet); archiveer ze. De tests controleren relatieve aantallen per unieke soort, niet het globale totaal.

## Migratie terugdraaien (alleen lokaal)

De migratie is niet-destructief voor data, maar verscherpt wel de pillar-policy. Terugdraaien is alleen nodig als je de oude constraint en delete-policy wilt herstellen:

```sql
ALTER TABLE kk_content_posts
  ADD CONSTRAINT kk_content_posts_datetime_required
  CHECK (status NOT IN ('gepland','live') OR (planned_date IS NOT NULL AND planned_time IS NOT NULL));

DROP POLICY IF EXISTS "Users can delete own content pillars" ON kk_content_pillars;
CREATE POLICY "Users can delete own content pillars" ON kk_content_pillars
  FOR DELETE USING (user_id = auth.uid());
```

Verwijder de index alleen als je zeker weet dat de nieuwe lijstquery niet meer gebruikt wordt:

```sql
DROP INDEX IF EXISTS idx_kk_content_posts_user_created;
```
