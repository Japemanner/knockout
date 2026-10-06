# Quickstart: Command Center gesterde items als kanban bord

**Feature**: 022-command-center-starred-kanban | **Date**: 2026-10-06

## Prerequisite

Feature 021 (vaste kolommen Backlog/Doing/Done per bord) is geïmplementeerd: migratie `021_standardize_board_columns.sql` is toegepast zodat elk bord exact die drie kolommen heeft.

## Verificatie van de feature

1. Start de dev-server (`npm run dev`)
2. Log in met een bestaand account
3. Ster op ten minste twee borden elk één of twee top-level kaarten (klik op het ster-icoon op een kaart in het bord)
4. Open het **Command Center**:
   - De sectie **"Gesterde items"** toont een kanban bord met precies de kolommen **Backlog, Doing, Done** (in die volgorde)
   - Elke gesterde kaart ligt in de kolom die overeenkomt met zijn kolom op het bronbord
   - Op elke kaart staat het bronbord als label
   - Binnen een kolom staan kaarten van hetzelfde bord naast elkaar
5. Sleep een gesterde kaart van **Backlog** naar **Doing**:
   - De kaart verschijnt direct in Doing (optimistische update)
   - Open het bronbord: de kaart ligt in **Doing** (ook na herladen)
   - Herlaad het command center: de kaart staat nog steeds in Doing
6. Sleep een gesterde kaart naar **Done**:
   - De kaart wordt verplaatst; de ster wordt uitgezet (bestaande Done-regel)
   - Na herladen van het command center is de kaart uit het bord verdwenen (niet meer gesterd)
   - Op het bronbord ligt de kaart in **Done**
7. Verplaats een gesterde kaart op het **bronbord** van Doing naar Backlog en herlaad het command center:
   - De kaart staat nu in de kolom **Backlog** op het command center-bord
8. Klik op een kaart in het command center-bord:
   - De kaartdetail-modal opent met titel, omschrijving, URL, ster-toggle, kolom-verplaatsknoppen (kolommen van het bronbord)
9. Zet alle sterren uit en herlaad het command center:
   - Het bord toont de lege staat: "Geen gesterde items. Klik op de ster bij een kaart om 'm hier te zien."

## Wat is er gewijzigd

- `src/app/(dashboard)/command-center/page.tsx` — nieuwe query (gesterde top-level kaarten + subtasks + kolommen per bronbord) en nieuwe props
- `src/components/command-center/StarredKanbanSection.tsx` — nieuw: CC-bord met DndContext (3 droppable kolommen, drag tussen kolommen, CardDetailModal)
- `src/components/command-center/CommandCenterClient.tsx` — `StarredSection` vervangen door `StarredKanbanSection`
- `src/actions/starred.ts` — nieuwe action `moveStarredCardByColumn` (kolom-lookup op bronbord + `kk_move_card` RPC + revalidatePath)
- `tests/e2e/command-center-kanban.spec.ts` — nieuw: kolomstructuur, drag-sync, lege staat
- `tests/e2e/kanban.spec.ts` — command-center tests herschreven naar bord-weergave

## Wat is er NIET gewijzigd

- Geen database-migraties, geen RLS-wijzigingen, geen nieuwe tabellen of RPC's
- De `/starred`-pagina werkt ongewijzigd
- Sleep-gedrag en Done-ster-regel op de reguliere borden ongewijzigd
- `StarredSection.tsx` blijft bestaan voor hergebruik waar nodig, maar wordt niet meer gerenderd op het command center

## Sanity checks na implementatie

- `tsc --noEmit` — compileert zonder errors
- `npx eslint src/ --max-warnings 0` — geen lint-warnings
- Playwright: nieuwe spec groen (of geskipt zonder login); volledige regressionsuite groen