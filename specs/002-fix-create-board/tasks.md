# Tasks: Fix Kanban Board Creation Button

**Input**: Design documents from `/specs/002-fix-create-board/`

**Prerequisites**: plan.md ✅, spec.md ✅

**Tests**: Playwright e2e via Playwright MCP per AGENTS.md workflow.

**Organization**: Tasks grouped by user story. This is a small fix — no foundational phase needed.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to

---

## Phase 1: User Story 1 — Create a New Kanban Board (Priority: P1) 🎯 MVP

**Goal**: Wire the "Nieuw bord" button to open CreateBoardDialog and call the createBoard server action

**Independent Test**: Click "Nieuw bord" on `/boards`, enter a name, click "Aanmaken", verify new board appears in list

### Implementation for User Story 1

- [ ] T001 [US1] Create `src/components/kanban/CreateBoardButton.tsx` — client component with: `open` state, `isLoading` state, renders `<Button>` with Plus icon + onClick to open dialog, renders `<CreateBoardDialog>` with `onCreateBoard` that calls `createBoard` server action and `router.refresh()` on success
- [ ] T002 [US1] Update `src/components/kanban/CreateBoardDialog.tsx` — make `onCreateBoard` prop return a Promise (async), await it in `handleCreate`, keep dialog open on error, only close + reset on success
- [ ] T003 [US1] Update `src/app/(dashboard)/boards/page.tsx` — replace dead `<Button>` at line 27-29 with `<CreateBoardButton boards={boards} />`, add import
- [ ] T004 [P] [US1] Update `src/components/kanban/KanbanBoard.tsx` — remove dead `CreateBoardDialog` import at line 10

**Checkpoint**: User can click "Nieuw bord", create a board, and see it in the list

---

## Phase 2: User Story 2 — Error Handling on Board Creation Failure (Priority: P2)

**Goal**: Show clear error messages when board creation fails; prevent duplicate submissions

**Independent Test**: Simulate server error, verify toast notification appears and dialog stays open

### Implementation for User Story 2

- [ ] T005 [US2] Update `src/components/kanban/CreateBoardButton.tsx` — handle `createBoard` error response: if `result.error`, show toast with `{ title: 'Fout', description: result.error, variant: 'destructive' }`, keep dialog open; if success, close dialog + `router.refresh()`
- [ ] T006 [US2] Update `src/components/kanban/CreateBoardDialog.tsx` — ensure `handleCreate` awaits `onCreateBoard` result, only closes dialog when `onCreateBoard` resolves to success (not on error); update `onCreateBoard` prop type to return `{ id: string; error?: string }`

**Checkpoint**: Error states show toast, dialog stays open for retry, no duplicate submissions

---

## Phase 3: User Story 3 — Board List Refreshes After Creation (Priority: P3)

**Goal**: New board appears in list immediately after creation without manual refresh

**Independent Test**: Create a board, verify the board card appears in the grid within 2 seconds

### Implementation for User Story 3

- [ ] T007 [US3] Verify `CreateBoardButton.tsx` calls `router.refresh()` after successful `createBoard` — the server action already calls `revalidatePath('/boards')`, so `router.refresh()` triggers a re-fetch of the server component data

**Checkpoint**: Board list refreshes automatically after creation

---

## Phase 4: Polish & Verification

**Purpose**: Clean up and verify all acceptance scenarios

- [ ] T008 Run `tsc --noEmit` to verify TypeScript compiles cleanly
- [ ] T009 [P] Run `npx eslint src/ --max-warnings 0` to verify no lint errors
- [ ] T010 Manual verification: click "Nieuw bord" → dialog opens → type name → "Aanmaken" → board appears in list → cancel works → empty name disables button → rapid clicks don't create duplicates

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (US1)**: T001 first (new file), then T002 (dialog async), then T003 (wire into page), T004 parallel (cleanup import)
- **Phase 2 (US2)**: Depends on T001 and T002 from Phase 1
- **Phase 3 (US3)**: Covered by T001 implementation, T007 is verification only
- **Phase 4**: Depends on all previous phases

### Execution Order

```
T001 → T002 → T003
T004 (parallel, anytime)
T005 → T006 (after T001, T002)
T007 (verification, after T005)
T008, T009, T010 (final verification)
```

### Parallel Opportunities

- T004 can run anytime (different file, just removing an import)
- T008 and T009 can run in parallel (different tools)

---

## Notes

- This is a small fix with 4 files changed (1 new, 3 modified)
- The `createBoard` server action already exists and works — we're wiring it to the UI
- The `CreateBoardDialog` component already exists — we're making its callback async
- No new dependencies needed