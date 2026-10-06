# Contract: Server action moveStarredCardByColumn

**Feature**: 022-command-center-starred-kanban | **Date**: 2026-10-06

## Doel

Eén mutatie-entrypoint voor het verplaatsen van een gesterde kaart op het command center-bord naar een andere vaste kolom, met doorvoering op het bronbord.

## Locatie

`src/actions/starred.ts` (bestaand bestand; uitbreiding naast `toggleStar` en `batchToggleStars`).

## Signature

```typescript
export async function moveStarredCardByColumn(data: {
  cardId: string
  targetColumn: 'Backlog' | 'Doing' | 'Done'
}): Promise<{ success: true; card: Card } | { success: false; error: string }>
```

## Gedrag (contractregels)

1. Haalt de kaart op inclusief `kk_columns(board_id)` — kaart moet bestaan, `is_starred = true`, `is_archived = false`, `parent_id = null`; anders `{ success: false, error }`.
2. Zoekt op het bronbord de kolom met `name ILIKE <targetColumn>` (exact één na 021-normalisatie). Niet gevonden → `{ success: false, error: 'Doelkolom niet gevonden op het bronbord' }`.
3. Berekent de append-positie: `MAX(position) + 1` van top-level kaarten in de doelkolom (`COALESCE(MAX+1, 0)` bij leeg).
4. Roept RPC `kk_move_card(p_card_id, p_column_id, p_position)` aan. De RPC behoudt zijn bestaande Done-regel: doelkolom `ILIKE 'done'` → `is_starred = false` (kaart verdwijnt daarmee uit het CC-bord).
5. Bij succes: `revalidatePath('/command-center')` en `revalidatePath('/boards/<board_id>')`, retourneert de geüpdatete kaart.
6. Bij fout: geen mutatie, foutmelding als string terug (client doet rollback + toast).

## Pre/post-conditions

| Voorwaarde | Verwachting |
|------------|-------------|
| Pre: kaart is gesterd, top-level, niet gearchiveerd |Afgedwongen (stap 1) |
| Pre: doelkolom behoort tot bronbord |Afgedwongen (stap 2 zoekt alléén binnen `board_id`) |
| Post: kaart ligt in doelkolom op bronbord, positie = append |Garandeert RPC + stap 3 |
| Post: `is_starred` ongewijzigd, tenzij doel = Done |RPC Done-regel (stap 4) |
| Post: CC en bronbord tonen verse data bij volgende navigatie |revalidatePath (stap 5) |
| Invariant: geen kopie, geen kaartverlies |Eén UPDATE op bestaande rij |

## Rechten en scope

- Draait onder de ingelogde gebruiker via `getAuthenticatedClient()` (server action, bestaand patroon).
- RLS op `kk_cards`/`kk_columns`/`kk_boards` blijft van kracht; geen service-role nodig.
- Alleen eigen borden raadbaar: join-filter `kk_boards.user_id = auth.uid()` wordt door RLS afgedwongen.

## Rollback-contract (client)

De client voert een optimistische update uit vóór de aanroep. Bij `{ success: false }`: herstelt de oorspronkelijke kolom in de lokale state en toont een toast met `error` (FR-010). Er is geen server-side compensatie nodig; de RPC is atomair.

---

# Contract: UI-component StarredKanbanSection

## Locatie

`src/components/command-center/StarredKanbanSection.tsx` (nieuw; vervangt `StarredSection` als weergave van gesterde items op het command center).

## Props

```typescript
interface StarredKanbanCard {
  id: string
  title: string
  description: string | null
  url: string | null
  deadline: string | null
  is_starred: true
  boardId: string
  boardName: string
  sourceColumnName: string   // kolomnaam op bronbord → bepaalt CC-kolom
  position: number
  subtasks: { id: string; title: string; position: number; column_id: string }[]
}

interface StarredKanbanSectionProps {
  cards: StarredKanbanCard[]
  boardColumns: Record<string, { id: string; name: string; position: number }[]>
  // key = boardId; de drie vaste kolommen per bronbord (voor CardDetailModal)
}
```

## Gedrag

- Rendert sectie-titel "Gesterde items" (met ster-icoon, conform bestaande stijl) — titel bewust behouden voor bestaande tests en herkenbaarheid.
- Rendert drie vaste kolommen Backlog, Doing, Done (in die volgorde) als droppable zones; kaart in kolom volgens ILIKE-mapping op `sourceColumnName` (fallback Backlog).
- Sortering binnen kolom: `boardName` oplopend, dan `position` oplopend (FR-012/SC-007). Geen SortableContext.
- Sleep alleen tussen kolommen; kaart is draggable (`useDraggable`), kolom is droppable (`useDroppable`).
- Optimistische update: kaart verplaatst direct naar doelkolom in lokale state; daarna `moveStarredCardByColumn` aanroepen. Fout → rollback + destructive toast.
- Kaartklik opent `CardDetailModal` met de kaart + subtasks + `boardColumns[boardId]` als kolommen.
- Done-kolom in het CC-bord is standaard uitgeklapt (afwijkend van bronbord, want de ster-belangeloosheid is hier al gefilterd; ster-gedrag bij Done-toevoegen blijft RPC-verantwoordelijkheid). *Opmerking: inclusie van deze regel valt onder implementatievrijheid; de spec schrijft alleen bronbord-gedrag voor de Done-kolom.*
- Lege staat: "Geen gesterde items. Klik op de ster bij een kaart om 'm hier te zien." (FR-009, behoudt bestaande tekst).

## Niet-functionele UI-eisen

- `tsc --noEmit` clean; geen `any` (strict mode).
- Hergebruik bestaande shadcn/ui-componenten (Card, useToast) en @dnd-kit (core) — geen nieuwe dependencies.
- Mobiel: kolommen horizontaal scrollbaar (`overflow-x-auto`, bestaand patroon); TouchSensor met bestaande activatie-constraints.