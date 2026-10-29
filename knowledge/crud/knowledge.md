# CRUD-domein — feiten en patronen

## Feiten (feature 025-crud-categorie-sync, 2026-10-29)

- De CRUD-module gebruikt een ander dataflow-patroon dan uren/content: server components met ISR/`revalidatePath` en mutatie-server-actions — het uren-besluit (2026-09-22, browser-client reads) geldt níet voor deze module.
- `searchParams`-gebruik in een Next 15-pagina maakt de pagina dynamisch; de `export const revalidate = 60` wordt inerte. /crud is sinds 025 dynamisch (verse data per request, Link-prefetch behouden).
- Mutatie-actions (`updateCrudOverview`) revalideerden historisch alleen `/crud`, nooit de detailroute — dat was de oorzaak van de delete+recreate-workaround bij schemawijzigingen; sinds 025 revalideert `syncCrudOverviewSchema` de detailroute expliciet.
- Metadata komt via SECURITY DEFINER-RPC's (`get_table_columns`, `get_table_foreign_keys`) met de authenticated client (besluit 2026-07-23); server actions worden niet ge-ISR-cached, dus een vers-call binnen een action is altijd actueel.
- `kk_crud_overviews`-instellingen die kolomnamen refereren (`hidden_columns`, `column_order`, `column_filters`) moeten bij schemadrift gepruned worden — `pruneStaleFilters` (018) + `pruneColumnSettings` (025, lib/crud/schema-sync.ts, unit-getest).
- Migratienummering heeft reserveringen over features heen: 023 gereserveerd voor 024-post-bijlagen; 025-feature gebruikte 024. Check `supabase/migrations/` én de specs-plannen vóór nummerkeuze.

## Patronen

- RLS-migraties: 003-patroon (`CREATE TABLE IF NOT EXISTS` + `ENABLE ROW LEVEL SECURITY` + vier `DROP POLICY IF EXISTS`/`CREATE POLICY` op `user_id = auth.uid()` + `update_updated_at()`-trigger), handmatig te draaien via SQL Editor.
- Koppelingen tussen eigen tabellen: nullable FK met `ON DELETE SET NULL` + ownership-check in de action-laag vóór de update (RLS is vangnet; FK-checks lopen buiten RLS om).
- UI zonder dropdown-dependency: hover-iconen (group-hover) + Dialog voor beheer-acties; native `<select>` met vastgezette optie-styling voor dark mode (017).
- Fitness-check F-08 gropt per regel: suppressie van `any` moet op dezelfde regel staan (of vermijd de helper door inline te werken met de untyped client).