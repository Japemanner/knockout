# Contract: UI-componenten — content-kalender

**Feature**: 023-content-kalender | **Date**: 2026-10-14 | **Reconciliatie**: 2026-10-14 — oorspronkelijk opgesteld in een parallelle sessie met alternatieve bestandsnamen (`ContentCalendarClient.tsx`, `TypesSlotsDialog.tsx`, `EmptySlot.tsx`, `IdeaBacklog.tsx`, `useCalendarDrag.ts`). Dit contract is verzoend met de daadwerkelijk gebouwde en geverifieerde implementatie (tsc 0 errors, unit-tests en regressiesuite groen): functionaliteit en FR-nummers zijn ongewijzigd, de bestandsnamen volgen de code. Voor feature 024 zijn de namen bindend die ook in het 024-plan staan: `PostEditorDialog.tsx`, `PostChip.tsx`, `src/actions/content.ts`, `src/lib/content/queries.ts`.

## Locatie & structuur

Componenten in `src/components/content/` (nieuwe map); route `src/app/(dashboard)/content/page.tsx` (server component, SSR-prefetch); React Query-hoeken in `src/hooks/useContent.ts`; drag-logica in `src/components/content/ContentView.tsx` (één DndContext over raster en ideeënbak); pure logica in `src/lib/content/calendar.ts`; querylaag in `src/lib/content/queries.ts`.

## Route & data — src/app/(dashboard)/content/page.tsx

- Server component, exact het /uren-patroon: `getUserId()` → `createClient()` (server) → `QueryClient` met parallelle `prefetchQuery` voor pillars (`fetchPillarsWithSlots`), maand-posts (`fetchMonthPosts` over het volledige zichtbare raster: maandag eerste week t/m zondag laatste week) en ideeën (`fetchIdeas`) → `HydrationBoundary` om `ContentView`.
- Nav-item "Content" in `src/components/layout/AppShell.tsx` (`navItems`, direct ná `/uren`, lucide `CalendarDays`, geen `adminOnly` — zelfde zichtbaarheid als Uren) — FR-007.
- SC-004: 0 server-action-calls voor reads na hydratie. Maandnavigatie haalt een doelmaand op via de browser-client en React Query (directe Supabase-reads onder RLS, nooit server actions).

## ContentView.tsx (hoofdcomponent)

- Toolbar: ◀ vorige maand, ▶ volgende maand, "Vandaag", "Nieuwe post" (opent de editor met een nieuw idee: geen datum, status Idee), "Soorten & slots" (opent PillarsDialog) — FR-009.
- Hoofdlayout: MonthGrid (links, flex-1) + IdeasPanel (rechts, vaste breedte op `lg:`); onder 768 px: daglijst (MobileDayList) + ideeënbak eronder (US5, FR-034).
- Één `DndContext` met Pointer-sensor (activatie-afstand 5) over raster én ideeënbak; `DragOverlay` met chip-ghost.
- Dialog-state: PostEditorDialog, PillarsDialog.
- Maandnavigatie via `buildMonthGridForYm` + `amsterdamTodayISO()`; na mutaties React Query invalidatie op `contentKeys`; drag optimistisch met rollback + toast (FR-033).

## MonthGrid.tsx

- Maandraster van hele weken via `buildMonthGrid(year, month)`; dagen buiten de maand gedimd (`inMonth: false`, FR-008); weekkoppen ma t/m zo.
- Exporteert tevens `MobileDayList` (daglijst onder 768 px, alleen dagen met posts of slot-voorkomens).

## DayCell.tsx

- Droppable met id `day:YYYY-MM-DD` + `data-date`-attribuut (drop van post/idee → `movePost`); bevat `DayCellContent` (gedeeld met de mobiele lijst).
- Rendert op volgorde: posts (chips, op `planned_time` gesorteerd; zonder tijd ná de posts mét tijd, zonder tijdlabel) en open/gemiste slot-voorkomens (`SlotPlaceholder`) uit `computeSlotOccurrences` + `matchSlots` voor die maand.
- Gemiste voorkomens (`slotState === 'gemist'`) grijs + label "gemist", niet klikbaar (FR-014).
- Meer dan 3 items → 3 chips + "+n"; klik toont alle items van die dag (uitklap binnen de cel, FR-011).

## PostChip.tsx

- Kleurstreep in de kleur van de soort (mapping `PillarColor` → vaste Tailwind-klasse uit `colors.ts`: blue/green/orange/purple/pink/yellow/teal/gray; post zonder soort: neutrale streep); gearchiveerde soort → soortnaam gedimd + "(gearchiveerd)" (spec edge).
- Tijd-label via `displayTime` (alleen bij `planned_time`), afgekaptte titel (1 regel, ellipsis), statusbadge via `statusLabel` + statuskleuren (idee grijs, concept geel, klaar blauw, gepland paars, live groen).
- Verlopen: `isOverdue` (datum < vandaag, alleen Idee/Concept/Klaar) → rode linkerkader-markering (FR-015; Gepland/Live in het verleden niet).
- Status Live zonder `linkedin_url` → badge "URL ontbreekt" (FR-025).
- Klik opent PostEditorDialog; `useDraggable` behalve bij status Live (FR-032: niet sleepbaar); in de mobiele lijst statisch gerenderd (prop `draggable={false}`).
- Uitbreidingspunt feature 024: prop `attachmentCount` + paperclip-icoon (`specs/024-post-bijlagen/`).

## SlotPlaceholder.tsx

- Gestippeld kader (border-dashed, border-2) in de kleur van de soort met "Soortnaam · HH:mm" (FR-012; `displayTime`).
- Open (`slotState === 'open'`): klik → nieuwe post met datum, tijd en soort ingevuld, status Concept, editor opent direct (FR-013).
- Gemist: grijs, "· gemist"-label, niet klikbaar (FR-014).

## IdeasPanel.tsx

- Alle posts zonder `planned_date`, nieuwste bovenaan (FR-028).
- Bovenaan invoerveld: titel typen + Enter → `createPost` (status Idee, geen datum) — direct in de lijst.
- Droppable met id `ideas`; chips hier zijn draggable naar dagcellen (behalve Live); post → ideeënbak alleen voor Idee/Concept/Klaar (FR-030, weigering in ContentView met toast; server hervalideert).

## PostEditorDialog.tsx

- Velden: titel (verplicht), contentsoort (select; gearchiveerde soorten niet kiesbaar behalve de huidige soort van de post, dan gedimd gelabeld), format (via `formatLabel`), status (vaste volgorde), datum, tijd, posttekst, bron-URL, LinkedIn-URL, notities (FR-019).
- Rond de posttekst: tekenteller "n / 3.000" via `charCount` (nl-NL duizendtal, rood boven 3.000, FR-020); hook-preview "Opening in de feed (benadering)" via `hookPreview` (3e regeleinde of 210 tekens + "…meer", FR-021); knop "Kopieer tekst" → volledige posttekst op het klembord + zichtbare bevestiging (FR-022).
- Statusregels lokaal via `validateStatusChange` bij statusselectie (weigeringen vóór opslaan met NL-uitleg, status blijft dan ongewijzigd; server hervalideert in `updatePost`).
- LinkedIn-URL: invoer die niet met `https://www.linkedin.com/` begint → weigering bij opslaan (FR-025).
- Opslaan expliciet: knop "Opslaan" + Ctrl/Cmd+S (FR-026). Sluiten met niet-opgeslagen wijzigingen → in-app bevestiging (geen browserdialoog); verwijderen van de post → in-app bevestiging (FR-027).
- Nieuwe post (vanuit leeg slot): post bestaat al via `createPost` (titel-placeholder "Nieuwe post", status Concept, datum/tijd/soort vooringevuld) en opent de editor; vanuit "Nieuwe post": geen datum, status Idee.
- Datum-/tijdwijziging bij status Gepland → toast "Pas de datum ook aan in LinkedIn" (FR-031); het inplan-moment (`scheduled_on_linkedin_at`) staat in de editor-kop bij Gepland (FR-024).

## PillarsDialog.tsx

- Nieuw-soort-formulier: naam (verplicht), doelgroep, korte beschrijving, kleur (8 swatches: blue/green/orange/purple/pink/yellow/teal/gray) (FR-001) + "Toevoegen".
- Per soort: naam/doelgroep/beschrijving met "Opslaan" (zichtbaar bij wijzigingen), kleur-swatches (direct opslaan), archiveren/heractiveren via `setPillarArchived` (geen verwijderen, FR-003), zeven dag-chips (maandag t/m zondag, ISO 1-7) met aan/uit (`active`) en tijdveld (standaard 08:00) → `upsertSlot`/`deleteSlot` per dag (FR-002).
- Gearchiveerde soorten zichtbaar maar gedimd. Lege staat: "Nog geen contentsoorten. Maak je eerste soort hierboven aan." (FR-006: geen startset).

## useContent.ts (React Query-hoeken)

- `usePillars()` / `useMonthPosts(ym)` / `useIdeas()` — reads via browser-client + fetchers uit `src/lib/content/queries.ts`, `enabled: !!userId`, `staleTime: 30_000` (uren-patroon).
- Mutatie-hoeken per action (createPillar, updatePillar, setPillarArchived, upsertSlot, deleteSlot, createPost, updatePost, movePost, deletePost) met `invalidateQueries` op de betrokken `contentKeys` na succes.
- `useMovePost`: optimistisch met `cancelQueries`/`getQueriesData`/`setQueriesData` op `['content','month']` + `['content','ideas']`, snapshot-rollback in `onError` + destructive toast; `mutationFn` gooit bij serverweigering zodat de rollback ook daar geldt (FR-033).

## Drag-regels (DndContext in ContentView.tsx)

- Dagcellen (`day:YYYY-MM-DD`) en ideeënbak (`ideas`) zijn droppables; posts/ideeën draggable via `useDraggable` in `PostChip` (behalve Live).
- `onDragEnd`: doel = dagcel → `movePost(postId, date, resolveDropTime(...))` (optimistisch, rollback + toast bij fout, FR-033); doel = ideeënbak → `movePost(postId, null, null)`; weigeringen: Gepland/Live → ideeënbak geweigerd met NL-toast (FR-030), Live is niet draggable (FR-032).
- Bij een Geplande post die naar een andere dag is gesleept: toast "Pas de datum ook aan in LinkedIn" (FR-031).
- Geen `SortableContext` — binnen een dag is de volgorde tijdsgesorteerd (FR-010).

## Niet-functionele UI-eisen

- `tsc --noEmit` clean; geen `any` in nieuwe bestanden behalve het `UntypedClient`-patroon met eslint-disable in `queries.ts` (conform `src/lib/hours/queries.ts`).
- Hergebruik de ui-componenten (Dialog, Button, Input, Textarea, Select, Badge, useToast) en @dnd-kit/core — geen nieuwe dependencies.
- Alle datums via `calendar.ts`-helpers en het Intl-patroon uit `src/lib/hours/dates.ts`; geen `toISOString()` op lokale datums (tijdzone-regel spec).
- Alle bevestigingen en meldingen via in-app dialogen en de bestaande toast — nooit `alert`/`confirm`/`prompt`.