# Data Model: CRUD-categorieën en Supabase-sync

**Feature**: 025-crud-categorie-sync | **Datum**: 2026-10-29

## Nieuwe tabel `kk_crud_categories`

| Kolom | Type | Constraints |
|-------|------|-------------|
| id | uuid | PRIMARY KEY, default gen_random_uuid() |
| user_id | uuid | NOT NULL, REFERENCES auth.users(id) ON DELETE CASCADE |
| name | text | NOT NULL |
| position | int | NOT NULL, default 0 |
| created_at | timestamptz | NOT NULL, default now() |
| updated_at | timestamptz | NOT NULL, default now() |

- Index: `(user_id, position)` — categorieën per gebruiker op aanmaakvolgorde.
- `updated_at` via de bestaande trigger-functie `update_updated_at()` (003-patroon).
- Dubbele namen toegestaan (spec: conform naamgeving bij borden/overzichten); lege namen weigert de action-laag (FR-002).
- Positie: `MAX(position) + 1` per gebruiker bij aanmaken (bestaand overzichten-patroon).

## RLS

`ALTER TABLE kk_crud_categories ENABLE ROW LEVEL SECURITY;` plus vier policies op `user_id = auth.uid()` (select/insert/update/delete), elk voorafgegaan door `DROP POLICY IF EXISTS` — identiek aan het patroon uit `003_crud_overviews.sql`.

## Wijziging `kk_crud_overviews`

```sql
ALTER TABLE kk_crud_overviews ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES kk_crud_categories(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_crud_overviews_category ON kk_crud_overviews(user_id, category_id);
```

- Nullable: een overzicht zonder categorie is ongecategoriseerd en zichtbaar onder "Alle" — bestaande overzichten hebben géén migratie nodig.
- `ON DELETE SET NULL`: categorie verwijderen laat de overzichten bestaan en ongecategoriseerd worden (FR-008).
- Ownership: de action-laag valideert dat een gekozen `category_id` van dezelfde gebruiker is; RLS op beide tabellen is het vangnet. FK-constraint-checks verlopen buiten RLS (Postgres) en zijn dus geen belemmering.
- Bestaande kolommen ongewijzigd: name, table_name, connection_id, interaction_type, hidden_columns, column_order, column_filters, position.

## Migratie

- Bestand: `supabase/migrations/024_crud_categories.sql` — idempotent (`CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, `DROP POLICY IF EXISTS` vóór elke `CREATE POLICY`).
- Nummering: `023` is gereserveerd voor `specs/024-post-bijlagen` (`023_content_attachments.sql`, nog niet toegepast); deze feature gebruikt `024`. Volgende vrije nummer daarna: `025`.
- Toepassen via Supabase MCP (AGENTS.md-regel); daarna direct F-01 verifiëren: RLS actief op `kk_crud_categories` en de vier policies aanwezig.

## Types

Na toepassing van de migratie: `npm run types:update` om `kk_crud_categories`-types en `category_id` op `kk_crud_overviews` te genereren in `src/types/database.types.ts`. Is geen database beschikbaar, dan handmatige tussenoplossing conform de 023-conventie.

## Sync-flow — geen nieuw schema

De sync-knop raakt géén tabellenstructuur aan. De flow leest metadata via de bestaande RPC's (`get_table_columns`, `get_table_foreign_keys` — SECURITY DEFINER, aangeroepen met de authenticated client conform besluit `2026-07-23-crud-postgrest-migration.md`) en schrijft uitsluitend de gesaneerde `hidden_columns` / `column_order` / `column_filters` terug naar de bestaande rij in `kk_crud_overviews`:

```
syncCrudOverviewSchema(crudId)
  → overzicht ophalen (table_name, hidden_columns, column_order, column_filters)
  → getLocalTableMeta(table_name)          // RPC, altijd actueel
  → pruneColumnSettings(..., actuele kolommen)
  → update uitsluitend bij wijziging       // gesaneerde instellingen
  → revalidatePath('/crud/' + crudId) + revalidatePath('/crud')
  → { added: string[], removed: string[] } // voor de toast-feedback
```

Foutpad (tabel verwijderd / onbereikbaar): fout retourneren, niets wijzigen (FR-014).