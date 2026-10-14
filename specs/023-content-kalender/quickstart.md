# Quickstart: LinkedIn content-kalender

**Feature**: 023-content-kalender | **Date**: 2026-10-14 | **Reconcilie**: 2026-10-14 — volgt de geïmplementeerde data-laag

## Prerequisite

1. Migratie `supabase/migrations/022_content_calendar.sql` is toegepast (SQL Editor of Supabase MCP, kanban-R3): tabellen `kk_content_pillars`, `kk_content_slots`, `kk_content_posts` met RLS (12 policies) en de DB-vingnet-CHECK op Gepland/Live.
2. Types: `src/types/database.types.ts` bevat `ContentPillar`/`ContentSlot`/`ContentPost` (handmatig toegevoegd; vervang zodra de migratie op een database staat door `npm run types:update`).

## Verificatie van de feature

1. Start de dev-server (`npm run dev`) en log in
2. Open de linkerbalk: **"Content"** staat direct onder "Uren"; een klik opent de kalender op de huidige maand (FR-007)
3. Klik **"Soorten & slots"** en maak een contentsoort "Praktijk financieel adviseurs" (kleur naar keuze) met weekslot woensdag 08:00:
   - Elke woensdag vanaf vandaag toont een leeg slot "Praktijk financieel adviseurs · 08:00" in de kleur van de soort (US1-scenario 1)
   - Blader een maand terug: daar staat géén leeg slot van deze weekdag (slots gelden pas vanaf aanmaak, FR-005)
   - Zet een tweede dag uit (bijv. vrijdag): uit = geen leeg slot, opnieuw aan (na opslaan) = wél — per dag aan/uit werkt (FR-002)
4. Klik op het lege woensdagslot:
   - De editor opent met datum, tijd 08:00, de contentsoort ingevuld en status Concept (FR-013)
5. Schrijf een post (titel "Belastingaangifte 2026", tekst van ±200 tekens) en sla op:
   - De dagcel toont de post met kleurstreep, tijd 08:00, titel en statusbadge Concept, gesorteerd op tijd (FR-010)
   - Het woensdagslot is niet langer leeg — de post vult het slot (FR-016)
6. Maak een tweede post van dezelfde soort op donderdag in diezelfde week:
   - Het woensdagslot blijft gevuld (post op donderdag vult het woensdagslot binnen de ISO-week); donderdag toont geen leeg slot (US2-scenario 1)
7. Sleep deze post naar een andere week:
   - Na de sleep staat hij op de nieuwe dag; in de oorspronkelijke week verschijnt het lege slot weer (FR-029)
8. Typ in de ideeënbak een titel en druk Enter:
   - Er staat direct een nieuw idee (status Idee, zonder datum) bovenaan (FR-028)
9. Sleep het idee naar een dag zonder slots:
   - Het idee krijgt die datum en tijd 08:00 (geen slot van zijn soort op die dag), status blijft Idee (US4-scenario 1)
10. Sleep een post met status Gepland naar een andere dag:
    - De post verschuift en er verschijnt "Pas de datum ook aan in LinkedIn" (US4-scenario 2)
11. Probeer een geplande post naar de ideeënbak te slepen:
    - Geweigerd met uitleg dat een geplande post niet naar de ideeënbak kan (FR-030); een Live-post is niet sleepbaar (FR-032)
12. Zet de status van een post op Klaar met meer dan 3.000 tekens:
    - Weigering met uitleg dat de tekst te lang is; als Concept opslaan lukt wél (US3-scenario 1)
13. Kies status Gepland op een post zonder datum:
    - De app vraagt om datum en tijd (US3-scenario 2); vul ze in en sla op — het inplan-moment is vastgelegd in `scheduled_on_linkedin_at` (FR-024)
14. Zet een post op Live zonder LinkedIn-URL:
    - De chip toont badge "URL ontbreekt" (US3-scenario 3); vul een URL die niet met `https://www.linkedin.com/` begint → veldfout (FR-025)
15. Gebruik "Kopieer tekst":
    - De exacte volledige posttekst staat op het klembord met een zichtbare bevestiging (US3-scenario 4)
16. Sluit de editor met niet-opgeslagen wijzigingen en verwijder daarna een post:
    - Beide vragen eerst bevestiging in de app (geen browserdialoog) (FR-027)
17. Maak de browser kleiner dan 768 px:
    - Het raster wordt een daglijst met alleen dagen die posts of slots hebben; de ideeënbak staat eronder; slepen is niet nodig, datum via de editor (US5)
18. Herlaad de pagina en blader binnen de geprefetchte maanden:
    - Geen extra netwerkverzoeken naar Supabase voor de getoonde maand (SC-004; check de network-tab)

## Wat is er veranderd

- `supabase/migrations/022_content_calendar.sql` — 3 tabellen, indexen, CHECKs (incl. vangnet Gepland/Live), RLS + 12 policies, updated_at-triggers
- `src/types/database.types.ts` — content-types toegevoegd
- `src/lib/content/calendar.ts` — pure logica: maandraster, slot-voorkomens + koppelregel (FR-016), statusregels (FR-023/FR-024), teller/hook-preview, drup-tijdregel, labels
- `src/lib/content/queries.ts` — fetchPillarsWithSlots/fetchMonthPosts/fetchIdeas + contentKeys
- `src/actions/content.ts` — createPillar, updatePillar, setPillarArchived, upsertSlot, deleteSlot, createPost, updatePost, movePost, deletePost
- `src/app/(dashboard)/content/page.tsx` — route met SSR-prefetch
- `src/components/layout/AppShell.tsx` — nav-item "Content" onder "Uren"
- `src/components/content/` — ContentCalendarClient, MonthGrid, DayCell, PostChip, EmptySlot, IdeaBacklog, PostEditorDialog, TypesSlotsDialog
- `src/hooks/useContent.ts`, `src/hooks/useCalendarDrag.ts`
- Tests: unit (`content-calendar-logic.spec.ts`) + E2E kalender-spec met login-skip-guards

## Wat is er NIET gewijzigd

- Geen bestaande tabellen aangepast; geen nieuwe RPC's; geen Edge Functions
- Uren, borden, command center en CRUD werken ongewijzigd
- Geen publicatie naar LinkedIn: Knockout is plan- en schrijfplek (status "Gepland" zet ik zelf in LinkedIn)

## Sanity checks na implementatie

- `tsc --noEmit` — compileert zonder errors
- `npx eslint src/ --max-warnings 0` — geen lint-warnings
- Playwright: nieuwe specs groen (of geskipt zonder login); volledige regressionsuite groen
- Fitness-check via Supabase MCP: RLS actief op alle drie de content-tabellen (F-01)