# Tasks: Multi-Kanban Workspace met Postgres CRUD

**Input**: Design documents from `/specs/001-multi-kanban-workspace/`

**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Tests**: Playwright e2e tests via Playwright MCP (included per AGENTS.md workflow). Unit tests OPTIONAL for MVP.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup — Next.js 15 Migration (Shared Infrastructure)

**Purpose**: Migrate project from Vite SPA to Next.js 15 App Router and install new dependencies.

- [ ] T001 Install Next.js 15 + @supabase/ssr + new deps (`next`, `@supabase/ssr`, `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`, `pg`, `rss-parser`, `react-markdown`, `remark-gfm`, `@netlify/plugin-nextjs`) — update `package.json`
- [ ] T002 [P] Create `src/app/globals.css` — migrate existing `src/index.css` Tailwind + CSS variables
- [ ] T003 [P] Create `next.config.ts` — configure transpilePackages, images, experimental settings
- [ ] T004 [P] Update `tsconfig.json` — add Next.js paths, keep strict mode, add `"plugins": [{"name": "next"}]`
- [ ] T005 [P] Update `tailwind.config.js` → `tailwind.config.ts` — add Next.js content paths (`src/app/**`, `src/components/**`)
- [ ] T006 [P] Update `netlify.toml` — add `@netlify/plugin-nextjs` plugin config
- [ ] T007 [P] Update `package.json` scripts — `dev: next dev`, `build: next build`, `lint: next lint`, add `postinstall: npx supabase gen types`
- [ ] T008 [P] Update `.env.example` — rename `VITE_` to `NEXT_PUBLIC_`, add server-only vars

---

## Phase 2: Foundational — Auth & Core Infrastructure (Blocking Prerequisites)

**Purpose**: Supabase SSR auth, middleware, server/browser client split, and database migration. BLOCKS all user stories.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T009 Create `src/lib/supabase/server.ts` — Supabase server client with `createServerClient` from `@supabase/ssr`, cookie-based session
- [ ] T010 [P] Create `src/lib/supabase/client.ts` — Supabase browser client with `createBrowserClient`, PKCE flow
- [ ] T011 [P] Create `src/lib/supabase/middleware.ts` — session refresh helper for Next.js middleware
- [ ] T012 Create `src/middleware.ts` — auth guard: redirect unauthenticated users from anything except `/login`, `/auth/callback`, `/forgot-password`, `/reset-password` to `/login`
- [ ] T013 Create `src/app/layout.tsx` — root layout with QueryClientProvider, ToastProvider, ThemeProvider (dark default), fonts
- [ ] T014 [P] Create `src/app/auth/callback/route.ts` — Supabase auth code exchange handler
- [ ] T015 Port login: create `src/app/(auth)/login/page.tsx` — extract LoginForm from `src/components/auth/LoginPage.tsx`, adapt to server component + client form pattern
- [ ] T016 [P] Port `src/app/(auth)/forgot-password/page.tsx` from existing `ForgotPasswordPage.tsx`
- [ ] T017 [P] Port `src/app/(auth)/reset-password/page.tsx` from existing `ResetPasswordPage.tsx`
- [ ] T018 Port `src/components/auth/LoginForm.tsx` — client component with `supabase.auth.signInWithPassword()`, magic link support, redirect to `/boards`
- [ ] T019 [P] Run migration `supabase/migrations/002_kanban_workspace.sql` — deploy via Supabase MCP or Supabase CLI to create 7 new tables with RLS policies
- [ ] T020 [P] Update `src/types/database.types.ts` — regenerate via `supabase gen types typescript` to include new tables (boards, columns, cards, time_sessions, db_connections, rss_feeds, focus_notes)
- [ ] T021 [P] Port existing `src/store/authStore.ts` — adapt to @supabase/ssr browser client, remove `initialize()` dependency on Vite-specific patterns
- [ ] T022 [P] Create `src/lib/utils.ts` — migrate existing `cn()` utility, add `formatDuration()` helper
- [ ] T023 [P] Port existing shadcn/ui components from `src/components/ui/` — ensure compatibility with Next.js (no Vite-specific imports)
- [ ] T024 Create `src/app/(dashboard)/layout.tsx` — protected dashboard layout with AppShell sidebar, auth check via server component, redirect to /login if no session

**Checkpoint**: Foundation ready — auth works on Next.js, middleware protects routes, DB tables exist with RLS. User story implementation can now begin.

---

## Phase 3: User Story 1 — Authenticatie & Beschermde Toegang (Priority: P1) 🎯 MVP

**Goal**: Working login/logout with Supabase Auth on Next.js, middleware route protection, session persistence.

**Independent Test**: Create a user via Supabase dashboard, login via `/login`, verify `/boards` is accessible, verify direct `/boards` URL redirects to `/login` when logged out.

- [ ] T025 [US1] Verify `src/app/auth/callback/route.ts` handles code exchange correctly — test magic link flow end-to-end
- [ ] T026 [US1] Add error handling to `src/components/auth/LoginForm.tsx` — display Supabase auth errors (invalid credentials, email not confirmed) with user-friendly Dutch messages
- [ ] T027 [US1] Add loading state to `src/components/auth/LoginForm.tsx` — disable form during submission, show spinner
- [ ] T028 [US1] Add logout to `src/components/layout/AppShell.tsx` sidebar — calls `supabase.auth.signOut()`, redirects to `/login`

**Checkpoint**: Auth fully functional — login, magic link, session persistence across refresh, logout, route protection all work.

---

## Phase 4: User Story 2 — Multi-Kanban Bordenbeheer (Priority: P1) 🎯 MVP

**Goal**: Board overview page as landing after login, create/rename/delete boards, auto-create 4 default columns per new board.

**Independent Test**: After login, see empty boards page with "Nieuw bord" button, create board "Test", verify 4 columns (Backlog/Doing/Review/Done) appear, rename board, delete board.

### Server Actions for User Story 2

- [ ] T029 [P] [US2] Create `src/actions/boards.ts` — `createBoard` (creates board + 4 default columns in transaction), `updateBoard`, `deleteBoard`, `reorderBoards`
- [ ] T030 [P] [US2] Create `src/actions/columns.ts` — `createColumn`, `updateColumn`, `deleteColumn` (with card relocation logic), `reorderColumns`

### Components for User Story 2

- [ ] T031 [US2] Create `src/app/(dashboard)/boards/page.tsx` — server component: fetch boards via supabase server client, render BoardGrid client component
- [ ] T032 [P] [US2] Create `src/components/boards/BoardGrid.tsx` — client component: grid of board cards, "Nieuw bord" card, reorder via drag
- [ ] T033 [P] [US2] Create `src/components/boards/BoardCard.tsx` — single board card with name, context menu (rename/delete), click navigates to `/boards/[boardId]`
- [ ] T034 [P] [US2] Create `src/components/boards/CreateBoardDialog.tsx` — dialog with name input, calls `createBoard` server action, navigates to new board on success

**Checkpoint**: Boards can be created, renamed, deleted. Each board has standard columns. Board overview shows all boards.

---

## Phase 5: User Story 3 — Kanban Kaarten & Drag-and-Drop (Priority: P1) 🎯 MVP

**Goal**: Full Kanban board with cards, drag-and-drop within and between columns, cross-board move, card reordering.

**Independent Test**: Create cards in a column, drag between columns (Backlog→Doing), reorder within column, drag to another board via switcher, verify positions persist after refresh.

### Server Actions for User Story 3

- [ ] T035 [US3] Create `src/actions/cards.ts` — `createCard`, `updateCard`, `moveCard` (between columns with position), `moveCardToBoard` (cross-board), `reorderCards` (batch position update), `toggleArchiveCard`, `deleteCard`

### DnD Kit Setup

- [ ] T036 [US3] Create `src/hooks/useKanbanDrag.ts` — dnd-kit DndContext setup with sensors (pointer, keyboard), collision detection (closestCenter), DragOverlay config, cross-board move detection via BoardSwitcher overlay
- [ ] T037 [US3] Create `src/components/kanban/BoardSwitcher.tsx` — drag overlay component: shows target board dropdown when card is dragged to a drop zone outside current board

### Kanban Components

- [ ] T038 [US3] Create `src/app/(dashboard)/boards/[boardId]/page.tsx` — server component: fetch board + columns + cards (non-archived, ordered by position), render BoardView client component
- [ ] T039 [P] [US3] Create `src/components/kanban/BoardView.tsx` — main Kanban container: horizontal scrollable columns, DndContext wrapper, keyboard shortcuts (J/K, S, N, /)
- [ ] T040 [P] [US3] Create `src/components/kanban/KanbanColumn.tsx` — single column: droppable container (useDroppable), column header with name + actions, card list (SortableContext)
- [ ] T041 [P] [US3] Create `src/components/kanban/KanbanCard.tsx` — single card: draggable (useSortable), title display, star icon, paperclip indicator (if description/URL filled), click → opens detail modal
- [ ] T042 [P] [US3] Create `src/components/kanban/ColumnHeader.tsx` — column name (editable inline or via dialog), card count, "Add card" button, column settings menu
- [ ] T043 [P] [US3] Create `src/components/kanban/NewCardForm.tsx` — inline form: text input + Enter to create, auto-focus when opened via N shortcut or button click

### Keyboard Navigation

- [ ] T044 [US3] Create `src/hooks/useKeyboardNav.ts` — keyboard shortcuts hook: J/K (next/prev card), S (toggle star on focused card), N (open new card form in focused column), / (focus search), Escape (close modals/forms)

### Optimistic Updates

- [ ] T045 [US3] Create `src/hooks/useOptimistic.ts` — generic optimistic update wrapper: immediately update local state, fire server action, rollback on error

**Checkpoint**: Full Kanban with drag-and-drop works. Cards can be dragged between columns and boards. Order persists. Keyboard navigation functional.

---

## Phase 6: User Story 4 — Sterretje-mechanisme & Focus View (Priority: P2)

**Goal**: Star toggle on cards, `/starred` page showing all starred cards grouped by board, optimistic star toggle.

**Independent Test**: Star a card, visit `/starred`, verify card appears grouped under its board. Unstar from `/starred`, verify card disappears. Refresh — stars persist.

### Server Actions for User Story 4

- [ ] T046 [US4] Create `src/actions/starred.ts` — `toggleStar` (toggle single card, optimistic-ready), `batchToggleStars` (for bulk unstar from starred view)

### Components for User Story 4

- [ ] T047 [US4] Add star toggle to `src/components/kanban/KanbanCard.tsx` — clickable star icon (outline/filled), optimistic update via `useOptimistic`, calls `toggleStar` action
- [ ] T048 [US4] Create `src/app/(dashboard)/starred/page.tsx` — server component: fetch all starred non-archived cards across all boards (RLS handles user filter), render StarredList client component
- [ ] T049 [P] [US4] Create `src/components/starred/StarredList.tsx` — client component: group cards by board, render board name header + card list, unstar action, click navigates to `/boards/[boardId]#[cardId]`

**Checkpoint**: Stars work bidirectionally between board and `/starred`. Optimistic updates are instant.

---

## Phase 7: User Story 5 — Kaartdetail & Snelle Toegang (Priority: P2)

**Goal**: Card detail modal with markdown description, URL field, star toggle, archive/delete. Visual indicator on cards with extra content.

**Independent Test**: Click card → modal opens with all fields. Add markdown description → rendered in modal. Card shows paperclip icon. Archive card → disappears from board.

### Components for User Story 5

- [ ] T050 [US5] Create `src/components/kanban/CardDetailModal.tsx` — modal/dialog component: editable title, markdown editor/textarea for description, URL input, star toggle, deadline picker, archive button, delete button with confirmation
- [ ] T051 [US5] Add `description` and `url` fields to `src/actions/cards.ts` `updateCard` action (already in contract, verify implementation)
- [ ] T052 [US5] Add markdown rendering in `CardDetailModal` — preview mode using `react-markdown` + `remark-gfm`
- [ ] T053 [US5] Add paperclip indicator to `src/components/kanban/KanbanCard.tsx` — show `Paperclip` icon (lucide-react) when card has non-empty description or URL
- [ ] T054 [US5] Add archive functionality — `toggleArchiveCard` in `src/actions/cards.ts`, filter archived cards from board queries, add "Show archived" toggle to board view
- [ ] T055 [US5] Add deadline field to card detail — date input, saved via `updateCard`, shown as badge on card in board view

**Checkpoint**: Card detail modal fully functional. Visual indicators on cards. Archive/deadline working.

---

## Phase 8: User Story 6 — Externe Postgres-koppeling & Dynamische CRUD (Priority: P2)

**Goal**: Add external PostgreSQL connections (encrypted), discover tables/columns, auto-generate CRUD forms, full CRUD on external tables.

**Independent Test**: Add a test Postgres connection, see table list, open a table, create a record via generated form, verify record appears in external DB.

### Encryption & Pool Infrastructure

- [ ] T056 [US6] Create `src/lib/db/encrypt.ts` — AES-256-GCM encrypt/decrypt functions using Web Crypto API with `ENCRYPTION_KEY` env var (server-only)
- [ ] T057 [P] [US6] Create `src/lib/db/pool.ts` — pg Pool manager: `getPool(connectionId, connStr)`, `destroyPool(connectionId)`, per-pool statement_timeout=10s, max 5 connections

### Schema Introspection

- [ ] T058 [US6] Create `src/lib/db/introspect.ts` — `getTables(connectionId, connStr)` and `getColumns(connectionId, connStr, tableName)` using `information_schema` queries (see contracts/external-db-api.md)

### Server Actions for User Story 6

- [ ] T059 [US6] Create `src/actions/db-connections.ts` — `createConnection` (encrypt + store), `updateConnection`, `deleteConnection` (+ destroy pool), `testConnection`
- [ ] T060 [US6] Create `src/actions/external-db.ts` — `getTables`, `getTableRecords` (paginated), `createRecord`, `updateRecord`, `deleteRecord`, `getForeignKeyOptions`

### Query Builder

- [ ] T061 [US6] Create `src/lib/db/query-builder.ts` — `buildInsert(table, values)`, `buildUpdate(table, pk, values)`, `buildSelect(table, options)` — all parameterized with `$1, $2, ...` to prevent SQL injection

### Type Mapping

- [ ] T062 [US6] Create `src/components/db-explorer/FormFieldMapper.tsx` — maps PostgreSQL column types to form fields: text/varchar→Input, int/numeric→Input[number], bool→Switch, date→Input[date], timestamp→Input[datetime-local], text[long]→Textarea, enum→Select, foreign key→Select (with fetched options)

### UI Components for User Story 6

- [ ] T063 [US6] Create `src/app/(dashboard)/settings/db/page.tsx` — server component: fetch user's DB connections, render ConnectionList
- [ ] T064 [P] [US6] Create `src/components/db-explorer/ConnectionList.tsx` — list of saved connections with add/edit/delete/test buttons
- [ ] T065 [P] [US6] Create `src/app/(dashboard)/settings/db/[connectionId]/page.tsx` — server component: fetch tables for connection via `getTables`, render TableList
- [ ] T066 [P] [US6] Create `src/components/db-explorer/TableList.tsx` — table name, column count, click opens `/settings/db/[connectionId]/[tableName]`
- [ ] T067 [US6] Create `src/app/(dashboard)/settings/db/[connectionId]/[tableName]/page.tsx` — server component: fetch columns + paginated records, render DynamicTable + DynamicForm
- [ ] T068 [P] [US6] Create `src/components/db-explorer/DynamicTable.tsx` — client component: renders table rows (scrollable), pagination controls, edit/delete buttons per row
- [ ] T069 [P] [US6] Create `src/components/db-explorer/DynamicForm.tsx` — client component: uses FormFieldMapper to render fields, handles required validation (NOT NULL without default), foreign key dropdowns, create/edit mode, submits via server actions
- [ ] T070 [US6] Add delete confirmation dialog for record deletion — explicit "Weet je zeker dat je dit record wilt verwijderen?" prompt in DynamicTable

### Navigation Integration

- [ ] T071 [US6] Add DB Connections link to `src/components/layout/AppShell.tsx` sidebar — navigate to `/settings/db`

**Checkpoint**: External DB connections work end-to-end. Tables discovered, forms generated, CRUD operations functional.

---

## Phase 9: User Story 7 — Time Tracking per Kaart (Priority: P3)

**Goal**: Start/stop timer on cards, log time sessions, show total time per card, optional hourly rate display.

**Independent Test**: Start timer on card, let it run, stop it — verify session logged with duration. Start timer on card Y while X is running → X auto-stops.

### Server Actions for User Story 7

- [ ] T072 [US7] Create `src/actions/time-tracking.ts` — `startTimer` (auto-stops any active timer), `stopTimer`, `getActiveTimer`, `deleteTimeSession`

### Components for User Story 7

- [ ] T073 [US7] Create `src/components/time-tracking/TimeTracker.tsx` — start/stop button, live elapsed time display, session history list, total time summary
- [ ] T074 [US7] Integrate `TimeTracker` into `src/components/kanban/CardDetailModal.tsx` — show timer and session history at bottom of modal
- [ ] T075 [US7] Add hourly rate setting — field in settings, stored in profiles or a new settings table, used to calculate cost display in TimeTracker
- [ ] T076 [US7] Handle page refresh with active timer — on board load, check `getActiveTimer`, restore running timer state in UI

**Checkpoint**: Time tracking works per card. Sessions logged. Hourly rate cost display functional.

---

## Phase 10: User Story 8 — Quick Capture (Priority: P3)

**Goal**: Global `Ctrl+Shift+N` shortcut or nav button opens minimal popup, creates card on inbox board or current board.

**Independent Test**: Press `Ctrl+Shift+N` anywhere in app, type title, press Enter, verify card appears on inbox board. From a board view, verify card appears in first column of current board.

### Components for User Story 8

- [ ] T077 [US8] Create `src/components/quick-capture/QuickCapture.tsx` — global dialog/popup: text input with placeholder "Wat wil je vastleggen?", Enter to submit (creates card via `createCard` action), Escape/click-outside to dismiss
- [ ] T078 [US8] Add QuickCapture to `src/app/(dashboard)/layout.tsx` — render as persistent component that listens for `Ctrl+Shift+N`, also add button in AppShell header
- [ ] T079 [US8] Add inbox board creation logic — on first login, check if any board has `is_inbox = true`, if not, create "Inbox" board with `is_inbox = true` and default columns
- [ ] T080 [US8] Context-aware card creation — if user is on a board page, create card in first column of current board; otherwise create in inbox board

**Checkpoint**: Quick capture works globally. Cards land in correct board.

---

## Phase 11: User Story 9 — Focus-modus (Priority: P3)

**Goal**: `/focus` page with starred cards, deadline cards for today, daily planning text block.

**Independent Test**: Visit `/focus`, see starred cards and deadline cards, type in daily planning block, refresh — text persists.

### Server Actions for User Story 9

- [ ] T081 [US9] Create `src/actions/focus-notes.ts` — `saveFocusNote` (upsert per user per day), `getTodayFocusNote`, `getFocusData` (starred + deadline cards)

### Components for User Story 9

- [ ] T082 [US9] Create `src/app/(dashboard)/focus/page.tsx` — server component: fetch `getFocusData`, render FocusDashboard
- [ ] T083 [P] [US9] Create `src/components/focus/FocusDashboard.tsx` — client component: three sections — "Vandaag gefocust" (starred cards), "Deadlines vandaag" (cards with deadline = today), "Wat ga je doen?" (editable text block using saveFocusNote)
- [ ] T084 [US9] Add `/focus` to sidebar navigation in `src/components/layout/AppShell.tsx`

**Checkpoint**: Focus mode fully functional with daily planning persistence.

---

## Phase 12: User Story 10 — RSS-feed Widget (Priority: P4)

**Goal**: Add RSS feeds in sidebar widget, view recent items, convert items to Kanban cards.

**Independent Test**: Add a feed URL, see items load in widget, click "Naar bord" on item → card created on "Inspiratie" board.

### Server Infrastructure for User Story 10

- [ ] T085 [US10] Create `src/lib/rss/parser.ts` — server-side cache with 5-min TTL, fetch + parse via `rss-parser`, error handling for malformed feeds
- [ ] T086 [US10] Create `src/app/api/rss/route.ts` — GET endpoint: fetch feed items by feedId (server-side, no CORS), returns JSON
- [ ] T087 [US10] Create `src/actions/rss-feeds.ts` — `addFeed`, `removeFeed`, `fetchFeedItems` (via API route), `convertToCard`

### Components for User Story 10

- [ ] T088 [US10] Create `src/components/rss/RSSWidget.tsx` — sidebar widget: "+" button to add feed URL, feed items list with title/pubDate, "Naar bord" button per item, loading/error states
- [ ] T089 [US10] Add RSSWidget to `src/components/layout/AppShell.tsx` sidebar
- [ ] T090 [US10] Handle "Naar bord" — when user clicks "Naar bord" on a feed item and no "Inspiratie" board exists, auto-create it. Convert feed item → card with title + URL in first column.

**Checkpoint**: RSS feeds functional. Items can be viewed and converted to Kanban cards.

---

## Phase 13: Polish & Cross-Cutting Concerns

**Purpose**: Mobile responsiveness, keyboard navigation polish, optimistic updates, existing page porting.

### Existing Pages Port (keep AI platform features)

- [ ] T091 [P] Port `src/app/(dashboard)/command-center/page.tsx` — migrate existing CommandCenterPage to App Router
- [ ] T092 [P] Port `src/app/(dashboard)/assistants/page.tsx` — migrate existing AssistantsPage to App Router
- [ ] T093 [P] Port `src/app/(dashboard)/knowledge/page.tsx` — migrate existing KnowledgePage to App Router
- [ ] T094 [P] Port `src/app/(dashboard)/team/page.tsx` — migrate existing TeamPage to App Router
- [ ] T095 [P] Port `src/app/(dashboard)/settings/page.tsx` — migrate existing SettingsPage to App Router

### Mobile Responsiveness

- [ ] T096 Make Kanban board horizontally scrollable on mobile — `overflow-x-auto` on BoardView, responsive column widths
- [ ] T097 Make drag-and-drop work on touch devices — add touch sensor to dnd-kit sensor config in `useKanbanDrag`
- [ ] T098 Make CardDetailModal full-screen on mobile — responsive modal sizing

### Keyboard Navigation Polish

- [ ] T099 Test and fix all shortcuts (J/K, S, N, /) across all board views and the starred page — verify no conflicts with browser shortcuts
- [ ] T100 Add `/` search shortcut — focus a search input that filters cards in current board by title

### Optimistic Updates

- [ ] T101 Add optimistic updates to drag-and-drop — use `useOptimistic` for `moveCard` and `reorderCards` to show instant column changes
- [ ] T102 Add optimistic rollback on server action error — show toast with error message, revert card to original position

### Cleanup & Validation

- [ ] T103 Remove Vite-specific files — `vite.config.ts`, `index.html`, Vite env handling
- [ ] T104 Run `tsc --noEmit` — ensure zero TypeScript errors across entire codebase
- [ ] T105 Run `npm run lint` — ensure zero ESLint warnings
- [ ] T106 Run `scripts/fitness-check.sh` — verify all fitness checks pass
- [ ] T107 Update `FEATURES.md` — document all new features (Kanban workspace, external DB, time tracking, quick capture, focus mode, RSS)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Phase 2 — no other dependencies
- **User Stories 2+3 (Phase 4+5)**: Depend on Phase 2 — US3 depends on US2 (boards must exist before cards)
- **User Stories 4+5 (Phase 6+7)**: Depend on Phase 3 (cards must exist for stars and details)
- **User Story 6 (Phase 8)**: Depends on Phase 2 only (independent of Kanban)
- **User Story 7 (Phase 9)**: Depends on Phase 7 (time tracking is in card detail modal)
- **User Story 8 (Phase 10)**: Depends on Phase 4 (boards must exist for quick capture)
- **User Story 9 (Phase 11)**: Depends on Phase 6 (uses starred data) + Phase 7 (deadline field)
- **User Story 10 (Phase 12)**: Depends on Phase 4 (boards exist for card conversion)
- **Polish (Phase 13)**: Depends on all user stories being complete

### User Story Dependencies

```
Phase 2 (Foundational) ────┬── Phase 3 (US1: Auth)
                           ├── Phase 4 (US2: Borden) ──┬── Phase 5 (US3: Drag & Drop)
                           │                           ├── Phase 8 (US10: RSS)
                           │                           └── Phase 10 (US8: Quick Capture)
                           ├── Phase 8 (US6: Externe DB) — independent
                           └── Phase 11 (US9: Focus) — depends on US4 + US7

Phase 5 (US3: Cards) ────┬── Phase 6 (US4: Sterretjes) ──┬── Phase 11 (US9: Focus)
                         └── Phase 7 (US5: Detail) ──┬── Phase 9 (US7: Time Tracking)
                                                     └── Phase 11 (US9: Focus)
```

### Within Each Phase

- Server actions marked [P] can be created in parallel
- UI components marked [P] can be created in parallel
- Sequential: actions → page → components (within a phase)

### Parallel Opportunities

- T002-T008 (Phase 1 config files) — all independent
- T009-T011 (Phase 2 Supabase clients) — all independent file
- T029-T030 (US2 server actions) — independent files
- T032-T034 (US2 components) — independent files
- T039-T043 (US3 Kanban components) — independent files
- T056-T057 (US6 infrastructure) — independent files
- T064-T069 (US6 UI components) — independent files
- T091-T095 (Phase 13 port existing pages) — independent pages

---

## Implementation Strategy

### MVP First (Phase 1-5)

1. Complete Phase 1: Setup (Next.js migration)
2. Complete Phase 2: Foundational (auth + DB)
3. Complete Phase 3: US1 Auth (verify working)
4. Complete Phase 4: US2 Boards
5. Complete Phase 5: US3 Kanban + Drag & Drop
6. **STOP and VALIDATE**: Core Kanban MVP is functional — login, boards, cards, drag-and-drop

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. US1+US2+US3 → Core Kanban MVP 🎯
3. US4+US5 → Stars + card detail → richer interaction
4. US6 → External DB CRUD → differentiating feature
5. US7 → Time tracking
6. US8 → Quick capture
7. US9 → Focus mode
8. US10 → RSS feeds
9. Phase 13 → Polish, existing page ports, cleanup

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- After each feature: run Playwright MCP (@playwright-tester) for e2e tests
- After each feature: run @fitness-checker to verify RLS and security
- Keyboard shortcuts: ensure `useKeyboardNav` ignores events when focus is in input/textarea
- Mobile: test on 320px width for all board interactions
- External DB: always verify `ENCRYPTION_KEY` is set before testing encryption
