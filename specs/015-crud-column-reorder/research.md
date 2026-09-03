# Research: CRUD Kolom Volgorde Aanpasbaar

**Date**: 2026-08-29
**Feature**: 015-crud-column-reorder

## Codebase Analysis

### Bestaande CRUD-architectuur

**Server-side data flow:**
- `src/app/(dashboard)/crud/[crudId]/page.tsx` — server component, haalt CRUD-overzicht op uit `kk_crud_overviews` met `.eq('user_id', userId)` (RLS-gefilterd)
- `src/actions/crud-overviews.ts` — server actions: `getCrudOverviews`, `createCrudOverview`, `updateCrudOverview`, `deleteCrudOverview`, `reorderCrudOverviews`
- `src/actions/local-db.ts` — `getLocalTableMeta` retourneert `ColumnInfo[]` via Supabase RPC `kk_get_table_meta`

**Client-side rendering:**
- `LocalDynamicTable.tsx` — wrapper die `GenericTable` aanstuurt met lokale DB data source
- `GenericTable.tsx` — de eigenlijke tabelweergave met CRUD-dialogen
  - Lijn 124: `displayColumns = columns.filter(c => !c.isPrimaryKey && !hiddenColumns.includes(c.name)).slice(0, 8)`
  - Lijn 155-161: statische `<thead>` met `displayColumns.map`
  - Lijn 160: actie-kolom (bewerk/verwijder) vast rechts, niet in `displayColumns`
- `ColumnVisibilityDialog.tsx` — kolom tonen/verbergen dialoog, roept `updateCrudOverview({ crudId, hidden_columns })` aan

### Database schema

**`kk_crud_overviews`** (migratie 003):
- `id UUID PK`, `user_id UUID NOT NULL REFERENCES auth.users(id)`, `name TEXT`, `connection_id UUID NULL`, `position INT`, `created_at`, `updated_at`
- RLS: `user_id = auth.uid()` voor SELECT/INSERT/UPDATE/DELETE
- `hidden_columns TEXT[] NOT NULL DEFAULT '{}'` (migratie 005)
- `table_name TEXT NULL`, `interaction_type TEXT` (migratie 004)

Elk CRUD-overzicht heeft een `user_id` — er is geen scenario waarin meerdere gebruikers hetzelfde overzicht delen. "Per-gebruiker-per-overzicht" = opslag op de bestaande rij.

### TypeScript types

`src/types/database.types.ts` lijn 169-180:
```ts
export interface CRUDOverview {
  id: string
  user_id: string
  name: string
  connection_id: string | null
  table_name: string | null
  interaction_type: 'crud' | 'formulier'
  hidden_columns: string[]
  position: number
  created_at: string
  updated_at: string
}
```

### Beschikbare drag-and-drop library

`package.json` bevat al:
- `@dnd-kit/core`
- `@dnd-kit/sortable`
- `@dnd-kit/utilities`

Deze zijn geïnstalleerd voor het kanban-bord (kaarten slepen tussen kolommen). Hergebruik voor kolomkop-slepen is de natuurlijke keuze — geen nieuwe dependency nodig.

### Bestaand reorder-patroon

`reorderCrudOverviews` in `crud-overviews.ts` (lijn 96-107) gebruikt een simpel `Promise.all` patroon om posities te updaten. Het kanban-bord gebruikt `@dnd-kit/sortable` in `src/components/kanban/`. Zelfde patroon toepasbaar voor kolomkoppen.

### Kolom-instellingenmenu

`ColumnVisibilityDialog.tsx` is het bestaande dialoog voor tonen/verbergen van kolommen. Het heeft een "Kolommen" knop met `Columns3` icoon. De "Reset volgorde" actie past hier natuurlijk in — dezelfde context (kolom-configuratie).

## Library evaluation

### @dnd-kit/sortable (gekozen)

**Waarom**: Al geïnstalleerd, bewezen in kanban-module, ondersteunt horizontale sorting, accessible (keyboard support built-in), klein bundle-size, actief onderhouden.

**Gebruik voor kolomkoppen**:
- `SortableContext` met `horizontalListSortingStrategy` rond de kolomkop-rij
- `useSortable` hook per kolomkop
- `onDragEnd` callback berekent nieuwe array-volgorde

### Alternatieven (verworpen)

- **Native HTML5 drag-and-drop**: Geen dependency, maar inconsistent cross-browser, geen touch, geen accessibility, veel boilerplate. Verworpen.
- **react-beautiful-dnd**: Deprecated (niet meer onderhouden door Atlassian). Verworpen.
- **Nieuwe dependency installeren**: Onnodig — `@dnd-kit` is al aanwezig.

## Decision: column_order op bestaande tabel

Zie plan.md "Design Decision" sectie. De spec stelt een nieuwe `UserColumnPreference` entiteit voor, maar codebase-onderzoek toont dat `kk_crud_overviews` al user-RLS heeft. Een `column_order TEXT[]` kolom op de bestaande tabel is eenvoudiger, hergebruikt RLS-policies, en voorkomt een extra join. Volgt Karpathy "Simplicity First".