# Implementation Plan: CRUD Decimale Input met Punt en Komma

**Branch**: `008-crud-decimal-dot-input` | **Date**: 2026-07-06 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/008-crud-decimal-dot-input/spec.md`

## Summary

De CRUD-formulieren (DynamicForm → FormFieldMapper) gebruiken momenteel `<input type="number">` voor numerieke velden. In een Nederlandse browser accepteert dit alleen een komma, terwijl `Number("1,5")` in JavaScript `NaN` oplevert — daarmee breekt punt-invoer en ontstaan `NaN`-waarden in de database.

Oplossing: vervang `type="number"` door `type="text"` met `inputMode="decimal"` voor decimale types en `inputMode="numeric"` voor integer-types, met eigen parsing die komma → punt normaliseert vóór `Number()`-conversie, en expliciete validatie die ongeldige invoer en integer-decimalen afwijst met een inline foutmelding. Weergave gebeurt altijd in punt-notatie (de database-waarde wordt direct getoond, geen locale-conversie).

De wijziging is geconcentreerd in `src/components/db-explorer/FormFieldMapper.tsx` met een kleine pure helper-module `src/lib/decimal.ts` voor de parsing/validatie-logica (testbaar los van React).

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode) + React 18 + Next.js 14 (App Router)

**Primary Dependencies**: Next.js 14, React 18, Tailwind CSS v3, shadcn/ui (`@/components/ui/input`), `pg` (postgres pool voor lokale DB-toegang via `DIRECT_DATABASE_URL`)

**Storage**: Supabase PostgreSQL (via `DIRECT_DATABASE_URL` connection string + `pg` Pool in `src/lib/db/pool.ts`). Lokaal: tabellen in `public` schema. Decimale kolommen: `numeric`, `decimal`, `real`, `double precision`, `float4`, `float8`. Integer-kolommen: `integer`, `int4`, `smallint`, `int2`, `bigint`, `int8`.

**Testing**: Playwright (e2e — `tests/e2e/`, momenteel leeg). Geen unit-test framework aanwezig in `package.json`. Validatie van de pure helper kan manueel of via een e2e-test die een CRUD-formulier opent.

**Target Platform**: Web (Netlify deployment), moderne browsers (Chrome/Edge/Firefox/Safari). NL-locale is de primaare gebruiksomgeving, maar de oplossing moet locale-onafhankelijk werken.

**Project Type**: Web applicatie (Next.js App Router, server components + client components)

**Performance Goals**: Geen specifieke performance-doelen — invoer-parsing is per-keystroke of per-blur, kost <1ms.

**Constraints**: TypeScript strict mode (geen `any` zonder `@ts-expect-error`). Geen nieuwe dependencies — alleen native browser input + TypeScript. shadcn/ui `Input` component hergebruiken. RLS op elke Supabase-tabel (onveranderd door deze feature — feature raakt alleen UI, geen schema).

**Scale/Scope**: 1 component wijziging (`FormFieldMapper.tsx`), 1 nieuwe helper-module (`src/lib/decimal.ts`), optioneel 1 Playwright e2e-test. Klein.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

De constitution (`.specify/memory/constitution.md`) is een lege template — geen principes of gates gedefinieerd. Geen schendingen mogelijk. Gate: PASS (geen principes om te evalueren).

## Project Structure

### Documentation (this feature)

```text
specs/008-crud-decimal-dot-input/
├── plan.md              # Dit bestand
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── checklists/
│   └── requirements.md  # Tijdens /speckit.specify aangemaakt
└── tasks.md             # Phase 2 output (/speckit.tasks — niet door /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── components/
│   └── db-explorer/
│       ├── DynamicForm.tsx        # bestaand — geen wijziging nodig (roept FormFieldMapper aan)
│       └── FormFieldMapper.tsx    # WIJZIGING — numeric input branch (lijn 70-82)
├── lib/
│   ├── decimal.ts                # NIEUW — pure parse/validate helpers
│   └── utils.ts                  # bestaand — geen wijziging
└── actions/
    └── local-db.ts               # bestaand — geen wijziging (createLocalRecord/updateLocalRecord ontvangen al getypeerde waarden)
```

**Structure Decision**: Single-project (Next.js App Router). Wijziging is geïsoleerd in de `db-explorer` component-map met een pure helper in `lib/`. Geen nieuwe mappen of modules nodig. Dit past bij de bestaande architectuur: UI-components in `src/components/`, pure logica in `src/lib/`.

## Complexity Tracking

Geen constitution-violaties om te rechtvaardigen. Tabel leeg.