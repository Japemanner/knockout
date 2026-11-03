# Implementation Plan: Content-ideeën snel vastleggen en overzicht per soort

**Branch**: `026-content-ideas-views` | **Date**: 2026-11-03 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/026-content-ideas-views/spec.md` + bestaande content-implementatie (feature 023), codebase-conventies (uren-besluit, AGENTS.md) en de niet-destructieve datastrategie uit [research.md](./research.md).

## Summary

De content-feature wordt losgekoppeld van de kalender en omgevormd tot een ideeënbank met twee views op de bestaande route `/content`:

1. **Ideeën** (default): een compact formulier om snel een idee vast te leggen (titel verplicht; soort, tekst, bron-URL en notities optioneel) met Enter/Ctrl+Cmd+Enter, plus een lijst van alle bewaarde ideeën, nieuwste bovenaan.
2. **Overzicht**: het aantal ideeën per contentsoort, inclusief soorten met 0, een totaal en een aparte groep "Geen soort".

De kalender (maandraster, weekslots, slepen, verlopen-markeringen) verdwijnt volledig. De velden Format, Datum, Tijd en LinkedIn-URL worden niet meer getoond of bewerkt. Bestaande data blijft behouden: één idempotente migratie dropt de datum/tijd-constraint voor Gepland/Live, verwijdert de DELETE-policy op contentsoorten (zodat archiveren de enige weg is) en voegt een index toe voor de nieuwe lijstquery. De datalaag blijft het uren-patroon volgen: SSR-prefetch van pillars + posts, browser-reads via React Query, mutaties via server actions, geen `revalidatePath`.

## Technical Context

**Language/Version**: TypeScript 5.6 (strict) + React 18.3 + Next.js 15.1 (App Router)

**Primary Dependencies**: @supabase/ssr, @supabase/supabase-js v2, @tanstack/react-query v5, Tailwind CSS v3, shadcn/ui-componenten, lucide-react, date-fns (elders in de app) — **geen nieuwe packages**. `@dnd-kit` blijft voor de kanban; de content-feature gebruikt het niet meer.

**Storage**: Supabase PostgreSQL. Bestaande tabellen `kk_content_pillars`, `kk_content_posts` (RLS) en legacy `kk_content_slots` (blijft staan, niet meer gebruikt). Geen nieuwe tabellen, geen Storage.

**Testing**: Playwright. Pure functietests in `tests/e2e/content-ideas-logic.spec.ts`; E2E met login-skip-guards in `tests/e2e/content-ideas.spec.ts`. De kalendertests worden verwijderd.

**Target Platform**: Web (Netlify, Node-runtime server actions), desktop + mobiel vanaf 375 px.

**Project Type**: Next.js App Router web application (server component + client component + server actions + React Query).

**Performance Goals**:
- Initiële content-load: 2 parallelle SSR-reads (pillars + posts); daarna 0 extra leesverzoeken voor de getoonde data (SC-002/SC-003).
- Tellingen: één O(n)-pass client-side per render, zonder netwerkcall.
- Lijstquery: gepagineerd in batches van 1.000, zodat de Supabase-standaardlimiet de tellingen niet stilletjes afkapt.

**Constraints**:
- Niet-destructief: geen kolommen, rijen of slottabel verwijderen; alleen de datum/tijd-constraint, de pillar-delete-policy en een index aanpassen.
- Dataflow conform `decisions/2026-09-22-uren-reads-browser-client.md`: SSR-prefetch + HydrationBoundary, reads via de browser-client, mutaties via server actions, geen `revalidatePath`.
- Eén Supabase-client per omgeving; RLS blijft de grens.
- TypeScript strict; geen nieuwe `any` zonder bestaande geannoteerde `UntypedClient`-uitzondering.
- Datumweergave met vaste `Europe/Amsterdam`-tijdzone tegen hydration-mismatch.

**Scale/Scope**: persoonlijke ideeënbank; typisch <500 en maximaal enkele duizenden posts, <20 contentsoorten. 1 migratie, 2 views, ~5 nieuwe/herschreven componenten, 1 pure logicamodule, 2 queryfuncties + gedeelde keys, 6 server actions (3 pillar + 3 post), 2 nieuwe testbestanden, 2 te verwijderen testbestanden.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

*De constitutie in `.specify/memory/constitution.md` is nog een ongevulde template; conform de werkwijze van 022/023 gelden de non-negotiable rules uit AGENTS.md als gates.*

| Gate | Status | Note |
|------|--------|------|
| RLS on every table | PASS | Bestaande content-tabellen behouden hun RLS + 4 policies; geen nieuwe tabellen. F-01-controle via Supabase MCP na de feature. |
| No secrets in client code | PASS | Alleen bestaande `NEXT_PUBLIC_*`/Supabase-anon-waarden; geen nieuwe secrets of service-role. |
| Edge Functions for privileged ops | N/A | Alle operaties zijn user-owned onder de ingelogde gebruiker. |
| PKCE auth flow | PASS | Ongewijzigd; bestaande client-setup blijft. |
| Netlify SPA redirects | N/A | Geen routing-wijzigingen; de bestaande `/content`-route blijft. |
| Storage bucket policies | N/A | Geen Storage in deze feature. |
| TypeScript strict mode | PASS | Nieuwe code volledig getypeerd; bestaande `UntypedClient`-patroon in queries blijft geannoteerd. |
| Eén Supabase-client | PASS | SSR via server-client, reads via browser-client, acties via `getAuthenticatedClient()`. |
| Regressietest-regel AGENTS.md | PASS | Nieuwe E2E dekt opslaan + herladen + tellingen; oude kalendertests worden vervangen. |

Geen constitution-violations. Geen complexity tracking nodig.

## Project Structure

### Documentation (this feature)

```text
specs/026-content-ideas-views/
├── plan.md                  # Dit bestand
├── spec.md                  # Feature-specificatie
├── research.md              # Phase 0 — beslissingen + alternatieven
├── data-model.md            # Phase 1 — entiteiten, migratie, telmodel
├── contracts/
│   ├── server-actions.md    # Phase 1 — actiecontracten
│   └── ui-components.md     # Phase 1 — component- en UI-contract
├── quickstart.md            # Phase 1 — handmatige + automatische verificatie
├── checklists/
│   └── requirements.md      # Tijdens /speckit.specify aangemaakt
└── tasks.md                 # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── app/(dashboard)/content/
│   └── page.tsx                        # TE WIJZIGEN — SSR-prefetch pillars + posts, geen maandrange
├── components/layout/
│   └── AppShell.tsx                    # TE WIJZIGEN — Content-nav-item blijft; kalendericoon → lichtbol
├── components/content/
│   ├── ContentView.tsx                 # TE HERSCHRIJVEN — tabbladen, data, dialogs
│   ├── IdeaComposer.tsx                # NIEUW — snel vastleggen
│   ├── IdeaList.tsx                    # NIEUW — alle ideeën, nieuwste bovenaan
│   ├── ContentOverview.tsx             # NIEUW — aantallen per soort
│   ├── IdeaEditorDialog.tsx            # NIEUW — vervangt PostEditorDialog
│   ├── PillarsDialog.tsx               # TE WIJZIGEN — slots eruit, kleur bewerken erbij
│   ├── colors.ts                        # ONGEWIJZIGD — 8 kleuren + statusbadges
│   ├── MonthGrid.tsx                   # VERWIJDEREN
│   ├── DayCell.tsx                     # VERWIJDEREN
│   ├── SlotPlaceholder.tsx             # VERWIJDEREN
│   ├── PostChip.tsx                    # VERWIJDEREN
│   ├── IdeasPanel.tsx                  # VERWIJDEREN
│   └── PostEditorDialog.tsx            # VERWIJDEREN (vervangen door IdeaEditorDialog)
├── hooks/
│   └── useContent.ts                   # TE HERSCHRIJVEN — usePosts/usePillars + 6 mutaties
├── lib/content/
│   ├── ideas.ts                        # NIEUW — tellen, tekst, status, datumlabel
│   ├── queries.ts                      # TE HERSCHRIJVEN — fetchPillars/fetchPosts + keys
│   └── calendar.ts                     # VERWIJDEREN
├── actions/
│   └── content.ts                      # TE WIJZIGEN — postacties versmallen; slot/move-acties eruit
└── types/
    └── database.types.ts               # TE WIJZIGEN — legacy-kolommen documenteren; geen schemawijziging

supabase/migrations/
└── 025_content_ideas.sql               # NIEUW — constraint droppen + index

tests/
├── e2e/
│   ├── content-ideas-logic.spec.ts     # NIEUW — pure functies
│   ├── content-ideas.spec.ts           # NIEUW — E2E met login-skip
│   ├── content-calendar-logic.spec.ts  # VERWIJDEREN
│   └── content-calendar.spec.ts        # VERWIJDEREN
└── fixtures/
    └── legacy-content.sql              # NIEUW — deterministische preservatiefixture
```

**Structure Decision**: Single-project layout (bestaand). De content-domeinmap blijft `src/components/content/`; de pure logica verhuist van `calendar.ts` naar `ideas.ts`; mutaties blijven in één domeinbestand `src/actions/content.ts`. De migratie krijgt nummer 025 (022 = content-kalender, 023 gereserveerd voor feature 024, 024 = crud-categorieën).

## Implementation Phases

### Phase 1 — Migratie en types

1. `supabase/migrations/025_content_ideas.sql`:
   - `ALTER TABLE kk_content_posts DROP CONSTRAINT IF EXISTS kk_content_posts_datetime_required;`
   - `DROP POLICY IF EXISTS "Users can delete own content pillars" ON kk_content_pillars;` — archiveren blijft de enige weg (FR-019).
   - `CREATE INDEX IF NOT EXISTS idx_kk_content_posts_user_created ON kk_content_posts (user_id, created_at DESC);`
   - Idempotent; geen datawijziging, wel een striktere policy.
2. `src/types/database.types.ts`: `format`, `planned_date`, `planned_time`, `linkedin_url` en `scheduled_on_linkedin_at` voorzien van een `// legacy`-toelichting; `ContentSlot`/`ContentFormat` blijven bestaan voor de bestaande tabel/historie.
3. Migratie toepassen via Supabase MCP of SQL Editor; daarna controleren dat de constraint weg is, de DELETE-policy op `kk_content_pillars` weg is en RLS nog aanstaat.

### Phase 2 — Pure logica `src/lib/content/ideas.ts` + unit-tests

1. Nieuwe module met:
   - `MAX_BODY_LENGTH`, `HOOK_CHAR_LIMIT`;
   - `charCount`, `hookPreview`;
   - `statusLabel`;
   - `validateStatusChange({ body, status }, next)` — alleen de bestaande tekstregel voor Klaar/Gepland/Live;
   - `buildPostWritePayload(patch)` — whitelist die alleen `title`, `pillar_id`, `body`, `status`, `source_url` en `notes` doorlaat;
   - `countIdeasByPillar(posts, pillars)` — alle soorten incl. 0, gearchiveerd gemarkeerd, "Geen soort" alleen bij >0, totaal;
   - `formatIdeaDate(iso)` — NL-datum met vaste `Europe/Amsterdam`.
2. `tests/e2e/content-ideas-logic.spec.ts`:
   - tellingen: 0-soorten, gearchiveerde soorten, "Geen soort", totaal, volgorde;
   - statusregels: lege/te lange tekst bij Klaar/Gepland/Live; Gepland/Live zonder datum/tijd toegestaan;
   - `charCount`/`hookPreview` (bestaande gevallen behouden);
   - datumlabel met vaste tijdzone.
3. `calendar.ts` verwijderen zodra alle imports zijn vervangen.

### Phase 3 — Datalaag: queries, hooks, server actions

1. `src/lib/content/queries.ts`:
   - `contentKeys = { pillars, posts }`;
   - `fetchPillars(supabase, userId)` — `select('*')`, user-scoped, `order('position')`, `order('name')`, inclusief gearchiveerd;
   - `fetchPosts(supabase, userId)` — user-scoped, `created_at DESC` + `id`, paginering in batches van 1.000 via `.range()`;
   - verwijder `PillarWithSlots`, `fetchPillarsWithSlots`, `fetchMonthPosts`, `fetchIdeas`.
2. `src/hooks/useContent.ts`:
   - `usePillars`, `usePosts`;
   - `useCreatePillar`, `useUpdatePillar`, `useSetPillarArchived`;
   - `useCreatePost`, `useUpdatePost`, `useDeletePost` met cache-update (prepend/vervang/verwijder) + invalidatie van `posts`;
   - verwijder `useMonthPosts`, `useIdeas`, `useUpsertSlot`, `useDeleteSlot`, `useMovePost`.
3. `src/actions/content.ts`:
   - `createPillar`, `updatePillar`, `setPillarArchived` behouden;
   - `createPost`/`updatePost` versmallen: titel, soort, body, status, bron-URL, notities; server-side controle op bestaan/niet-gearchiveerd van de soort; `validateStatusChange` op de samengevoegde staat; schrijven via `buildPostWritePayload`, zodat legacy-kolommen nooit worden aangeraakt;
   - `deletePost` behouden;
   - `upsertSlot`, `deleteSlot`, `movePost` verwijderen.
4. `npx tsc --noEmit` als tussencontrole.

### Phase 4 — Ideeën-view: composer + lijst

1. `ContentView.tsx` herschrijven:
   - tablist "Ideeën"/"Overzicht" (default Ideeën), "Soorten"-knop;
   - `usePillars()` + `usePosts()`;
   - `pillarById` en `counts` via `useMemo`;
   - dialog-state voor editor en soortenbeheer;
   - `PillarsDialog` en `IdeaEditorDialog` renderen.
2. `IdeaComposer.tsx`:
   - titel (autofocus, verplicht), soort, idee-tekst; bron-URL/notities achter "Meer details";
   - Enter in titel + Ctrl/Cmd+Enter + knop; geen submit vanuit de tekstarea;
   - pending-blokkade, inline titelfout, leegmaken + focus + toast na succes, inhoud behouden bij fout.
3. `IdeaList.tsx`:
   - alle posts nieuwste eerst; kleurstip + soortnaam of "Geen soort"; statusbadge; aanmaakdatum; gearchiveerd gemarkeerd;
   - rij is toetsenbord-bedienbaar en opent de editor;
   - lege, laad- en foutstaat.
4. `data-testid`-haken toevoegen zoals in [contracts/ui-components.md](./contracts/ui-components.md).

### Phase 5 — Overzicht en soortenbeheer

1. `ContentOverview.tsx`:
   - rijen uit `counts.rows` (alle soorten, ook 0), "Geen soort" indien >0, totaalrij;
   - archiefmarkering; optionele relatieve balk met tekstueel aantal als primaire info;
   - lege staat met verwijzing naar soortenbeheer.
2. `PillarsDialog.tsx`:
   - titel "Contentsoorten"; alle weekdag-/tijd-/slotcode verwijderen;
   - nieuwe soort (naam + kleur), bestaande soort bewerken (naam, doelgroep, beschrijving, kleur), archiveren/heractiveren;
   - gearchiveerde soort gedimd + markering; geen verwijderknop.
3. `colors.ts` controleren op hergebruik in lijst/overzicht (geen wijziging verwacht).

### Phase 6 — Detail-editor

1. `IdeaEditorDialog.tsx` op basis van `PostEditorDialog.tsx`:
   - velden: titel, soort, status, idee-tekst, bron-URL, notities;
   - Format/Datum/Tijd/LinkedIn-URL verwijderen; ook de "URL ontbreekt"- en LinkedIn-meldingen verwijderen;
   - tekenteller, hook-preview en "Kopieer tekst" behouden;
   - statusvalidatie via `validateStatusChange` (body-regel; geen datum/tijd/URL);
   - Ctrl/Cmd+S, in-app sluitbevestiging, in-app verwijderbevestiging;
   - gearchiveerde huidige soort blijft kiesbaar; een andere gearchiveerde soort niet.
2. `PostEditorDialog.tsx` verwijderen.

### Phase 7 — Pagina, nav en opruimen

1. `src/app/(dashboard)/content/page.tsx`:
   - prefetch `contentKeys.pillars` + `contentKeys.posts` met `fetchPillars`/`fetchPosts`;
   - geen `monthGridRange`, `amsterdamTodayISO` of `initialYm` meer;
   - `<ContentView />` zonder props.
2. `AppShell.tsx`: nav-item "Content" blijft direct onder "Uren"; icoon van `CalendarDays` naar `Lightbulb`.
3. Verwijderen: `MonthGrid.tsx`, `DayCell.tsx`, `SlotPlaceholder.tsx`, `PostChip.tsx`, `IdeasPanel.tsx`, `calendar.ts`, de oude kalendertests.
4. `npx tsc --noEmit` + `npm run lint`; controleren dat geen dnd-kit/slot/calendar-imports in de content-map achterblijven.

### Phase 8 — E2E, regressie en documentatie

1. `tests/e2e/content-ideas.spec.ts` (login-skip-guards):
   - nav-item "Content" direct onder "Uren"; standaard tab "Ideeën"; tab "Overzicht" bereikbaar;
   - idee met alleen titel via Enter → zichtbaar in lijst; na `reload()` nog steeds zichtbaar (mutatie persistent);
   - geen Format/Datum/Tijd/LinkedIn-URL in composer en editor;
   - unieke soort aanmaken, 2 ideeën eraan toevoegen, 1 zonder soort; overzicht toont 2 voor die unieke soort en minstens 1 zonder soort; totaal is minstens 3; na toevoegen direct opgehoogd;
   - soort hernoemen → lijst en overzicht tonen de nieuwe naam;
   - soort archiveren → niet meer in de composer, wel met "(gearchiveerd)" en aantal in het overzicht;
   - status Gepland/Live zonder datum/tijd opslaan lukt;
   - mobiel 375 px: tabs, composer en lijst zonder horizontaal scrollen.
2. `tests/fixtures/legacy-content.sql` + deterministische preservatietest:
   - de fixture voegt idempotent één post toe met `planned_date`, `planned_time`, `format`, `linkedin_url`, `scheduled_on_linkedin_at` en status `gepland`;
   - de E2E-test controleert dat de unieke titel in de lijst staat, meetelt in het totaal en dat de vier verboden velden nergens zichtbaar zijn;
   - de fixture wordt aan het einde opgeruimd; apply/cleanup staat in `quickstart.md`.
3. `tests/e2e/content-ideas-logic.spec.ts` groen, inclusief `buildPostWritePayload`-tests die bewijzen dat legacy-keys nooit in een insert/update-payload belanden.
4. Volledige Playwright-suite draaien; bestaande tests mogen niet breken.
4. `@feature-tracker` → `FEATURES.md`; `@fitness-checker` → `scripts/fitness-check.sh`, Supabase MCP F-01 (RLS) en Snyk; `FITNESS.md` bijwerken.
5. Commit volgens conventie, bijvoorbeeld `feat(content): ideeënbank met twee views en overzicht per soort`.

## Risk Analysis

| Risico | Impact | Mitigatie |
|--------|--------|-----------|
| DB-constraint `kk_content_posts_datetime_required` blokkeert status Gepland/Live zonder datum/tijd | Opslaan mislukt ondanks groene UI | Migratie 025 dropt de constraint; serveractie validatie getest in unit + E2E |
| Supabase geeft standaard max. 1.000 rijen | Lijst en tellingen stilletjes onvolledig | `fetchPosts` pagineert in batches van 1.000 tot de laatste batch; unit-test op telmodel; E2E controleert relatieve aantallen |
| Hydration-mismatch door datumformattering (server UTC vs. browser Amsterdam) | Verkeerde datum of React-hydrationwaarschuwing | `formatIdeaDate` met vaste `timeZone: 'Europe/Amsterdam'`; pure unit-test |
| Bestaande data raakt zoek bij het verwijderen van kalenderqueries | In strijd met FR-023/SC-005 | Niet-destructieve migratie; `fetchPosts` leest alle rijen (geen datumfilter); deterministische fixture `tests/fixtures/legacy-content.sql` + E2E controleert lijst = totaal; `buildPostWritePayload`-unit-tests bewijzen dat legacy-kolommen nooit worden overschreven |
| Preservatietest slaagt zonder echte legacy-data (vacuous truth) | SC-005 lijkt groen maar is niet bewezen | Fixture met vaste legacy-rij verplicht vóór de preservatietest; test faalt als de fixture ontbreekt |
| Gearchiveerde soort alsnog gekozen in een open tab | Idee krijgt een niet-kiesbare soort | Server-side controle in `createPost`/`updatePost`; duidelijke NL-foutmelding |
| Dubbel idee door snel tweemaal Enter | Dubbele rijen | Submit blokkeren tijdens `isPending`; mutation-guard; formulier pas leeg na succes |
| React Query-keys raken uit sync met de SSR-prefetch | Lege lijst of verouderde tellingen | Eén gedeelde `contentKeys` in `queries.ts`, gebruikt door `page.tsx` en `useContent.ts`; cache-update + invalidatie |
| Oude kalendertests/imports blijven hangen | Rode suite of dode code | Kalendercomponenten, `calendar.ts` en tests in dezelfde fase verwijderen; `tsc`/ESLint als poort |
| Parallelle E2E-tests vervuilen elkaars tellingen | Flaky tests | Unieke soortsnamen met `Date.now()`, asserties per unieke soort, `data-testid`-haken, geen globale totaalverwachting |
| Verwijderen van een idee zonder bevestiging | Onbedoeld dataverlies | In-app bevestigingsdialoog (FR-027), bestaand patroon |

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

Geen violations. Geen complexity tracking nodig.

## Out of Scope

- Kalender, maandraster, weekslots, slepen en verlopen-markeringen.
- LinkedIn-publicatie, inplannen of URL-administratie.
- Herinneringen (n8n, Slack, mail), Command Center-widget, analytics.
- AI-schrijfhulp, bijlagen (feature 024), video-upload, terugkerende series.
- Meerdere gebruikers, andere LinkedIn-accounts of bedrijfspagina's.
- Realtime conflictdetectie; laatste schrijfactie wint.
- Destructief opschonen van legacy-kolommen, `kk_content_slots` of bestaande waarden.
