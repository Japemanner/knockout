# Server Actions Contract: 025-crud-categorie-sync

**Feature**: 025-crud-categorie-sync | **Datum**: 2026-10-29

Alle actions draaien onder `'use server'` en gebruiken `getAuthenticatedClient()` uit `src/lib/supabase/actions.ts` (één client, geen tweede instantie). Foutafhandeling conform het bestaande patroon: géén throw naar de UI, maar `{ …, error }`-returns die de componenten als destructive toast tonen. Na mutaties `revalidatePath('/crud')`; de detailroute wordt uitsluitend door de sync-action gerevalideerd.

## Nieuw: `src/actions/crud-categories.ts`

### createCrudCategory

| | |
|---|---|
| Input | `{ name: string }` |
| Output | `{ id: string; error: string \| null }` |
| Regels | `name.trim()` niet-leeg (FR-002); `position = MAX(position) + 1` over de eigen categorieën; insert met `user_id` |

### renameCrudCategory

| | |
|---|---|
| Input | `{ categoryId: string; name: string }` |
| Output | `{ success: boolean; error: string \| null }` |
| Regels | `name.trim()` niet-leeg; update via `.eq('id', categoryId).eq('user_id', userId)` (ownership); direct zichtbaar resultaat in de tab (FR-006) |

### deleteCrudCategory

| | |
|---|---|
| Input | `{ categoryId: string }` |
| Output | `{ success: boolean; error: string \| null }` |
| Regels | ownership-filter; overzichten blijven bestaan — database lost `category_id` op via `ON DELETE SET NULL` (FR-008); bevestiging zit in de UI |

## Gewijzigd: `src/actions/crud-overviews.ts`

### Bestaande actions

| Action | Wijziging |
|--------|-----------|
| `getCrudOverviews` | select-lijst uitbreiden met `category_id` |
| `createCrudOverview` | input + insert `category_id: string \| null`; bij gevulde waarde ownership-check op `kk_crud_categories` (id behoort tot de gebruiker) |
| `updateCrudOverview` | ongewijzigd — categoriewijzigingen gaan uitsluitend via `setCrudOverviewCategory` |

### Nieuw: setCrudOverviewCategory

| | |
|---|---|
| Input | `{ crudId: string; categoryId: string \| null }` |
| Output | `{ success: boolean; error: string \| null }` |
| Regels | ownership overzicht (user_id); bij niet-null `categoryId` ownership-check op de categorie; update `category_id` (FR-007); `revalidatePath('/crud')` |

### Nieuw: syncCrudOverviewSchema

| | |
|---|---|
| Input | `{ crudId: string; knownColumns?: string[] }` — `knownColumns` zijn de kolomnamen zoals de detailpagina ze op het moment van klikken rendert (client-props); dienen uitsluitend voor de toegevoegd/verwijderd-feedback; de pruning is server-autoritair via de RPC |
| Output | `{ success: boolean; added: string[]; removed: string[]; error: string \| null }` |
| Flow | 1. overzicht ophalen (`table_name`, `hidden_columns`, `column_order`, `column_filters`) — zonder `table_name` of niet gevonden → fout, niets wijzigen<br>2. `getLocalTableMeta(table_name)` — fout → fout retourneren, niets wijzigen (FR-014)<br>3. `pruneColumnSettings` (uit `src/lib/crud/schema-sync.ts`) tegen de actuele kolommen<br>4. alleen bij wijzigingen: gesaneerde `hidden_columns` / `column_order` / `column_filters` persisteren (FR-013)<br>5. `revalidatePath('/crud/' + crudId)` + `revalidatePath('/crud')`<br>6. `{ added, removed }` retourneren voor de toast (FR-015) |

## Pure helpers: `src/lib/crud/schema-sync.ts` (geen 'use server')

| Functie | Input | Output |
|----------|-------|--------|
| `diffColumns` | `previous: string[], current: string[]` | `{ added: string[]; removed: string[] }` |
| `pruneColumnSettings` | `{ hiddenColumns: string[]; columnOrder: string[]; filters: ColumnFilters }` + `currentColumns: ColumnInfo[]` | gesaneerde variant van alle drie (filters via bestaande `pruneStaleFilters`; volgorde behoudt relatieve ordening van overgebleven kolommen; verwijderde kolommen uit `hiddenColumns` weglaten) |

Deze functies zijn puur en unit-testbaar (`tests/e2e/crud-schema-sync-logic.spec.ts`); de sync-action is de enige consument.

## Regressie-impact (AGENTS.md-regels)

- **Gewijzigde server actions** (`createCrudOverview`, `updateCrudOverview`): E2E verifieert dat mutaties na herladen in de UI zichtbaar blijven.
- **Nieuwe `revalidatePath` op de detailroute** (sync-action): E2E verifieert verse weergave na de sync-klik (toast + refresh); volledige live schemadrift is niet praktisch E2E-testbaar — dekking via unit-tests op de pruning en de quickstart-handcheck.
- Bestaande suite moet groen blijven (reorder/filters/column-order-specs).