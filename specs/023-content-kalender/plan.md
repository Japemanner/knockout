# Implementation Plan: LinkedIn content-kalender

**Branch**: `023-content-kalender` | **Date**: 2026-10-14 | **Spec**: [spec.md](./spec.md) | **Reconcilie**: 2026-10-14

**Input**: Feature specification from `/specs/023-content-kalender/spec.md` (na vastgestelde clarifications) + codebase-conventies (uren-besluit, kanban-R3). Dit plan is verzoend met de parallel ontstane implementatie van de data-laag (migratie, actions, `calendar.ts`, `queries.ts`, types).

## Summary

LinkedIn content-kalender voor het persoonlijke profiel: contentsoorten ("pillars", `kk_content_pillars`) met vaste weekslots, een maandraster (maandag t/m zondag) dat posts én lege/gemiste sloten toont, een post-editor met statussen (Idee → Live) inclusief tekenteller, hook-preview en kopieerknop, en een ideeënbak met drag & drop. Knockout publiceert niets zelf. Drie nieuwe RLS-tabellen; lege slot-voorkomens zijn pure afleiding client-side (per ISO-week en per soort gekoppeld aan posts volgens FR-016, `matchSlots`). Dataflow volgens het uren-besluit: SSR-prefetch + browser-client reads, server actions uitsluitend voor mutaties, React Query invalidatie, geen `revalidatePath`. Bestandsnamen (`PostEditorDialog.tsx`, `PostChip.tsx`, `src/actions/content.ts` incl. `deletePost`, `src/lib/content/queries.ts`, `kk_content_posts`) zijn afgestemd op vervolgfeature 024 (bijlagen), die zonder rework op dit plan kan voortbouwen.

**Prerequisite**: geen — dit is de basale feature; 024 (bijlagen) bouwt hierop voort.

## Technical Context

**Language/Version**: TypeScript 5.6 (strict) + React 18 + Next.js 15 (App Router)

**Primary Dependencies**: @supabase/ssr (bestaand), @supabase/supabase-js v2 (bestaand), @tanstack/react-query v5 (bestaand), @dnd-kit/core (bestaand), date-fns v4 (bestaand), shadcn/ui + lucide-react (bestaand) — geen nieuwe packages

**Storage**: Supabase PostgreSQL — 3 nieuwe tabellen `kk_content_pillars`, `kk_content_slots`, `kk_content_posts` (RLS, user-scoped); géén Supabase Storage in deze feature (bijlagen zijn 024)

**Testing**: Playwright — unit-patroon voor pure functies (`tests/e2e/content-calendar-logic.spec.ts`, decimal-helper-conventie) + E2E met login-skip-guards

**Target Platform**: Web (Netlify, Node-runtime server actions), desktop-first; mobiele leesweergave onder 768 px (US5)

**Project Type**: Next.js App Router web application (server components + server actions + React Query)

**Performance Goals**: initiële load ≤4 parallelle reads (pillars + 3 maanden posts + ideeën); maandnavigatie binnen prefetch-venster 0 extra verzoeken (SC-004); slotberekening puur synchronisch (<10 ms per maand)

**Constraints**: dataflow conform besluit `2026-09-22-uren-reads-browser-client.md` (SSR-prefetch + HydrationBoundary, reads via browser-client, mutaties via server actions, géén revalidatePath); tijdzone-stabiel via het Intl-patroon uit `src/lib/hours/dates.ts` (Europe/Amsterdam); Netlify-regels: Node-runtime, geen `unstable_cache`; één Supabase-client per omgeving

**Scale/Scope**: 1 migratie, 1 nieuwe route, ~9 nieuwe componenten, pure logica + querylaag + 9 actions (data-laag gereed), 1 nav-wijziging, 3 testbestanden; persoonlijk profiel — typisch <500 posts, <20 pillars

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

*De constitutie in `.specify/memory/constitution.md` is nog een ongevulde template; conform de werkwijze van 022 gelden de non-negotiable rules uit AGENTS.md als gates.*

| Gate | Status | Note |
|------|--------|------|
| RLS on every table | PASS | 3 nieuwe tabellen, elk RLS + vier policies (`user_id = auth.uid()`, 007-patroon); F-01-check na feature via Supabase MCP |
| No secrets in client code | PASS | Alleen bestaande `NEXT_PUBLIC_*`-waarden; queries zonder 'use server' bevatten geen secrets (conform uren-besluit) |
| Edge Functions for privileged ops | N/A | Alle operaties user-owned onder ingelogde gebruiker; geen service-role |
| PKCE auth flow | PASS | Ongewijzigd; hergebruik bestaande client-setup |
| Netlify SPA redirects | N/A | Geen routing-wijzigingen buiten de nieuwe route |
| Storage bucket policies | N/A | Geen storage in deze feature (024 introduceert de bucket) |
| TypeScript strict mode | PASS | Nieuwe types volledig getypeerd; `UntypedClient` in queries.ts volgt het bestaande hours-patroon met eslint-annotatie |
| Eén Supabase-client | PASS | SSR-prefetch via server-client, client reads via bestaande browser-client, actions via `getAuthenticatedClient()` — geen tweede instantie |

Geen constitution violations. Geen complexity tracking nodig.

## Project Structure

### Documentation (this feature)

```text
specs/023-content-kalender/
├── plan.md              # Dit bestand
├── research.md          # Phase 0 output — beslissingen + alternatieven + reconciliatie
├── data-model.md        # Phase 1 output — tabellen, koppelregel, status-machine (verzoend)
├── contracts/
│   ├── server-actions.md  # Phase 1 output — acties (verzoend met implementatie)
│   └── ui-components.md   # Phase 1 output — component- en hook-contract
├── quickstart.md        # Phase 1 output — verificatie-instructies
├── checklists/
│   └── requirements.md  # Tijdens /speckit.specify aangemaakt
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── app/(dashboard)/content/
│   └── page.tsx                        # NOG TE BOUWEN — SSR-prefetch + HydrationBoundary
├── components/layout/
│   └── AppShell.tsx                    # TE WIJZIGEN — nav-item "Content" direct onder "Uren"
├── components/content/                  # NOG TE BOUWEN
│   ├── ContentCalendarClient.tsx       # toolbar, DndContext, dialog-state, invalidatie
│   ├── MonthGrid.tsx                   # maandraster via buildMonthGrid; dagen buiten maand gedimd
│   ├── DayCell.tsx                     # droppable dagcel: chips + slot-voorkomens + "+n"
│   ├── PostChip.tsx                    # kleurstreep, tijd, titel, statusbadge, verlopen, URL-ontbreekt
│   ├── EmptySlot.tsx                   # gestippeld slot; open klikbaar, gemist grijs
│   ├── IdeaBacklog.tsx                 # invoerveld + lijst posts zonder planned_date
│   ├── PostEditorDialog.tsx            # editor met statusregels, teller, hook-preview, kopieerknop
│   └── TypesSlotsDialog.tsx            # pillars beheren + 7 weekdagen met tijd en aan/uit
├── hooks/
│   ├── useContent.ts                   # NOG TE BOUWEN — React Query-hoeken
│   └── useCalendarDrag.ts              # NOG TE BOUWEN — DndContext-regels
├── lib/content/
│   ├── calendar.ts                     # GEREED — pure logica (raster, koppelregel, statusregels, labels)
│   └── queries.ts                      # GEREED — fetchPillarsWithSlots/fetchMonthPosts/fetchIdeas + contentKeys
├── actions/
│   └── content.ts                       # GEREED — createPillar … deletePost (9 actions)
└── types/
    └── database.types.ts               # GEWIJZIGD — content-types handmatig toegevoegd

supabase/migrations/
└── 022_content_calendar.sql            # GEREED — 3 tabellen, indexen, CHECKs, RLS + 12 policies, triggers

tests/e2e/
├── content-calendar-logic.spec.ts      # TE SCHRIJVEN — unit-patroon op calendar.ts
└── content-kalender.spec.ts            # TE SCHRIJVEN — E2E met login-skip-guards
```

**Structure Decision**: Single-project layout (bestaand). Nieuwe domeinmap `src/components/content/` naast de bestaande domeinmappen; pure logica in `src/lib/content/calendar.ts` (één module — de implementatie heeft de geplande splitsing slots.ts/text.ts samengevoegd); mutaties in één domeinbestand `src/actions/content.ts`; migratie 022 (huidige max was 021; 024 gebruikt al 023 voor bijlagen).

## Implementation Phases

### Phase 1 — Migratie `supabase/migrations/022_content_calendar.sql` (idempotent) — GEREED

Zie [data-model.md](./data-model.md). Toepassing via SQL Editor (kanban-R3) of Supabase MCP; daarna `npm run types:update` zodra de migratie op een lokale/remote database staat (de handmatig toegevoegde types in `database.types.ts` dienen als tussenoplossing).

### Phase 2 — Pure logica `src/lib/content/calendar.ts` — GEREED; unit-tests nog te schrijven

- Raster (`buildMonthGrid`), slot-voorkomens + koppelregel (`computeSlotOccurrences`/`matchSlots`, FR-016 + FR-005), statusregels (`validateStatusChange`/`isLowerStatus`, FR-023/FR-024), teller/hook-preview (`charCount`/`hookPreview`, FR-020/FR-021), verlopen/URL-ontbreekt (`isOverdue`), drup-tijdregel (`resolveDropTime`, FR-029), labels.
- **Open**: `tests/e2e/content-calendar-logic.spec.ts` — koppelregel (post op donderdag vult woensdagslot in dezelfde ISO-week; week over maandgrens; FR-005 aanmaakdatum; gemist vs. open; post zonder pillar vult geen slot), statusregels, hook-preview (3e regeleinden/210 tekens), verlopen, LinkedIn-prefix.

### Phase 3 — Querylaag + hoeken

- `src/lib/content/queries.ts` — GEREED (fetchPillarsWithSlots, fetchMonthPosts, fetchIdeas, contentKeys; uren-patroon).
- **Open**: `src/hooks/useContent.ts` (read-hoeken usePillarsWithSlots/useMonthPosts/useIdeas + mutatie-hoeken met invalidatie), `src/app/(dashboard)/content/page.tsx` (SSR-prefetch pillars + posts ±1 maand + ideeën), nav-item in `src/components/layout/AppShell.tsx` (FR-007).

### Phase 4 — Kalenderstructuur (US2-weergave)

1. `MonthGrid.tsx` — via `buildMonthGrid`; dagen buiten maand gedimd
2. `DayCell.tsx` — droppable; posts op `planned_time` gesorteerd (zonder tijd achteraan); >3 items → "+n" + dagdetail; gemiste voorkomens grijs
3. `PostChip.tsx` — kleurstreep (PillarColor → Tailwind), tijd via `displayTime`, titel ellipsis, statusbadge via `statusLabel`, verlopen via `isOverdue`, badge "URL ontbreekt"; Live niet draggable; klik → editor
4. `EmptySlot.tsx` — gestippeld kader in pillar-kleur; open klikbaar (nieuwe post, status Concept), gemist grijs
5. `ContentCalendarClient.tsx` — toolbar (◀/▶/Vandaag/Nieuwe post/Soorten & slots), layout grid + backlog, dialog-state, DndContext

### Phase 5 — Soorten & slots beheer (US1)

1. `TypesSlotsDialog.tsx` — pillar-lijst (naam, kleurstip, actieve slots, archief) + formulier (naam verplicht, kleur-swatches), per pillar 7 dagen met `active` + tijd → `upsertSlot`/`deleteSlot`, archiveren via `setPillarArchived` (FR-003)
2. Actions `createPillar`/`updatePillar`/`setPillarArchived`/`upsertSlot`/`deleteSlot` — GEREED (zie [contracts/server-actions.md](./contracts/server-actions.md))

### Phase 6 — Editor & post-mutaties (US3)

1. Actions `createPost`/`updatePost`/`deletePost` — GEREED (statusregels server-side, `scheduled_on_linkedin_at`-logica FR-024, LinkedIn-URL-check FR-025)
2. `PostEditorDialog.tsx` — velden, teller, hook-preview, "Kopieer tekst", statusselect met vóór-validatie, Ctrl/Cmd+S, sluit-/verwijderbevestiging in-app, LinkedIn-melding inline
3. Wisselwerking kalender: slotklik → nieuwe post vooringevuld; "Nieuwe post" → idee zonder datum; postklik → bewerken

### Phase 7 — Ideeënbak & drag & drop (US4)

1. `IdeaBacklog.tsx` — invoerveld (Enter → createPost idee), lijst zonder `planned_date` nieuwste bovenaan
2. Action `movePost(postId, date, time)` — GEREED (één action voor alle richtingen; weigeringen Live/Gepland; `resolveDropTime`; linkedinHint)
3. `useCalendarDrag.ts` — dagcel-drops → `movePost` (optimistisch, rollback + toast, FR-033), backlog-drop → `movePost(null)`, LinkedIn-melding (FR-031), Live niet draggable (FR-032)

### Phase 8 — Mobiel (US5)

- `ContentCalendarClient.tsx` breakpoint <768 px: daglijst per dag (alleen dagen met posts of slots) + ideeënbak eronder; geen drag (datumwijziging via de editor)

### Phase 9 — E2E-tests & after-feature checks

1. `tests/e2e/content-kalender.spec.ts` (login-skip-guards): nav-item positie; leeg slot zichtbaar + klik → editor vooringevuld; post vult slot (FR-016 data-correctheid: gerenderde chips tegen verwachte waarden); "+n" bij >3; ideeënbak Enter → idee; drag dag → dag (mutatie zichtbaar na herladen); weigering gepland → backlog; statusweigering >3.000 tekens; badge "URL ontbreekt"
2. Regressieregels AGENTS.md: mutaties UI-verifieerbaar, data-correctheid, skip-guards; bestaande suite groen
3. `tsc --noEmit` + `npx eslint src/ --max-warnings 0`; `@feature-tracker` → FEATURES.md; fitness-check (scripts + F-01 via Supabase MCP) → FITNESS.md

## Risk Analysis

| Risico | Impact | Mitigatie |
|--------|--------|-----------|
| Koppelregel FR-016 verkeerd (week-/maandgrenzen, meerdere slots) | Kalender toont gaten of dubbele vullingen | Pure functies in `calendar.ts` + unit-tests `content-calendar-logic.spec.ts` (fase 2); E2E data-correctheid in fase 9 |
| Tijdzone/weekberekening verschilt server vs. browser (UTC vs. Amsterdam) | Slots/posts verschuiven rond middernacht en bij maandgrenzen | `amsterdamDateOf`/Intl-patroon uit hours/dates.ts; `planned_date` als ISO-tekst; geen locale-`toISOString()` in de weergaveketen |
| Handmatig toegevoegde types raken uit sync met het echte schema | Type-fouten die pas bij runtime/na types:update zichtbaar worden | Zodra de migratie op een database staat: `npm run types:update` draaien en de handmatige types vervangen; F-01/post-check |
| Drag met statusweigeringen voelt onvoorspelbaar | Gebruiker "verliest" posts of snapt weigering niet | Weigeringen server-side + toast met uitleg; Live niet draggable; optimistische update rollback + toast (FR-033) |
| Migratie faalt halverwege (SQL Editor, handmatig) | Deel-schema live zonder RLS | Migratie idempotent (herhaald draaien is veilig); F-01-verificatie direct na toepassing |
| 3 posts-dag limiet "+n" bij veel posts | Dagcel onoverzichtelijk | "+n" opent dagdetail met alle items (FR-011); persoonlijk volume blijft klein |
| Editor sluiten met wijzigingen → dataverlies | Weggegooid werk | In-app sluitbevestiging (FR-027); Ctrl/Cmd+S |
| React Query key mismatch (prefetch vs. client-hooks) | Lege kalender ondanks data | `contentKeys` in queries.ts gedeeld door page.tsx en useContent.ts (les uit uren-besluit) |
| Gearchiveerde pillar met posts | Posts "kwijt" in de kalender | Posts blijven tonen met gedimde soortnaam (`pillar_id` blijft staan; SET NULL is vangnet bij handmatige verwijdering); archiveren wint alleen nieuwe slots af (FR-003) |

## Out of Scope

- Bijlagen (afbeeldingen/PDF) bij posts — vervolgfeature 024 (`specs/024-post-bijlagen/`), bouwt voort op PostEditorDialog/PostChip/content.ts/queries.ts uit dit plan
- Publiceren of inlezen via de LinkedIn-API (status "Gepland" zet ik zelf in LinkedIn; de API kan ingeplande posts niet uitlezen)
- Herinneringen (n8n, Slack, mail), Command Center-widget, AI-schrijfhulp, statistieken/analytics-import
- Andere LinkedIn-accounts of bedrijfspagina's; meerdere gebruikers per kalender
- Realtime sync (twee tabs: laatste schrijfactie wint, bestaande conventie; geen conflictdetectie)
- Terugkerende series en herhalingsopties bij posts