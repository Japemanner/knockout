# Implementation Plan: Multi-Kanban Workspace met Postgres CRUD

**Branch**: `001-multi-kanban-workspace` | **Date**: 2026-06-02 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-multi-kanban-workspace/spec.md`

## Summary

Bouw een persoonlijke productiviteits-workspace bovenop de bestaande Knockout AI-platform codebase. De workspace voegt multi-Kanban borden, drag-and-drop kaartbeheer, een sterretje/focus-mechanisme, externe Postgres-databasekoppeling met dynamische CRUD-formulieren, time tracking, quick capture, focus-modus en RSS-feed integratie toe. De bestaande auth (Supabase), UI-componenten (shadcn/ui) en database-infrastructuur worden hergebruikt.

**Kritisch architectuurbesluit**: De specificeert Next.js 15 App Router, maar de bestaande codebase is Vite + React 18 + react-router-dom. We migreren naar Next.js 15 om server actions, @supabase/ssr cookie-auth, en middleware te ondersteunen. Bestaande pagina's worden geporteerd naar App Router met behoud van alle functionaliteit.

## Technical Context

**Language/Version**: TypeScript 5.6+ (strict mode)

**Primary Dependencies**: Next.js 15 (App Router), React 18, Tailwind CSS 3, shadcn/ui (Radix UI primitives), @supabase/ssr, @supabase/supabase-js v2, @dnd-kit/core + @dnd-kit/sortable, pg (node-postgres), @tanstack/react-query v5, zustand v5, react-hook-form + zod, react-markdown

**Storage**: Supabase PostgreSQL (app-data: boards, columns, cards, time sessions, db connections, RSS feeds, focus notes) + externe PostgreSQL-databases (via `pg` pool, alleen server-side)

**Testing**: Playwright MCP (e2e), Vitest (unit)

**Target Platform**: Web (desktop-first, mobile-responsive), Netlify (Next.js runtime)

**Project Type**: Web application (full-stack Next.js met server actions)

**Performance Goals**: Drag-and-drop visuele feedback <100ms, server-persistentie <1s, externe DB-tabel zichtbaar <10s na connectie-activatie

**Constraints**: Geen service role key in client code, externe connection strings alleen server-side (AES-GCM encrypted at rest), RLS op alle Supabase-tabellen, query-timeout van 10s op externe DB's, mobile scrollbare Kanban (320px+)

**Scale/Scope**: Single-user MVP, multi-tenant-ready datamodel, 10+ borden, 100+ kaarten per bord, 5+ externe DB-connecties, 10+ feeds

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| RLS on every table | ✅ PASS | Alle nieuwe tabellen krijgen RLS policies op `auth.uid() = user_id` |
| No secrets in client code | ✅ PASS | Alleen `VITE_SUPABASE_URL` en `VITE_SUPABASE_ANON_KEY` naar Next.js `NEXT_PUBLIC_` equivalent; service role key en ENCRYPTION_KEY alleen server-side |
| Edge Functions for privileged ops | ✅ PASS | Externe DB-queries via server actions + `pg` pool; connection string decryptie alleen server-side |
| PKCE auth flow | ✅ PASS | @supabase/ssr middleware-based cookie auth met PKCE |
| Netlify SPA redirects | ✅ PASS | Next.js output via `@netlify/plugin-nextjs`; redirect config in `netlify.toml` |
| TypeScript strict mode | ✅ PASS | Behoud `"strict": true` in `tsconfig.json` |
| Storage bucket policies | N/A | Geen nieuwe buckets nodig voor MVP; bestaande `knowledge-documents` bucket heeft policies |

## Project Structure

### Documentation (this feature)

```text
specs/001-multi-kanban-workspace/
├── plan.md              # This file
├── research.md          # Phase 0: Technology research & decisions
├── data-model.md        # Phase 1: Database schema & entity relationships
├── quickstart.md        # Phase 1: Local dev setup guide
├── contracts/           # Phase 1: API contracts
│   ├── server-actions.md    # Server action signatures
│   ├── external-db-api.md   # External DB query interface contract
│   └── rss-feed-api.md      # RSS feed fetch contract
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
# Next.js 15 App Router migration from existing Vite SPA
src/
├── app/
│   ├── layout.tsx                  # Root layout (providers, fonts)
│   ├── globals.css                 # Tailwind + CSS variables
│   ├── page.tsx                    # Redirect to /login or /boards
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx            # Login (ported from LoginPage)
│   │   ├── forgot-password/
│   │   │   └── page.tsx            # Password reset (ported)
│   │   ├── reset-password/
│   │   │   └── page.tsx            # Reset handler (ported)
│   │   └── auth/
│   │       └── callback/
│   │           └── route.ts        # Supabase auth callback
│   ├── (dashboard)/
│   │   ├── layout.tsx              # AppShell sidebar layout
│   │   ├── boards/
│   │   │   ├── page.tsx            # Bordenoverzicht (landing)
│   │   │   └── [boardId]/
│   │   │       └── page.tsx        # Enkel bord Kanban-view
│   │   ├── starred/
│   │   │   └── page.tsx            # Gesterde items aggregated
│   │   ├── focus/
│   │   │   └── page.tsx            # Focus-modus dashboard
│   │   ├── settings/
│   │   │   ├── page.tsx            # Settings (ported + DB connections)
│   │   │   └── db/
│   │   │       ├── page.tsx        # Externe DB-overzicht
│   │   │       └── [connectionId]/
│   │   │           ├── page.tsx    # Tabellenlijst per connectie
│   │   │           └── [tableName]/
│   │   │               └── page.tsx # CRUD table-view
│   │   ├── command-center/         # Ported existing page
│   │   │   └── page.tsx
│   │   ├── assistants/             # Ported existing page
│   │   │   └── page.tsx
│   │   ├── knowledge/              # Ported existing page
│   │   │   └── page.tsx
│   │   └── team/                   # Ported existing page
│   │       └── page.tsx
│   └── api/
│       └── rss/
│           └── route.ts            # RSS feed proxy (server-side fetch)
├── components/
│   ├── ui/                         # shadcn/ui (bestaand, aangevuld)
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── ... (existing)
│   │   ├── checkbox.tsx            # Nieuw
│   │   ├── date-picker.tsx         # Nieuw
│   │   ├── dropdown-menu.tsx       # Nieuw (Radix-based)
│   │   ├── popover.tsx             # Nieuw
│   │   ├── switch.tsx              # Nieuw
│   │   └── tooltip.tsx             # Bestaand Radix dependency
│   ├── kanban/
│   │   ├── BoardView.tsx           # Hoofd Kanban-component
│   │   ├── KanbanColumn.tsx        # Enkele kolom (droppable)
│   │   ├── KanbanCard.tsx          # Enkele kaart (draggable)
│   │   ├── CardDetailModal.tsx     # Modal/zijbalk voor kaartdetail
│   │   ├── NewCardForm.tsx         # Inline form voor nieuwe kaart
│   │   ├── BoardSwitcher.tsx       # Drag-overlay bordwisselaar
│   │   └── ColumnHeader.tsx        # Kolom-header (naam, acties)
│   ├── starred/
│   │   └── StarredList.tsx         # Gesterde items per bord
│   ├── focus/
│   │   └── FocusDashboard.tsx      # Focus-modus componenten
│   ├── db-explorer/
│   │   ├── ConnectionList.tsx      # Externe DB-connecties lijst
│   │   ├── TableList.tsx           # Tabellen per connectie
│   │   ├── DynamicTable.tsx        # Paginated table-view
│   │   ├── DynamicForm.tsx         # Auto-generated CRUD form
│   │   └── FormFieldMapper.tsx     # Kolomtype → form field mapper
│   ├── time-tracking/
│   │   └── TimeTracker.tsx         # Start/stop timer component
│   ├── quick-capture/
│   │   └── QuickCapture.tsx        # Globale invoer-popup
│   ├── rss/
│   │   └── RSSWidget.tsx           # RSS-feed widget
│   ├── auth/
│   │   └── LoginForm.tsx           # Login form (geëxtraheerd)
│   └── layout/
│       └── AppShell.tsx            # Sidebar layout (bestaand, aangepast)
├── lib/
│   ├── supabase/
│   │   ├── server.ts               # Supabase server client (cookies)
│   │   ├── client.ts               # Supabase browser client
│   │   └── middleware.ts           # Session refresh middleware helper
│   ├── db/
│   │   ├── pool.ts                  # pg Pool manager (server-only)
│   │   ├── introspect.ts            # Schema-introspectie queries
│   │   ├── encrypt.ts               # AES-GCM encrypt/decrypt
│   │   └── query-builder.ts         # Safe parameterized query builder
│   ├── rss/
│   │   └── parser.ts               # RSS/Atom feed parser (server)
│   └── utils.ts                    # Bestaande cn() utility
├── actions/
│   ├── boards.ts                   # Board CRUD server actions
│   ├── columns.ts                  # Column CRUD server actions
│   ├── cards.ts                    # Card CRUD + drag-and-drop actions
│   ├── starred.ts                  # Star toggle action
│   ├── time-tracking.ts            # Timer start/stop/log actions
│   ├── db-connections.ts           # DB connection CRUD actions
│   ├── external-db.ts              # Externe DB query actions
│   ├── focus-notes.ts              # Focus note save/load actions
│   └── rss-feeds.ts                # RSS feed CRUD actions
├── hooks/
│   ├── useAuth.ts                  # Bestaand (aangepast voor @supabase/ssr)
│   ├── useKanbanDrag.ts            # dnd-kit drag-and-drop hook
│   ├── useKeyboardNav.ts           # J/K/S/N// shortcuts hook
│   └── useOptimistic.ts            # Optimistic update wrapper hook
├── store/
│   └── authStore.ts                # Bestaand (aangepast)
├── types/
│   └── database.types.ts           # Bestaand + nieuwe tabellen
├── middleware.ts                    # Next.js middleware (auth guard)
└── ... (existing config files)

supabase/
└── migrations/
    └── 002_kanban_workspace.sql    # Nieuwe tabellen + RLS policies
```

**Structure Decision**: Next.js 15 App Router met route groups `(auth)` en `(dashboard)`. Server actions in `src/actions/` voor alle mutaties. Componenten georganiseerd per feature-domein (kanban, starred, focus, db-explorer, time-tracking, quick-capture, rss). Backward compatibel: alle bestaande pagina's (command-center, assistants, knowledge, team) worden geporteerd naar App Router.

## Complexity Tracking

> No constitution violations. All principles pass.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | N/A | N/A |
