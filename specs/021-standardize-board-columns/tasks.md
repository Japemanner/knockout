# Tasks: Standaardisatie van bordkolommen

**Input**: Design documents from `/specs/021-standardize-board-columns/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: Playwright E2E-tests verplicht per AGENTS.md (regressieregel: server action `createBoard` gewijzigd, kolom-aanmaak verwijderd, Done-collapse gewijzigd).

**Organization**: Taken gegroepeerd per user story. US1 (nieuwe borden) + US2 (Done ingeklapt) vormen samen de MVP; US3 (migratie bestaande borden) levert de consistentie op alle borden; US4 (structuur behouden) is de afronding.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Parallel uitvoerbaar (andere bestanden, geen dependencies)
- **[Story]**: US1 — vaste kolommen bij nieuw bord; US2 — Done altijd ingeklapt; US3 — bestaande borden omgezet; US4 — vaste structuur behouden
- Exacte bestandspaden in elke beschrijving

## Path Conventions

- Single project: `src/`, `tests/`, `supabase/` op repository-root

---

## Phase 1: Setup

**Purpose**: Bestaande context verifiëren — geen nieuwe infrastructuur nodig.

- [ ] T001 Verifieer dat `src/actions/boards.ts` (lijn 18-23) de 4-kolommen-insert bevat, `src/components/kanban/KanbanColumn.tsx` (lijn 33) de case-sensitive collapse-init `column.name === 'done'` bevat, en `src/actions/columns.ts` enkel door `AddColumnForm`-pad wordt gebruikt (grep createColumn/updateColumn/deleteColumn/reorderColumns) — zoals beschreven in plan.md

---

## Phase 2: Foundational

**Purpose**: Geen blocking prerequisites — de user stories zijn onafhankelijke codewijzigingen die direct op bestaande infrastructuur bouwen. Deze fase is bewust leeg.

**Checkpoint**: Foundation is de bestaande kanban-stack (actions + components + migratiepatroon) — geen werk nodig.

---

## Phase 3: User Story 1 — Nieuw bord krijgt vaste kolommen (Priority: P1) 🎯 MVP

**Goal**: Elk nieuw bord wordt aangemaakt met exact Backlog (position 0), Doing (1) en Done (2) — geen Review.

**Independent Test**: Maak een nieuw bord aan en verifieer dat het bord precies drie kolommen toont: Backlog, Doing, Done, in die volgorde.

### Implementation for User Story 1

- [ ] T002 [US1] Wijzig `src/actions/boards.ts` `createBoard` (lijn 18-23): verwijder de Review-regel, hernoem niets — insert wordt Backlog/0, Doing/1, Done/2

**Checkpoint**: Nieuwe borden hebben de vaste structuur. US2 is onafhankelijk parallel uitvoerbaar.

---

## Phase 4: User Story 2 — Done-kolom altijd ingeklapt (Priority: P1) 🎯 MVP

**Goal**: De Done-kolom start bij elk bordbezoek ingeklapt (titel + aantal zichtbaar, kaarten verborgen), handmatig uit-/inklappen blijft mogelijk.

**Independent Test**: Open een bord met kaarten in Done en verifieer: (a) Done is ingeklapt, (b) klik op kolomkop klapt uit, (c) herladen van de pagina zet Done weer ingeklapt.

### Implementation for User Story 2

- [ ] T003 [P] [US2] Fix de case-bug in `src/components/kanban/KanbanColumn.tsx` lijn 33: vervang `useState(column.name === 'done')` door `useState(column.name.trim().toLowerCase() === 'done')` (FR-002, FR-007)

**Checkpoint**: MVP compleet (US1 + US2): nieuwe borden hebben de vaste structuur en Done is altijd ingeklapt.

---

## Phase 5: User Story 3 — Bestaande borden omgezet (Priority: P2)

**Goal**: Alle bestaande borden hebben na de migratie exact Backlog/Doing/Done; kaarten uit verwijderde kolommen (bijv. Review) liggen in Doing; geen kaartverlies.

**Independent Test**: Open een bestaand bord (aangemaakt vóór deze feature): het toont alleen Backlog/Doing/Done, alle eerder zichtbare kaarten zijn nog zichtbaar (Review-kaarten nu in Doing).

### Implementation for User Story 3

- [ ] T004 [US3] Schrijf `supabase/migrations/021_standardize_board_columns.sql`: één atomair, idempotent `DO $$ ... $$`-blok per bord — (1) case-varianten canoniseren (ILIKE 'backlog'/'doing'/'done' → exacte naam), (2) canonieke kolom per standaardnaam = laagste position, duplicaat-kolommen mergen (kaarten appenden met ROW_NUMBER-volgorde naar canonieke kolom, duplicaat verwijderen), (3) kaarten uit niet-standaard kolommen → Doing geappend na bestaande Doing-kaarten (behoud relatieve volgorde), (4) subtask-veiligheidsnet: subtask volgt parent-kolom wanneer parent in standaardkolom ligt, (5) niet-standaard kolommen verwijderen (pas ná verplaatsingen — geen kaartverlies), (6) posities hernormaliseren naar 0/1/2, (7) ontbrekende standaardkolommen leeg aanvullen
- [ ] T005 [US3] Voer de migratie uit via Supabase MCP (niet handmatig); verifieer daarna via MCP-query dat elk bord exact 3 kolommen heeft met namen Backlog/Doing/Done en posities 0/1/2; verifieer dat RLS op `kk_columns` en `kk_cards` nog enabled is (F-01)

**Checkpoint**: Alle bestaande borden voldoen aan de vaste structuur.

---

## Phase 6: User Story 4 — Vaste structuur behouden (Priority: P3)

**Goal**: Er bestaat geen gebruikerspad meer dat de vaste kolomstructuur kan breken; kaartverplaatsing tussen de drie kolommen blijft werken.

**Independent Test**: Open een bord: er is geen "Kolom toevoegen"-knop; versleep een kaart van Backlog naar Doing — verplaatsen werkt en de kolomstructuur blijft Backlog/Doing/Done.

### Implementation for User Story 4

- [ ] T006 [US4] Verwijder `src/actions/columns.ts` (createColumn, updateColumn, deleteColumn, reorderColumns — laatste drie zijn reeds dode code)
- [ ] T007 [P] [US4] Verwijder `src/components/kanban/AddColumnForm.tsx`
- [ ] T008 [US4] Ruim `src/components/kanban/KanbanBoard.tsx` op: verwijder AddColumnForm-import (lijn 10), createColumn-import (lijn 14), `handleAddColumn` (lijn 80-85) en de `<AddColumnForm>`-usage (lijn 185)

**Checkpoint**: Vaste structuur is afgedwongen; drag-and-drop tussen kolommen onaangetast.

---

## Phase 7: Tests (verplicht per AGENTS.md regressieregel)

**Purpose**: Dekking voor gewijzigde server action (createBoard), verwijderde kolom-CRUD en gewijzigd collapse-gedrag; legacy-tests die Review/kolom-aanmaak verwachten worden aangepast.

- [ ] T009 [P] Schrijf `tests/e2e/board-standard-columns.spec.ts`: (a) nieuw bord aanmaken → exact Backlog/Doing/Done in volgorde (data-correctheid via kolom-header-teksten, niet alleen bestaan), (b) Done start ingeklapt (aria-label `Done uitklappen` + kaarten verborgen), (c) klik op Done-kolomkop klapt uit en toont kaarten, (d) na page.reload() is Done weer ingeklapt, (e) skip-patroon `if (page.url().includes('/login'))` zoals in bestaande tests
- [ ] T010 [P] Update `tests/e2e/regression.spec.ts`: pas `bordpagina kolom-volgorde`-test (lijn 478-511) aan naar verwachte volgorde Backlog/Doing/Done (verwijder Review-verwachting lijn 504, Done wordt positie 3 → 2e expect-index); verwijder de volledige `kolom aanmaken`-describe (lijn 332-375) — functionaliteit bestaat niet meer
- [ ] T011 [P] Update `tests/e2e/kanban.spec.ts` (comment rond lijn 182): vervang "Backlog, Doing, Review, Done zijn de defaults" door "Backlog, Doing, Done zijn de defaults"
- [ ] T012 Draai de volledige E2E-regressiesuite en verifieer dat alle tests groen zijn (of geskipt zonder sessie)

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Kwaliteitspoorten conform AGENTS.md "After Every Feature".

- [ ] T013 [P] Draai `tsc --noEmit` en verifieer dat TypeScript zonder errors compileert
- [ ] T014 [P] Draai `npx eslint src/ --max-warnings 0` en verifieer nul warnings
- [ ] T015 [P] Werk FEATURES.md bij met de nieuwe feature (@feature-tracker patroon)
- [ ] T016 Run quickstart.md validatie (`specs/021-standardize-board-columns/quickstart.md`)
- [ ] T017 [P] Draai `bash scripts/fitness-check.sh` en verifieer dat alle checks slagen
- [ ] T018 Verifieer F-01 (RLS op kk_columns/kk_cards) en F-10 (storage buckets) via Supabase MCP, en F-16/F-17 (Snyk SAST/SCA) via Snyk MCP; schrijf FITNESS.md (@fitness-checker patroon)
- [ ] T019 Commit met conventional message (`feat(kanban): vaste kolommen Backlog/Doing/Done, Done standaard ingeklapt`)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Geen dependencies — direct starten
- **Foundational (Phase 2)**: Leeg — geen blocking prerequisites
- **US1 (Phase 3)**: T002 direct na T001
- **US2 (Phase 4)**: T003 is [P] ten opzichte van T002 (verschillende bestanden) — parallel uitvoerbaar
- **US3 (Phase 5)**: T004 → T005 sequentieel (migratie schrijven vóór uitvoeren); onafhankelijk van T002/T003
- **US4 (Phase 6)**: T006 → T008 sequentieel (KanbanBoard-opruiming vereist verwijderde columns.ts/import); T007 parallel met T006
- **Tests (Phase 7)**: T009/T010/T011 zijn [P] onderling; T009 vereist T002+T003 (nieuw bord + collapse gedrag); T010 vereist T002 (kolomvolgorde) en T006-T008 (kolom-aanmaak weg); T012 na alle implementatie en testupdates
- **Polish (Phase 8)**: Na T012 groen; T019 pas als alles groen is

### Within Each User Story

- Migratie bestand (T004) vóór MCP-uitvoering (T005)
- Code-verwijdering (T006-T008) vóór de regressiesuite-run (T012) — anders falende tests
- E2E-run (T012) pas wanneer implementatie + testupdates klaar zijn

### Parallel Opportunities

- T002 (boards.ts) ∥ T003 (KanbanColumn.tsx) — verschillende bestanden
- T004 (migratie schrijven) ∥ T002/T003 — verschillende bestanden
- T006 (columns.ts) ∥ T007 (AddColumnForm.tsx) — verschillende bestanden
- T009 ∥ T010 ∥ T011 — verschillende testbestanden
- T013 ∥ T014 ∥ T015 ∥ T017 — onafhankelijke checks

---

## Parallel Example

```bash
# Na T001, parallel:
Task: "Wijzig createBoard in src/actions/boards.ts (T002)"
Task: "Fix case-bug in src/components/kanban/KanbanColumn.tsx (T003)"
Task: "Schrijf supabase/migrations/021_standardize_board_columns.sql (T004)"
```

---

## Implementation Strategy

### MVP First (US1 + US2)

1. Complete Phase 1: Setup (verificatie)
2. Complete T002 + T003 (parallel)
3. **STOP en VALIDATE**: nieuw bord heeft Backlog/Doing/Done en Done start ingeklapt
4. Complete Phase 5 (T004 → T005): bestaande borden gemigreerd
5. Complete Phase 6 (T006 → T008): kolom-CRUD verwijderd
6. Complete Phase 7 (T009-T012): tests geschreven/updated en suite groen
7. Complete Phase 8: T013 → T019
8. **STOP en VALIDATE**: quickstart.md draait groen, regressiesuite groen, fitness check passed

---

## Notes

- T005, T018 vereisen Supabase MCP; T018 vereist daarnaast Snyk MCP (F-16/F-17)
- Migratie is idempotent — herhaalde uitvoering is veilig en verandert niets aan borden die al voldoen
- Pre-commit hook (tsc, fitness-check, gitleaks, eslint) draait automatisch bij T019
- Commit pas bij T019 — alle eerdere taken blijven ongecommit tot de volledige feature + tests groen zijn
- `CardDetailModal` gebruikt `columns`-prop (KanbanBoard geeft `sortedColumns` door) — onaangetast: kolommen blijven bestaan, alleen de set is vast
- Bordpagina-query (`boards/[boardId]/page.tsx`) vereist geen wijziging — data is na migratie correct