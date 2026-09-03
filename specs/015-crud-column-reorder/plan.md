# Implementation Plan: CRUD Kolom Volgorde Aanpasbaar

**Branch**: `015-crud-column-reorder` | **Date**: 2026-08-29 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/015-crud-column-reorder/spec.md`

## Summary

Gebruikers kunnen in CRUD-tabelweergaves de kolomvolgorde aanpassen door kolomkoppen te verslepen (drag-and-drop met `@dnd-kit`, reeds geïnstalleerd). De volgorde wordt opgeslagen in een nieuwe `column_order TEXT[]` kolom op de bestaande `kk_crud_overviews` tabel — dezelfde plek als `hidden_columns`. Omdat elk CRUD-overzicht al een `user_id` heeft met RLS `user_id = auth.uid()`, is de volgorde automatisch per-gebruiker. Een "Reset volgorde" actie wordt toegevoegd aan het bestaande `ColumnVisibilityDialog` menu.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)

**Primary Dependencies**: React 18, `@supabase/supabase-js` v2, `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities` (al geïnstalleerd), Tailwind CSS v3, shadcn/ui

**Storage**: Supabase PostgreSQL (eigen DB) — nieuwe kolom `column_order` op `kk_crud_overviews`

**Testing**: Playwright E2E (`tests/e2e/`)

**Target Platform**: Web (Netlify)

**Project Type**: Web application (Next.js App Router + Supabase backend)

**Performance Goals**: Sleepbeweging < 2s (SC-001); soepel tot 20 kolommen (SC-005)

**Constraints**: Hergebruik `@dnd-kit` (geen nieuwe dependency); RLS op elke tabel; geen service-role in client

**Scale/Scope**: 1 migratie (1 kolom), 3 server-actions, 1 nieuwe client-component, 2 bestaande componenten aangepast, 1 E2E-test

## Constitution Check

| Gate | Status | Note |
|------|--------|------|
| RLS on every table | PASS | `kk_crud_overviews` heeft al RLS met `user_id = auth.uid()` policies (003_crud_overviews.sql:14-27). Nieuwe kolom erft deze policies automatisch. |
| No secrets in client code | PASS | Geen secrets betrokken |
| Edge Functions for privileged ops | N/A | Kolomvolgorde is user-scoped via bestaande RLS — geen service-role nodig |
| PKCE auth flow | N/A | Geen auth-wijziging |
| Netlify SPA redirects | N/A | Geen routing-wijziging |
| Storage bucket policies | N/A | Geen storage |
| TypeScript strict mode | PASS | Alle nieuwe code volledig getypeerd, geen `any` |
| Pre-commit hook | PASS | tsc + fitness + gitleaks + eslint uitgevoerd bij commit |

Geen constitution violations. Geen complexity tracking nodig.

## Design Decision: column_order op bestaande tabel in plaats van nieuwe entiteit

De spec noemt een nieuwe `UserColumnPreference` entiteit. Bij codebase-onderzoek blijkt dat `kk_crud_overviews` al een `user_id` kolom heeft met RLS-policy `user_id = auth.uid()` — elk CRUD-overzicht behoort aan precies één gebruiker. Er is geen scenario waarin meerdere gebruikers hetzelfde CRUD-overzicht delen. Daarom is een aparte per-gebruiker-tabel overbodig: een `column_order TEXT[]` kolom op `kk_crud_overviews` (analoog aan de bestaande `hidden_columns TEXT[]`) dekt de per-gebruiker-per-overzicht semantiek volledig, met hergebruik van de bestaande RLS-policies. Dit past bij Karpathy-regel 2 (Simplicity First) en voorkomt een onnodige join.

## Project Structure

### Documentation (this feature)

```text
specs/015-crud-column-reorder/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Codebase research output
├── data-model.md        # column_order kolom + ordering logic
├── quickstart.md        # Verification steps
├── contracts/           # Interface contracts
│   └── column-order.md  # Pure helper contract
└── checklists/
    └── requirements.md  # Spec quality checklist
```

### Source Code (repository root)

```text
src/
├── lib/
│   └── column-order.ts            # NEW — pure helpers for ordering logic
├── actions/
│   └── crud-overviews.ts          # MODIFIED — add column_order to CRUD + save action
├── components/
│   ├── crud/
│   │   └── ColumnVisibilityDialog.tsx  # MODIFIED — add "Reset volgorde" button
│   └── db-explorer/
│       ├── GenericTable.tsx       # MODIFIED — accept columnOrder prop, render DraggableTableHeader
│       └── DraggableTableHeader.tsx  # NEW — dnd-kit sortable header row
└── types/
    └── database.types.ts          # MODIFIED — add column_order to CRUDOverview

supabase/
└── migrations/
    └── 015_crud_overviews_column_order.sql  # NEW — add column_order column

tests/
└── e2e/
    └── crud-column-reorder.spec.ts  # NEW — Playwright E2E
```

**Structure Decision**: Single-project layout (bestaand). De feature volgt het patroon van spec 005 (`hidden_columns` kolom toevoegen + kleine componentwijziging). Geen nieuwe mappen behalve component-bestand.

## Implementation Phases

### Phase 0 — Database migration (`015_crud_overviews_column_order.sql`)

Nieuwe kolom op bestaande tabel, analoog aan `005_crud_overviews_hidden_columns.sql`.

```sql
ALTER TABLE kk_crud_overviews
  ADD COLUMN IF NOT EXISTS column_order TEXT[] NOT NULL DEFAULT '{}';
```

RLS is al actief op de tabel met `user_id = auth.uid()` policies — de nieuwe kolom erft SELECT/INSERT/UPDATE-rechten automatisch. Geen extra policies nodig.

### Phase 1 — Pure helper (`src/lib/column-order.ts`)

Nieuwe pure module, geen React-afhankelijkheden, testbaar in isolatie. Volgt het patroon van `src/lib/decimal.ts` en `src/lib/date-defaults.ts`.

**Functions:**

1. `applyColumnOrder(allColumns: ColumnInfo[], savedOrder: string[]): ColumnInfo[]` — herordent `allColumns` op basis van `savedOrder`. Kolommen in `savedOrder` komen eerst in die volgorde; kolommen niet in `savedOrder` (nieuw in DB) verschijnen daarna in natuurlijke volgorde. Verwijderde kolommen in `savedOrder` die niet in `allColumns` voorkomen worden genegeerd (FR-007, FR-008).
2. `reorderArray<T>(arr: T[], from: number, to: number): T[]` — pure array-herordening. Retourneert nieuwe array met element van `from` verplaatst naar `to`.
3. `isDefaultOrder(savedOrder: string[]): boolean` — `true` als `savedOrder` leeg is (`[]`). Gebruikt voor "Reset volgorde" knop-state.

**Contract**: zie `contracts/column-order.md`

### Phase 2 — Type update (`database.types.ts`)

```ts
export interface CRUDOverview {
  // ... bestaande velden ...
  column_order: string[]   // NEW
}
```

### Phase 3 — Server actions (`crud-overviews.ts`)

Twee wijzigingen:

1. `getCrudOverviews` (lijn 12) — voeg `column_order` toe aan de SELECT.
2. `updateCrudOverview` (lijn 60) — accepteer optioneel `column_order?: string[]` en update het. Volgt exact het bestaande patroon van `hidden_columns`.

```ts
export async function updateCrudOverview(data: {
  crudId: string
  name?: string
  hidden_columns?: string[]
  column_order?: string[]   // NEW
}) {
  // ... bestaande logica ...
  if (data.column_order !== undefined) updateData.column_order = data.column_order
  // ...
}
```

### Phase 4 — DraggableTableHeader component (`src/components/db-explorer/DraggableTableHeader.tsx`)

Nieuwe client-component met `@dnd-kit/sortable` voor de kolomkop-rij. Rendert alleen de datadragende kolomkoppen (niet de actie-kolom — die staat vast rechts en is niet versleepbaar, FR-011).

**Props:**
```ts
interface DraggableTableHeaderProps {
  columns: ColumnInfo[]          // de zichtbare, geordende kolommen
  onReorder: (newOrder: string[]) => void  // callback met nieuwe kolomnaam-volgorde
}
```

**Gedrag:**
- Elke kolomkop is een `SortableContext` item met `useSortable` hook
- `cursor: grab` op kolomkoppen (FR-006) — `cursor-grab` tijdens hover, `cursor-grabbing` tijdens slepen
- Sleep-handle icoon (lucide `GripVertical`) links in elke kop — visuele affordance
- `onDragEnd`: bereken nieuwe volgorde van kolomnamen, roep `onReorder` aan
- DnD beperkt tot horizontale as (kolommen verschuiven alleen links/rechts)

### Phase 5 — GenericTable integratie (`GenericTable.tsx`)

Wijzigingen op lijn 124 (displayColumns) en lijn 153-161 (thead):

1. Vervang de statische `displayColumns` berekening met ordering:
```ts
import { applyColumnOrder } from '@/lib/column-order'

const orderedColumns = useMemo(
  () => applyColumnOrder(columns, columnOrder ?? []),
  [columns, columnOrder]
)
const displayColumns = orderedColumns.filter((c) => !c.isPrimaryKey && !hiddenColumns.includes(c.name)).slice(0, 8)
```

2. Nieuwe prop `columnOrder?: string[]` en `onColumnReorder?: (newOrder: string[]) => void` op `GenericTable` en `LocalDynamicTable` (doorgeven).

3. Vervang de `<thead>` block (lijn 155-161) met `DraggableTableHeader` wanneer `onColumnReorder` is geleverd, anders de bestaande statische rendering (backward compat voor db-explorer gebruik):

```tsx
{onColumnReorder ? (
  <DraggableTableHeader columns={displayColumns} onReorder={onColumnReorder} />
) : (
  <tr className="bg-muted/50">
    {displayColumns.map((c) => <th ...>{c.name}</th>)}
    {canEdit && <th ... />}
  </tr>
)}
```

### Phase 6 — CRUD detail page wiring (`crud/[crudId]/page.tsx`)

1. Voeg `column_order` toe aan de CrudOverviewData interface en select.
2. Geef `columnOrder={crud.column_order ?? []}` door aan `LocalDynamicTable`.
3. Maak een client-side handler die `updateCrudOverview({ crudId, column_order: newOrder })` aanroept na elke reorder + `router.refresh()`.

Omdat de pagina een server-component is, moet de reorder-handler in een client-component leven. Oplossing: een kleine `CrudTableWrapper` client-component die `LocalDynamicTable` omringt en de server-action aanroept bij reorder. Volgt het bestaande patroon van `ColumnVisibilityDialog` die ook een client-component is dat server-actions aanroept.

### Phase 7 — Reset volgorde in ColumnVisibilityDialog (`ColumnVisibilityDialog.tsx`)

Voeg een "Reset volgorde" knop toe aan het dialoog, naast de bestaande kolom-checkboxes:

```tsx
<Button variant="outline" size="sm" onClick={handleResetOrder} disabled={isDefaultOrder(savedOrder)}>
  <RotateCcw className="h-4 w-4 mr-1" /> Reset volgorde
</Button>
```

`handleResetOrder` roept `updateCrudOverview({ crudId, column_order: [] })` aan en ververst.

Props uitbreiden: `columnOrder?: string[]` doorgeven vanuit de pagina.

### Phase 8 — E2E test (`tests/e2e/crud-column-reorder.spec.ts`)

Playwright-test die:
1. Een CRUD-overzicht opent met meerdere kolommen
2. Een kolomkop versleept naar een andere positie
3. Verifieert dat de kolom verplaatst is (kolomnamen in nieuwe volgorde)
4. De pagina herlaadt en verifieert dat de volgorde behouden is (SC-002)
5. "Reset volgorde" kiest en verifieert dat de standaardvolgorde hersteld is

De test volgt het bestaande skip-als-niet-ingelogd patroon uit andere E2E-tests.

## Risk Analysis

| Risk | Impact | Mitigatie |
|------|--------|-----------|
| `@dnd-kit/sortable` met horizontaal scrollen in brede tabellen kan haperen | Medium — `displayColumns.slice(0, 8)` beperkt zichtbare kolommen tot 8, dus scroll is zeldzaam | Test met tabel van 8 kolommen; auto-scroll is ingebouwd in dnd-kit's `SortableContext` |
| `column_order` leeg (`[]`) bij bestaande CRUD-overviews na migratie | Laag — default `'{}'` betekent natuurlijke volgorde (FR-007 fallback). `applyColumnOrder` handelt lege array correct af | Default in migratie is `'{}'` |
| `GenericTable` wordt ook gebruikt door db-explorer (niet- CRUD) — `columnOrder` mag dat niet breken | Laag — `columnOrder` en `onColumnReorder` zijn optionele props; bij afwezigheid valt terug op bestaande statische rendering | Backward-compat ontwerp in Phase 5 |
| Tabel heeft `displayColumns.slice(0, 8)` — kolommen na de 8e zijn niet zichtbaar en dus niet versleepbaar | Laag — current limitation; slepen binnen zichtbare 8 volstaat voor alle praktische scenario's | Documenteer in quickstart; toekomstige uitbreiding kan alle kolommen tonen |
| Drag-and-drop op touch-apparaten (mobiel) niet ondersteund | Zeer laag — spec noemt touch out-of-scope | Geen mitigatie nodig; gedocumenteerd in assumptions |

## Out of Scope

- Touch/trackpad-drag ondersteuning op mobiel (uit scope per spec assumptions)
- Kolomvolgorde per individuele tabel binnen een CRUD-overzicht (indien meerdere tabellen) — één volgorde per overzicht
- Kolombreedte aanpasbaar maken (resizen) — niet gevraagd
- Kolomvolgorde exporteren/importeren tussen overzichten
- Server-side validatie van kolomnamen in `column_order` (RLS dekt toegang; namen die niet bestaan worden door `applyColumnOrder` gefilterd)