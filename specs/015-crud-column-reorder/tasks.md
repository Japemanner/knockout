# Tasks: CRUD Kolom Volgorde Aanpasbaar

**Input**: Design documents from `/specs/015-crud-column-reorder/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/column-order.md

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story (US1 = drag-and-drop P1, US2 = reset P2)

---

## Phase 1: Foundation (Blocking)

**Purpose**: Database + types + helpers die alle user stories nodig hebben

- [ ] T001 Create `supabase/migrations/015_crud_overviews_column_order.sql` — add `column_order TEXT[] NOT NULL DEFAULT '{}'` column
- [ ] T002 [P] Add `column_order: string[]` to `CRUDOverview` interface in `src/types/database.types.ts:169`
- [ ] T003 [P] Create `src/lib/column-order.ts` with `applyColumnOrder`, `reorderArray`, `isDefaultOrder` per `contracts/column-order.md`
- [ ] T004 Update `getCrudOverviews` in `src/actions/crud-overviews.ts:12` — add `column_order` to SELECT
- [ ] T005 Update `updateCrudOverview` in `src/actions/crud-overviews.ts:60` — accept optional `column_order?: string[]` and write it

**Checkpoint**: Database + server layer ready. Frontend kan nu bouwen.

---

## Phase 2: User Story 1 — Kolomvolgorde aanpassen via drag-and-drop (P1) 🎯 MVP

**Goal**: Gebruiker versleept kolomkoppen en de nieuwe volgorde wordt opgeslagen per-overzicht per-gebruiker

**Independent Test**: Versleep een kolom, herlaad pagina, verifieer volgorde behouden

### Implementation

- [ ] T006 [P] [US1] Create `src/components/db-explorer/DraggableTableHeader.tsx` — dnd-kit sortable header row met `GripVertical` handle, `cursor-grab`, `horizontalListSortingStrategy`
- [ ] T007 [US1] Modify `src/components/db-explorer/GenericTable.tsx` — add `columnOrder?: string[]` and `onColumnReorder?: (newOrder: string[]) => void` props; apply `applyColumnOrder` to `displayColumns`; conditionally render `DraggableTableHeader` when `onColumnReorder` provided
- [ ] T008 [US1] Modify `src/components/db-explorer/LocalDynamicTable.tsx` — pass through `columnOrder` and `onColumnReorder` props to `GenericTable`
- [ ] T009 [US1] Create `src/components/crud/CrudTableWrapper.tsx` — client component wrapping `LocalDynamicTable`, calls `updateCrudOverview({ crudId, column_order })` on reorder + `router.refresh()`
- [ ] T010 [US1] Modify `src/app/(dashboard)/crud/[crudId]/page.tsx` — add `column_order` to CrudOverviewData interface and select; render `CrudTableWrapper` instead of `LocalDynamicTable`; pass `columnOrder={crud.column_order ?? []}`

**Checkpoint**: Drag-and-drop werkt, volgorde wordt opgeslagen. MVP functioneel.

---

## Phase 3: User Story 2 — Reset volgorde naar standaard (P2)

**Goal**: "Reset volgorde" knop in kolom-instellingenmenu herstelt standaardvolgorde

**Independent Test**: Pas volgorde aan, klik "Reset volgorde", verifieer standaardvolgorde

### Implementation

- [ ] T011 [US2] Modify `src/components/crud/ColumnVisibilityDialog.tsx` — add `columnOrder?: string[]` prop; add "Reset volgorde" button calling `updateCrudOverview({ crudId, column_order: [] })`; disable button when `isDefaultOrder(columnOrder)`
- [ ] T012 [US2] Modify `src/app/(dashboard)/crud/[crudId]/page.tsx` — pass `columnOrder={crud.column_order ?? []}` to `ColumnVisibilityDialog`

**Checkpoint**: Reset werkt. Beide user stories functioneel.

---

## Phase 4: Testing & Polish

- [ ] T013 [P] Create `tests/e2e/crud-column-reorder.spec.ts` — drag column, verify order, reload, verify persisted, reset, verify default
- [ ] T014 Run `npx tsc --noEmit` — must be 0 errors
- [ ] T015 Run Playwright regression suite
- [ ] T016 Commit with conventional message

---

## Dependencies

- T001 → T002 (type needs column to exist conceptually)
- T002 → T004, T005 (server actions use type)
- T003 → T007 (GenericTable uses helper)
- T004, T005 → T009 (wrapper calls server action)
- T006 → T007 (GenericTable renders DraggableTableHeader)
- T007 → T008 (LocalDynamicTable passes through)
- T008 → T009 (wrapper uses LocalDynamicTable)
- T009 → T010 (page uses wrapper)
- T010 → T011, T012 (page passes columnOrder to dialog)
- T013 → after T012 (test needs full feature)