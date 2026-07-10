# Refactor prompt voor GLM (opencode) — Knockout performance

Kopieer alles onder de streep en plak het als prompt in opencode.

---

You are refactoring this Next.js 15 (App Router) + Supabase kanban app for **user-perceived speed**. The app feels slow on every Supabase-backed interaction. The causes are known and listed below in priority order. Work through them top to bottom. Do NOT change functionality, UI, or behavior — only make it faster.

## Ground rules

- Optimistic updates in `src/components/kanban/KanbanBoard.tsx` + `src/hooks/useKanbanDrag.ts` already work (client state updates before the server action resolves). Never break this.
- New SQL goes in a new migration: `supabase/migrations/009_performance.sql`. Use `CREATE OR REPLACE FUNCTION ... SECURITY INVOKER` so RLS still applies.
- After each priority block: `npm run build` must pass. Finish with `npx playwright test`.
- Commit per priority block with a clear message.

## Priority 1 — Stop full-board revalidation on every mutation (biggest perceived win)

Nearly every server action in `src/actions/cards.ts`, `src/actions/starred.ts`, `src/actions/boards.ts`, `src/actions/columns.ts` calls `revalidatePath('/boards')` and/or `revalidatePath('/boards/{id}')`. Because the client already does optimistic updates, every drag, star-toggle, or card edit triggers a full RSC re-render + refetch of the entire board on top of the mutation. This is the main reason interactions feel slow.

- Remove `revalidatePath` calls from high-frequency actions: `moveCard`, `reorderCards`, `moveCardToBoard`, `moveCardUnderParent`, `moveCardOutOfParent`, `updateCard`, `toggleStar`, `batchToggleStars`, `reorderBoards`. The client state is already correct after the optimistic update; the next hard navigation fetches fresh data anyway.
- Keep `revalidatePath` only in structural actions: create/delete board, create/delete/rename column, and card create (the new card comes back in the action response — check whether the client inserts it into state; if it does, drop revalidation there too).
- In `updateCard` and `toggleStar`: also delete the extra lookup queries that exist purely to find the `board_id` for revalidation (in `toggleStar` there is even a nested awaited query inside `.eq()` — remove that whole chain). Where a boardId is still genuinely needed, pass it as a parameter from the client, which already knows it (`board.id` in KanbanBoard).

## Priority 2 — Collapse sequential query waterfalls in server actions into single RPCs

Each Supabase round-trip from the Netlify serverless function costs ~50–150 ms. Several actions chain 3–6+ sequential round-trips. Replace each with one Postgres function called via `supabase.rpc(...)`:

- `createCard` (cards.ts): find inbox board → find first column → count cards → insert = 4 sequential trips. → RPC `create_card_in_inbox(p_user_id, p_title, p_description, p_url, p_deadline)` that does all of it in one statement and returns the inserted row.
- `createCardInColumn`: column lookup → count → insert = 3 trips. → single `INSERT ... position = (SELECT count(*) FROM kk_cards WHERE column_id = $1)` in an RPC, returning the row.
- `moveCardUnderParent`: 6+ sequential trips **plus an unbounded while-loop doing one query per ancestor** for cycle detection. → RPC using a recursive CTE for the cycle check + the update, one round trip.
- `reorderCards`, `reorderBoards` (boards.ts), `batchToggleStars` (starred.ts): N separate UPDATE round-trips via `Promise.all`. → one RPC per case taking `uuid[]` and using `unnest ... WITH ORDINALITY` for a single batched UPDATE.
- `moveCard` / `moveCardToBoard`: column lookup (for the "done"-column check) then update, plus a second UPDATE for subtasks in moveCardToBoard. → fold into one RPC each.

After adding the functions, regenerate types (`npm run types:update`) if the local Supabase CLI is available; otherwise add the RPC signatures manually to the Database type.

## Priority 3 — Cut the auth round-trip out of the middleware

`src/lib/supabase/middleware.ts` calls `supabase.auth.getUser()` on **every request** — a network call to Supabase Auth before every page load, RSC fetch, and server action. Replace with local JWT verification:

- Upgrade `@supabase/supabase-js` to latest 2.x and use `supabase.auth.getClaims()`, which verifies the JWT locally against cached JWKS when the project uses asymmetric signing keys (falls back to a server call otherwise). Extract the user id from `claims.sub` and keep the existing `x-user-id` header mechanism intact.
- Add a code comment noting that asymmetric JWT signing keys must be enabled in the Supabase dashboard (Project Settings → JWT Keys) for the local-verification fast path.

## Priority 4 — One query per page instead of waterfalls

- `src/app/(dashboard)/boards/[boardId]/page.tsx`: currently board → (allBoards ∥ columns) → cards = 3 sequential stages. Replace with 2 parallel queries: (a) `kk_boards.select('*, kk_columns(*, kk_cards(*))').eq('id', boardId).eq('user_id', userId).eq('kk_columns.kk_cards.is_archived', false).single()` with ordering via `.order()` on the embedded resources, (b) the allBoards list. Flatten the nested result into the same `columns`/`cards` props so `KanbanBoard` is untouched.
- `src/app/(dashboard)/command-center/page.tsx` and `src/app/(dashboard)/starred/page.tsx`: both do boards → columns → cards sequentially. Replace with a single nested select from `kk_cards` using `!inner` joins: `kk_cards.select('id, title, column_id, kk_columns!inner(board_id, kk_boards!inner(id, name, user_id))').eq('kk_columns.kk_boards.user_id', userId).eq('is_starred', true).eq('is_archived', false)`. Group by board in JS as now.
- `src/app/(dashboard)/layout.tsx` fetches the full profile on every navigation, and command-center fetches it again. Wrap the profile fetch in React `cache()` (per-request dedupe) in a shared helper, and select only needed columns instead of `*`.
- Remove the dead `export const revalidate = 60` in command-center — the page uses cookies and is always dynamic, so it does nothing.

## Priority 5 — Fix the N+1 in the hours dashboard

`getDashboardStats` in `src/actions/hours.ts` runs one `kk_hour_entries` query **per client**. Replace with a single query: fetch `client_id, hours, entry_date` for all active client ids in one call (filter `entry_date >= ` earliest period start across clients), then aggregate per client in JS applying each client's own period start. Same output shape.

## Verification

1. `npm run build` — zero type errors.
2. `npx playwright test` — all existing tests pass.
3. Manual smoke check list: drag a card between columns, star/unstar, create card via quick capture, reorder boards, open hours dashboard.
4. In the summary, report per priority: files changed, round-trips before → after.
