# Contract: RLS-policy-invarianten

**Feature**: 029-page-load-performance | **Date**: 2026-11-06

Deze migratie mag de prestaties van RLS verbeteren, maar **geen enkele zichtbare of toegestane actie veranderen**. Dit contract is de checklist waarmee de migratie wordt beoordeeld.

## 1. Toegestane wijziging

Voor elke policy-expressie:

```sql
-- Voor
user_id = auth.uid()
organization_id = get_user_org_id()
EXISTS (SELECT 1 FROM kk_profiles WHERE id = auth.uid() AND role = 'admin')

-- Na
user_id = (select auth.uid())
organization_id = (select get_user_org_id())
EXISTS (SELECT 1 FROM kk_profiles WHERE id = (select auth.uid()) AND role = 'admin')
```

En in de helperfunctie:

```sql
-- Voor
SELECT organization_id FROM kk_profiles WHERE id = auth.uid()

-- Na
SELECT organization_id FROM kk_profiles WHERE id = (select auth.uid())
```

## 2. Verboden wijzigingen

| Verboden | Reden |
|----------|-------|
| Een policy verwijderen | Verandert de effectieve toegang. |
| Twee policies samenvoegen | Verandert de evaluatie en mogelijk de rechten. |
| De rollen (`TO authenticated`, `TO anon`, ...) wijzigen | Verandert wie de policy mag gebruiken. |
| Het commando (`SELECT`/`INSERT`/`UPDATE`/`DELETE`) wijzigen | Verandert welke actie wordt toegestaan. |
| `USING` en `WITH CHECK` omwisselen | Verandert de richting van de controle. |
| `SECURITY DEFINER` verwijderen uit `get_user_org_id()` | Kan de functie onder RLS laten vastlopen. |
| Een kolom of tabel toevoegen | Buiten scope. |
| `auth.uid()` vervangen door een custom claim | Vereist auth-wijzigingen; buiten scope. |
| Een policy op een andere tabel zetten | Verandert de beveiligingsgrens. |

## 3. Equivalentie-eisen

1. **Naam**: elke policy houdt exact dezelfde naam.
2. **Tabel**: elke policy blijft op dezelfde tabel.
3. **Commando**: `SELECT`, `INSERT`, `UPDATE` of `DELETE` blijft gelijk.
4. **Rollen**: dezelfde rollen blijven gekoppeld.
5. **Expressie**: na normalisatie (haakjes, `select`-wrapper) is de logische expressie identiek.
6. **Returnwaarde helper**: `get_user_org_id()` geeft voor elke gebruiker hetzelfde `organization_id` als voorheen.
7. **Rechten**: een `anon`-gebruiker, een `authenticated`-gebruiker en een admin zien exact dezelfde rijen en mogen exact dezelfde acties uitvoeren.

## 4. Verificatiematrix

| Controle | Commando/methode | Pass |
|----------|------------------|------|
| Aantal policies vóór en na | `select count(*) from pg_policy ...` | 90 → 90 |
| Policynamen vóór en na | Vergelijk de lijst | Identiek |
| Advisor initplan | Supabase MCP `get_advisors` performance | 0 |
| Advisor unindexed FK | Supabase MCP `get_advisors` performance | 0 |
| Helper-return | SQL-query met twee testgebruikers | Identiek |
| Cross-user read | Playwright/F-01 of handmatige REST-call | Gebruiker A ziet geen rij van B |
| Admin-actie | Bestaande E2E of handmatige controle | Toegestaan zoals voorheen |
| Member-actie | Bestaande E2E of handmatige controle | Geweigerd zoals voorheen |
| Volledige suite | `npx playwright test` | Geen nieuwe failures |

## 5. Uitrol en terugdraaien

1. Migratie lokaal vastleggen als `supabase/migrations/026_performance_rls.sql`.
2. Toepassen via de Supabase MCP op project `ythjnatklbnjtvvgpwlr`.
3. Direct daarna de performance-adviseur opnieuw opvragen.
4. Bij een onverwachte wijziging in rechten: compensatiemigratie met de oorspronkelijke expressies en `DROP INDEX` voor de nieuwe indexen. De oude expressies staan in `supabase/migrations/001_initial_schema.sql`, `002_kanban_workspace.sql`, `003_crud_overviews.sql`, `007_hours_tracking.sql`, `013_command_center_priorities.sql`, `022_content_calendar.sql`, `024_crud_categories.sql` en `025_content_ideas.sql`.

## 6. Bewijs bij oplevering

- De volledige lijst van 90 policies vóór en na (naam + tabel + commando).
- De advisor-uitvoer met 0 initplan en 0 unindexed FK.
- De Playwright-run.
- Een korte notitie waaruit blijkt dat `get_user_org_id()` dezelfde waarde teruggeeft.
