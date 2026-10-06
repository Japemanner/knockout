# Kanban — Knowledge

## Feiten en patronen

- Vaste kolomstructuur per bord: Backlog (position 0), Doing (1), Done (2) — feature 021 (2026-10-06). Kolom-CRUD (createColumn/updateColumn/deleteColumn/reorderColumns + AddColumnForm) is bewust verwijderd; er bestaat geen applicatiepad meer dat kolommen aanmaakt, hernoemt of verwijdert.
- Done-herkenning gebeurt overal via case-insensitive match (`ILIKE 'done'` in RPC's `kk_move_card`/`kk_move_card_under_parent`/`kk_move_card_to_board`; frontend `name.trim().toLowerCase() === 'done'`). Nieuwe done-gerelateerde logica moet dit patroon volgen.
- Done-kolom start altijd ingeklapt (component-local state, geen persistentie). Herladen/hervisit reset naar ingeklapt — bewuste keuze, geen localStorage.
- Kaart-verlies voorkomen bij kolomwijzigingen: verplaats kaarten vóór kolom-DELETE, in dezelfde transactie. Subtasks moeten de kolom van hun parent volgen (invariant), anders worden ze onzichtbaar (KanbanColumn filtert subtasks per parent-kolom).
- Command-center starred-kanban (feature 022) leunt op de vaste kolomnamen: kolom-toewijzing via ILIKE op `sourceColumnName`, fallback Backlog.

## Hypotheses

- Gebruikers missen de mogelijkheid om extra kolommen toe te voegen (Review e.d.) nu de vaste structuur is afgedwongen — tegen 2027 evaluatiepunt: als er herhaalde vragen komen, overweeg een kolom-templates-configuratie i.p.v. vrije CRUD.