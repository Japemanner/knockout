# Implementation Plan: Fix Kanban Board Creation Button

**Branch**: `002-fix-create-board` | **Date**: 2026-06-03 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-fix-create-board/spec.md`

## Summary

Fix the non-functional "Nieuw bord" button on the boards overview page. The button exists but has no click handler, the page is a server component that cannot handle client events, and the existing `CreateBoardDialog` component is imported but never rendered. Wire all parts together by creating a client component wrapper that bridges the server page to the client-side dialog and `createBoard` server action.

## Technical Context

**Language/Version**: TypeScript 5.6+ (strict mode)

**Primary Dependencies**: Next.js 15 (App Router), React 18, shadcn/ui (Dialog, Button, Input), @supabase/ssr

**Storage**: Supabase PostgreSQL (existing `kk_boards` + `kk_columns` tables with RLS)

**Testing**: Playwright MCP (e2e), Vitest (unit)

**Target Platform**: Web (Netlify, Next.js runtime)

**Project Type**: Web application (Next.js App Router + server actions)

**Performance Goals**: Dialog opens <500ms, board creation + list refresh <2s

**Constraints**: Server components cannot handle onClick; existing `createBoard` server action must be reused; no new dependencies

**Scale/Scope**: Single fix, 3 files modified, 1 file created

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| RLS on every table | ✅ PASS | No new tables; existing `kk_boards` + `kk_columns` already have RLS |
| No secrets in client code | ✅ PASS | `createBoard` server action runs server-side; no secrets exposed |
| PKCE auth flow | ✅ PASS | Auth handled by existing middleware + server client |
| TypeScript strict mode | ✅ PASS | All new code uses strict types, no `any` |
| Storage bucket policies | N/A | No storage buckets involved |

## Project Structure

### Documentation (this feature)

```text
specs/002-fix-create-board/
├── plan.md              # This file
└── spec.md              # Feature specification
```

### Source Code Changes

```text
src/
├── app/(dashboard)/boards/
│   └── page.tsx                    # MODIFY: Replace dead Button with CreateBoardButton client component
├── components/kanban/
│   ├── CreateBoardDialog.tsx       # MODIFY: Fix async handling, add error handling in onCreateBoard callback
│   └── CreateBoardButton.tsx        # NEW: Client component wrapping button + dialog + createBoard call
└── components/kanban/
    └── KanbanBoard.tsx              # MODIFY: Remove dead CreateBoardDialog import
```

**Structure Decision**: Follow existing pattern — client components in `src/components/kanban/` that compose shadcn/ui primitives and call server actions from `src/actions/`. A new `CreateBoardButton` client component wraps the button + dialog + server action call, then is imported into the server page.

## Implementation Design

### Phase 0: Root Cause Analysis (Complete)

**Problem**: Three disconnected pieces that were never wired together:

1. **Dead button** (`boards/page.tsx:27-29`): `<Button>` with no `onClick`, no `action`, no form. Page is a server component.
2. **Dead import** (`KanbanBoard.tsx:10`): `CreateBoardDialog` imported but never rendered in JSX.
3. **Unused server action** (`actions/boards.ts:16-38`): `createBoard` fully implemented (inserts board + 4 default columns + revalidates `/boards`) but never called from UI.

### Phase 1: Component Design

**New component: `CreateBoardButton`** (`src/components/kanban/CreateBoardButton.tsx`)

```
CreateBoardButton (client component)
├── State: open (boolean), isLoading (boolean), error (string | null)
├── Renders: <Button> with Plus icon + onClick → set open=true
├── Renders: <CreateBoardDialog> with:
│   ├── open={open}
│   ├── onOpenChange={setOpen}
│   ├── allBoards={boards} (passed from parent)
│   └── onCreateBoard={handleCreate}
│       ├── Calls createBoard server action
│       ├── On success: closes dialog, router.refresh()
│       └── On error: shows toast, keeps dialog open
```

**Props**:
- `boards: { id: string; name: string }[]` — passed through to CreateBoardDialog for `allBoards` prop

**Flow**:
1. User clicks button → dialog opens
2. User types name, clicks "Aanmaken" or Enter
3. `handleCreate` calls `createBoard({ name })`
4. If success → `onOpenChange(false)` + `router.refresh()`
5. If error → toast with error message, dialog stays open

**Existing `CreateBoardDialog` changes**:
- The `handleCreate` callback currently calls `onCreateBoard(name.trim())` synchronously. Since the server action is async, `CreateBoardButton.handleCreate` must be async and `CreateBoardDialog.onCreateBoard` should await the result. Current dialog does not await — it sets `isLoading=false` immediately. Fix: make `onCreateBoard` return a Promise and have the dialog await it before resetting state.

### Phase 2: File Changes

| File | Change Type | Details |
|------|------------|---------|
| `src/components/kanban/CreateBoardButton.tsx` | NEW | Client component: button + dialog + server action wiring |
| `src/components/kanban/CreateBoardDialog.tsx` | MODIFY | Make `onCreateBoard` async, await result, handle error return |
| `src/app/(dashboard)/boards/page.tsx` | MODIFY | Replace dead `<Button>` with `<CreateBoardButton>`, pass boards data |
| `src/components/kanban/KanbanBoard.tsx` | MODIFY | Remove dead `CreateBoardDialog` import (line 10) |

### Phase 3: Error Handling Design

**Error states**:
- `createBoard` returns `{ id: '', error: 'Niet ingelogd' }` → toast "Niet ingelogd"
- `createBoard` returns `{ id: '', error: 'Kon bord niet aanmaken' }` → toast with server error
- Network/unknown error → toast "Onbekende fout"
- Empty name → `CreateBoardDialog` already disables "Aanmaken" button when name is empty/whitespace

**Toast convention** (existing pattern from `KanbanBoard.tsx:64`):
```typescript
toast({ title: 'Fout', description: result.error, variant: 'destructive' })
```

## Complexity Tracking

> No constitution violations. All principles pass.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | N/A | N/A |