# Research: Standaardisatie van bordkolommen

**Feature**: 021-standardize-board-columns | **Date**: 2026-10-06

## Vraagpunten

Geen NEEDS CLARIFICATION-markers in de spec — alle onderzoeksvragen zijn tijdens de plan-fase direct uit de codebase beantwoord.

## Onderzoek

### 1. Waarom is de Done-kolom nu nooit ingeklapt? (bug)

**Decision**: Case-bug in `src/components/kanban/KanbanColumn.tsx` lijn 33.

**Rationale**: De collapse-initialisatie is `useState(column.name === 'done')` — een exacte, case-sensitive vergelijking met lowercase `'done'`. De kolom heet echter `Done` (hoofdletter, aangemaakt in `src/actions/boards.ts` lijn 22), dus de vergelijking is altijd `false` en de kolom start altijd uitgeklapt. De SQL-functies in `supabase/migrations/009_performance.sql` (bijv. lijn 124, 242) gebruiken consequent `ILIKE 'done'` — het frontend wijkt hiervan af. Fix: `column.name.trim().toLowerCase() === 'done'`, wat voldoet aan FR-007 (hoofdletterongevoelig) én consistent is met de bestaande ILIKE-semantiek in de database.

**Alternatives considered**:
- `ILIKE`-patroon in frontend — afgewezen: overengineering, `toLowerCase()` dekt de spec volledig.
- Collapsed-status per sessie bewaren (localStorage) — afgewezen: spec zegt expliciet "inklapstatus wordt niet bewaard; beginstatus is altijd ingeklapt".

### 2. Hoe standaardiseer je bestaande borden?

**Decision**: Eénmalige, atomaire en idempotente data-migratie in `supabase/migrations/021_standardize_board_columns.sql`, toegepast via Supabase MCP.

**Rationale**: Alle bestaande borden zijn aangemaakt door `createBoard` met het vaste patroon Backlog(0)/Doing(1)/Review(2)/Done(3). De migratie normaliseert per bord naar Backlog(0)/Doing(1)/Done(2). Migraties draaien bij Supabase in één transactie; het `DO $$ ... $$`-blok is daarmee atomair — bij een fout blijft de oude toestand intact. Idempotent: bij hernieuwde uitvoering zijn alle kolommen al standaard en verandert er niets. Dit voldoet aan FR-004 t/m FR-007.

Belangrijk detail: `AddColumnForm` stond vrije kolomnamen toe (bijv. `done` in lowercase, of `Test Kolom 123`). Daarom normaliseert de migratie eerst case-varianten (ILIKE 'backlog'/'doing'/'done' → exacte naam) en merge vervolgens duplicaat-kolommen met dezelfde canonieke naam (laagste position wordt canoniek; kaarten uit duplicaten gaan naar de canonieke kolom, niet naar Doing).

**Alternatives considered**:
- Omzetting on-the-fly bij het uitlezen van een bord — afgewezen: blijvend performance-overhead, data blijft inconsistent, en schrijfpaden blijven bestaan.
- RPC aangeroepen vanuit de app — afgewezen: éénmalige operatie hoort niet in applicatiecode; migratie via MCP is het bestaande patroon (zie 016-fix-column-order-schema).

### 3. Waar belanden kaarten uit verwijderde kolommen?

**Decision**: Kaarten uit niet-standaard kolommen (bijv. Review) worden verplaatst naar **Doing**, geappend na bestaande Doing-kaarten met behoud van relatieve volgorde (ROW_NUMBER over originele position).

**Rationale**: Spec FR-005 en assumptie bepalen Doing als bestemming. Appending voorkomt position-conflicten met bestaande Doing-kaarten. Subtask-veiligheidsnet: een subtask wiens kolom verdwijnt volgt eerst de (nieuwe) kolom van zijn parent wanneer de parent in een standaardkolom ligt; anders verplaatst de reguliere Doing-verplaatsing parent én subtask samen. Zo blijft de invariant "subtask in dezelfde kolom als parent" gehandhaafd (`KanbanColumn` filtert subtasks per kolom — een subtask in een andere kolom dan de parent zou onzichtbaar worden). FR-006 (geen kaartverlies) is hiermee gedekt: elk UPDATE gaat vóór de DELETE van de kolom.

### 4. Waar wordt de vaste structuur afgedwongen?

**Decision**: Op applicatieniveau — kolom-CRUD volledig verwijderen; géén database-trigger.

**Rationale**: `AddColumnForm` + `createColumn` zijn het enige bereikbare pad om kolommen toe te voegen. `updateColumn`, `deleteColumn` en `reorderColumns` in `src/actions/columns.ts` zijn al dode code (nergens geïmporteerd in componenten). Na verwijdering van de UI bestaat er geen gebruikerspad meer dat de vaste structuur kan breken (FR-008). Na de data-migratie is er geen runtime-pad meer dat kolommen aanmaakt, hernoemt of verwijdert.

**Alternatives considered**:
- DB-trigger die inserts van niet-standaard kolommen blokkeert — afgewezen: overengineering; na verwijdering van alle CRUD-paden bestaat er geen insert meer om te blokkeren, en een trigger beperkt toekomstige flexibiliteit zonder actuele dreiging.
- Kolom-CRUD laten staan "voor later" — afgewezen: dode server actions blijven bereikbaar via Next.js server-action endpoints (aanvalsoppervlak) en spreken FR-008 tegen.

### 5. Welke tests moet je aanpassen?

**Decision**:
- `tests/e2e/regression.spec.ts` lijn 478: verwachte volgorde Backlog/Doing/Review/Done → Backlog/Doing/Done (Review verdwijnt).
- `tests/e2e/regression.spec.ts` lijn 335-375 (`kolom aanmaken`-describe): volledig verwijderen — de geteste "Kolom toevoegen"-knop verdwijnt.
- `tests/e2e/kanban.spec.ts` (comment bij lijn 182 verwijst naar Review): comment bijwerken.
- Nieuw bestand `tests/e2e/board-standard-columns.spec.ts`: nieuw bord heeft exact Backlog/Doing/Done; Done start altijd ingeklapt (aria-label `Done uitklappen`), inklappen/uitklappen werkt, en na herladen is Done weer ingeklapt.

**Rationale**: AGENTS.md-regel voor regressietests: elke wijziging aan server actions (`createBoard`, verwijderde `createColumn`) en page-queries vraagt om testdekking; verwijderde functionaliteit mag geen falende tests achterlaten.

## Conclusie

Implementatie = 1 data-migratie + 1 case-bugfix + vaste kolommen bij bord-aanmaak + verwijderen van kolom-CRUD + testupdates. Geen openstaande onderzoeksvragen.