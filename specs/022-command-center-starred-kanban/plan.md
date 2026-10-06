# Implementation Plan: Command Center gesterde items als kanban bord

**Branch**: `022-command-center-starred-kanban` | **Date**: 2026-10-06 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/022-command-center-starred-kanban/spec.md`

## Summary

Vervang de platte "Gesterde items"-lijst op het command center door een kanban bord met de drie vaste kolommen Backlog/Doing/Done. Het bord is een weergave-aggregatie: kaarten zijn de bestaande gesterde top-level kaarten uit alle borden (geen kopie), gelabeld met hun bronbord en gesorteerd per kolom op bronbord. Een sleep-actie naar een andere kolom verplaatst dezelfde kaart op het bronbord via één nieuwe server action (`moveStarredCardByColumn`) die de doelkolom opzoekt en de bestaande RPC `kk_move_card` aanroept, gevolgd door `revalidatePath` op beide routes. Omgekeerde sync ontstaat automatisch doordat de kolomtoewijzing bij elke load uit de actuele kolomnaam wordt afgeleid.

**Prerequisite**: feature 021 (kolomnormalisatie naar Backlog/Doing/Done) is geïmplementeerd; deze feature bouwt voort op die vaste kolomstructuur.

## Technical Context

**Language/Version**: TypeScript 5.x (strict) + React 18 + Next.js 14 (App Router)

**Primary Dependencies**: @dnd-kit/core (bestaand), shadcn/ui (bestaand), @supabase/supabase-js v2 (bestaand) — geen nieuwe packages

**Storage**: Supabase PostgreSQL (hergebruik `kk_cards`, `kk_columns`, `kk_boards`, RPC `kk_move_card`) — geen schema-wijzigingen

**Testing**: Playwright E2E (`tests/e2e/`)

**Target Platform**: Web (Netlify), desktop-first met touch-ondersteuning via bestaande dnd-kit sensors

**Project Type**: Web application (Next.js App Router, server components + server actions)

**Performance Goals**: Optimistische UI direct (<100ms visuele feedback, conform SC-002 van de workspace-basis); server-persistentie <1s

**Constraints**: Geen tweede Supabase-client; alle mutaties onder ingelogde gebruiker (RLS); geen real-time push (sync via revalidate bij navigatie/herladen, conform spec-aanname)

**Scale/Scope**: 4 bronbestanden gewijzigd/nieuw in `src/`, 2 testbestanden; gesterde sets zijn typisch klein (<50 kaarten)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Status | Note |
|------|--------|------|
| RLS on every table | PASS | Geen nieuwe tabellen; mutaties via server action onder ingelogde gebruiker, bestaande RLS-policies dekken user-scoping |
| No secrets in client code | PASS | Geen secrets; server action gebruikt bestaande auth-client |
| Edge Functions for privileged ops | N/A | Geen service-role-operaties; mutatie is user-owned data |
| PKCE auth flow | PASS | Ongewijzigd; hergebruik bestaande client-setup |
| Netlify SPA redirects | N/A | Geen routing-wijzigingen |
| Storage bucket policies | N/A | Geen storage |
| TypeScript strict mode | PASS | Nieuwe interfaces volledig getypeerd; geen `any` |
| Eén Supabase-client | PASS | Server action hergebruikt `getAuthenticatedClient()`/`createClient()` patronen; geen tweede instantie |

Geen constitution violations. Geen complexity tracking nodig.

## Project Structure

### Documentation (this feature)

```text
specs/022-command-center-starred-kanban/
├── plan.md              # Dit bestand
├── research.md          # Phase 0 output — beslissingen + alternatieven
├── data-model.md        # Phase 1 output — query-vorm, mapping, state transitions
├── contracts/
│   └── server-actions.md  # Phase 1 output — action- en UI-contract
├── quickstart.md        # Phase 1 output — verificatie-instructies
├── checklists/
│   └── requirements.md  # Tijdens /speckit.specify aangemaakt (16/16 passing)
└── tasks.md             # Phase 2 output (/speckit.tasks — niet door /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── app/(dashboard)/command-center/
│   └── page.tsx                        # WIJZIGING — nieuwe query + props (kaarten, subtasks, boardColumns)
├── components/command-center/
│   ├── CommandCenterClient.tsx         # WIJZIGING — StarredKanbanSection i.p.v. StarredSection
│   ├── StarredKanbanSection.tsx        # NIEUW — CC-bord: 3 droppable kolommen, drag, CardDetailModal
│   └── StarredSection.tsx              # ONGEWIJZIGD — blijft bestaan, wordt niet meer gerenderd op CC
├── actions/
│   └── starred.ts                      # UITBREIDING — moveStarredCardByColumn action
└── types/
    └── database.types.ts               # RAAKTAKT — alleen indien Card-type aanvulling nodig is

tests/e2e/
├── command-center-kanban.spec.ts       # NIEUW — kolomstructuur, drag-sync, lege staat
└── kanban.spec.ts                      # WIJZIGING — /command-center describe herschreven naar bord-weergave
```

**Structure Decision**: Single-project layout (bestaand). Componenten in de bestaande `command-center`-domeinmap; server action in het bestaande `starred.ts`-domeinbestand; E2E-tests volgen het bestaande patroon met skip-als-niet-ingelogd.

## Implementation Phases

### Phase 1 — Server action `moveStarredCardByColumn` (`src/actions/starred.ts`)

Volgens het contract in [contracts/server-actions.md](./contracts/server-actions.md):

1. Kaart ophalen met `kk_columns(board_id)`; guards: gesterd, top-level, niet gearchiveerd
2. Doelkolom op bronbord zoeken via `ILIKE` op `targetColumn` (Backlog/Doing/Done)
3. Append-positie berekenen: `MAX(position) + 1` binnen doelkolom (top-level)
4. RPC `kk_move_card(p_card_id, p_column_id, p_position)` aanroepen (Done → ster uit, bestaand RPC-gedrag)
5. Bij succes: `revalidatePath('/command-center')` + `revalidatePath('/boards/<board_id>')`
6. Foutpad: `{ success: false, error }` zonder mutatie

### Phase 2 — Query uitbreiden (`src/app/(dashboard)/command-center/page.tsx`)

Vervang de huidige query door de vorm uit [data-model.md](./data-model.md):

1. Gesterde top-level kaarten met `kk_columns!inner(..., kk_boards!inner(id, name))` — één round-trip
2. Subtasks van die kaarten (`parent_id IN ...`, niet gearchiveerd)
3. Kolommen per betrokken bronbord (`kk_columns ... IN board_ids`)
4. Mapper naar props: `cards: StarredKanbanCard[]`, `boardColumns: Record<boardId, columns[]>`

### Phase 3 — `StarredKanbanSection` (`src/components/command-center/StarredKanbanSection.tsx`)

1. Sectie-titel "Gesterde items" (ster-icoon, bestaande Card-stijl)
2. Drie kolommen Backlog/Doing/Done als droppables; kolomtoewijzing via ILIKE op `sourceColumnName` (fallback Backlog); lege kolom → "Geen kaarten"-placeholder; kolomkop met aantal
3. Kaarten: bronbord-label + titel + deadline-indicator; `useDraggable`; sortering binnen kolom op (boardName, position)
4. DndContext met Pointer/Touch-sensors (bestaande activatie-constraints); DragEnd → optimistische update + `moveStarredCardByColumn`; fout → rollback + destructive toast (FR-010)
5. Kaartklik → `CardDetailModal` (kaart + subtasks + `boardColumns[boardId]`)
6. Lege staat bij `cards.length === 0` (FR-009, bestaande tekst)

### Phase 4 — `CommandCenterClient` aansluiten

`StarredSection` vervangen door `StarredKanbanSection` met de nieuwe props; `PrioritiesSection` blijft ongewijzigd erboven staan.

### Phase 5 — E2E-tests

1. **Nieuw** `tests/e2e/command-center-kanban.spec.ts`:
   - Kolomstructuur: Backlog, Doing, Done zichtbaar in volgorde (ook bij lege staat)
   - Lege staat: placeholder-tekst zichtbaar zonder gesterde kaarten
   - Kaart-in-kolom: gesterde kaart ligt in CC-kolom die overeenkomt met bronkolom; bronbord-label zichtbaar
   - Drag-sync: sleep kaart Backlog → Doing; bronbord toont kaart in Doing na reload (persistente mutatie, conform AGENTS.md regressieregels)
   - Skip-patroon `if (page.url().includes('/login'))` behouden
2. **Herschrijf** `tests/e2e/kanban.spec.ts` describe `/command-center route` naar bord-weergave (kolomkoppen i.p.v. platte-lijst assertions)
3. **Blijft geldig**: `regression.spec.ts` "command-center gesterde items data-correctheid" — bordnamen blijven als kaart-label tekst zichtbaar

### Phase 6 — After-feature checks (conform AGENTS.md)

- `tsc --noEmit`
- `@feature-tracker` → FEATURES.md
- Playwright regressionsuite volledig groen
- Fitness-check (F-01 RLS via Supabase MCP ongewijzigd-passend, scripts)

## Risk Analysis

| Risico | Impact | Mitigatie |
|--------|--------|-----------|
| Kaart zonder ILIKE-kolommatch (tussen 021-deploy en herladen van oude data) | Kaart lijkt "verloren" op CC-bord | Fallback naar Backlog-kolom + bronbord-label blijft zichtbaar (spec edge case) |
| Gesterde kaart naar Done gesleept → ster uit → kaart verdwijnt na refresh | Gebruiker verrast door "weg" kaart | Bestaand RPC-gedrag, identiek aan bronbord; kaart blijft in Done op bronbord zichtbaar |
| Twee tabs slepen tegelijk (race) | Laatste schrijf wint | Conforme bestaande race-conventie (spec edge case); geen extra werk |
| CardDetailModal verwacht `columns` van één bord | Verkeerde kolommen in modal bij mixed boards | Kolommen worden per boardId meegegeven (`boardColumns`-prop), modal krijgt alléén die van het bronbord |
| Optimistische update faalt (netwerk) | Kaart lijkt verplaatst maar is het niet | Rollback + toast (FR-010); E2E-test dekt happy path, toast wordt unit-gewijs gerenderd |
| Bestaande kanban.spec.ts faalt op nieuwe weergave | Rode regressionsuite | Fase 5.2 herschrijft de assertions expliciet mee in dezelfde feature |

## Out of Scope

- Real-time sync (Supabase Realtime) — sync verloopt via herladen/revalidate (spec-aanname)
- Gesterde subtasks op het CC-bord (alleen top-level; invariant subtask-kolom = parent-kolom)
- Nieuwe kaarten aanmaken of kolommen beheren op het CC-bord
- Wijzigingen aan de `/starred`-pagina
- Handmatige volgorde-binnen-kolom op het CC-bord (FR-012)