# Tasks: CRUD Kolomvolgorde Doorgetrokken naar Record-Formulier

**Input**: Design documents from `/specs/019-crud-column-order-new-record/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/generic-table-form-wiring.md

**Tests**: Playwright e2e-test per AGENTS.md "Definition of Done" (minimaal één Playwright-test voor het happy path) — opgenomen in Phase 6.

**Organization**: Tasks gegroepeerd per user story (US1–US3) zodat elke story onafhankelijk implementeerbaar en testbaar is.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Exacte bestandspaden in descriptions

## Path Conventions

Single project (Next.js App Router): `src/`, `tests/e2e/` op repository-root.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verificatie van de bestaande infrastructuur — er is niets nieuws aan te maken (sorteerhelper bestaat, props bestaan, keten bestaat).

- [x] T001 Verifieer preconditie: lees `src/components/db-explorer/GenericTable.tsx` en bevestig dat `orderedColumns` (regel ~143) al bestaat en `DynamicForm` (regel ~308) nog de ruwe `columns` ontvangt — dit is de enige te wijzigen regel
- [x] T002 Verifieer `tsc --noEmit` slaagt op de ongewijzigde codebase (baseline schoon vóór de wijziging)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Geen nieuwe infrastructuur nodig — `applyColumnOrder` (`src/lib/column-order.ts`) is al geïmplementeerd én unit-getest (`tests/e2e/crud-column-reorder.spec.ts`). Deze fase is een expliciete no-op-bevestiging.

**⚠️ CRITICAL**: Bevestig vóór UI-wijziging dat de sorteerlogica-garanties uit contracts/generic-table-form-wiring.md (lege volgorde → natuurlijk, ontbrekende kolommen achteraan, niet-bestaande namen overgeslagen, geen mutatie) gedekt zijn door de bestaande tests.

- [x] T003 Run de bestaande unit-tests voor `applyColumnOrder` (`tests/e2e/crud-column-reorder.spec.ts` via Playwright) en bevestig: groen. Geen nieuwe helper-code nodig.

**Checkpoint**: Sorteerlogica geverifieerd. De enige implementatie-taak (US1) kan beginnen.

---

## Phase 3: User Story 1 — Nieuw record-formulier volgt aangepaste kolomvolgorde (Priority: P1) 🎯 MVP

**Goal**: Bij een opgeslagen kolomvolgorde toont het "+ Record"-formulier de velden in dezelfde volgorde als de tabelkoppen.

**Independent Test**: Sleep een kolom naar de eerste positie, wacht op de refresh, klik "+ Record", verifieer dat het bijbehorende veld als eerste in het formulier staat.

### Implementation for User Story 1

- [x] T004 [US1] Wijzig `src/components/db-explorer/GenericTable.tsx` regel ~309: vervang `columns={columns}` door `columns={orderedColumns}` in de `<DynamicForm>`-aanroep. Geen andere regels aanpassen — contract: contracts/generic-table-form-wiring.md.
- [x] T005 [US1] Verifieer dat `DynamicForm.tsx` geen wijziging nodig heeft: het `nonPkColumns`-filter (regel 33) is order-preserving en de veldset-criteria (PK/identity/generated/hidden) zijn ongewijzigd. Alleen leescontrole — geen code.
- [x] T006 [US1] Verifieer `tsc --noEmit` slaagt en `npx eslint src/components/db-explorer/ --max-warnings 0` is schoon
- [ ] T007 [US1] Handmatige test pad A uit quickstart.md: sleep kolom naar eerste positie, open "+ Record", verifieer veldvolgorde = tabelkopvolgorde
- [ ] T008 [US1] Handmatige test pad D uit quickstart.md: verberg een kolom, open "+ Record", verifieer verborgen veld afwezig én overige velden in opgeslagen volgorde

**Checkpoint**: US1 werkt — dit is de volledige MVP (de kernwijziging is één regel).

---

## Phase 4: User Story 2 — Bewerkformulier volgt dezelfde volgorde (Priority: P2)

**Goal**: Het bewerkformulier (potlood-icoon) toont dezelfde veldvolgorde als het aanmaakformulier.

**Independent Test**: Met een opgeslagen volgorde, open een bestaand record voor bewerking en vergelijk de veldvolgorde met het aanmaakformulier.

### Implementation for User Story 2

- [x] T009 [US2] Geen nieuwe code — aanmaken en bewerken delen één `<DynamicForm>`-aanroep in `GenericTable.tsx` (regels ~308-316), dus T004 dekt beide flows. Verifieer door het bewerkformulier te openen (potlood-icoon) met een aangepaste volgorde actief.
- [ ] T010 [US2] Handmatige test pad B uit quickstart.md: bewerk een bestaand record, verifieer zelfde volgorde als aanmaakformulier en tabel

**Checkpoint**: US1 + US2 werken — formulier is volledig consistent met de tabelweergave.

---

## Phase 5: User Story 3 — Volgorde robuust bij kolom-wijzigingen (Priority: P3)

**Goal**: Nieuwe database-kolommen verschijnen achteraan in het formulier; verwijderde kolommen veroorzaken geen fouten.

**Independent Test**: Voeg een kolom toe aan de onderliggende tabel met een opgeslagen volgorde actief, open "+ Record", verifieer nieuw veld achteraan.

### Implementation for User Story 3

- [x] T011 [US3] Geen nieuwe code — `applyColumnOrder`-garanties (contracts/generic-table-form-wiring.md, regels 3-4) dekken dit al en zijn unit-getest in `crud-column-reorder.spec.ts` (tests "herordent volgens savedOrder, rest achteraan" en "kolommen in savedOrder maar niet in allColumns worden overgeslagen"). Alleen leescontrole — geen code.
- [ ] T012 [US3] Handmatige test pad E uit quickstart.md (optioneel, vereist schrijftoegang tot de tabel): voeg kolom toe via SQL, open "+ Record", verifieer nieuw veld achteraan, bestaande volgorde onverstoord
- [ ] T013 [US3] Handmatige test pad C uit quickstart.md: kies "Reset volgorde" (indien aanwezig in kolom-instellingenmenu), open "+ Record", verifieer standaard database-volgorde

**Checkpoint**: Alle user stories functioneel compleet.

---

## Phase 6: Playwright Test (AGENTS.md Definition of Done)

**Purpose**: Minimaal één Playwright e2e-test die het happy path dekt (AGENTS.md: "At least one Playwright test covers the happy path").

- [x] T014 [P] Schrijf Playwright-test `tests/e2e/crud-form-order.spec.ts`: (1) open een CRUD-overzicht, (2) lees de tabelkop-volgorde uit de `thead`, (3) klik "+ Record", (4) lees de veldvolgorde uit het formulier (labels/input-volgorde in de dialog), (5) verifieer dat de formuliervelden in dezelfde relatieve volgorde staan als de zichtbare tabelkolommen (kopvolgorde ⊂ veldvolgorde, relatief behouden), (6) herhaal voor het bewerkformulier via potlood-icoon. Gebruik het bestaande login-skip-patroon (`if (page.url().includes('/login'))` → `test.skip`). Teststrategie per research.md beslissing 5: corrigeer kop-volgorde vs. veldvolgorde zoals gerenderd — geen drag-event-simulatie nodig.
- [ ] T015 Voer de volledige Playwright-regressie-suite uit via `@playwright-tester` (AGENTS.md: "Run the full test suite"). Verifieer alle tests groen.

**Checkpoint**: Happy path afgedekt, regressie groen.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Afronding, quality gates, documentatie.

- [x] T016 [P] Update `FEATURES.md` met de nieuwe feature via `@feature-tracker` (AGENTS.md: "Update FEATURES.md with the new feature")
- [x] T017 [P] Run `tsc --noEmit` — moet schoon zijn (AGENTS.md pre-commit hook)
- [ ] T018 [P] Run `npx eslint src/ --max-warnings 0` — moet schoon zijn (AGENTS.md pre-commit hook)
- [x] T019 [P] Run `bash scripts/fitness-check.sh` — moet PASS zijn (AGENTS.md pre-commit hook)
- [x] T020 [P] Run Gitleaks — moet schoon zijn (AGENTS.md pre-commit hook; geen secrets in deze feature)
- [x] T021 [P] Run `@fitness-checker` voor Supabase MCP checks: F-01 (RLS — geen schemawijziging, moet nog steeds PASS) en F-10 (Storage buckets — onveranderd). Snyk F-16 SAST op `src/` na afronding.
- [ ] T022 Run quickstart.md validatie: paden A–D via Playwright-test (T014), pad E–C handmatig
- [ ] T023 Commit met conventional message: `feat(crud): apply saved column order to create/edit record form` — na alle groene checks per AGENTS.md "After Every Feature"

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: Geen dependencies — start onmiddellijk
- **Phase 2 (Foundational)**: Depends on Phase 1 — verifieert sorteerlogica vóór UI-wijziging
- **Phase 3 (US1)**: Depends on Phase 2 — de kernwijziging (T004 blokkeert alles daarna)
- **Phase 4 (US2)**: Depends on T004 — deelt dezelfde wijziging, alleen verificatie
- **Phase 5 (US3)**: Depends on T004 — alleen verificatie van bestaande garanties
- **Phase 6 (Playwright)**: Depends on Phase 3 (US1 compleet)
- **Phase 7 (Polish)**: Depends on alle voorgaande fases

### User Story Dependencies

- **US1 (P1)**: Start na Foundational — bevat de enige codewijziging
- **US2 (P2)**: Geen eigen code — erft automatisch uit T004, alleen verificatie
- **US3 (P3)**: Geen eigen code — gedekt door bestaande `applyColumnOrder`-garanties, alleen verificatie

### Parallel Opportunities

- T007 en T008 (handmatige testen US1) kunnen parallel — verschillende browsers/tabbladen
- T016 t/m T021 in Phase 7 zijn allemaal [P] — onafhankelijke tools/agents
- T014 kan parallel met Phase 5-verificaties zodra US1 compleet is

---

## Implementation Strategy

### MVP First (US1 only)

1. Phase 1 + Phase 2 (verificatie van bestaande infrastructuur)
2. Phase 3 (T004: één-regelwijziging `columns` → `orderedColumns`)
3. **STOP and VALIDATE**: sleep een kolom, open "+ Record", zie de volgorde doorkomen
4. Dit is de MVP — de kernvraag van de gebruiker is opgelost

### Incremental Delivery

1. Verificatie → T004 (kernwijziging) → US2/US3-verificaties → Playwright → Polish
2. US2 en US3 kosten geen ontwikkeltijd — ze zijn logisch gevolg van T004

---

## Notes

- Geen database-migraties — feature is UI-only (één prop-swap)
- Geen nieuwe dependencies, geen nieuwe bestanden behalve het Playwright-testbestand
- `DynamicForm.tsx` krijgt géén wijziging — zijn impliciete contract (array-volgorde = veldvolgorde) wordt benut
- De pre-commit hook (AGENTS.md) dekt T017–T020 automatisch op `git commit`
- Playwright MCP / `@playwright-tester` per AGENTS.md "Never write Playwright tests by hand" en "Run the full test suite"
- `@feature-tracker` en `@fitness-checker` subagents per AGENTS.md "After Every Feature" workflow
- Total nieuwe coderegels: 1 (plus testbestand) — bewust klein gehouden; alle infrastructuur bestaat al