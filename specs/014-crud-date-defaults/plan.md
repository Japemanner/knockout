# Implementation Plan: CRUD Datum-Standaardwaarden

**Branch**: `014-crud-date-defaults` | **Date**: 2026-08-29 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/014-crud-date-defaults/spec.md`

## Summary

Bij het openen van een "Nieuw record"-formulier in de CRUD-interface moeten datum-, timestamp- en time-velden automatisch worden gevuld met de huidige datum/tijd, **tenzij** de kolom al een expliciete database-`DEFAULT` heeft. De feature concentreert zich op één centrale plek: de initialisatie van `initialValues` voor create-mode in `DynamicForm`, backed by een pure helper `src/lib/date-defaults.ts`. Daarnaast krijgt `FormFieldMapper` een `time`-branch die momenteel ontbreekt (time-velden vallen nu door naar een plain text-input).

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)

**Primary Dependencies**: React 18, `@supabase/supabase-js` v2, Tailwind CSS v3, shadcn/ui

**Storage**: Supabase PostgreSQL (eigen DB via PostgREST RPC) + externe PostgreSQL (via `pg.Pool`)

**Testing**: Playwright E2E (`tests/e2e/`), geen unit-test runner aanwezig — helper wordt gedekt door E2E

**Target Platform**: Web (Netlify SPA)

**Project Type**: Web application (frontend-only, Supabase als backend)

**Performance Goals**: N/A — feature is een éénmalige compute bij form-openen, geen runtime-impact

**Constraints**: Geen nieuwe dependencies; hergebruik bestaand `todayISO`-patroon uit `HoursEntryForm.tsx`

**Scale/Scope**: 1 nieuwe helper-file (~40 regels), 2 kleine wijzigingen in bestaande componenten

## Constitution Check

| Gate | Status | Note |
|------|--------|------|
| RLS on every table | N/A | Geen nieuwe tabellen; feature raakt enkel frontend-formulierinitialisatie |
| No secrets in client code | PASS | Geen secrets betrokken |
| Edge Functions for privileged ops | N/A | Geen privileged operatie; louter client-side default-vulling |
| PKCE auth flow | N/A | Geen auth-wijziging |
| Netlify SPA redirects | N/A | Geen routing-wijziging |
| Storage bucket policies | N/A | Geen storage |
| TypeScript strict mode | PASS | Helper wordt volledig getypeerd, geen `any` |
| Pre-commit hook (tsc + fitness + gitleaks + eslint) | PASS | Wordt uitgevoerd bij commit |

Geen constitution violations. Geen complexity tracking nodig.

## Project Structure

### Documentation (this feature)

```text
specs/014-crud-date-defaults/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Codebase research output
├── data-model.md        # Column metadata analysis
├── quickstart.md        # Verification steps
├── contracts/           # Interface contracts
│   └── date-defaults.md # Helper function contract
└── checklists/
    └── requirements.md  # Spec quality checklist
```

### Source Code (repository root)

```text
src/
├── lib/
│   ├── date-defaults.ts          # NEW — pure helpers for date/time defaults
│   └── decimal.ts                # existing (spec 008 pattern reference)
├── components/
│   └── db-explorer/
│       ├── GenericTable.tsx      # MODIFIED — pass computed initialValues on create
│       ├── DynamicForm.tsx       # MODIFIED — merge date-defaults into initial values
│       └── FormFieldMapper.tsx   # MODIFIED — add `time` type branch
└── types/
    └── database.types.ts         # unchanged

tests/
└── e2e/
    └── crud-date-defaults.spec.ts # NEW — Playwright E2E
```

**Structure Decision**: Single-project layout (bestaand). De feature volgt het patroon van spec 008 (`src/lib/decimal.ts` als pure helper + kleine componentwijziging). Geen nieuwe mappen, geen nieuwe dependencies.

## Implementation Phases

### Phase 0 — Helper module (`src/lib/date-defaults.ts`)

Nieuwe pure module met geen React-afhankelijkheden. Testbaar in isolatie.

**Functions:**

1. `isDateColumn(dataType: string): boolean` — detecteert `date`
2. `isTimestampColumn(dataType: string): boolean` — detecteert `timestamp`, `timestamp without time zone`, `timestamp with time zone`, `timestamptz`
3. `isTimeColumn(dataType: string): boolean` — detecteert `time`, `time without time zone`, `time with time zone`, `timetz`
4. `todayISO(): string` — `YYYY-MM-DD` in lokale tijd (kopie uit `HoursEntryForm.tsx:12-16`)
5. `nowLocalDateTime(): string` — `YYYY-MM-DDTHH:mm` in lokale tijd (voor `<input type="datetime-local">`)
6. `nowLocalTime(): string` — `HH:mm` in lokale tijd (voor `<input type="time">`)
7. `buildDateDefaults(columns: ColumnInfo[]): Record<string, string>` — orchestrator: voor elke kolom waarvan `defaultValue === null` én die een date/timestamp/time-type is, return het juiste default. Kolommen met `defaultValue !== null` worden overgeslagen (database-default is leidend).

**Contract**: zie `contracts/date-defaults.md`

### Phase 1 — Formulierintegratie (`DynamicForm.tsx`)

Wijziging op lijn 18-19: bij initialisatie van `values`-state, als `initialValues` leeg is (create-mode), merge dan `buildDateDefaults(columns)` erin.

```ts
// DynamicForm.tsx — nieuw
import { buildDateDefaults } from '@/lib/date-defaults'

const [values, setValues] = useState<Record<string, unknown>>(() => {
  const isEmpty = Object.keys(initialValues).length === 0
  return isEmpty ? { ...buildDateDefaults(columns) } : { ...initialValues }
})
```

**Waarom hier en niet in `GenericTable`**: `DynamicForm` ontvangt `columns` al en is de eigenaar van `values`-state. Door de logica hier te plaatsen geldt het voor beide CRUD-paden (lokaal + extern) automatisch, zonder dat `GenericTable` twee plekken hoeft aan te passen. Bovendien is de "is this create or edit?" check simpel: lege `initialValues` = create.

### Phase 2 — `FormFieldMapper.tsx` time-branch

Lijn 167: voeg `time`-types toe aan de datum-afhandeling. Nu vallen `time`-kolommen door naar de fallback plain `<Input>` zonder `type="time"`.

```tsx
// nieuw: aparte check voor time-types
const isTime = ['time', 'time without time zone', 'time with time zone', 'timetz'].includes(column.dataType)

if (isTime) {
  return (
    <div className="flex flex-col gap-1">
      <Label>{column.name}{isRequired ? ' *' : ''}</Label>
      <Input type="time" value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}
```

De bestaande `isDate`-branch (lijn 167-180) blijft ongewijzigd voor `date` en `timestamp`-types.

### Phase 3 — E2E test (`tests/e2e/crud-date-defaults.spec.ts`)

Playwright-test die:
1. Een tabel opent met een `date`-kolom zonder database-default
2. Op "Record" klikt
3. Verifieert dat het datumveld de huidige datum bevat (niet leeg)
4. Verifieert dat het veld overschrijfbaar is
5. (Optioneel) Verifieert dat een tabel met een `DEFAULT now()`-kolom het veld niet client-side vult

De test volgt het bestaande skip-als-niet-ingelogd patroon uit andere E2E-tests.

## Risk Analysis

| Risk | Impact | Mitigatie |
|------|--------|-----------|
| `time`-velden bestonden al maar werden als plain text getoond — wijziging naar `type="time"` kan bestaande data-breuk veroorzaken | Laag — bestaande time-waarden in `HH:mm:ss` formaat worden door `<input type="time">` nog steeds geaccepteerd (seconden worden genegeerd in weergave) | E2E-test dekt happy path |
| Tijdzone-afwijking tussen browser en server | Laag — bestaand patroon (`todayISO` met `getTimezoneOffset`) is al in productie voor uren-module | Hergebruik hetzelfde patroon; geen nieuwe timezone-logica |
| `initialValues` is `{}` bij create, maar sommige tabellen kunnen hierin al defaults injecteren via een ander pad | Zeer laag — `GenericTable.tsx:206` geeft altijd letterlijk `{}` door bij create | Merge met spread: `{ ...buildDateDefaults(columns) }` — overschrijft niks dat er al is |
| Externe DB's retourneren `column_default` in ander formaat dan Supabase RPC | Laag — beide bronnen gebruiken `information_schema.columns.column_default` | Helper checkt alleen `=== null`, parseert de default-waarde niet |

## Out of Scope

- Server-side datumvalidatie bij opslaan (FR-008 noemt dit als optioneel; de huidige aanpak met browser-lokale tijd is consistent met de uren-module)
- Tijdzone-selector per gebruiker of per veld
- Conversie van bestaande time-waarden in de database
- Wijziging aan de `isRequired`-logica in `FormFieldMapper` (die blijft ongewijzigd)