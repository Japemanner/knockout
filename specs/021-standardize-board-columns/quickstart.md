# Quickstart: Standaardisatie van bordkolommen

**Feature**: 021-standardize-board-columns | **Date**: 2026-10-06

## Verificatie van de feature

1. Start de dev-server (`npm run dev`)
2. Log in met een bestaand account

### Bestaand bord

3. Open een bestaand bord (aangemaakt vóór deze feature):
   - Het bord toont exact drie kolommen: **Backlog, Doing, Done** — geen Review
   - Alle kaarten die eerst in Review lagen staan nu in **Doing**
   - **Done** is ingeklapt: alleen de titel en het aantal kaarten zichtbaar
4. Klik op de Done-kolomkop → de kolom klapt uit en toont de kaarten
5. Klap de kolom weer in (of laat uitgeklapt) en herlaad de pagina (F5):
   - **Done** staat weer ingeklapt (beginstatus reset altijd)

### Nieuw bord

6. Maak een nieuw bord aan via "Nieuw bord":
   - Het bord opent met exact **Backlog, Doing, Done**
   - Er is geen "Kolom toevoegen"-knop meer aan het einde van de kolommen
7. Maak een kaart aan in Backlog en versleep deze naar Doing:
   - Verplaatsen werkt zoals voorheen
   - Kaart in Done verliest automatisch zijn ster (bestaand RPC-gedrag)

## Wat is er gewijzigd

- `supabase/migrations/021_standardize_board_columns.sql` — éénmalige normalisatie bestaande borden (via Supabase MCP uitgevoerd)
- `src/actions/boards.ts` — nieuw bord krijgt 3 kolommen in plaats van 4
- `src/components/kanban/KanbanColumn.tsx` — Done-kolom start altijd ingeklapt (case-bug gefixed)
- `src/actions/columns.ts` + `src/components/kanban/AddColumnForm.tsx` — verwijderd (vaste structuur, dode code weggehaald)
- `tests/e2e/regression.spec.ts` — kolomvolgorde-test aangepast, kolom-aanmaak-test verwijderd
- `tests/e2e/board-standard-columns.spec.ts` — nieuw

## Wat is er NIET gewijzigd

- Geen RLS-policy-wijzigingen (F-01 dekt ongewijzigde kk_-tabellen)
- Geen wijzigingen aan kaart-detail, drag-and-drop, sterren of subtask-logica
- Geen schema-wijzigingen (geen nieuwe kolommen/kolommen in kk_columns/kk_cards)
- Geen storage, Edge Functions of auth-flow

## Sanity checks na implementatie

- `tsc --noEmit` — compileert zonder errors
- `npx eslint src/ --max-warnings 0` — geen lint-warnings
- E2E-suite groen (of geskipt zonder sessie), inclusief nieuwe `board-standard-columns.spec.ts`
- Supabase MCP verificatie: na migratie heeft élk bord in de database exact 3 kolommen (Backlog/Doing/Done) — query `SELECT board_id, count(*), string_agg(name, ',') FROM kk_columns GROUP BY board_id`