# Quickstart: Kortere laadtijd van pagina's

**Feature**: 029-page-load-performance | **Date**: 2026-11-06

> **Status 2026-11-06**: de migratie is toegepast op project `ythjnatklbnjtvvgpwlr`. `auth_rls_initplan` en `unindexed_foreign_keys` zijn 0. `scripts/rls-verify.mjs` is toegevoegd en groen.

## 1. Releasevolgorde

1. **Database eerst**: pas `supabase/migrations/026_performance_rls.sql` toe. De migratie verandert geen gedrag: alleen policy-expressies krijgen een `(select ...)`-wrapper en er komen 20 foreign-key-indexen bij. Zij mag daarom los vóór de frontend.
2. **Frontend daarna**: deploy de frontend met de nieuwe `netlify.toml`-cacheheader, `staleTimes.dynamic = 30`, de vier laadgrenzen en de harde uitlog-navigatie. De frontend is onafhankelijk van de migratie, maar de volgorde maakt terugdraaien eenvoudiger.
3. **Na de release**: voer de controles uit §3 uit.

De migratie mag **niet** worden toegepast zonder expliciete bevestiging in de chat. Er is één Supabase-project en dat is productie.

## 2. Vóór de release

```bash
npx tsc --noEmit
npx eslint src/ --max-warnings 0
npm run build
```

Verwacht:

- [ ] TypeScript strict compileert zonder errors.
- [ ] ESLint geeft 0 warnings.
- [ ] De build is groen en de chunktabel komt overeen met de baseline in [research.md](./research.md) §Nulmeting 0b (gedeelde basis 103 kB; `/content` 200 kB; `/uren` 211 kB).
- [ ] `package.json` en `package-lock.json` zijn ongewijzigd.

Playwright:

```bash
npx playwright test
```

Verwacht:

- [ ] Bestaande tests slagen of skippen volgens de bestaande login-guard.
- [ ] Geen nieuwe failures.
- [ ] Nieuwe test `tests/e2e/performance.spec.ts`: login-gated; controleert dat een tweede bezoek aan `/crud` binnen 30 seconden geen nieuwe `/crud`-request oplevert. Zonder sessie skipt hij volgens de bestaande guard.

## 3. Controle na de release

1. **Database-adviseur** via de Supabase MCP, project `ythjnatklbnjtvvgpwlr`:

   ```text
   get_advisors({ project_id: "ythjnatklbnjtvvgpwlr", type: "performance" })
   ```

   Verwacht:
   - [ ] `auth_rls_initplan`: 0.
   - [ ] `unindexed_foreign_keys`: 0.
   - [ ] Geen nieuwe security- of performance-meldingen door de migratie.
   - [ ] Het aantal policies is nog steeds 101 in `public` + `storage` (90 herschreven, 11 ongewijzigd).

2. **Policies na de migratie** opslaan:

   ```sql
   SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
   FROM pg_policies
   WHERE schemaname IN ('public', 'storage')
   ORDER BY 1, 2, 3;
   ```

   Sla de volledige uitvoer op als `specs/029-page-load-performance/policies-after.txt`.

3. **Handmatige nameting op de iPhone** (door de gebruiker zelf):
   - Koude start op `/` met de netwerkprofiler.
   - Controleer dat het startscherm sneller is en dat de pagina niet op een tweede navigatie wacht.
   - Controleer dat een paginawissel binnen 30 seconden niet opnieuw alle data ophaalt.
   - Controleer na uitloggen dat de browser-back geen dashboardpagina uit de cache toont.
   - Noteer de waarden in [research.md](./research.md) of in het releaseverslag.

4. **RLS-verificatie**: draai `node scripts/rls-verify.mjs`. Het script simuleert de `authenticated`-rol met een echte JWT-claim, vergelijkt de RLS-zichtbare aantallen met de verwachte aantallen en controleert dat geen policy een ongewrapte identiteitsfunctie bevat. Verwacht: `RLS verify: PASS`.

## 4. Terugdraaien

### Frontend

Deploy de vorige Netlify-deploy opnieuw. Dat draait de cacheheader, `staleTimes.dynamic`, de vier laadgrenzen en de harde uitlog-navigatie terug. De cacheheader zelf is onschadelijk en hoeft niet per se terug.

### Database

Voer `specs/029-page-load-performance/rollback.sql` uit. Dat script:

- herstelt de 90 policies exact zoals ze in `policies-before.txt` staan;
- verwijdert de 20 nieuwe indexen.

Het script is niet automatisch uitgevoerd. Controleer na het terugdraaien:

- [ ] `get_advisors` meldt weer de oude aantallen (70 initplan, 20 unindexed FK).
- [ ] De policies zijn inhoudelijk gelijk aan `policies-before.txt`.
- [ ] Geen nieuwe indexen met het achtervoegsel `_idx` die door deze feature zijn toegevoegd.

## 5. Bestanden

| Bestand | Doel |
|---------|------|
| `supabase/migrations/026_performance_rls.sql` | 90 policy-rewrites + 20 FK-indexen; nog niet toegepast |
| `specs/029-page-load-performance/policies-before.txt` | Volledige `pg_policies`-uitvoer vóór de migratie |
| `specs/029-page-load-performance/rollback.sql` | Exacte terugdraaiing van de migratie |
| `netlify.toml` | `Cache-Control` voor `/_next/static/*` |
| `specs/029-page-load-performance/research.md` | Nulmeting, N/A-verklaringen en blokkades |

## 6. Foutopsporing

| Symptoom | Waarschijnlijke oorzaak | Actie |
|----------|-------------------------|-------|
| Adviseur meldt nog initplan | Een policy is niet meegenomen | Vergelijk de policylijst met `policies-before.txt` en `026_performance_rls.sql`. |
| Adviseur meldt nog unindexed FK | Indexnaam of kolom wijkt af | Vergelijk met de 20 indexregels in de migratie. |
| Migratie faalt op een policy | Een expressie is niet exact overgenomen | Vergelijk met `policies-before.txt`; herstel de expressie één-op-één. |
| Terugdraaien geeft een fout | Een policy bestaat niet meer of een indexnaam wijkt af | Gebruik `DROP POLICY IF EXISTS` / `DROP INDEX IF EXISTS`; vergelijk met `rollback.sql`. |
| Playwright skipt alles | Geen login-sessie | Log in via de bestaande setup of accepteer de skip; de handmatige meting blijft verplicht. |
