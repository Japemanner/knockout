# Data Model: Standaardisatie van bordkolommen

**Feature**: 021-standardize-board-columns | **Date**: 2026-10-06

## Overzicht

Geen nieuwe tabellen of kolommen. De feature normaliseert bestaande data in `kk_columns` en verandert het gedrag van `kk_create_board`-flow (applicatielaag). Eén nieuwe migratie: `supabase/migrations/021_standardize_board_columns.sql`.

## Entiteiten

### Kolom (kk_columns) — gewijzigd gedrag

| Attribuut | Type | Verandering |
|-----------|------|-------------|
| id | uuid | Ongewijzigd |
| board_id | uuid | Ongewijzigd |
| name | text | Genormaliseerd naar exact `Backlog`, `Doing` of `Done` (case-varianten zoals `done` worden gecanoniseerd) |
| position | integer | Genormaliseerd naar 0=Backlog, 1=Doing, 2=Done |
| created_at / updated_at | timestamptz | Ongewijzigd |

**Invariante na migratie**: elk bord heeft exact 3 kolommen met namen (Backlog, Doing, Done) en posities (0, 1, 2).

### Kaart (kk_cards) — verplaatst, niet gewijzigd van schema

| Attribuut | Verandering bij migratie |
|-----------|--------------------------|
| column_id | Kaarten uit niet-standaard kolommen (bijv. Review) → Doing; duplicaat-canonisatie: kaarten uit duplicaat-kolommen → canonieke kolom; subtasks volgen de kolom van hun parent |

Geen kaart wordt ooit verwijderd door de migratie (FR-006).

## Migratie: 021_standardize_board_columns.sql

Eén `DO $$ ... $$`-blok (atomair, idempotent), per bord:

1. **Canoniseer case-varianten**: `UPDATE kk_columns SET name = 'Backlog' WHERE name ILIKE 'backlog'` (idem Doing/Done) — geen position-wijziging.
2. **Canonieke kolom bepalen**: per bord per standaardnaam de kolom met laagste position = canoniek.
3. **Duplicaten mergen**: kaarten uit duplicaat-kolommen (zelfde canonieke naam, hogere position) verplaatsen naar canonieke kolom (na bestaande kaarten, behoud volgorde via ROW_NUMBER); daarna duplicaat-kolommen verwijderen.
4. **Kaarten uit niet-standaard kolommen**: verplaatsen naar Doing, geappend na bestaande Doing-kaarten (behoud relatieve volgorde).
5. **Subtask-veiligheidsnet**: subtasks waarvan de parent in een standaardkolom ligt volgen de parent-kolom (invariant: subtask = kolom parent).
6. **Niet-standaard kolommen verwijderen** (kaarten zijn in stap 4 al verplaatst — géén kaartverlies).
7. **Posities hernormaliseren**: Backlog=0, Doing=1, Done=2.
8. **Ontbrekende standaardkolommen aanvullen**: bord zonder Backlog/Doing/Done krijgt deze kolom op de juiste position (leeg).
9. **Controle**: bord met 3 standaardkolommen → geen actie (idempotent).

**RLS-impact**: geen. Migratie draait als service-role via MCP; RLS-policies op `kk_columns`/`kk_cards` (bestaand sinds 002) blijven ongewijzigd gelden voor alle applicatie-aanroepen.

## Applicatie-wijzigingen op data-toegang

| Pad | Verandering |
|-----|-------------|
| `src/actions/boards.ts` → `createBoard` | 4 kolommen (Backlog/Doing/Review/Done) → 3 kolommen (Backlog/Doing/Done) |
| `src/actions/columns.ts` | Volledig verwijderd (createColumn, updateColumn, deleteColumn, reorderColumns — dode code na UI-verwijdering) |
| `src/components/kanban/AddColumnForm.tsx` | Verwijderd + import/usage uit `KanbanBoard.tsx` |
| `src/components/kanban/KanbanColumn.tsx` | Collapse-init: `column.name === 'done'` → `column.name.trim().toLowerCase() === 'done'` (case-bugfix, FR-007) |

## State transitions

- **Bord-aanmaak**: board-insert → 3 kolom-inserts met posities 0/1/2 (was 0/1/2/3).
- **Done-kolom render**: initial state `collapsed=true` (naar naam, case-insensitive) → gebruiker kan togglen → opnieuw openen bord reset naar ingeklapt (geen persistentie — conform spec).