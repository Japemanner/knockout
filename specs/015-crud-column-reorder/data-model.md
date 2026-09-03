# Data Model: CRUD Kolom Volgorde Aanpasbaar

**Date**: 2026-08-29
**Feature**: 015-crud-column-reorder

## Schema wijziging

### Nieuwe kolom: `kk_crud_overviews.column_order`

```sql
ALTER TABLE kk_crud_overviews
  ADD COLUMN IF NOT EXISTS column_order TEXT[] NOT NULL DEFAULT '{}';
```

| Eigenschap | Waarde |
|------------|--------|
| Type | `TEXT[]` (array van kolomnamen) |
| Nullable | Nee (`NOT NULL`) |
| Default | `'{}'` (lege array = natuurlijke volgorde) |
| RLS | Overerft bestaande policies op `kk_crud_overviews` (geen nieuwe policies nodig) |
| Index | Nee — array wordt bij elke open actief gelezen; geen query-optimalisatie nodig op dit volume |

### Bestaande kolommen ongewijzigd

- `id`, `user_id`, `name`, `connection_id`, `table_name`, `interaction_type`, `hidden_columns`, `position`, `created_at`, `updated_at` — allen ongewijzigd.

## Ordering logica

### `applyColumnOrder(allColumns, savedOrder)` — algoritme

```
Input:
  allColumns = [A, B, C, D, E]  (natuurlijke volgorde uit DB-introspectie)
  savedOrder = [C, A, E]        (opgeslagen gebruikersvoorkeur)

Output:
  ordered = [C, A, E, B, D]    (savedOrder eerst, rest in natuurlijke volgorde)

Regels:
  1. Kolommen in savedOrder komen eerst, in die volgorde
  2. Kolommen in allColumns maar niet in savedOrder (nieuw in DB) verschijnen daarna in natuurlijke volgorde (FR-007)
  3. Kolommen in savedOrder maar niet in allColumns (verwijderd uit DB) worden overgeslagen (FR-008)
  4. Lege savedOrder ([] of undefined) → natuurlijke volgorde (allColumns ongeordend)
```

### Interactie met `hidden_columns`

`hidden_columns` en `column_order` zijn onafhankelijk:
- `column_order` bevat alle kolomnamen (zowel zichtbare als verborgen) in de gekozen volgorde
- `hidden_columns` bepaalt welke kolommen niet worden getoond
- Volgorde wordt berekend vóór hidden-filtering: `applyColumnOrder(all, order).filter(notHidden)` (FR-010)

### Actie-kolom

De actie-kolom (bewerk/verwijder-knoppen, `canEdit && <th>`) staat vast rechts en is niet opgenomen in `column_order` en niet versleepbaar (FR-011). Wordt na `displayColumns` gerenderd, los van de sorteer-context.

### Reset volgorde

`column_order = []` betekent natuurlijke volgorde (default). "Reset volgorde" schrijft `[]` naar de database en wist daarmee de opgeslagen voorkeur.

## Type wijziging

```ts
// src/types/database.types.ts
export interface CRUDOverview {
  // ... bestaande velden ...
  column_order: string[]  // NEW
}
```

## Migratie-strategie

- Bestaande CRUD-overviews krijgen `column_order = '{}'` (default) → natuurlijke volgorde, geen gedragsverandering
- Geen data-migratie nodig (default dekt alle bestaande rijen)
- Migration file: `supabase/migrations/015_crud_overviews_column_order.sql`