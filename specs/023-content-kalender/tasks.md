# Tasks: LinkedIn content-kalender

**Input**: Design documents from `/specs/023-content-kalender/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/server-actions.md, contracts/ui-components.md, quickstart.md

**Tests**: Playwright-taken zijn opgenomen (AGENTS.md vereist minimaal één happy-path test per feature + regressie-evaluatie bij Supabase-mutaties; unit-dekking op de pure kalenderlogica is expliciet onderdeel van het plan).

**Organization**: Taken gegroepeerd per user story voor onafhankelijke implementatie en testbaarheid. US1 en US2 zijn samengevoegd in één fase: de acceptance scenarios van US1 (lege slots zichtbaar in de kalender) vereisen de kalenderweergave uit US2.

**Reconciliatie-notitie (2026-10-14)**: Tijdens de implementatie liep een parallelle sessie die eveneens taken voor feature 023 genereerde (eigen naamgeving: `ContentCalendarClient.tsx`, `EmptySlot.tsx`, `IdeaBacklog.tsx`, `TypesSlotsDialog.tsx`) en een UI-contract schreef. Die UI-bestanden zijn nooit gebouwd; de uitgevoerde implementatie volgt dit takenbestand (naamgeving: `ContentView.tsx`, `SlotPlaceholder.tsx`, `IdeasPanel.tsx`, `PillarsDialog.tsx`). Het UI-contract van die sessie is verzoend in [contracts/ui-components.md](./contracts/ui-components.md) — functionaliteit en FR-nummers zijn identiek, de bestandsnamen volgen de werkelijke implementatie. Voor feature 024 zijn de namen bindend die ook in het 024-plan staan: `PostEditorDialog.tsx`, `PostChip.tsx`, `src/actions/content.ts`, `src/lib/content/queries.ts`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Paralleliseerbaar (andere bestanden, geen afhankelijkheden)
- **[Story]**: User story uit spec.md (US1-US5)
- Bestandspaden staan exact in de omschrijvingen

## Prerequisite

Geen — de feature raakt geen bestaande modules behalve `src/components/layout/AppShell.tsx` (nav-item) en `src/types/database.types.ts` (typen). Uitvoering gebeurt op branch `023-content-kalender`.

---

## Phase 1: Setup

**Purpose**: Verificatie van de uitgangspunsten uit het plan

- [X] T001 Controleer de uitgangspunten vóór start: branch `023-content-kalender` actief; lees `specs/023-content-kalender/contracts/server-actions.md` (action- en UI-contract) en `specs/023-content-kalender/data-model.md` (tabellen, slotmatching, statusmachine); verifieer dat de referentiepatronen bestaan: /uren-datalaag (`src/app/(dashboard)/uren/page.tsx`, `src/lib/hours/queries.ts`, `src/hooks/useHours.ts`), migratiestijl (`supabase/migrations/007_hours_tracking.sql`), unit-testpatroon (`tests/e2e/column-filters.spec.ts`), UI-componenten (`src/components/ui/dialog.tsx`, `badge.tsx`, `select.tsx`, `textarea.tsx`, `toast.tsx`) en `amsterdamTodayISO()` in `src/lib/hours/dates.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database, pure logica en datalaag die álle user stories nodig hebben

**⚠️ CRITICAL**: User story-werk kan pas beginnen na deze fase

- [X] T002 Schrijf migratie `supabase/migrations/022_content_calendar.sql`: idempotent volgens de stijl van `supabase/migrations/007_hours_tracking.sql` — `CREATE TABLE IF NOT EXISTS` voor `kk_content_pillars`, `kk_content_slots`, `kk_content_posts` (schema + alle check-constraints + `unique (pillar_id, weekday)` per data-model.md), drie indexen, RLS op alle tabellen, vier policies per tabel met `DROP POLICY IF EXISTS` ervoor, `updated_at`-triggers via bestaande `update_updated_at()` in één `DO $$`-blok; geen DB-constraint op de lengte van `body`
- [X] T003 [P] Voeg de typen toe aan `src/types/database.types.ts` in de bestaande handmatige stijl: `ContentPillar`-, `ContentSlot`-, `ContentPost`-interfaces plus drie entries in `Database['public']['Tables']` en de domein-unies `ContentStatus`, `ContentFormat`, `PillarColor` (per data-model.md)
- [X] T004 Implementeer de pure logica in `src/lib/content/calendar.ts` (geen React, geen Supabase): `buildMonthGrid` (startOfISOWeek/endOfISOWeek, `amsterdamReferenceDate`-patroon), `computeSlotOccurrences` (active slots, niet-gearchiveerd, datum ≥ Amsterdamse aanmaakdag van `slot.created_at`), `matchSlots` (per ISO-week + pillarId, i-de post → i-de voorkomen op volgorde datum/tijd), `slotState` (open/gemist), `isOverdue`, `charCount` (Array.from, emoji = 1), `hookPreview` (derde `\n` of 210 tekens, `{ preview, truncated }`), `validateStatusChange` (guards per data-model statusmachine incl. LinkedIn-URL-prefix), `resolveDropTime` (slot-tijd > bestaande tijd > 08:00) — contracten in `specs/023-content-kalender/data-model.md`
- [X] T005 [P] Implementeer `src/lib/content/queries.ts` (geen `'use server'`): `contentKeys` (`pillars`, `month: (ym) => …`, `ideas`), `fetchPillarsWithSlots` (incl. gearchiveerd, join slots), `fetchMonthPosts(supabase, userId, gridStart, gridEnd)` (posts met `planned_date` binnen het volledige zichtbare raster incl. grenzen), `fetchIdeas` (`planned_date is null`, nieuwste eerst); Supabase-fouten **gooien** i.p.v. stil `[]`; `UntypedClient`-patroon met eslint-disable conform `src/lib/hours/queries.ts`
- [X] T006 Implementeer de server actions in `src/actions/content.ts` (`'use server'`, `ActionResult`-patroon uit `src/actions/hours.ts`, via `getAuthenticatedClient()`, **geen `revalidatePath`**): `createPillar`, `updatePillar`, `setPillarArchived`, `upsertSlot`, `deleteSlot`, `createPost`, `updatePost`, `movePost(id, date | null, time | null)`, `deletePost` — exact per `specs/023-content-kalender/contracts/server-actions.md`: server-side `validateStatusChange` bij elke status- of tekstmutatie, overgang naar `gepland` zet `scheduled_on_linkedin_at = now()` als leeg, lagere status wist het, `movePost` weigert `date = null` bij gepland/live vóór de DB-call
- [X] T007 Implementeer `src/hooks/useContent.ts` naar het patroon van `src/hooks/useHours.ts`: `usePillars`, `useMonthPosts(ym)`, `useIdeas` (browser-client, `enabled: !!userId`, staleTime, keys matchen de SSR-prefetch) en mutatie-hooks per action met invalidatie per data-model.md-overzicht; `useMovePost` met optimistische update volgens het uren-patroon: `cancelQueries` + `getQueriesData`/`setQueriesData` op prefix `['content','month']` én `['content','ideas']`, snapshot-rollback in `onError`
- [X] T008 [P] Maak `src/components/content/colors.ts`: mapping van de 8 kleur-keys (`blue`, `green`, `orange`, `purple`, `pink`, `yellow`, `teal`, `gray`) naar Tailwind-klassen (bg/border/text) met `dark:`-varianten, plus statusbadge-kleuren (idee grijs, concept geel, klaar blauw, gepland paars, live groen) voor gebruik met `src/components/ui/badge.tsx`
- [X] T009 [P] Voeg het nav-item toe in `src/components/layout/AppShell.tsx`: in `navItems` direct na Uren `{ href: '/content', label: 'Content', icon: CalendarDays, external: false }` (lucide-react `CalendarDays` importeren); geen `adminOnly` — zelfde zichtbaarheid als Uren

**Checkpoint**: Fundament klaar — migratie-script, typen, pure logica, queries, actions en hooks bestaan en compileren; nog geen UI

---

## Phase 3: User Story 1 + 2 - Contentsoorten, weekslots en maandkalender (Priority: P1/P1) 🎯 MVP

**Goal**: /content opent de maandkalender als raster van hele weken; via "Soorten & slots" beheer ik contentsoorten met vaste weekslots (kleur, dagen, tijden, archiveren); de kalender toont per dag posts en lege/gemiste slots volgens de slotmatching-regel; klik op een leeg slot maakt direct een Concept-post op die datum/tijd/soort

**Independent Test**: Maak soort "Praktijk financieel adviseurs" (blauw) met woensdagslot 08:00 → elke woensdag vanaf vandaag toont een gestippeld blauw slot ("Soortnaam · 08:00"); maand terugbladeren → geen slots vóór de aanmaakdatum; slot vóór vandaag grijs "gemist" en niet klikbaar; klik op een open slot → Concept-post verschijnt in de dagcel (persistent na herladen) en het slot is gevuld; verplaats de post binnen dezelfde week naar donderdag → woensdag toont géén leeg slot

### Implementation for User Story 1 + 2

- [X] T010 [US1] [US2] Maak `src/components/content/ContentView.tsx`: header met maandnavigatie (vorige/volgende maand, maandlabel), "Vandaag", "Nieuwe post" en "Soorten & slots"; maandstatus (`yyyy-MM`) via `useMonthPosts`; layout met `MonthGrid` en `IdeasPanel`; verwerking slotmatching: `computeSlotOccurrences` + `matchSlots` + `slotState` per data-model.md; vandaag via `amsterdamTodayISO()`
- [X] T011 [US2] Maak `src/components/content/MonthGrid.tsx`: weken maandag t/m zondag uit `buildMonthGrid`, dagen buiten de maand gedimd (`inMonth`), dagcellen in een 7-koloms grid
- [X] T012 [US2] Maak `src/components/content/DayCell.tsx`: droppable-registratie met id `day:YYYY-MM-DD` (drop-afhandeling komt in US4); posts gesorteerd op tijd (zonder tijd achteraan, zonder tijdlabel); max 3 items + "+n" met uitklap bij klik; posts en lege slots van die dag naast elkaar
- [X] T013 [US2] Maak `src/components/content/PostChip.tsx` (nog zonder drag): kleurstreep in soortkleur (`colors.ts`), tijd `HH:mm`, afgekaptte titel, statusbadge (`badge.tsx` + statuskleuren); rode verlopen-markering bij `isOverdue`; badge "URL ontbreekt" bij live zonder `linkedin_url`; soortnaam gedimd bij gearchiveerde soort
- [X] T014 [US2] Maak `src/components/content/SlotPlaceholder.tsx`: gestippeld kader in soortkleur met "Soortnaam · HH:mm"; klik → `createPost({ title: 'Nieuwe post', status: 'concept', planned_date, planned_time, pillar_id })` — de post verschijnt in de dagcel en het slot is gevuld (editor-openen volgt in US3); grijs "gemist" en niet klikbaar wanneer `slotState` gemist is
- [X] T015 [US1] Maak `src/components/content/PillarsDialog.tsx` (Radix `Dialog` uit `src/components/ui/dialog.tsx`): lijst soorten met naam (verplicht), doelgroep, korte beschrijving, kleurkeuze uit 8 swatches (`colors.ts`), archiveren/heractiveren (`setPillarArchived`); per soort zeven dag-chips maandag t/m zondag met aan/uit en tijdveld (standaard 08:00) via `upsertSlot`/`deleteSlot`; gearchiveerde soorten zichtbaar maar gedimd
- [X] T016 [US1] [US2] Koppel "Soorten & slots" in `src/components/content/ContentView.tsx` aan `PillarsDialog.tsx` en maak de route `src/app/(dashboard)/content/page.tsx`: exact het patroon van `src/app/(dashboard)/uren/page.tsx` — `getUserId()`, `createClient()`, `QueryClient` met drie parallelle `prefetchQuery`-calls (pillars, month van de huidige Amsterdamse maand, ideas), `HydrationBoundary` met `dehydrate` rond `ContentView` (SC-004: 0 server-action-reads na hydratie)

**Checkpoint**: Kalenderweergave + soorten-/slotbeheer werken; klik op leeg slot maakt een Concept-post — onafhankelijk testbaar via de Independent Test hierboven

---

## Phase 4: User Story 3 - Post schrijven en status bijhouden (Priority: P1)

**Goal**: Klik op een post opent de editor met alle velden; posttekst met tekenteller, hook-preview en kopieerknop; statusovergangen met guards (tekst ≤ 3.000, datum+tijd bij Gepland/Live, LinkedIn-URL-prefix, inplan-moment); expliciet opslaan (knop + Ctrl/Cmd+S), in-app bevestigingen bij sluiten-met-wijzigingen en verwijderen

**Independent Test**: Open een Concept-post in de editor: typ > 3.000 tekens → teller rood en status Klaar geweigerd met NL-melding; tekst korter → Klaar lukt; Gepland zonder datum → prompt voor datum/tijd; vul datum → Gepland en inplan-moment vastgelegd; "Kopieer tekst" → exacte tekst op klembord (plaktest); sluit met wijzigingen → in-app bevestiging; Ctrl+S slaat op; verwijderen vraagt bevestiging

### Implementation for User Story 3

- [X] T017 [US3] Maak `src/components/content/PostEditorDialog.tsx` (Radix `Dialog`): velden titel (intern, verplicht), contentsoort (select incl. "geen"), format (Tekst/Afbeelding/Carrousel/Video/Poll), status, datum, tijd, posttekst (`textarea.tsx`), bron-URL, LinkedIn-URL, notities; opslaan via `updatePost`; verwijderen via `deletePost`
- [X] T018 [US3] Voeg de posttekst-tools toe in `src/components/content/PostEditorDialog.tsx`: tekenteller "1.234 / 3.000" via `charCount` (rood boven 3.000), hook-preview via `hookPreview` met label "Opening in de feed (benadering)" en "…meer", knop "Kopieer tekst" (klembord-API + toast-bevestiging)
- [X] T019 [US3] Implementeer de statusregels in `src/components/content/PostEditorDialog.tsx`: client-side `validateStatusChange` bij statusselectie — weigeringen inline met NL-reden (te lang/leeg, datum+tijd vereist, ongeldige LinkedIn-URL `https://www.linkedin.com/`-prefix); het inplan-moment en de "URL ontbreekt"-badge volgen uit de server response
- [X] T020 [US3] Koppel de editor-flows in `src/components/content/ContentView.tsx` + `DayCell.tsx`: klik op `PostChip` opent de editor van die post; klik op leeg slot (in `SlotPlaceholder.tsx`) opent na `createPost` direct de editor met datum/tijd/soort ingevuld en status Concept; knop "Nieuwe post" in de header → `createPost({ title: 'Nieuwe post', status: 'idee' })` zonder datum + editor openen
- [X] T021 [US3] Implementeer opslaan en bevestigingen in `src/components/content/PostEditorDialog.tsx`: expliciete knop "Opslaan" + Ctrl/Cmd+S-handler op de dialog-content (`preventDefault`); sluiten met niet-opgeslagen wijzigingen → in-app bevestigingsdialoog (geen browser-`confirm`); verwijderen → in-app bevestiging; alle meldingen via de bestaande toast (`src/components/ui/toast.tsx`)

**Checkpoint**: Editor volledig functioneel met statusbewaking; alle US3-acceptatiescenario's testbaar

---

## Phase 5: User Story 4 - Ideeënbak en slepen (Priority: P2)

**Goal**: Ideeënbak naast het raster met quick-add en sleepbare posts: idee → dagcel (tijdregel), post → andere dag, post → ideeënbak (alleen Idee/Concept/Klaar); geplande posts verplaatsbaar met LinkedIn-melding; live niet sleepbaar; serverfout → rollback + toast

**Independent Test**: Typ een titel + Enter in de ideeënbak → nieuw idee (zonder datum) verschijnt bovenaan; sleep het naar een dag zonder passend slot → krijgt die datum en 08:00; sleep het naar een dag met open slot van de soort → neemt de slottijd over; sleep een geplande post naar een andere dag → toast "Pas de datum ook aan in LinkedIn"; sleep een geplande post naar de ideeënbak → geweigerd met melding; live-post is niet sleepbaar; na herladen zijn alle mutaties persistent

### Implementation for User Story 4

- [X] T022 [US4] Maak `src/components/content/IdeasPanel.tsx`: alle posts zonder datum via `useIdeas`, nieuwste bovenaan; bovenin quick-add-invoerveld (titel + Enter → `createPost({ title, status: 'idee' })` zonder editor); droppable-registratie met id `ideas`; render naast `MonthGrid` in `src/components/content/ContentView.tsx`
- [X] T023 [US4] Implementeer drag & drop in `src/components/content/ContentView.tsx` + `src/components/content/PostChip.tsx`: `DndContext` met Pointer-sensor + `DragOverlay` met chip-ghost; `PostChip` `useDraggable` behalve bij status `live`; `DayCell`-droppables actief; DragEnd → `resolveDropTime` + `useMovePost` (optimistisch + rollback per T007); na elke drop correcte invalidatie van `['content','month']` + `['content','ideas']`
- [X] T024 [US4] Implementeer de drag-regels en meldingen in `src/components/content/ContentView.tsx`: geplande post naar andere dag → toast "Pas de datum ook aan in LinkedIn" (FR-031); drop op `ideas` geweigerd bij status gepland (toast) en live (niet draggable); in de editor dezelfde LinkedIn-melding tonen bij datum- of tijdwijziging van een geplande post; serverfout → de post veert terug naar zijn oude plek (rollback uit T007) + destructive toast (FR-033)

**Checkpoint**: Volledige planningsworkflow zonder de pagina te verlaten (SC-001, SC-003)

---

## Phase 6: User Story 5 - Mobiele weergave (Priority: P3)

**Goal**: Onder 768 px breedte een lijst per dag (alleen dagen met posts of slots) met de ideeënbak eronder; geen drag op mobiel; datumwijziging via de editor

**Independent Test**: Verklein het browservenster onder 768 px op /content: daglijst toont alleen dagen met posts of slots (met dezelfde chips en slot-placeholders), de ideeënbak staat eronder; post verplaatsen kan via de editor

### Implementation for User Story 5

- [X] T025 [US5] Implementeer de mobiele weergave in `src/components/content/ContentView.tsx` (Tailwind responsive, `lg:`-grid vs. mobiele lijst): onder 768 px een lijst per dag — alleen dagen met posts of slotvoorkomens, zelfde `PostChip`/`SlotPlaceholder`-rendering — met de `IdeasPanel` eronder; drag-opties zijn in de mobiele weergave afwezig (geen DndContext-interactie); datumwijziging blijft via de editor mogelijk

**Checkpoint**: Alle user stories functioneel onafhankelijk

---

## Phase 7: Tests (Playwright)

**Purpose**: Unit-dekking op de pure kalenderlogica + e2e happy paths conform AGENTS.md-regels (nieuwe Supabase-tabellen en server actions → regressietesten verplicht)

- [X] T026 [P] Maak `tests/e2e/content-calendar-logic.spec.ts` (setup zoals `tests/e2e/column-filters.spec.ts`, directe imports uit `@/lib/content/calendar`): minimaal de twaalf gevallen uit `specs/023-content-kalender/quickstart.md` — woensdagslot-voorkomens (gemist vóór vandaag, open vanaf vandaag), slot gevuld door post op woensdag, verplaatsing naar donderdag zelfde week houdt slot gevuld, post volgende week laat slot open, di+do met één post op di, gearchiveerde soort/inactief slot geven geen voorkomens, slot geldt pas vanaf aanmaakdatum, post zonder soort vult niets + extra posts geven geen fout, week over de maandgrens (di 29 sep + do 1 okt 2026 matcht als één week), `charCount` met emoji + `hookPreview` randgevallen, de vier `validateStatusChange`-weigeringen, de drie `resolveDropTime`-varianten
- [X] T027 Maak `tests/e2e/content-calendar.spec.ts` met de bestaande login-skip-guards (`if (page.url().includes('/login'))`): (a) nav-item "Content" staat direct onder "Uren" en /content opent de kalender op de huidige maand; (b) soort + slot aanmaken via "Soorten & slots" → leeg slot zichtbaar in de kalender; (c) klik op leeg slot → editor geopend met datum/tijd/soort ingevuld en status Concept; (d) idee aanmaken in de ideeënbak en naar een dag slepen → datum + tijd overgenomen, zichtbaar in de UI en persistent na herladen; (e) geplande post verslepen → toast "Pas de datum ook aan in LinkedIn"

---

## Phase 8: Polish & Cross-Cutting Concerns

- [X] T028 Run `npx tsc --noEmit` — compileert zonder errors
- [X] T029 Run `npx eslint src/ --max-warnings 0` — geen lint-warnings
- [X] T030 Run de volledige Playwright-regressiesuite — alle tests groen (of geskipt zonder login)
- [X] T031 Werk FEATURES.md bij via het `@feature-tracker`-protocol: entry voor `023-content-kalender` met referentie naar `specs/023-content-kalender/spec.md`
- [X] T032 Run `@fitness-checker`: `scripts/fitness-check.sh`, Supabase MCP F-01 (RLS op de drie nieuwe tabellen), Snyk MCP F-16/F-17; schrijf FITNESS.md
- [ ] T033 Run de quickstart-validatie in de browser (`specs/023-content-kalender/quickstart.md`, stappen 1 t/m 11), ná het handmatig draaien van `supabase/migrations/022_content_calendar.sql` in de Supabase SQL Editor
- [X] T034 Commit met conventioneel bericht: `feat(content): LinkedIn content-kalender met weekslots, ideeënbak en post-editor`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: Geen dependencies — direct starten
- **Phase 2 (Foundational)**: T002+T003 parallel; T004 en T005 parallel na T003 (aparte bestanden); T006 na T004 (`validateStatusChange`); T007 na T005+T006; T008+T009 parallel met alles — BLOKKEERT alle user stories
- **Phase 3 (US1+US2)**: Na Phase 2; binnen de fase: T010 → T011 → T012 → T013/T014 (parallel, aparte bestanden) → T015 → T016 (route als laatste, importeert ContentView)
- **Phase 4 (US3)**: Na Phase 3 (dagcel en post-render bestaan); T017 → T018/T019 (sequentieel binnen hetzelfde bestand) → T020 → T021
- **Phase 5 (US4)**: Na Phase 4 (editor bestaat voor de mobiele datumwijziging-flow); T022 → T023 → T024
- **Phase 6 (US5)**: Na Phase 5 (ideeënbak-render hergebruikt in mobiele weergave)
- **Phase 7 (Tests)**: T026 parallel aan Phase 3-6 (alleen afhankelijk van T004); T027 na Phase 5
- **Phase 8 (Polish)**: Na alle voorgaande fasen

### User Story Dependencies

- **US1 + US2 (Phase 3)**: Alleen afhankelijk van foundational — geen story-dependencies
- **US3 (Phase 4)**: Bouwt voort op US2-render (dagcel-chips) en US1 (soort-select in de editor)
- **US4 (Phase 5)**: Bouwt voort op US2 (droppable dagcellen) en US3 (editor als fallback voor datumwijziging)
- **US5 (Phase 6)**: Bouwt voort op US2 (dagweergave) en US4 (ideeënbak-render)

### Parallel Opportunities

- T002 + T003 (migratie vs. typen — verschillende bestanden)
- T004 + T005 (calendar.ts vs. queries.ts)
- T008 + T009 (colors.ts vs. AppShell.tsx) parallel aan T004-T007
- T013 + T014 (PostChip.tsx vs. SlotPlaceholder.tsx)
- T026 parallel aan alle UI-fasen (unit-tests op pure logica)

---

## Parallel Example: Phase 2

```bash
# Launch foundational tasks together (verschillende bestanden):
Task: "Migratie in supabase/migrations/022_content_calendar.sql" (T002)
Task: "Typen in src/types/database.types.ts" (T003)

# Daarna parallel:
Task: "Pure logica in src/lib/content/calendar.ts" (T004)
Task: "Queries in src/lib/content/queries.ts" (T005)

# Daarnaast altijd parallel:
Task: "colors.ts kleurmapping" (T008)
Task: "AppShell nav-item" (T009)
```

---

## Implementation Strategy

### MVP First (Phase 3 = US1+US2)

1. Complete Phase 1 + 2 (fundament: migratie, logica, datalaag)
2. Complete Phase 3 (maandkalender + soorten/slotbeheer + klik-op-slot)
3. **STOP and VALIDATE**: onafhankelijke test US1/US2 (quickstart stappen 2-3)
4. Daarna Phase 4 (US3, de editor) — het dagelijkse schrijfwerk

### Incremental Delivery

1. Foundation → 2. Kalender + slots (US1+US2, demo-klaar) → 3. Editor (US3) → 4. Ideeënbak + slepen (US4) → 5. Mobiel (US5) → 6. Tests → 7. Polish/commit

---

## Notes

- [P]-taken = andere bestanden, geen dependencies
- US1 en US2 zijn samengevoegd in Phase 3: de acceptance scenarios van US1 vereisen de kalenderweergave (lege slots zichtbaar, geen slots vóór aanmaakdatum); onafhankelijke testbaarheid blijft per scenario behouden
- Klik-op-leeg-slot is bewust gesplitst: in Phase 3 wordt de post aangemaakt (zichtbaar + persistent, FR-013 eerste helft), het openen van de editor volgt in Phase 4 (US3) zodra de editor bestaat
- De migratie (`supabase/migrations/022_content_calendar.sql`) wordt handmatig in de Supabase SQL Editor gedraaid — vastgestelde werkwijze; T033 (quickstart-validatie) vereist een gedraaide migratie
- Commit na elke taak of logische groep; stop bij elke checkpoint voor validatie
- Verzoening parallelle sessie: zie de Reconciliatie-notitie bovenaan. De data-laag die die sessie als "reeds geïmplementeerd" signaleerde, is dezelfde data-laag die in deze sessie is gebouwd en geverifieerd (tsc 0 errors, 25 unit-tests groen, suite 130 passed / 63 skipped / 0 failed)