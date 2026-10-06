# Implementation Plan: Standaardisatie van bordkolommen

**Branch**: `021-standardize-board-columns` | **Date**: 2026-10-06 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/021-standardize-board-columns/spec.md`

## Summary

Alle borden krijgen de vaste kolomstructuur **Backlog, Doing, Done**. Dit vereist vier ingrepen: (1) een case-bugfix in `KanbanColumn.tsx` — de collapse-initialisatie `column.name === 'done'` matcht nooit omdat de kolom `Done` heet, waardoor de Done-kolop momenteel nooit ingeklapt start; (2) `createBoard` in `boards.ts` past Backlog/Doing/Review/Done aan naar Backlog/Doing/Done; (3) een éénmalige, atomair-idempotente SQL-migratie normaliseert bestaande borden (case-varianten canoniseren, duplicaten mergen, kaarten uit Review e.d. naar Doing verplaatsen, posities hernormaliseren); (4) kolom-CRUD wordt verwijderd (AddColumnForm + de server actions in columns.ts, waarvan drie al dode code zijn) zodat de vaste structuur behouden blijft.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode) + React 18 + Next.js 14 (App Router)

**Primary Dependencies**: Next.js 14, React 18, @dnd-kit, Supabase PostgreSQL (via MCP), Playwright

**Storage**: Supabase PostgreSQL — migratie `021_standardize_board_columns.sql` op `kk_columns`/`kk_cards`

**Testing**: Playwright E2E (`tests/e2e/`) — nieuw `board-standard-columns.spec.ts` + updates in `regression.spec.ts` en `kanban.spec.ts`

**Target Platform**: Web (Netlify), moderne browsers

**Project Type**: Web application (Next.js App Router)

**Performance Goals**: Migratie is één batched DO-blok (geen N+1); bordpagina-query ongewijzigd (nested select met foreignTable ordering blijft)

**Constraints**: Alle DB-wijzigingen via Supabase MCP; RLS blijft ongewijzigd aanstaan (F-01); geen `any` (strict mode); server action-wijzigingen vragen regressietests (AGENTS.md)

**Scale/Scope**: 1 migratie, 2 aangepaste componenten, 1 aangepaste action-file (boards.ts), 1 verwijderde action-file (columns.ts) + 1 verwijderde component, 3 test-bestanden

## Constitution Check

| Gate | Status | Note |
|------|--------|------|
| RLS on every table | PASS | Migratie normaliseert data binnen bestaande RLS-tabellen; policies ongewijzigd (verificatie via MCP na migratie, F-01) |
| No secrets in client code | PASS | Geen secrets; migratie draait via MCP met service role |
| Edge Functions for privileged ops | PASS | Eénmalige data-migratie hoort in een migration-bestand (bestaand patroon, zie 016), geen Edge Function nodig |
| PKCE auth flow | N/A | Geen auth-wijziging |
| Netlify SPA redirects | N/A | Geen routing-wijziging |
| Storage bucket policies | N/A | Geen storage |
| TypeScript strict mode | PASS | Verwijderde files elimineren dode code; geen nieuwe types nodig |

Geen constitution violations. Geen complexity tracking nodig.

## Project Structure

### Documentation (this feature)

```text
specs/021-standardize-board-columns/
├── plan.md              # Dit bestand
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── checklists/
│   └── requirements.md  # Tijdens /speckit.specify aangemaakt
└── tasks.md             # Phase 2 output (/speckit.tasks — niet door /speckit.plan)
```

### Source Code (repository root)

```text
supabase/
└── migrations/
    └── 021_standardize_board_columns.sql   # NIEUW — éénmalige normalisatie bestaande borden

src/
├── actions/
│   ├── boards.ts                          # WIJZIGING — createBoard: 3 kolommen i.p.v. 4
│   └── columns.ts                         # VERWIJDERD — dode code + geblokkeerde paden
└── components/
    └── kanban/
        ├── KanbanColumn.tsx               # WIJZIGING — case-bugfix collapse-init (lijn 33)
        ├── KanbanBoard.tsx                # WIJZIGING — AddColumnForm-import + -usage verwijderd
        └── AddColumnForm.tsx              # VERWIJDERD

tests/
└── e2e/
    ├── board-standard-columns.spec.ts     # NIEUW — vaste structuur + Done ingeklapt
    ├── regression.spec.ts                  # WIJZIGING — kolomvolgorde-test, kolom-aanmaak-test weg
    └── kanban.spec.ts                     # WIJZIGING — comment (Review-verwijzing) bijwerken
```

**Structure Decision**: Single-project layout (bestaand). Geen nieuwe mappen; alle wijzigingen vallen binnen de bestaande kanban-structuur en het bestaande migratiepatroon.

## Implementation Phases

### Phase 1 — Case-bugfix Done-kolom (`KanbanColumn.tsx` lijn 33)

```tsx
// van
const [collapsed, setCollapsed] = useState(column.name === 'done')
// naar
const [collapsed, setCollapsed] = useState(column.name.trim().toLowerCase() === 'done')
```

**Beslissing**: `trim().toLowerCase()` in plaats van exacte match — voldoet aan FR-007 (hoofdletterongevoelig) en is consistent met de `ILIKE 'done'`-semantiek die de bestaande RPC's in `009_performance.sql` gebruiken. De state is puur component-local: opnieuw openen/het herladen van een bord reset Done altijd naar ingeklapt (FR-002), handmatig uit-/inklappen blijft werken (FR-003).

### Phase 2 — Vaste kolommen bij bord-aanmaak (`boards.ts` lijn 18-23)

```ts
await supabase.from('kk_columns').insert([
  { board_id: board.id, name: 'Backlog', position: 0 },
  { board_id: board.id, name: 'Doing', position: 1 },
  { board_id: board.id, name: 'Done', position: 2 },
])
```

Review-regel verwijderen. FR-001.

### Phase 3 — Data-migratie bestaande borden (`supabase/migrations/021_standardize_board_columns.sql`)

Eén atomair `DO $$ ... $$`-blok, per bord (loop over kk_boards), idempotent:

1. Case-varianten canoniseren (`ILIKE 'backlog'` → `'Backlog'`, idem Doing/Done) — dekt legacy-borden met lowercase `done`
2. Canonieke kolom per standaardnaam = laagste position; duplicaten mergen (kaarten appenden aan canonieke kolom met ROW_NUMBER-volgorde, duplicaat verwijderen)
3. Kaarten uit niet-standaard kolommen → Doing, geappend na bestaande Doing-kaarten (FR-005)
4. Subtask-veiligheidsnet: subtask volgt parent-kolom wanneer de parent in een standaardkolom ligt (invariant subtask = kolom parent)
5. Niet-standaard kolommen verwijderen (na de verplaatsingen — FR-006: geen kaartverlies)
6. Posities hernormaliseren naar 0/1/2; ontbrekende standaardkolommen leeg aanvullen
7. Idempotent: bord dat al voldoet → geen actie

Uitvoeren via **Supabase MCP** (niet handmatig), daarna RLS-verificatie (F-01) en resultaat-controle via MCP-query (elk bord exact 3 kolommen).

**Beslissing**: Migratie boven runtime-normalisatie — éénmalig, verlaat applicatiepad niet, atomair; runtime-checks zouden blijvend overhead geven en de data inconsistent laten.

### Phase 4 — Kolom-CRUD verwijderen

- `src/actions/columns.ts` verwijderen — `createColumn` is het enige actieve pad (via AddColumnForm); `updateColumn`/`deleteColumn`/`reorderColumns` zijn reeds dode code (nergens geïmporteerd)
- `src/components/kanban/AddColumnForm.tsx` verwijderen
- `KanbanBoard.tsx`: import (lijn 10) + usage (lijn 185) + nu-ongebruikte `createColumn`-import (lijn 14) en `handleAddColumn` (lijn 80-85) verwijderen

**Beslissing**: Verwijderen boven behouden — dode server actions blijven via Next.js server-action-endpoints aanroepbaar (aanvalsoppervlak), en FR-008 vraagt dat de vaste structuur niet breekbaar is.

### Phase 5 — Tests

1. **Nieuw** `tests/e2e/board-standard-columns.spec.ts`:
   - Nieuw bord aanmaken → exact Backlog/Doing/Done in volgorde (data-correctheid, niet alleen bestaan)
   - Done start ingeklapt: kolombreedte smal + aria-label `Done uitklappen` + kaarten verborgen
   - Uit-/inklappen via klik werkt; na reload is Done weer ingeklapt
   - Vaststellingspatroon: skip indien `page.url().includes('/login')`
2. **Update** `regression.spec.ts`:
   - Lijn 478-511 (`bordpagina kolom-volgorde`): verwachte volgorde → Backlog/Doing/Done (Review-verwachting verwijderen)
   - Lijn 332-375 (`kolom aanmaken`-describe): volledig verwijderen — geteste functionaliteit bestaat niet meer
3. **Update** `kanban.spec.ts` (comment rond lijn 182): "Backlog, Doing, Review, Done zijn de defaults" → "Backlog, Doing, Done"

**Beslissing**: AGENTS.md regressieregel — createBoard (server action) gewijzigd, kolom-aanmaak verwijderd, Done-collapse gewijzigd → elk vraagt testdekking; falende legacy-tests worden vooraf aangepast, niet naderhand genegeerd.

## Risk Analysis

| Risk | Impact | Mitigatie |
|------|--------|-----------|
| Migratie faalt halverwege → inconsistent board | Middel | DO-blok is atomair (Supabase draait migrations in één transactie) + idempotent; bij fout blijft oude toestand intact en kan opnieuw gedraaid worden |
| Kaartverlies bij kolom-verwijdering | Hoog | Alle UPDATEs (stap 3-4) gaan vóór DELETEs (stap 5) binnen hetzelfde blok; subtask-invariant expliciet hersteld |
| Position-conflicten bij append naar Doing | Laag | ROW_NUMBER over originele position, offset achter hoogste bestaande Doing-position |
| Bestaand bord zonder Doing-kolom (edge case) | Laag | Migratie vult ontbrekende standaardkolommen leeg aan vóór verplaatsingen; kaarten gaan naar de nieuw aangemaakte Doing |
| Legacy lowercase `done`-kolommen | Laag | Stap 1 canoniseert case-varianten vóór alle verdere logica |
| Kolom-aanmaak elders gebruikt (bijv. onbekende verwijzing) | Laag | Grep bevestigt: AddColumnForm is enige createColumn-consumer; andere columns.ts-actions zijn dode code |
| Dode tests achterblijven | Laag | Fase 5 verwijdert/past alle Review- en kolom-aanmaak-verwachtingen expliciet aan |

## Out of Scope

- Hernoemen van individuele kolommen of aangepaste kolomnamen per bord (vaste structuur vervangt dit)
- Persistente inklap-status per gebruiker (spec: altijd ingeklapt bij openen)
- Archiverings- of opruimfunctionaliteit voor oude Done-kaarten
- Kolomvolgorde-configuratie per bord (positie is vast: 0/1/2)
- Wijzigingen aan het bord-detail-query in `boards/[boardId]/page.tsx` (data is na migratie correct; nested select blijft)