# Data Model: Centraal categoriebeheer op het CRUD-tabblad

**Feature**: 027-crud-categorie-beheer | **Date**: 2026-11-03

Er is **geen databasemigratie** nodig. Deze feature gebruikt de bestaande tabellen uit migratie `supabase/migrations/024_crud_categories.sql` ongewijzigd. Hieronder staan de relevante entiteiten, hun relatie en de regels die de UI en server actions moeten respecteren.

## Bestaande entiteiten

### `kk_crud_categories` (ongewijzigd)

| Kolom | Type | Regels |
|---|---|---|
| `id` | `uuid` | Primary key, default `gen_random_uuid()` |
| `user_id` | `uuid` | Verplicht, FK naar `auth.users(id)` met `ON DELETE CASCADE`; eigenaar |
| `name` | `text` | Verplicht; wordt door de actie getrimd; lege/whitespace-naam geweigerd; duplicaten toegestaan |
| `position` | `int` | Verplicht, default `0`; aanmaakvolgorde (`COUNT(*)` bij insert, bestaand gedrag) |
| `created_at` | `timestamptz` | Default `now()` |
| `updated_at` | `timestamptz` | Default `now()`; bijgewerkt door de bestaande `set_updated_at`-trigger |

**Index**: `idx_crud_categories_user_position (user_id, position)` — dekt de lijstquery `order by position`.

### `kk_crud_overviews` (ongewijzigd, relevant veld)

| Kolom | Type | Regels |
|---|---|---|
| `category_id` | `uuid` | Nullable; FK naar `kk_crud_categories(id)` met `ON DELETE SET NULL` |

**Index**: `idx_crud_overviews_category (user_id, category_id)` — dekt het filteren op categorie.

De `ON DELETE SET NULL`-relatie is de garantie achter FR-009: het verwijderen van een categorie laat elk overzicht bestaan en maakt het ongecategoriseerd.

## Relatie

```text
auth.users (1) ──< kk_crud_categories (0..n)
                        │ 1
                        │
                        └──< kk_crud_overviews (0..n)   [category_id nullable, ON DELETE SET NULL]
```

- Een categorie hoort bij precies één gebruiker.
- Een overzicht hoort bij nul of één categorie.
- Een categorie bevat nul of meer overzichten.
- Verwijderen van een gebruiker verwijdert diens categorieën; de overzichten vallen terug op `category_id = NULL` (bestaand gedrag).

## RLS (ongewijzigd)

`kk_crud_categories` heeft RLS aan met vier policies, alle op `user_id = auth.uid()`:

| Operatie | Policy |
|---|---|
| SELECT | `Users can view their own CRUD categories` |
| INSERT | `Users can create their own CRUD categories` (WITH CHECK) |
| UPDATE | `Users can update their own CRUD categories` (USING + WITH CHECK) |
| DELETE | `Users can delete their own CRUD categories` |

`kk_crud_overviews` behoudt zijn bestaande user-scoped policies. De server actions filteren daarnaast expliciet op `user_id`; RLS is het vangnet.

## Afgeleid model (niet opgeslagen)

### `CategoryWithCount` (UI-model)

```ts
interface CategoryWithCount {
  id: string
  name: string
  overviewCount: number
}
```

- Wordt in `src/app/(dashboard)/crud/page.tsx` opgebouwd uit de al geladen `categories` en `allOverviews`.
- `overviewCount` = het aantal overzichten met `category_id === category.id`.
- Wordt nooit gepersisteerd; na elke mutatie opnieuw berekend bij de server-render.

## Validatieregels

| Regel | Bron | Afgedwongen in |
|---|---|---|
| Naam is verplicht en mag niet alleen whitespace zijn | FR-005, FR-007 | Client (disabled + trim) én `createCrudCategory`/`renameCrudCategory` (trim + fout) |
| Duplicate namen zijn toegestaan | Spec-assumptie | Geen unieke constraint; beide rijen blijven apart |
| Categorieën zijn user-scoped | FR-012 | RLS + expliciete `user_id`-filters in de acties |
| Verwijderen verwijdert nooit overzichten | FR-009 | `ON DELETE SET NULL` + bevestigingsweergave in de UI |
| Naam van een categorie mag lang zijn | Edge case | UI: `break-words`/`min-w-0`; geen DB-limiet aanwezig |
| Positie is de aanmaakvolgorde | FR-003 | `order by position`; nieuwe categorie krijgt `COUNT(*)` (bestaand) |

## Toegestane toestandsovergangen

```text
(geen categorie) --aanmaken--> bestaat
bestaat --hernoemen--> bestaat (zelfde id, nieuwe naam)
bestaat --verwijderen--> (geen categorie); overzichten: category_id = NULL
```

Er zijn geen andere statusvelden, soft-deletes of archivering.

## Buiten scope (datamodel)

- Nieuwe kolommen (kleur, icoon, volgorde-handmatig, `overview_count`).
- Nieuwe indexen of constraints.
- Migratie of datacorrectie van bestaande rijen.
- Herordenen van categorieën; `position` blijft voorlopig zoals het is.
