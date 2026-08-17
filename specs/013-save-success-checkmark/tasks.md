# Tasks: Save Success Checkmark

**Input**: Design documents from `/specs/013-save-success-checkmark/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/card-save-feedback.md

**Tests**: Playwright e2e-test voor paden A (vinkje verschijnt) en B (vinkje reset bij nieuwe wijziging) — opgenomen in Phase 6 per AGENTS.md "Definition of Done" (minimaal één Playwright-test voor het happy path) en de "Regression Test Rule" (wijziging aan een server-action-flow die `updateCard` aanroept → UI-regressietest vereist).

**Organization**: Tasks gegroepeerd per user story (US1–US3) zodat elke story onafhankelijk implementeerbaar en testbaar is. Let op: US2 (bordinstellingen) heeft geen implementatie-taken omdat er geen bestaand bord-bewerkingsformulier is — zie research.md beslissing 1.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g. US1, US3)
- Exacte bestandspaden in descriptions

## Path Conventions

Single project (Next.js App Router): `src/`, `tests/e2e/` op repository-root.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Import- en type-voorwerk in `CardDetailModal.tsx` dat alle user stories nodig hebben.

- [ ] T001 Voeg `Check` toe aan de bestaande `lucide-react`-import in `src/components/kanban/CardDetailModal.tsx:11` — wijzig `import { Star, Trash2, ExternalLink, ArrowUp, ArrowRight } from 'lucide-react'` naar `import { Star, Trash2, ExternalLink, ArrowUp, ArrowRight, Check } from 'lucide-react'`
- [ ] T002 Voeg `useRef` toe aan de bestaande React-import in `src/components/kanban/CardDetailModal.tsx:3` — wijzig `import { useState, useEffect, useMemo } from 'react'` naar `import { useState, useEffect, useMemo, useRef } from 'react'`
- [ ] T003 Voeg twee nieuwe state-variabelen toe bovenaan `CardDetailModal` (na `const [isSaving, setIsSaving] = useState(false)` op regel 48): `const [isSaved, setIsSaved] = useState(false)` en `const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)`
- [ ] T004 Verifieer `tsc --noEmit` slaagt — geen TypeScript-fouten met de nieuwe imports en state

**Checkpoint**: Imports en state op hun plek. Gedragslogica kan beginnen.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Timer-cleanup bij unmount en reset bij nieuwe kaart — deze logica moet kloppen vóór de knop/vinkje-swap, anders kan state lekken tussen kaarten.

**⚠️ CRITICAL**: Geen user story werk vóór deze fase compleet is.

- [ ] T005 Voeg een cleanup-`useEffect` toe aan `src/components/kanban/CardDetailModal.tsx` (na de bestaande `useEffect([card])` op regel 53-59): `useEffect(() => { return () => { if (savedTimerRef.current) { clearTimeout(savedTimerRef.current); savedTimerRef.current = null } } }, [])` — voorkomt memory-leak bij unmount. Volgens contracts/card-save-feedback.md.
- [ ] T006 Breid de bestaande `useEffect([card])` in `src/components/kanban/CardDetailModal.tsx:53-59` uit met `setIsSaving(false)`, `setIsSaved(false)` en timer-annulering (`if (savedTimerRef.current) { clearTimeout(savedTimerRef.current); savedTimerRef.current = null }`) — zorgt dat bij elke nieuwe kaart-open het vinkje uit staat en geen lopende timer overleeft. FR-006.
- [ ] T007 Verifieer `tsc --noEmit` slaagt en `npx eslint src/components/kanban/CardDetailModal.tsx --max-warnings 0` is schoon

**Checkpoint**: Levenscyclus-logica compleet. Knop/vinkje-swap kan beginnen.

---

## Phase 3: User Story 1 — Groen vinkje na succesvolle opslag (Priority: P1) 🎯 MVP

**Goal**: Na een succesvolle opslag in de kaartdetail-dialoog verandert de knop "Opslaan" direct in een groen vinkje op dezelfde positie.

**Independent Test**: Open een bord, open een kaart, wijzig de titel, klik op "Opslaan" en controleer dat de knop direct verandert in een groen vinkje (pad A uit quickstart.md).

### Tests for User Story 1

> **NOTE**: Schrijf deze test EERST, laat hem FALEN vóór implementatie (zie "Regression Test Rule" in AGENTS.md — `updateCard`-flow wijzigt → UI-regressietest vereist).

- [ ] T008 [P] [US1] Voeg een Playwright-test toe in `tests/e2e/regression.spec.ts` binnen de bestaande `test.describe('kaart bewerken', ...)`-block (na de huidige test op regel 112-150): een nieuwe test `'kaart opslaan toont groen vinkje'` die een bord opent, een kaart opent, de titel wijzigt, op "Opslaan" klikt, en vervolgens `await expect(page.getByRole('dialog').getByText('Opgeslagen')).toBeVisible({ timeout: 2000 })` en `await expect(page.getByRole('dialog').locator('svg.lucide-check')).toBeVisible()` controleert. Gebruik het bestaande `skipIfNotLoggedIn(page)` patroon en de bestaande bord/kaart-locator-strategie. De test moet FAILen vóór implementatie (het label "Opgeslagen" bestaat nog niet).

### Implementation for User Story 1

- [ ] T009 [US1] Wijzig `handleSave` in `src/components/kanban/CardDetailModal.tsx:79-93`: behoud de bestaande `setIsSaving(true)` + `await updateCard(...)` + `setIsSaving(false)`. Vervang de success-branch (na `onUpdated(result.card)`) met: `if (!open) return; setIsSaved(true); if (savedTimerRef.current) clearTimeout(savedTimerRef.current); savedTimerRef.current = setTimeout(() => { setIsSaved(false); savedTimerRef.current = null }, 2000)`. Laat de error-branch ongewijzigd (toast foutmelding, geen `setIsSaved(true)`). Volledig contract in contracts/card-save-feedback.md.
- [ ] T010 [US1] Wijzig de knop-render in `src/components/kanban/CardDetailModal.tsx:231-233`: vervang de huidige `<Button size="sm" onClick={handleSave} disabled={isSaving}>{isSaving ? 'Opslaan...' : 'Opslaan'}</Button>` door een voorwaardelijke render met drie branches: (1) `isSaving` → `<Button size="sm" disabled>Opslaan...</Button>`, (2) `isSaved` → `<span className="text-green-600 dark:text-green-500 inline-flex items-center gap-1 text-sm font-medium"><Check className="h-4 w-4" />Opgeslagen</span>`, (3) anders → `<Button size="sm" onClick={handleSave}>Opslaan</Button>`. Volledig visueel contract in contracts/card-save-feedback.md.
- [ ] T011 [US1] Verifieer `tsc --noEmit` slaagt en `npx eslint src/components/kanban/CardDetailModal.tsx --max-warnings 0` is schoon
- [ ] T012 [US1] Handmatige rooktest: open een kaart, wijzig de titel, klik op "Opslaan", bevestig dat het groene vinkje met label "Opgeslagen" verschijnt op de plek van de knop. Wacht 2 seconden, bevestig dat de knop "Opslaan" terugkeert. Verifieer pad A uit quickstart.md.

**Checkpoint**: US1 compleet. Het groene vinkje verschijnt na opslaan en verdwijnt na 2 seconden. Nog geen reset bij nieuwe wijziging (dat is US3).

---

## Phase 4: User Story 2 — Bordinstellingen (Priority: P2) — GEEN IMPLEMENTATIE

**Goal**: N.v.t. — er bestaat geen bewerkingsformulier voor bordinstellingen in de codebase.

**Independent Test**: N.v.t.

### Notes

Zie research.md beslissing 1: `src/actions/boards.ts:32` bevat wel een `updateBoard` server action, maar er is geen UI-component die deze aanroept (`grep "updateBoard"` over `src/**/*.tsx` = 0 hits). `BoardHeader.tsx` toont alleen de naam + verwijder-knop; `CreateBoardDialog.tsx` heeft een "Aanmaken"-knop (geen "Opslaan") en roept `createBoard` aan.

P2 uit de spec heeft daardoor geen concreet oppervlak. Als later een bord-bewerkingsformulier wordt toegevoegd, kan hetzelfde patroon uit US1 (UI-state + Check-icon swap + 2000ms timer) daar worden hergebruikt. Dit wordt als technische-schuld / future-work genoteerd, niet als taak in deze feature.

**Checkpoint**: N.v.t. — direct door naar US3.

---

## Phase 5: User Story 3 — Automatisch herstel + reset bij nieuwe wijziging (Priority: P3)

**Goal**: Het groene vinkje verdwijnt vanzelf na 2 seconden (automatisch herstel — al geïmplementeerd in T009) en verandert direct terug naar de knop "Opslaan" zodra de gebruiker een veld wijzigt.

**Independent Test**: Open een kaart, sla op, wacht tot het vinkje verschijnt, wijzig direct een ander veld, bevestig dat het vinkje direct verdwijnt (pad B uit quickstart.md).

### Tests for User Story 3

- [ ] T013 [P] [US3] Voeg een Playwright-test toe in `tests/e2e/regression.spec.ts` binnen `test.describe('kaart bewerken', ...)`: test `'vinkje verdwijnt bij nieuwe wijziging'` die een kaart opent, titel wijzigt, opslaat, wacht tot "Opgeslagen" zichtbaar is, dan de omschrijving (textarea) invult, en binnen 500ms verwacht dat "Opgeslagen" NIET meer zichtbaar is en de knop "Opslaan" wél. Gebruik `await expect(page.getByRole('dialog').getByText('Opgeslagen')).not.toBeVisible()` en `await expect(page.getByRole('button', { name: 'Opslaan' })).toBeVisible()`. Test moet FAILen vóór implementatie.

### Implementation for User Story 3

- [ ] T014 [US3] Voeg een nieuw `useEffect` toe aan `src/components/kanban/CardDetailModal.tsx` (na de bestaande `useEffect([card])`): `useEffect(() => { if (isSaved) { setIsSaved(false); if (savedTimerRef.current) { clearTimeout(savedTimerRef.current); savedTimerRef.current = null } } }, [title, description, url, deadline, isStarred])`. FR-003: zodra een van deze velden verandert nadat het vinkje aan stond, wordt het vinkje onmiddellijk gereset en de timer geannuleerd. Let op de `if (isSaved)`-wacht — voorkomt dat het effect `isSaved` initialisiert op `true` bij mount. Volgens contracts/card-save-feedback.md.
- [ ] T015 [US3] Verifieer `tsc --noEmit` slaagt en `npx eslint src/components/kanban/CardDetailModal.tsx --max-warnings 0` is schoon
- [ ] T016 [US3] Handmatige rooktest: open een kaart, wijzig titel, sla op, wacht tot vinkje verschijnt, wijzig direct omschrijving — bevestig dat vinkje direct verdwijnt en knop "Opslaan" terugkeert. Verifieer pad B uit quickstart.md. Extra: verifieer pad D (sluiten tijdens opslaan → geen vinkje bij heropenen) en pad E (andere kaart openen → geen vinkje).

**Checkpoint**: US3 compleet. Vinkje reset zowel automatisch (na 2s) als bij nieuwe wijziging. Alle paden uit quickstart.md werken.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Volledige regressie-suite draaien, fitness-check, FEATURES.md bijwerken.

- [ ] T017 [P] Voeg een Playwright-regressietest toe in `tests/e2e/regression.spec.ts` die pad C dekt: mislukte opslag toont geen vinkje. Omdat het simuleren van een netwerkfout in Playwright via `page.route('**/rest/v1/kk_cards**', route => route.abort())` kan, wijzig de test om te verifiëren dat na een geforceerde fout de knop "Opslaan" zichtbaar blijft en er geen "Opgeslagen" label staat. Skip-graceful als niet ingelogd.
- [ ] T018 [P] Werk `FEATURES.md` bij via het `@feature-tracker`-protocol: voeg een entry toe voor feature `013-save-success-checkmark` met korte beschrijving "Groen vinkje na opslaan in kaartdetail-dialoog (CardDetailModal)", status "shipped", en referentie naar `specs/013-save-success-checkmark/spec.md`.
- [ ] T019 Draai de volledige Playwright-regressie-suite via `@playwright-tester`: `npx playwright test tests/e2e/regression.spec.ts`. Verifieer dat alle bestaande testen nog groen zijn (geen regressie) en dat de nieuwe testen (T008, T013, T017) groen zijn.
- [ ] T020 [P] Draai `bash scripts/fitness-check.sh` via het `@fitness-checker`-protocol: verifieer dat F-02 t/m F-15 passeren. Noteer resultaten in `FITNESS.md`. Geen Supabase-RLS-of bucket-checks nodig (feature raakt geen schema en geen storage).
- [ ] T021 Verifieer `tsc --noEmit` slaagt voor de hele repository (niet alleen `CardDetailModal.tsx`) — vang type-fouten op die elders zouden kunnen ontstaan.
- [ ] T022 Valideer handmatig alle 6 paden uit `specs/013-save-success-checkmark/quickstart.md` (A t/m F) in de browser. Documenteer eventuele afwijkingen.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Geen dependencies — kan direct starten. Moest eerst (imports/state).
- **Foundational (Phase 2)**: Hangt af van Phase 1 (state-variabelen moeten bestaan). BLOCKS alle user stories.
- **User Story 1 (Phase 3)**: Hangt af van Phase 2. Levert de MVP.
- **User Story 2 (Phase 4)**: Geen implementatie — skipped.
- **User Story 3 (Phase 5)**: Hangt af van Phase 3 (de knop/vinkje-swap moet bestaan om reset-gedrag te kunnen testen).
- **Polish (Phase 6)**: Hangt af van Phase 3 en Phase 5.

### Within Each User Story

- Tests (T008, T013) MOETEN worden geschreven en FAILen vóór implementatie (T009, T014) — per AGENTS.md "Regression Test Rule".
- Implementatie volgorde: state-logica → render-wijziging → typecheck/lint → rooktest.
- Story compleet vóór naar de volgende prioriteit.

### Parallel Opportunities

- T008 (US1 test) en T013 (US3 test) zijn [P] — beide in `tests/e2e/regression.spec.ts`, kunnen tegelijk worden geschreven als verschillende `test(...)`-blocks.
- T017 (regressietest pad C) en T018 (FEATURES.md) zijn [P] — verschillende bestanden, geen dependency.
- T020 (fitness-check) is [P] ten opzichte van T019 (playwright-suite), maar beide moeten groen zijn vóór commit.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: Setup — imports, state, `tsc --noEmit` ✓
2. Phase 2: Foundational — cleanup-effect, reset-effect, lint schoon
3. Phase 3: User Story 1 — test FAILt, `handleSave` + render-wijziging, test PASSt
4. **STOP and VALIDATE**: rooktest pad A; "Opgeslagen" zichtbaar na opslaan
5. Indien gewenst: commit als MVP

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. US1 → Test onafhankelijk → MVP gedemonstreerd
3. US3 → Test onafhankelijk → reset-gedrag werkt
4. Polish → regressie-suite groen, FEATURES.md bijgewerkt, fitness-check pass

---

## Notes

- [P] tasks = verschillende bestanden, geen dependencies
- [Story] label mapt task naar user story voor traceability
- US2 heeft geen taken — zie research.md beslissing 1 (geen bestaand bord-bewerkingsformulier)
- Verifieer tests FAILen vóór implementatie
- Commit na elke logische groep (bijv. na Phase 2, na US1, na US3, na Polish)
- Stop bij elk checkpoint om de story onafhankelijk te valideren
- Voorkom: vage tasks, conflicts in hetzelfde bestand (alle wijzigingen zijn in `CardDetailModal.tsx` — dus sequentieel werken binnen dat bestand)