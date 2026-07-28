# Implementation Plan: Top 3 bewerkbare prioriteiten op het command center

**Branch**: `011-command-center-priorities` | **Date**: 2026-07-28 | **Spec**: [spec.md](./spec.md)

## Summary

Het command center krijgt een "Top 3 prioriteiten"-sectie met drie bewerkbare vrije-tekst velden, per gebruiker opgeslagen in een nieuwe `kk_priorities` tabel met RLS. De sectie staat boven de gesterde items en heeft een Opslaan-knop die alleen actief is bij wijzigingen.

## Technical Context

**Language/Version**: TypeScript 5.x (strict), React 18, Next.js App Router
**Primary Dependencies**: Supabase (PostgreSQL + RLS), TanStack Query, Tailwind, shadcn/ui
**Storage**: Nieuwe `kk_priorities` tabel (1 rij per gebruiker, unique index op user_id)
**Testing**: Playwright E2E

## Implementation

### Migration 013 — kk_priorities tabel
- `id`, `user_id` (FK auth.users, unique), `item_1/2/3` (text, default ''), timestamps
- RLS: gebruiker kan alleen eigen rij zien/wijzigen
- `updated_at` trigger

### Type definitions
- `Priority` interface in `database.types.ts`
- `kk_priorities` entry in Database.Tables

### Server actions (`src/actions/priorities.ts`)
- `getPriorities()`: leest eigen rij, retourneert `{ item_1, item_2, item_3 }` (default leeg)
- `savePriorities(input)`: upsert — update bestaande rij of insert nieuwe
- `revalidatePath('/command-center')` na opslaan

### Hooks (`src/hooks/usePriorities.ts`)
- `usePriorities()`: TanStack Query, staleTime 60s
- `useSavePriorities()`: mutation, update query cache bij success

### UI — PrioritiesSection
- Card met Target-icoon + "Top 3 prioriteiten" titel
- Drie genummerde Input-velden met placeholders
- Opslaan-knop (Save-icoon), disabled wanneer geen wijzigingen of tijdens opslaan
- Toast feedback bij opslaan
- Hydration: lokale state vult zich vanuit query-data bij eerste load

### UI — CommandCenterClient
- PrioritiesSection boven StarredSection in een `space-y-6` wrapper