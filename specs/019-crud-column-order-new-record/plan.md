# Implementation Plan: CRUD Kolomvolgorde Doorgetrokken naar Record-Formulier

**Branch**: `019-crud-column-order-new-record` | **Date**: 2026-09-22 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/019-crud-column-order-new-record/spec.md`

## Summary

De tabelweergave van een CRUD-overzicht past de per-gebruiker opgeslagen kolomvolgorde (`kk_crud_overviews.column_order`) al toe via `applyColumnOrder` in `src/lib/column-order.ts`. Het aanmaak-/bewerkformulier ontvangt echter nog de ruwe, ongesorteerde `columns`-array (database-volgorde): `GenericTable.tsx:309` geeft `columns` door in plaats van de reeds berekende `orderedColumns` (regel 143-146).

Oplossing: geef in `GenericTable.tsx` de reeds gesorteerde kolommenlijst door aan `DynamicForm` in plaats van de ruwe lijst. `DynamicForm` filtert vervolgens zijn velden (PK, identity, generated, hidden) uit die gesorteerde lijst — de relatieve volgorde blijft daarbij intact. Geen nieuwe modules, geen nieuwe props, geen schemawijzigingen: één regel wijziging plus afstemming van het filter. Aanmaken én bewerken erven de wijziging automatisch omdat ze hetzelfde formulier delen.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode) + React 18 + Next.js 14 (App Router)

**Primary Dependencies**: Next.js 14, React 18, shadcn/ui (Dialog, Button), `pg` (postgres pool via `DIRECT_DATABASE_URL`)

**Storage**: Supabase PostgreSQL. Per-gebruiker per-overzicht kolomvolgorde in bestaande kolom `kk_crud_overviews.column_order TEXT[] NOT NULL DEFAULT '{}'` (migratie 015). **Geen schemawijziging nodig** — deze feature leest alleen de bestaande voorkeur.

**Testing**: Playwright (`tests/e2e/`). Bestaand patroon: unit-style specs op pure helpers (zoals `crud-column-reorder.spec.ts` voor `applyColumnOrder`) en UI-tests met login-skip (`regression.spec.ts`). Dev-start: `npm run dev`.

**Target Platform**: Web (Netlify), moderne browsers.

**Project Type**: Web applicatie (Next.js App Router, server components + client components)

**Performance Goals**: Verwaarloosbaar — sortering is al berekend voor de tabelweergave; het formulier hergebruikt die array. `applyColumnOrder` is O(n).

**Constraints**: TypeScript strict mode (geen `any` zonder `@ts-expect-error`). Geen nieuwe dependencies. Bestaand gedrag van veldselectie (hidden columns, PK/identity/generated-uitsluiting) mag niet veranderen. RLS-onderdelen onaangetast (geen DB-wijziging).

**Scale/Scope**: 1 component-wijziging (`GenericTable.tsx`, 1 prop) + mogelijk kleine aanpassing in `DynamicForm.tsx` (filter-bron). Kleinste mogelijke feature-grootte.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

De constitution (`.specify/memory/constitution.md`) is een lege template — geen principes of gates gedefinieerd. Geen schendingen mogelijk. Gate: PASS (geen principes om te evalueren).

## Project Structure

### Documentation (this feature)

```text
specs/019-crud-column-order-new-record/
├── plan.md              # Dit bestand
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── generic-table-form-wiring.md  # Phase 1 output
├── checklists/
│   └── requirements.md  # Tijdens /speckit.specify aangemaakt
└── tasks.md             # Phase 2 output (/speckit.tasks — niet door /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── components/
│   ├── db-explorer/
│   │   ├── GenericTable.tsx        # WIJZIGING — lijn 309: columns → orderedColumns in <DynamicForm>
│   │   └── DynamicForm.tsx         # WIJZIGING (klein) — nonPkColumns filtert uit gesorteerde lijst
│   └── crud/
│       └── CrudTableWrapper.tsx    # bestaand — geen wijziging (geeft columnOrder al door)
├── lib/
│   └── column-order.ts             # bestaand — geen wijziging (applyColumnOrder wordt hergebruikt)
└── actions/
    └── crud-overviews.ts          # bestaand — geen wijziging

tests/
└── e2e/
    └── crud-form-order.spec.ts    # NIEUW — UI-test: gesleepte kolom is eerste formulierveld
```

**Structure Decision**: Single-project (Next.js App Router). De wijziging is geconcentreerd in de bestaande `db-explorer` componenten; de sorteerlogica bestaat al als pure helper (`src/lib/column-order.ts`) en wordt slechts hergebruikt. Geen nieuwe mappen behalve één Playwright-testbestand in het bestaande `tests/e2e/`-patroon.

## Complexity Tracking

Geen constitution-violaties om te rechtvaardigen. Tabel leeg.