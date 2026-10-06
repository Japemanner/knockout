# Research: Command Center gesterde items als kanban bord

**Feature**: 022-command-center-starred-kanban | **Date**: 2026-10-06

## Vraagpunten uit Technical Context

Geen NEEDS CLARIFICATION-markers. De spec is na `/speckit.clarify` volledig bepaald: één aggregatiebord met vaste kolommen, alleen kolomverplaatsing sync naar bronbord. Onderstaande onderzoekspunten zijn uit de codebase beantwoord.

## Onderzoek

### 1. Welke data nodig voor het command center-bord?

**Decision**: Eén server-side nested select op `kk_cards` in `src/app/(dashboard)/command-center/page.tsx`, uitgebreid t.o.v. de huidige query met `column_id` + kolomnaam + `position` + subtasks.

**Rationale**: De huidige query (lijn 16-23) haalt al gesterde kaarten op met `kk_columns!inner` + `kk_boards!inner`. Voor het bord ontbreekt alleen de kolomnaam (voor de mapping naar Backlog/Doing/Done) en de subtasks (voor de detail-modal). Eén query met join volstaat; geen nieuwe RPC nodig. Client-side groeperen op kolomnaam (ILIKE-mapping) is pure presentatie.

**Alternatives considered**:
- Nieuwe RPC met json_agg (zoals de /starred optimalisatie) — afgewezen: de bestaande join-query is al geoptimaliseerd (één round-trip) en het kaartaantal op het command center is klein (top-level gesterd, typisch <20).
- Client-side fetch via TanStack Query — afgewezen: server component met `cookies()` is het bestaande patroon op deze pagina; SSR-prefetch is sneller en consistent.

### 2. Hoe wordt een sleep-actie gesynced naar het bronbord?

**Decision**: Nieuwe server action `moveStarredCardByColumn(cardId, targetColumn)` in `src/actions/starred.ts` die de doel-kolom op het bronbord opzoekt (ILIKE, conform vaste kolomnamen uit feature 021), de append-positie berekent (`MAX(position) + 1`) en de bestaande RPC `kk_move_card` aanroept. Daarna `revalidatePath('/command-center')` + `revalidatePath('/boards/<boardId>')`.

**Rationale**: De RPC `kk_move_card` (migratie 009) bevat al de Done-regel (`ILIKE 'done'` → `is_starred = false`) en verplaatst atomair. Door de kolom-lookup server-side te doen, heeft de client geen kolom-lijsten van álle bronborden nodig — één round-trip, minder payload. `revalidatePath` op beide routes garandeert dat zowel het command center als het bronbord na navigatie verse data tonen (FR-008, omgekeerde sync bij herladen).

**Alternatives considered**:
- Bestaande `moveCard(cardId, newColumnId, newPosition)`-action hergebruiken vanuit de client — afgewezen: dan moet de client per kaart de kolom-id's van het bronbord kennen én de append-positie raden; dubbele verantwoordelijkheid en race-gevoelig.
- Realtime sync via Supabase Realtime — afgewezen: spec zegt expliciet "sync bij (her)laden actueel (geen real-time push)".

### 3. Wat gebeurt er als een gesterde kaart naar Done wordt gesleept?

**Decision**: Bestaand RPC-gedrag blijft leidend: `kk_move_card` zet `is_starred = false` bij de Done-kolom, waarna de kaart uit het command center-bord verdwijnt (bij refresh).

**Rationale**: Dit is identiek aan sleep-gedrag op het bronbord (`useKanbanDrag.ts` lijn 175-183) en aan `/starred`-gedrag. Consistentie met de bronbord-regels is precies wat de spec vraagt (FR-011: geen kopie, dezelfde status overal). De optimistische update in de client toont de kaart direct in Done tot de revalidate/refresh; daarna is de ster uit.

**Alternatives considered**:
- Ster behouden in het CC-bord ondanks Done — afgewezen: breekt de bestaande invariant "Done-kolom wist ster" die op alle borden geldt.

### 4. Welke kaarten verschijnen op het command center-bord?

**Decision**: Alleen top-level gesterde kaarten (`is_starred = true` én `is_archived = false` én `parent_id = null`).

**Rationale**: Gesterde subtasks verplaatsen op het CC-bord zou de invariant "subtask ligt in dezelfde kolom als parent" breken: `kk_move_card` wijzigt `column_id` zonder `parent_id` bij te werken. De 021-migratie bevat daarvoor juist een veiligheidsnet. Subtasks blijven zichtbaar via het bronbord, de detail-modal (als subtask-lijst onder de kaart) en `/starred`.

**Alternatives considered**:
- Alle gesterde kaarten tonen incl. subtasks — afgewezen: risico op gebroken subtask-invariant bij een sleep-actie.

### 5. DnD-implementatie in het CC-bord?

**Decision**: Eigen `DndContext` in een nieuw client-component `StarredKanbanSection`; de drie vaste kolommen zijn droppable zones (`useDroppable` per kolom). Geen `SortableContext` binnen kolommen — FR-012 verbiedt handmatige volgorde. Kaarten zijn draggable via `useDraggable`. Sortering binnen een kolom: bronbordnaam oplopend, daarna `position` oplopend (SC-007: kaarten van hetzelfde bord bij elkaar).

**Rationale**: `useKanbanDrag.ts` is gebouwd voor één bord met board-switcher en subtask-drops — hergebruik zou props en paden forceren die niet passen (virtuele kolommen, geen reorder). Een eigen, kleine hook (`useStarredDrag`) met alleen kolom-detectie is eenvoudiger en testbaarder. @dnd-kit is al een bestaande dependency; geen nieuwe packages.

**Alternatives considered**:
- `useKanbanDrag` parametriseren met een "virtual columns"-modus — afgewezen: de hook koppelt reorder/subtask/board-switch logica die op het CC-bord expliciet niet mag werken; conditionele takken maken hem onhoudbaar.

### 6. Kaartdetail-openen vanaf het command center?

**Decision**: Hergebruik `CardDetailModal` met per kaart: de kaart zelf + subtasks (uit dezelfde query) + de drie kolommen van het bronbord (als `columns`-prop). De modal werkt dan volledig (titel/desc/URL/ster/archiveren/verplaatsen binnen bronbord).

**Rationale**: Spec US2 scenario 3 eist de kaartdetail-weergave. De modal heeft `columns` nodig voor de verplaats-knoppen en `allCards` voor subtasks — beide zijn server-side al beschikbaar in dezelfde query (kolommen per bronbord worden per bord meegegeven). Geen nieuwe component nodig.

**Alternatives considered**:
- Link naar `/boards/<id>#<cardId>` (oud StarredSection-patroon) — afgewezen: voldoet niet aan de letter van de spec ("opent de kaartdetail-weergave") en kost een navigatie.

### 7. Impact op bestaande tests?

**Decision**: `tests/e2e/kanban.spec.ts` describe `/command-center route` herschrijven naar de bord-weergave (kolomkoppen Backlog/Doing/Done zichtbaar; kaart-labels tonen bordnaam). Nieuw bestand `tests/e2e/command-center-kanban.spec.ts` voor drag-sync. `tests/e2e/regression.spec.ts` "command-center gesterde items data-correctheid" blijft werken mits de sectie-titel "Gesterde items" en de bordnamen als zichtbare tekst behouden blijven.

**Rationale**: De platte-lijst assertions (`Geen gesterde items`-placeholder + linkjes gegroepeerd per bord) gelden niet meer. Bordnamen blijven zichtbaar als kaart-label (FR-004), waardoor de data-correctheidstest (elke /starred-bordnaam zichtbaar op CC) blijft kloppen.

**Alternatives considered**:
- Oude tests laten staan — afgewezen: ze failen op de nieuwe weergave (regression suite moet groen blijven).

### 8. Dependency op feature 021?

**Decision**: 022 veronderstelt dat feature 021 (vaste kolommen Backlog/Doing/Done + migratie) is geïmplementeerd en gemerged.

**Rationale**: De kolom-mapping (ILIKE op de drie vaste namen) en de Done-ster-regel zijn pas betrouwbaar als elk bord exact die drie kolommen heeft. De 021-migratie normaliseert bestaande borden; zonder die normalisatie vallen kaarten in niet-gestandaardiseerde kolommen terug op Backlog (spec edge case), wat de sync-ervaring degradeert.

## Conclusie

Alle onderzoeksvragen beantwoord. Implementatie: 1 nieuwe server action, 1 nieuw client-component (+kleine drag-hook), 1 nieuwe query in page.tsx, hergebruik CardDetailModal en kk_move_card RPC, 2 testbestanden (1 herschreven, 1 nieuw). Geen nieuwe dependencies, geen schema-wijzigingen.