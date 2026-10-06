# Tasks: Command Center gesterde items als kanban bord

**Input**: Design documents from `/specs/022-command-center-starred-kanban/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/server-actions.md, quickstart.md

**Tests**: Playwright E2E-taken zijn opgenomen (AGENTS.md vereist minimaal één happy-path test per feature + regressie-evaluatie bij Supabase-mutaties).

**Organization**: Taken gegroepeerd per user story voor onafhankelijke implementatie en testbaarheid.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Paralleliseerbaar (andere bestanden, geen afhankelijkheden)
- **[Story]**: User story uit spec.md (US1-US5)
- Bestandspaden staan exact in de omschrijvingen

## Prerequisite

Feature 021 (vaste kolommen Backlog/Doing/Done) is geïmplementeerd: migratie `supabase/migrations/021_standardize_board_columns.sql` toegepast, zodat elk bord exact die drie kolommen heeft.

---

## Phase 1: Setup

**Purpose**: Verificatie van de uitgangspunsten uit het plan

- [X] T001 Controleer dat feature 021 is afgerond: borden tonen precies Backlog/Doing/Done (bronbord-check in de browser) en migratie `supabase/migrations/021_standardize_board_columns.sql` is toegepast; leg eventuele afwijkingen vast vóór start
- [X] T002 Lees de contracten: `specs/022-command-center-starred-kanban/contracts/server-actions.md` (action- en UI-contract) en `specs/022-command-center-starred-kanban/data-model.md` (query-vorm + kolom-mapping)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Server-side fundament dat alle user stories nodig hebben

**⚠️ CRITICAL**: User story-werk kan pas beginnen na deze fase

- [X] T003 Breid `src/app/(dashboard)/command-center/page.tsx` uit met de nieuwe query-vorm uit data-model.md: gesterde top-level kaarten (`is_starred=true`, `is_archived=false`, `parent_id=null`) met `kk_columns!inner(id, name, position, kk_boards!inner(id, name))`, plus subtasks (`parent_id IN gesterde ids`, niet gearchiveerd) en kolommen per betrokken bronbord (`kk_columns ... IN board_ids, order by position`)
- [X] T004 Voeg de props-mapping toe in `src/app/(dashboard)/command-center/page.tsx`: `cards: StarredKanbanCard[]` (incl. `sourceColumnName`, `boardId`, `boardName`, `subtasks`) en `boardColumns: Record<boardId, {id, name, position}[]>`; definieer de `StarredKanbanCard`-interface conform contracts/server-actions.md
- [X] T005 Implementeer server action `moveStarredCardByColumn(data: { cardId, targetColumn: 'Backlog' | 'Doing' | 'Done' })` in `src/actions/starred.ts` conform het contract: guards (gesterd, top-level, niet gearchiveerd), doelkolom-lookup via ILIKE op het bronbord, append-positie `MAX(position)+1`, RPC `kk_move_card` aanroepen, bij succes `revalidatePath('/command-center')` + `revalidatePath('/boards/<board_id>')`, bij fout `{ success: false, error }` zonder mutatie

**Checkpoint**: Fundament klaar — query levert bord-data, action kan muteren

---

## Phase 3: User Story 1 + 4 - Gesterde items als kanban bord met vaste kolommen (Priority: P1/P2) 🎯 MVP

**Goal**: Het command center toont gesterde top-level kaarten als één aggregatiebord met precies Backlog, Doing, Done; elke kaart met bronbord-label, gesorteerd per kolom op bronbord (US1 + US4 samen: bord-weergave is zonder vaste kolommen niet testbaar)

**Independent Test**: Ster kaarten op meerdere borden, open `/command-center`: alle gesterde kaarten zichtbaar als bord met 3 kolommen in vaste volgorde, kaart ligt in kolom die overeenkomt met bronkolom, bronbord-label zichtbaar, niet-gesterde kaarten ontbreken; niet-gesterde kolom leeg maar zichtbaar

### Implementation for User Story 1 + 4

- [X] T006 [US1] [US4] Maak `src/components/command-center/StarredKanbanSection.tsx`: sectie met titel "Gesterde items" (ster-icoon, bestaande Card-stijl) en drie vaste kolommen Backlog, Doing, Done (in die volgorde) als droppable zones; kolomtoewijzing via ILIKE op `sourceColumnName` met fallback Backlog; kolomkop met naam + aantal; lege kolom toont "Geen kaarten"
- [X] T007 [US1] Maak de kaart-render in `src/components/command-center/StarredKanbanSection.tsx`: titel, bronbord-label (FR-004), deadline-indicator indien aanwezig; sortering binnen kolom op `(boardName oplopend, position oplopend)` (FR-012/SC-007); kaarten draggable via `useDraggable` (nog zonder drag-end-afhandeling — dat is US2)
- [X] T008 [US1] [US4] Vervang `StarredSection` door `StarredKanbanSection` in `src/components/command-center/CommandCenterClient.tsx` met de nieuwe props (`cards`, `boardColumns`); `PrioritiesSection` blijft ongewijzigd bovenaan
- [X] T009 [US4] Zorg dat de drie kolommen altijd renderen (ook bij lege kolommen) en horizontaal scrollbaar zijn op mobiel (`overflow-x-auto`, conform bestaand patroon in `src/components/kanban/KanbanBoard.tsx`)

**Checkpoint**: Bord-weergave werkt; kolomstructuur en labels zichtbaar; drag valt nog terug op niets-doener

---

## Phase 4: User Story 2 - Verplaatsen op CC-bord sync met bronbord (Priority: P1)

**Goal**: Sleep een gesterde kaart naar een andere vaste kolom op het CC-bord; de kaart verplaatst naar de gelijknamige kolom op het bronbord, persistent, zonder kopie; kaartklik opent de kaartdetail-weergave

**Independent Test**: Sleep gesterde kaart Backlog → Doing op `/command-center`, open het bronbord: kaart ligt in Doing (ook na herladen); klik op de kaart opent de kaartdetail-modal

### Implementation for User Story 2

- [X] T010 [US2] Implementeer drag-end-afhandeling in `src/components/command-center/StarredKanbanSection.tsx`: DndContext met Pointer/Touch-sensors (bestaande activatie-constraints conform `src/hooks/useKanbanDrag.ts`), DragOverlay met kaart-titel, DragEnd detecteert doel-CC-kolom (droppable id) en roept optimistische update + `moveStarredCardByColumn` aan; bij `{ success: false }` rollback naar oorspronkelijke kolom + destructive toast (FR-010)
- [X] T011 [US2] Verwerk het succesresultaat van `moveStarredCardByColumn`: bij doelkolom Done verdwijnt de kaart uit de lokale state zodra de geretourneerde kaart `is_starred = false` heeft (RPC Done-regel; kaart blijft wel in Done op het bronbord); bij andere kolommen blijft de ster behouden en wordt `sourceColumnName` bijgewerkt
- [X] T012 [US2] Open `CardDetailModal` bij kaartklik in `src/components/command-center/StarredKanbanSection.tsx`: geef de kaart + subtasks + `boardColumns[boardId]` als `columns` door (conform bestaand gebruik in `src/components/kanban/KanbanBoard.tsx`), zodat titel/description/URL/ster/archiveer/verplaats-werkbladen binnen het bronbord functioneren

**Checkpoint**: Tweewegs-sync via revalidate werkt; mutaties persistent

---

## Phase 5: User Story 3 + 5 - Omgekeerde sync en lege staat (Priority: P2/P3)

**Goal**: Kolomwijzigingen op het bronbord zijn bij (her)laden correct zichtbaar op het CC-bord (US3); zonder gesterde kaarten toont het bord de lege staat (US5)

**Independent Test**: Verplaats gesterde kaart Doing → Done op het bronbord, herlaad `/command-center`: kaart staat in Done (of verdwijnt bij ster-uit door RPC Done-regel — verifieer beide); zet alle sterren uit: lege staat met uitleg

### Implementation for User Story 3 + 5

- [X] T013 [US3] Controleer in `src/app/(dashboard)/command-center/page.tsx` en `src/actions/starred.ts` dat elke kolommutatiepad (bronbord `kk_move_card` via `src/actions/cards.ts` moveCard, en de nieuwe CC-action) leidt tot verse CC-data: voeg `revalidatePath('/command-center')` toe aan `moveCard` in `src/actions/cards.ts` (aanwezig bij `createCard`, ontbreekt bij `moveCard`) zodat navigatie naar het CC na bronbord-mutatie actuele kolommen toont
- [X] T014 [US5] Implementeer de lege staat in `src/components/command-center/StarredKanbanSection.tsx`: bij `cards.length === 0` toont de sectie "Geen gesterde items. Klik op de ster bij een kaart om 'm hier te zien." (FR-009, bestaande tekst behouden)

**Checkpoint**: Alle user stories functioneel onafhankelijk

---

## Phase 6: Tests (Playwright E2E)

**Purpose**: Happy-path dekking conform AGENTS.md-regels (Supabase-mutatie + pagina-query gewijzigd → regressietesten verplicht)

- [X] T015 [P] Maak `tests/e2e/command-center-kanban.spec.ts`: (a) kolomstructuur-test — Backlog, Doing, Done zichtbaar in volgorde op `/command-center`; (b) lege-staat-test — placeholder-tekst zichtbaar wanneer geen gesterde kaarten; (c) kaart-in-kolom-test — gesterde kaart ligt in de CC-kolom die overeenkomt met de bronkolom en toont het bronbord-label; (d) drag-sync-test — sleep kaart Backlog → Doing, open het bronbord en verifieer dat de kaart in Doing ligt na herladen (persistente mutatie zichtbaar in UI); skip-patroon `if (page.url().includes('/login'))` behouden
- [X] T016 Herschrijf de describe `/command-center route` in `tests/e2e/kanban.spec.ts` naar de bord-weergave: vervang de platte-lijst assertions (gegroepeerde linkjes, `Geen gesterde items`-telling in oude structuur) door kolomkop-asserties (Backlog/Doing/Done) en kaart-label-asserties (bronbord zichtbaar als tekst)
- [X] T017 Controleer dat `tests/e2e/regression.spec.ts` test "gesterde items op command-center komen overeen met /starred pagina" nog steeds geldig is (bordnamen blijven als kaart-label tekst zichtbaar) en pas alleen de locator-structuur aan als de sectie-DOM is gewijzigd

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T018 Run `tsc --noEmit` — compileert zonder errors
- [X] T019 Run `npx eslint src/ --max-warnings 0` — geen lint-warnings
- [X] T020 Run de volledige Playwright-regressiesuite; alle tests groen (of geskipt zonder login)
- [X] T021 Werk FEATURES.md bij via het `@feature-tracker`-protocol: entry voor `022-command-center-starred-kanban` met referentie naar `specs/022-command-center-starred-kanban/spec.md`
- [X] T022 Run `@fitness-checker` (fitness-check.sh + Supabase MCP F-01/F-10; geen schema-wijzigingen dus RLS ongewijzigd) en schrijf FITNESS.md
- [ ] T023 Run quickstart.md validatie (`specs/022-command-center-starred-kanban/quickstart.md`, stappen 1-9) in de browser
- [ ] T024 Commit met conventioneel bericht: `feat(command-center): gesterde items als kanban bord met sync naar bronbord`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: Geen dependencies — direct starten
- **Phase 2 (Foundational)**: Na Phase 1 — BLOKKEERT alle user stories
- **Phase 3 (US1+US4)**: Na Phase 2 (T003/T004 leveren de props; T005 niet nodig voor weergave)
- **Phase 4 (US2)**: Na Phase 3 (bord-render moet bestaan) én T005 (action)
- **Phase 5 (US3+US5)**: US5 na Phase 3; US3 na Phase 4 (revalidate-pad compleet)
- **Phase 6 (Tests)**: Na Phase 4/5 implementatie; T015 kan parallel aan T016/T017
- **Phase 7 (Polish)**: Na alle voorgaande fasen

### User Story Dependencies

- **US1 + US4 (Phase 3)**: Alleen afhankelijk van foundational query — geen story-dependencies
- **US2 (Phase 4)**: Bouwt voort op US1/US4-render en de action uit Phase 2
- **US3 (Phase 5)**: Afhankelijk van US2 (revalidate-pad); verder onafhankelijk testbaar
- **US5 (Phase 5)**: Alleen afhankelijk van US1-render; volledig onafhankelijk

### Parallel Opportunities

- T003 + T005 (andere bestanden: page.tsx vs starred.ts)
- T006 + T007 + T009 binnen Phase 3 (alleen zelfde component-map; sequentieel aanbevolen binnen één bestand)
- T015 parallel aan T016/T017 (verschillende testbestanden)
- T018 + T019 na elkaar, daarna T020

---

## Parallel Example: Phase 2

```bash
# Launch foundational tasks together (verschillende bestanden):
Task: "Query + props-mapping in src/app/(dashboard)/command-center/page.tsx" (T003+T004)
Task: "Server action moveStarredCardByColumn in src/actions/starred.ts" (T005)
```

---

## Implementation Strategy

### MVP First (Phase 3 = US1+US4)

1. Complete Phase 1 + 2 (foundational query + action)
2. Complete Phase 3 (bord-weergave met vaste kolommen)
3. **STOP and VALIDATE**: onafhankelijke test US1/US4 (quickstart stappen 3-4)
4. Daarna US2 (Phase 4) — de daadwerkelijke sync, het tweede deel van de kernvraag

### Incremental Delivery

1. Foundation → 2. Bord-weergave (US1+US4, demo-klaar) → 3. Drag-sync (US2) → 4. Omgekeerde sync + lege staat (US3+US5) → 5. Tests → 6. Polish/commit

---

## Notes

- [P]-taken = andere bestanden, geen dependencies
- US1 en US4 zijn samengevoegd in Phase 3 omdat de vaste kolomstructuur deel uitmaakt van de bord-weergave; onafhankelijke testbaarheid blijft per scenario behouden
- US2-scenario "kaartklik opent detail" (T012) hoort bij Phase 4 omdat CardDetailModal de kolommen van het bronbord nodig heeft die pas na Phase 3 props beschikbaar zijn
- Commit na elke taak of logische groep; stop bij elke checkpoint voor validatie