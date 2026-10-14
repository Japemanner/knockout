# Content-kalender — Knowledge (feiten en patronen)

Domain: LinkedIn content-kalender (feature 023, branch `023-content-kalender`, gemerged via `1b42490`).

## Feiten

- **Datalaag volgt de uren-beslissing** (`decisions/2026-09-22-uren-reads-browser-client.md`): SSR-prefetch met `QueryClient.prefetchQuery` + `dehydrate` + `HydrationBoundary`, reads in `src/lib/content/queries.ts` (geen `'use server'`, fouten gooien), mutaties via server actions met `getAuthenticatedClient()`, géén `revalidatePath` — client invalideert React Query-keys (`contentKeys`: pillars / month(yyyy-MM) / ideas).
- **Alle kalenderlogica is puur** in `src/lib/content/calendar.ts` (geen React/Supabase): `buildMonthGrid` (hele weken ma–zo via startOfISOWeek/endOfISOWeek), `computeSlotOccurrences` (active slots, niet-gearchiveerde soorten, pas vanaf de Amsterdamse aanmaakdag van `slot.created_at`), `matchSlots` (per ISO-week + pillarId: i-de post op volgorde vult het i-de voorkomen), `slotState`, `isOverdue`, `charCount` (Array.from → emoji = 1), `hookPreview` (3e regeleinde of 210 tekens), `validateStatusChange`, `resolveDropTime` (slottijd > bestaande tijd > 08:00).
- **Datums zijn 'YYYY-MM-DD'-strings** (lexicografisch = chronologisch); Amsterdamse dag van een timestamptz via `Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Amsterdam' })` (patroon uit `src/lib/hours/dates.ts`); nooit `toISOString()` op lokale datums.
- **Maandquery haalt het volledige raster** (maandag eerste week t/m zondag laatste week), niet alleen de kalendermaand — anders klopt de ISO-weekmatching aan de maandranden niet (unit-test: di 29 sep + do 1 okt 2026 = één week).
- **Statusguards dubbel bewaakt**: `validateStatusChange` draait client-side (editor) én server-side (elke status-/tekstmutatie in `src/actions/content.ts`) — API-bypass onmogelijk. DB-check (gepland/live ⇒ datum+tijd) blijft als vangnet.
- **Migratie 022_content_calendar.sql** nog handmatig te draaien in de Supabase SQL Editor (vastgestelde werkwijze; idempotent, stijl 007).
- **UI-namen bindend voor feature 024** (bijlagen): `PostEditorDialog.tsx`, `PostChip.tsx` (uitbreidingspunt: prop `attachmentCount` + paperclip-icoon), `src/actions/content.ts`, `src/lib/content/queries.ts`, `kk_content_posts`.

## Patronen

- Optimistisch slepen (`useMovePost`) via `cancelQueries`/`getQueriesData`/`setQueriesData` op prefix `['content','month']` + `['content','ideas']` met snapshot-rollback in `onError` + destructive toast; `mutationFn` gooit bij serverweigering zodat rollback+toast ook bij weigeringen gelden.
- Één `DndContext` over raster én ideeënbak in `ContentView.tsx`; droppables `day:YYYY-MM-DD` + `ideas`; `data-date`-attribuut op de dagcel voor e2e-testbaarheid (dnd-kit zet géén DOM-id's).
- Bevestigingen en meldingen altijd via in-app dialogen en de bestaande toast — nooit `alert`/`confirm`/`prompt`.
- Resync-patroon voor editor-formulieren: `useEffect` op `[post.id, post.updated_at]` (niet op het post-object) zodat cache-refetches met gelijke waarden het formulier tijdens het typen niet resetten.