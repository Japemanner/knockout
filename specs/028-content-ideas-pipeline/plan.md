# Implementation Plan: Content-pijplijn met niet-live ideeën

**Branch**: `028-content-ideas-pipeline` | **Date**: 2026-11-03 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/028-content-ideas-pipeline/spec.md` + de bestaande content-implementatie uit feature 026 en de datalaag-afspraak uit `decisions/2026-09-22-uren-reads-browser-client.md`.

## Summary

De weergave "Ideeën" krijgt tussen het invoerformulier en de volledige ideeënlijst een apart blok **"Pijplijn"**. Het blok toont alle ideeën waarvan de status niet Live is (Idee, Concept, Klaar, Gepland), met in de kop het aantal en per rij de titel, status en contentsoort. Een klik op een rij opent het bestaande detailvenster. Live-ideeën blijven buiten het blok, maar blijven zichtbaar in de volledige lijst en tellen mee in het overzicht.

De pijplijn is een **afgeleide view**, geen nieuwe databron: `ContentView` filtert de al geladen `usePosts()`-data met een pure helper. Daardoor zijn er geen extra netwerkrequests, geen nieuwe serveracties en geen schemawijziging nodig. De bestaande React Query-cache-updates na toevoegen, bewerken en verwijderen zorgen dat het blok direct meeverandert. Het blok krijgt duidelijke laad-, fout- en lege staten, een interne scroll bij veel items en is volledig toetsenbordbedienbaar.

## Technical Context

**Language/Version**: TypeScript 5.6 (strict) + React 18.3 + Next.js 15.1 (App Router)

**Primary Dependencies**: `@tanstack/react-query` v5, `@supabase/ssr`, `@supabase/supabase-js` v2, Tailwind CSS v3, shadcn/ui-componenten, `lucide-react` — **geen nieuwe packages**

**Storage**: Supabase PostgreSQL. Bestaande tabellen `kk_content_posts` (met `status`) en `kk_content_pillars`. Geen nieuwe tabellen, kolommen, index of migratie; RLS blijft ongewijzigd.

**Testing**: Playwright. Pure functietests in `tests/e2e/content-ideas-logic.spec.ts`; E2E met login-skip-guard in `tests/e2e/content-ideas.spec.ts`.

**Target Platform**: Web (Netlify, Next.js), desktop + mobiel vanaf 375 px.

**Project Type**: Next.js App Router webapplicatie (server component + client component + React Query).

**Performance Goals**:
- 0 extra netwerkrequests voor het pijplijnblok: het filtert de bestaande posts-array.
- Filteren is O(n) client-side per render; bij 200 niet-live ideeën ruim binnen de interactiebudgetten.
- Eerste render direct vanuit de bestaande SSR-hydratie; geen extra waterfall.
- Een statuswijziging is binnen 1 seconde zichtbaar zonder paginavernieuwing (SC-003).
- Een nieuw idee staat binnen 1 seconde in het blok (SC-004).

**Constraints**:
- Geen nieuwe query, serveractie, RPC of migratie.
- Geen `revalidatePath`; de client werkt de bestaande React Query-cache bij.
- Eén Supabase-client per omgeving; RLS blijft de grens.
- TypeScript strict; geen nieuwe `any` zonder bestaande geannoteerde uitzondering.
- Bestaande statuswaarden, statusregels, volledige ideeënlijst en overzicht blijven ongewijzigd.
- Het blok verschijnt alleen in de weergave "Ideeën", niet in "Overzicht".
- Hergebruik de bestaande status- en pillarkleur-mappings; geen nieuwe visuele taal.

**Scale/Scope**: persoonlijke ideeënbank; doorgaans <500 en maximaal enkele duizenden posts, <20 contentsoorten. 1 nieuw presentational component, 2 pure helpers, 2 bestaande testbestanden uitbreiden, `ContentView.tsx` aanpassen. Geen datamodel- of actiewijzigingen.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

*De constitutie in `.specify/memory/constitution.md` is nog een ongevulde template; conform de werkwijze van 022–027 gelden de non-negotiable rules uit `AGENTS.md` als gates.*

| Gate | Status | Note |
|------|--------|------|
| RLS on every table | PASS | Geen nieuwe tabellen of kolommen. `kk_content_posts` en `kk_content_pillars` behouden hun bestaande RLS en policies. F-01-controle via Supabase MCP na de feature. |
| No secrets in client code | PASS | Alleen bestaande Supabase-anon-waarden; geen nieuwe secrets of service-role. |
| Edge Functions for privileged ops | N/A | Alle reads zijn user-scoped onder de ingelogde gebruiker; geen privileged operatie. |
| PKCE auth flow | PASS | Ongewijzigd; bestaande client-setup blijft. |
| Netlify SPA redirects | N/A | Geen routing-wijzigingen; de bestaande `/content`-route blijft. |
| Storage bucket policies | N/A | Geen Storage in deze feature. |
| TypeScript strict mode | PASS | Nieuwe code volledig getypeerd; bestaande `UntypedClient`-patronen blijven geannoteerd. |
| Eén Supabase-client | PASS | Geen nieuwe client; het blok gebruikt de bestaande `usePosts()`-data. |
| Regressietest-regel AGENTS.md | PASS | Nieuwe pure tests voor het filter en E2E voor de pijplijnflows; de bestaande suite moet groen blijven. |

**Resultaat**: geen constitution-violations. Geen complexity tracking nodig.

## Project Structure

### Documentation (this feature)

```text
specs/028-content-ideas-pipeline/
├── plan.md                  # Dit bestand
├── spec.md                  # Feature-specificatie
├── research.md              # Phase 0 — beslissingen + alternatieven
├── data-model.md            # Phase 1 — bestaande entiteiten, afgeleide pijplijn, geen migratie
├── contracts/
│   └── ui-components.md     # Phase 1 — component-, staat- en toegankelijkheidscontract
├── quickstart.md            # Phase 1 — handmatige + automatische verificatie
├── checklists/
│   └── requirements.md      # Tijdens /speckit.specify aangemaakt
└── tasks.md                 # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── app/(dashboard)/content/
│   └── page.tsx                     # ONGEWIJZIGD — bestaande SSR-prefetch pillars + posts
├── components/content/
│   ├── ContentView.tsx              # TE WIJZIGEN — pijplijn afleiden en tussen composer en lijst renderen
│   ├── PipelineBlock.tsx            # NIEUW — pijplijnblok met rijen, count en laad-/fout-/leegstaat
│   ├── IdeaComposer.tsx             # ONGEWIJZIGD
│   ├── IdeaList.tsx                 # ONGEWIJZIGD — blijft alle ideeën tonen, inclusief live
│   ├── IdeaEditorDialog.tsx         # ONGEWIJZIGD — bestaande editor wordt hergebruikt
│   ├── ContentOverview.tsx          # ONGEWIJZIGD
│   ├── PillarsDialog.tsx            # ONGEWIJZIGD
│   └── colors.ts                    # ONGEWIJZIGD — statusbadges en pillarkleuren worden hergebruikt
├── lib/content/
│   ├── ideas.ts                     # TE WIJZIGEN — pure pijplijnselectie toevoegen
│   └── queries.ts                   # ONGEWIJZIGD — fetchPosts levert al alle statussen
├── hooks/useContent.ts              # ONGEWIJZIGD — bestaande cache-updates blijven de actualiteit garanderen
├── actions/content.ts               # ONGEWIJZIGD
└── types/database.types.ts          # ONGEWIJZIGD

tests/e2e/
├── content-ideas-logic.spec.ts      # TE WIJZIGEN — tests voor isPipelineStatus/selectPipelinePosts
└── content-ideas.spec.ts            # TE WIJZIGEN — E2E voor blok, live-uitsluiting en directe updates
```

**Structure Decision**: bestaande single-project Next.js-layout. Het nieuwe component hoort in de bestaande content-domeinmap `src/components/content/`; de pure selectie hoort in de bestaande `src/lib/content/ideas.ts`, naast `countIdeasByPillar`. Er komen geen nieuwe mappen, packages, queries of migraties.

## Implementation Phases

### Phase 1 — Pure pijplijnselectie + unit-tests

1. Breid `src/lib/content/ideas.ts` uit met:
   - `isPipelineStatus(status: ContentStatus): boolean` — waar voor Idee, Concept, Klaar en Gepland; onwaar voor Live.
   - `selectPipelinePosts<T extends Pick<ContentPost, 'status'>>(posts: T[]): T[]` — filtert zonder de volgorde te wijzigen en zonder de invoerarray te muteren.
   - `pipelineViewState({ count, isLoading, isError })` — bepaalt de staatvolgorde loading → error-empty → empty → error-with-data → ready.
2. Breid `tests/e2e/content-ideas-logic.spec.ts` uit met tests voor:
   - alle vijf statussen: alleen `live` valt af;
   - de volgorde van de posts blijft behouden;
   - een lege lijst geeft een lege pijplijn;
   - de functie muteert de invoerarray niet;
   - de staatmatrix: laden, fout zonder data, leeg, fout met data en gereed.
3. Geen wijziging aan `ContentStatus`, de database of de statusregels.

**Checkpoint**: De selectieregel is als pure functie bewezen en kan door UI en tests worden gedeeld.

### Phase 2 — `PipelineBlock`-component

1. Maak `src/components/content/PipelineBlock.tsx`:
   - Sectie met toegankelijke kop "Pijplijn", een `ListChecks`-icoon en het aantal niet-live ideeën.
   - Compacte rijen met pillarkleur-stip, titel (afgekapt), statusbadge en contentsoort of "Geen soort"; gearchiveerde soorten krijgen een archiefmarkering.
   - Elke rij is een native `button` in een `li`, opent via klik/Enter/Space de bestaande editor en heeft een zichtbare focusring.
   - Geen datum in de rij: het blok is een compact overzicht; de volledige lijst toont de aanmaakdatum al.
2. Staten in deze volgorde:
   - **Laden** (`isLoading` en nog geen rijen, geen fout): skeleton/laadmelding "Pijplijn laden…".
   - **Fout zonder data**: foutmelding "Kon de pijplijn niet laden." met knop "Opnieuw proberen" die `onRetry` aanroept.
   - **Leeg**: titel "Niets in de pijplijn" met "Alle ideeën zijn live." als er wel posts zijn, of "Nog geen ideeën" met "Voeg hierboven een idee toe om je pijplijn te starten." als er nog geen posts zijn. Het blok en het aantal 0 blijven zichtbaar.
   - **Fout met bestaande data**: toon een compacte foutbanner met "Opnieuw proberen" boven de bestaande rijen; verberg de rijen niet.
   - **Gevuld**: alle niet-live rijen.
3. Lay-out:
   - Zelfde kaartstijl als `IdeaList` (`rounded-lg border bg-card`).
   - Interne scroll met een begrensde hoogte (`max-h-72`, op mobiel `max-h-64`) en `overflow-y-auto`; geen horizontaal scrollen.
   - Titel afkappen met `truncate`; de volledige titel blijft in de editor zichtbaar.
   - Status wordt altijd als tekst getoond (`statusLabel`), niet alleen via kleur.
4. Data-testids: `content-pipeline`, `pipeline-count`, `pipeline-row`, `pipeline-row-title`, `pipeline-row-status`, `pipeline-row-pillar`, `pipeline-loading`, `pipeline-error`, `pipeline-empty`, `pipeline-retry`.

**Checkpoint**: Het blok is zelfstandig presentational, hergebruikt de bestaande editor en heeft alle staten.

### Phase 3 — Integratie in `ContentView`

1. Importeer `selectPipelinePosts` en `PipelineBlock`.
2. Bereken in `ContentView`:
   - `pipelinePosts = useMemo(() => selectPipelinePosts(posts), [posts])`.
3. Render het blok binnen `content-panel-ideeen`, **na** `IdeaComposer` en **vóór** `IdeaList`:
   - `posts={pipelinePosts}`;
   - `hasAnyPosts={posts.length > 0}`;
   - `pillarById={pillarById}`;
   - `onOpen={(post) => setEditorPostId(post.id)}`;
   - `isLoading={postsQuery.isLoading}`;
   - `isError={postsQuery.isError}`;
   - `onRetry={() => { void postsQuery.refetch() }}`.
4. Laat `IdeaList` ongewijzigd: die blijft alle posts tonen, inclusief live, en houdt de bestaande testids en volgorde.
5. Laat de overzicht-tab ongewijzigd; het pijplijnblok wordt daar niet gerenderd.
6. Geen wijziging aan `usePosts`, de query-keys, de SSR-prefetch of de serveracties. De bestaande cache-updates (`setQueryData` + invalidatie) zorgen voor de directe bijwerking.

**Checkpoint**: Het blok staat op de juiste plek, live-ideeën blijven buiten het blok en de volledige lijst blijft intact.

### Phase 4 — E2E en regressie

1. Breid `tests/e2e/content-ideas.spec.ts` uit met een `content-pijplijn`-describe en de bestaande `openContent`-login-skip-guard:
   - Het blok is zichtbaar boven de ideeënlijst en onder de composer; de kop toont "Pijplijn".
   - Een nieuw titel-only idee verschijnt direct in het blok en verhoogt het aantal met 1; het staat ook in de volledige lijst.
   - Een idee met status Live verschijnt niet in het blok, maar blijft in de volledige lijst; het aantal daalt met 1.
   - Een live idee dat terug naar Gepland gaat, verschijnt weer in het blok en verhoogt het aantal.
   - Een klik op een pijplijnrij opent de bestaande editor; een verwijdering via de editor haalt het idee uit het blok en de lijst.
   - Een zeer lange titel wordt in de rij afgekapt en is volledig in de editor zichtbaar.
   - Op 375 px is er geen horizontaal scrollen en blijven de rijen leesbaar.
   - Een mislukte refetch toont de foutmelding met "Opnieuw proberen" en verbergt bestaande rijen niet (via `page.route` op de posts-request en een mutatie die een refetch uitlokt).
   - De lege staat wordt gecontroleerd wanneer er geen niet-live ideeën zijn; als de testdataset dat niet deterministisch toelaat, wordt dit scenario via de quickstart afgedekt en bewijst de pure selectietest dat een lege selectie mogelijk is.
2. Voeg aan `tests/e2e/content-ideas-logic.spec.ts` de selectietests uit Phase 1 toe.
3. Controleer dat bestaande tests ongewijzigd groen blijven: `idea-row` blijft de volledige lijst aanduiden, `pipeline-row` is een aparte testid.
4. Draai de volledige Playwright-suite; bestaande tests mogen niet breken.

**Checkpoint**: De pijplijnflows zijn end-to-end bewezen en de bestaande content-suite is niet geraakt.

### Phase 5 — Kwaliteitspoorten en documentatie

1. `npx tsc --noEmit`
2. `npm run lint`
3. `npx playwright test tests/e2e/content-ideas-logic.spec.ts`
4. `npx playwright test tests/e2e/content-ideas.spec.ts`
5. `npx playwright test` (volledige suite)
6. `@feature-tracker` → `FEATURES.md` bijwerken met het pijplijnblok.
7. `@fitness-checker` → `scripts/fitness-check.sh`, Supabase MCP F-01 (RLS) en F-10 (buckets), Snyk F-16/F-17; `FITNESS.md` bijwerken.
8. Commit volgens conventie, bijvoorbeeld `feat(content): pijplijnblok met niet-live ideeën`.

## Risk Analysis

| Risico | Impact | Mitigatie |
|--------|--------|-----------|
| Het blok dupliceert de volledige lijst en maakt de pagina visueel druk | Gebruiker raakt overzicht kwijt | Compacte rijen, duidelijke kop met aantal, interne scroll en geen datum in de rij; de volledige lijst blijft de primaire werkplek. |
| Live-ideeën lekken toch in het blok | Pijplijn is onbetrouwbaar | Eén pure `isPipelineStatus`/`selectPipelinePosts`-regel, getest voor alle vijf statussen; UI filtert niet zelf opnieuw. |
| Het blok blijft verouderd na een statuswijziging | Gebruiker vertrouwt de pijplijn niet | Bestaande `useUpdatePost`/`useCreatePost`/`useDeletePost` updaten de posts-cache direct en invalideren de query; E2E test Live → weg en terug → erin. |
| Een laadfout wordt als lege pijplijn getoond | Verkeerde conclusie over de pijplijn | Expliciete staatvolgorde: laden → fout → leeg → rijen; fout met bestaande data toont een banner en verbergt de rijen niet. |
| Het aantal wijkt af van de lijst | Wantrouwen in de telling | Het aantal is `pipelinePosts.length`, afgeleid van dezelfde array als de rijen; geen tweede count-query. |
| Interne scroll of lange titels veroorzaken horizontaal scrollen op mobiel | Slechte mobiele ervaring | `max-h-*` + `overflow-y-auto`, `truncate`, `min-w-0` en een 375 px-check in E2E. |
| Toetsenbordgebruik werkt niet | Toegankelijkheidsregressie | Native `button` per rij, `ul`/`li`, zichtbare focusring, Enter/Space via native gedrag. |
| Nieuwe testids botsen met bestaande `idea-row`-selectors | Bestaande tests breken of meten de verkeerde lijst | Aparte `pipeline-row`-testid; bestaande `idea-row` blijft uitsluitend de volledige lijst. |
| React Query toont bij een mislukte refetch zowel data als `isError` | Blok verbergt onterecht bestaande rijen | Staat `isError && posts.length > 0` apart afhandelen als foutbanner boven de bestaande rijen. |
| Hydration-mismatch door nieuwe datumweergave | React-waarschuwing of verkeerde datum | Het blok toont geen datum; bestaande datumweergave in `IdeaList` blijft ongewijzigd. |
| Onnodige complexiteit door een aparte query/componentlaag | Meer code, extra netwerkcall, extra invalidatie | De pijplijn is een afgeleide view op de bestaande posts; alleen één presentational component en één pure helper. |
| Bestaande data of RLS raakt beschadigd | Dataverlies of beveiligingsregressie | Geen schema-, actie- of policywijziging; alleen een client-side filter. |

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

Geen violations. Geen complexity tracking nodig.

## Post-Design Constitution Re-check

Na Phase 1-design opnieuw gecontroleerd:

| Gate | Status | Note |
|------|--------|------|
| RLS / data-toegang | PASS | Geen nieuwe data of policies; het blok leest dezelfde user-scoped posts. |
| Secrets / privileged ops | PASS | Geen secrets, geen service-role, geen Edge Function. |
| TypeScript strict | PASS | `selectPipelinePosts` is generiek getypeerd; `PipelineBlock` heeft expliciete props. |
| Eén Supabase-client | PASS | Geen nieuwe client; hergebruik van `usePosts`. |
| Regressietests | PASS | Pure selectietests + E2E voor de pijplijn; volledige suite blijft de poort. |
| Bestaande lijst/overzicht | PASS | `IdeaList`, `ContentOverview`, queries en acties blijven ongewijzigd. |

## Out of Scope

- Nieuwe statussen, statusovergangen of een publicatieproces.
- Een aparte editor, formulier of sleepfunctionaliteit in het pijplijnblok.
- Filters, zoeken, sorteren of groeperen binnen het blok.
- Notificaties, herinneringen of automatisch publiceren.
- Wijzigingen aan de volledige ideeënlijst, het overzicht of de contentsoorten.
- Nieuwe gegevensvelden, migraties of het opslaan van de pijplijn als apart gegeven.
- Een aparte route of tab voor de pijplijn.
