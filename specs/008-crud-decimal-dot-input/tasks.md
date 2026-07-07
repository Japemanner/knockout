# Tasks: CRUD Decimale Input met Punt en Komma

**Input**: Design documents from `/specs/008-crud-decimal-dot-input/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/decimal-helper.md

**Tests**: Playwright e2e-test voor paden A, B, C, D — opgenomen in Phase 6 per AGENTS.md "Definition of Done" (minimaal één Playwright-test voor het happy path).

**Organization**: Tasks gegroepeerd per user story (US1–US5) zodat elke story onafhankelijk implementeerbaar en testbaar is.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g. US1, US2)
- Exacte bestandspaden in descriptions

## Path Conventions

Single project (Next.js App Router): `src/`, `tests/e2e/` op repository-root.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Pure helper-module aanmaken die alle user stories nodig hebben.

- [ ] T001 Maak `src/lib/decimal.ts` aan met lege functie-stubs en `DecimalParseResult`-type volgens `specs/008-crud-decimal-dot-input/contracts/decimal-helper.md` (geen implementatie, alleen signatures + `return { ok: false, error: "not implemented" }` placeholders)
- [ ] T002 Verifieer `tsc --noEmit` slaagt met de stubs (geen TypeScript-fouten)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Kern-logica die MOET kloppen vóór enige UI-wijziging — alle user stories leunen op deze parse-functies.

**⚠️ CRITICAL**: Geen user story werk vóór deze fase compleet is.

- [ ] T003 Implementeer `isDecimalType(dataType: string): boolean` in `src/lib/decimal.ts` — retourneert `true` voor `numeric`, `decimal`, `real`, `double precision`, `float4`, `float8` (contracts/decimal-helper.md)
- [ ] T004 [P] Implementeer `isIntegerType(dataType: string): boolean` in `src/lib/decimal.ts` — retourneert `true` voor `integer`, `int`, `int4`, `smallint`, `int2`, `bigint`, `int8` (contracts/decimal-helper.md)
- [ ] T005 Implementeer `normalizeForDisplay(value: unknown): string` in `src/lib/decimal.ts` — `null/undefined` → `""`, `Number` → `String(number)`, string → komma vervangen door punt. Defensief per research.md beslissing 5.
- [ ] T006 Implementeer `parseDecimalInput(raw: string, isNullable: boolean): DecimalParseResult` in `src/lib/decimal.ts` — normaliseer `,` → `.`, regex `^-?\d+(\.\d+)?$|^-?\d+$`, `Number()`-conversie, fout bij ongeldig. Volledige gedragstabel in contracts/decimal-helper.md.
- [ ] T007 [P] Implementeer `parseIntegerInput(raw: string, isNullable: boolean): DecimalParseResult` in `src/lib/decimal.ts` — regex `^-?\d+$`, `.`/`,` afgewezen met eigen foutmelding. Volledige gedragstabel in contracts/decimal-helper.md.
- [ ] T008 Verifieer `tsc --noEmit` slaagt en `npx eslint src/lib/decimal.ts --max-warnings 0` is schoon
- [ ] T009 Handmatige rooktest: console-log van `parseDecimalInput("1,5", true)`, `parseDecimalInput("1.5", true)`, `parseDecimalInput("1..5", true)`, `parseIntegerInput("1.5", true)` — verwacht `1.5`, `1.5`, fout, fout

**Checkpoint**: Helper-module compleet en getest. UI-wijzigingen kunnen beginnen.

---

## Phase 3: User Story 1 — Decimale invoer met punt (Priority: P1) 🎯 MVP

**Goal**: Gebruiker voert `1.5` in een decimaal CRUD-veld in, slaat op, database bevat `1.5`.

**Independent Test**: Open een CRUD-formulier met een `numeric`-kolom, voer `1.5` in, sla op, verifieer database-waarde = `1.5`.

### Implementation for User Story 1

- [ ] T010 [US1] Wijzig `src/components/db-explorer/FormFieldMapper.tsx` numeric input-branch (huidige lijn 70-82): vervang `type={isNumeric ? 'number' : 'text'}` door `type="text"` met `inputMode={isDecimalType(column.dataType) ? 'decimal' : isIntegerType(column.dataType) ? 'numeric' : 'text'}`. Gebruik `normalizeForDisplay(value)` voor de `value`-prop bij decimale velden. Vervang `onChange` logica: roep `parseDecimalInput(e.target.value, column.isNullable)` aan, stuur `result.ok ? result.value : null` naar `onChange`, bewaar `result.error` in lokale component-state voor inline weergave.
- [ ] T011 [US1] Voeg inline foutmelding toe onder het input-veld in `FormFieldMapper.tsx`: `{error && <p className="text-xs text-destructive mt-1">{error}</p>}` (alleen voor numerieke velden). Voeg `useState<string | null>` toe in `FormFieldMapper` voor de foutmelding-state.
- [ ] T012 [US1] Verifieer `tsc --noEmit` slaagt en `npx eslint src/components/db-explorer/FormFieldMapper.tsx --max-warnings 0` is schoon
- [ ] T013 [US1] Handmatige test pad A uit quickstart.md: typ `1.5` in een `numeric` veld, sla op, verifieer database bevat `1.5` (geen `NaN`, geen foutmelding)

**Checkpoint**: US1 werkt — punt-invoer in decimale velden is gefixt. Dit is de MVP.

---

## Phase 4: User Story 2 — Decimale invoer met komma (Priority: P1)

**Goal**: Gebruiker voert `1,5` in, slaat op, database bevat `1.5` (komma genormaliseerd).

**Independent Test**: Typ `1,5` in hetzelfde veld, sla op, verifieer database = `1.5`.

### Implementation for User Story 2

- [ ] T014 [US2] Geen nieuwe code — `parseDecimalInput` uit T006 normaliseert al `,` → `.`. Verifieer in `FormFieldMapper.tsx` dat de onChange-handler uit T010 ook `1,5` goed doorgeeft aan `parseDecimalInput` (geen extra filtering).
- [ ] T015 [US2] Handmatige test pad B uit quickstart.md: typ `1,5` in een `numeric` veld, sla op, verifieer database bevat `1.5`

**Checkpoint**: US1 + US2 werken — beide scheidingstekens geaccepteerd. P1-kern compleet.

---

## Phase 5: User Story 3 — Weergave in punt-notatie (Priority: P2)

**Goal**: Bij heropenen van een record toont het veld `1.5` (punt), nooit `1,5`.

**Independent Test**: Sla een record op met `1,5`, heropen hetzelfde record, verifieer veld toont `1.5`.

### Implementation for User Story 3

- [ ] T016 [US3] Verifieer in `FormFieldMapper.tsx` dat de `value`-prop voor decimale velden via `normalizeForDisplay(value)` gaat (al geïmplementeerd in T010 — expliciete verificatie-taak).
- [ ] T017 [US3] Handmatige test pad C uit quickstart.md: sla `1,5` op, heropen record, verifieer veld toont `1.5` (punt, niet komma)

**Checkpoint**: Weergave = database-waarde in punt-notatie. FR-004 gehaald.

---

## Phase 6: User Story 4 — Integer-velden blijven strikt (Priority: P2)

**Goal**: Integer-velden wijzen `1.5` en `1,5` af met foutmelding.

**Independent Test**: Typ `1.5` in een `integer` veld, probeer op te slaan, verifieer foutmelding.

### Implementation for User Story 4

- [ ] T018 [US4] Breid de `onChange`-logica in `FormFieldMapper.tsx` (uit T010) uit: als `isIntegerType(column.dataType)`, gebruik `parseIntegerInput(e.target.value, column.isNullable)` in plaats van `parseDecimalInput`. Stuur `result.value` naar `onChange`, toon `result.error` inline.
- [ ] T019 [US4] Verifieer dat `inputMode="numeric"` wordt gezet voor integer-typen (al in T010 — expliciete verificatie).
- [ ] T020 [US4] Handmatige test pad D uit quickstart.md: typ `1.5` of `1,5` in `integer` veld, verifieer foutmelding "Gehele getallen toegestaan — geen decimale scheidingsteken"
- [ ] T021 [US4] Handmatige test: typ `42` in `integer` veld, sla op, verifieer database bevat `42`

**Checkpoint**: Integer-velden strikt, decimalen flexibel. FR-005 gehaald.

---

## Phase 7: User Story 5 — Ongeldige invoer wordt helder afgewezen (Priority: P3)

**Goal**: `1..5`, `1,,5`, `1abc`, `1.234,56` geven foutmelding, geen `NaN` naar database.

**Independent Test**: Typ `1..5` in een `numeric` veld, verifieer foutmelding.

### Implementation for User Story 5

- [ ] T022 [US5] Geen nieuwe code — `parseDecimalInput` uit T006 dekt al deze gevallen via de regex `^-?\d+(\.\d+)?$|^-?\d+$`. Verifieer in `FormFieldMapper.tsx` dat de foutmelding-state uit T011 de error toont en dat `onChange(null)` wordt gegeven (zodat `DynamicForm` geen ongeldige waarde opslaat).
- [ ] T023 [US5] [P] Optioneel: voeg submit-blokade toe in `src/components/db-explorer/DynamicForm.tsx` `handleSubmit` — controleer vóór `onSubmit(values)` of alle numerieke waarden geldig zijn (niet `null` bij verplicht, niet `NaN`). Indien een veld fout bevat, toon toast "Corrigeer de gemarkeerde velden" en blokkeer opslaan. (Optioneel — kan ook in een latere iteratie.)
- [ ] T024 [US5] Handmatige test pad E uit quickstart.md: typ `1..5`, `1,,5`, `1abc`, `1.234,56` — alle gevallen foutmelding
- [ ] T025 [US5] Handmatige test pad F: laat nullable decimaal veld leeg, sla op, verifieer `NULL` in database
- [ ] T026 [US5] Handmatige test pad G: typ `-1,5` of `-1.5`, sla op, verifieer `-1.5` in database

**Checkpoint**: Alle edge-cases afgedekt. FR-006 t/m FR-011 gehaald.

---

## Phase 8: Playwright Test (AGENTS.md Definition of Done)

**Purpose**: Minimaal één Playwright e2e-test voor het happy path (AGENTS.md: "At least one Playwright test covers the happy path").

- [ ] T027 [P] Schrijf Playwright-test `tests/e2e/crud-decimal-input.spec.ts` die paden A, B, C, D dekt: (1) open CRUD-formulier met numeric-kolom, (2) typ `1.5`, sla op, verifieer opgeslagen waarde, (3) typ `1,5`, sla op, verifieer `1.5`, (4) heropen record, verifieer veld toont `1.5`, (5) typ `1.5` in integer-veld, verifieer foutmelding. Gebruik Playwright MCP per AGENTS.md.
- [ ] T028 Voer Playwright-regressie-suite uit via `@playwright-tester` (AGENTS.md: "Run the full test suite"). Verifieer alle tests groen.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Afronding, quality gates, documentatie.

- [ ] T029 [P] Update `FEATURES.md` met de nieuwe feature via `@feature-tracker` (AGENTS.md: "Update FEATURES.md with the new feature")
- [ ] T030 [P] Run `tsc --noEmit` — moet schoon zijn (AGENTS.md pre-commit hook)
- [ ] T031 [P] Run `npx eslint src/ --max-warnings 0` — moet schoon zijn (AGENTS.md pre-commit hook)
- [ ] T032 [P] Run `bash scripts/fitness-check.sh` — moet PASS zijn (AGENTS.md pre-commit hook)
- [ ] T033 [P] Run Gitleaks — moet schoon zijn (AGENTS.md pre-commit hook, geen secrets in deze feature)
- [ ] T034 [P] Run `@fitness-checker` voor Supabase MCP checks: F-01 (RLS — onveranderd, moet nog steeds PASS) en F-10 (Storage buckets — onveranderd). Geen schema-wijzigingen, dus geen nieuwe policies.
- [ ] T035 Run quickstart.md validatie: doorloop paden A–G handmatig of via Playwright-test (T027 dekt A–D, E–G handmatig)
- [ ] T036 Commit met conventional message: `fix(crud): accept both . and , as decimal separator in numeric input fields` — na alle groene checks per AGENTS.md "After Every Feature"

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: Geen dependencies — start onmiddellijk
- **Phase 2 (Foundational)**: Depends on Phase 1 — BLOCKS alle user stories
- **Phase 3 (US1)**: Depends on Phase 2 — MVP, implementeer eerst
- **Phase 4 (US2)**: Depends on Phase 2 + T010 (US1 UI-wijziging) — US2 deelt de UI-wijziging met US1, alleen verificatie nodig
- **Phase 5 (US3)**: Depends on Phase 3 — verifieert weergave-gedrag van US1-implementatie
- **Phase 6 (US4)**: Depends on Phase 2 + T010 — breidt UI-logica uit met integer-branch
- **Phase 7 (US5)**: Depends on Phase 3 + Phase 6 — verifieert edge-cases van beide branches
- **Phase 8 (Playwright)**: Depends on Phase 3 + Phase 6 (US1 + US4 compleet)
- **Phase 9 (Polish)**: Depends on alle voorgaande fases

### User Story Dependencies

- **US1 (P1)**: Start na Foundational — onafhankelijk
- **US2 (P1)**: Deelt UI met US1 — alleen verificatie, geen nieuwe code
- **US3 (P2)**: Verifieert US1-weergave — alleen verificatie
- **US4 (P2)**: Uitbreiding op US1 UI-wijziging — voegt integer-branch toe
- **US5 (P3)**: Verifieert edge-cases — alleen verificatie + optioneel submit-blokade (T023)

### Parallel Opportunities

- T004 parallel met T003 (verschillende functies, zelfde bestand — pas op voor merge-conflict, kan ook sequentieel)
- T007 parallel met T006 (verschillende functies, zelfde bestand — zelfde voorbehoud)
- T029, T030, T031, T032, T033, T034 in Phase 9 zijn allemaal [P] — onafhankelijk verschillende tools

---

## Implementation Strategy

### MVP First (US1 only)

1. Phase 1 + Phase 2 (helper-module compleet)
2. Phase 3 (US1 — punt-invoer in decimale velden)
3. **STOP and VALIDATE**: typ `1.5` in een CRUD-formulier, sla op, verifieer database
4. Dit is de MVP — het kernprobleem is opgelost

### Incremental Delivery

1. Helper-module → US1 (punt) → US2 (komma) → US3 (weergave) → US4 (integer) → US5 (edge-cases) → Playwright → Polish
2. Elke story voegt waarde toe zonder vorige te breken

---

## Notes

- Geen database-migraties — feature is UI-only
- Geen nieuwe dependencies — alleen native browser input + TypeScript
- shadcn/ui `Input` component wordt hergebruikt (geen nieuwe UI-component)
- `DynamicForm.tsx` wijziging is optioneel (T023) — kan in een latere iteratie als submit-blokade wenselijk blijkt
- Pre-commit hook (AGENTS.md) draait automatisch op `git commit` — dekt T030, T031, T032, T033
- Playwright MCP wordt gebruikt voor T027/T028 per AGENTS.md "Never write Playwright tests by hand"
- `@feature-tracker` en `@fitness-checker` subagents per AGENTS.md "After Every Feature" workflow