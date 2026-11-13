# Implementation Plan: Content-ideeën filteren op soort met zichtbare korte beschrijving

**Branch**: `031-content-ideas-type-filter` | **Date**: 2026-11-13 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/030-content-ideas-type-filter/spec.md` + de bestaande content-implementatie uit feature 026/028 en de datalaag-afspraak uit `decisions/2026-09-22-uren-reads-browser-client.md`.

## Summary

De weergave "Ideeën" houdt één lijst met alle ideeën over. Het aparte blok **"Pijplijn"**, de pijplijnhelpers en de bijbehorende tests verdwijnen. Boven de lijst komt een single-select filter op contentsoort: **"Alle soorten"**, elke soort (ook gearchiveerd en met 0 ideeën) en **"Geen soort"** wanneer nodig, elk met een telling over alle statussen. Bij een gekozen soort verschijnt een alleen-lezen strook met de naam, kleur, archiefmarkering en **korte beschrijving**; een lange beschrijving kan worden uitgeklapt. De lijstkop toont het aantal zichtbare en het totale aantal ideeën. Een lege gefilterde lijst biedt een actie **"Toon alle ideeën"**.

De filter is een **afgeleide view**, geen nieuwe databron: `ContentView` gebruikt de bestaande `usePosts()`- en `usePillars()`-data, de bestaande `countIdeasByPillar()`-telling en nieuwe pure filterhelpers. Daardoor zijn er geen extra netwerkrequests, geen nieuwe serveracties, geen nieuwe dependencies en geen schemawijziging nodig. De bestaande React Query-cache-updates en invalidaties na het toevoegen, bewerken, verwijderen of wijzigen van een soort houden de filteropties, aantallen, beschrijving en lijst direct actueel.

## Technical Context

**Language/Version**: TypeScript 5.6 (strict, `noUncheckedIndexedAccess`) + React 18.3.1 + Next.js 15.5.19 (App Router)

**Primary Dependencies**: `@tanstack/react-query` 5.100.14, `@supabase/supabase-js` 2.110.2, `@supabase/ssr` 0.5, Tailwind CSS 3.4.19, shadcn/ui, `lucide-react` — **geen nieuwe packages**

**Storage**: Supabase PostgreSQL. Bestaande tabellen `kk_content_posts` (met `pillar_id`, `status`, `created_at`) en `kk_content_pillars` (met `name`, `description`, `color`, `archived`, `position`). **Geen nieuwe tabellen, kolommen, indexen, migratie of RLS-wijziging.**

**Testing**: Playwright 1.61. Pure functietests in `tests/e2e/content-ideas-logic.spec.ts`; E2E met login-skip-guard in `tests/e2e/content-ideas.spec.ts`; daarnaast `npx tsc --noEmit`, `npx eslint src/ --max-warnings 0` en de volledige Playwright-suite.

**Target Platform**: Web op Netlify via `@netlify/plugin-nextjs`; desktop en mobiel vanaf 375 px.

**Project Type**: Next.js App Router webapplicatie met server components, client components, server actions en TanStack Query.

**Performance Goals**:
- **0 extra netwerkrequests** voor filteren, tellen of de beschrijvingsstrook: alles komt uit de bestaande posts- en pillars-arrays.
- Filteren en tellen zijn **O(n)** met `useMemo`; bij 200 ideeën ruim binnen het interactiebudget.
- Een filterkeuze, statuswijziging, soortwijziging of beschrijvingswijziging is **binnen 1 seconde** zichtbaar zonder paginavernieuwing (SC-003/SC-005).
- De eerste render blijft direct vanuit de bestaande SSR-hydratie komen; geen extra waterfall.
- Het aantal posts en soorten wordt niet groter dan de bestaande dataset; geen nieuwe paginering of lazy loading nodig.

**Constraints**:
- Geen nieuwe npm-dependencies; `package.json` en `package-lock.json` blijven ongewijzigd.
- Geen nieuwe query, serveractie, RPC of migratie; geen `revalidatePath`.
- Eén Supabase-client per omgeving; RLS blijft de grens.
- TypeScript strict; geen nieuwe `any` zonder geannoteerde uitzondering.
- Bestaande statuswaarden, het detailvenster, de volgorde (nieuwste eerst), het soortenbeheer en het overzicht blijven ongewijzigd.
- De filter is single-select, wordt niet opgeslagen en verandert geen gegevens.
- Status is geen filter: alle statussen (Idee, Concept, Klaar, Gepland, Live) blijven zichtbaar en tellen mee.
- Gearchiveerde soorten en soorten met 0 ideeën blijven als filteroptie bestaan; een onbekende `pillar_id` telt als "Geen soort".
- De filterbalk wordt verborgen bij 0 soorten en bij een posts-fout; bij een soorten-fout toont hij een in-app melding met retry, terwijl de lijst alle ideeën blijft tonen.
- Geen browserdialoogvensters; alle meldingen verschijnen in de app.
- Bestaande Tailwind- en shadcn/ui-patronen; geen nieuwe visuele taal.

**Scale/Scope**: persoonlijke ideeënbank; doorgaans enkele honderden en maximaal enkele duizenden posts, tientallen contentsoorten. Eén nieuw presentational component, één gewijzigde lijst, één gewijzigde view, pure helpers in `ideas.ts`, bijgewerkte tests en een aangepaste laadskeleton. Geen datamodel-, actie- of routeringswijzigingen.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

De constitutie in `.specify/memory/constitution.md` is nog een ongevulde template. Conform de werkwijze van 022–029 gelden de non-negotiable regels uit `AGENTS.md` als gates.

| Gate | Status | Note |
|------|--------|------|
| RLS op elke tabel | PASS | Geen nieuwe tabel of kolom. `kk_content_posts` en `kk_content_pillars` behouden hun bestaande RLS en policies. Na de feature de F-01-controle via Supabase MCP uitvoeren. |
| Geen secrets in clientcode | PASS | Alleen de bestaande Supabase-anon-waarden; geen nieuwe secrets of service-role. |
| Edge Functions voor privileged ops | N/A | Geen privileged operatie; alle reads zijn user-scoped onder de ingelogde gebruiker. |
| PKCE auth flow | PASS | Auth-configuratie en bestaande client-setup blijven ongewijzigd. |
| Netlify SPA-redirects | N/A | Geen routingwijziging; de bestaande `/content`-route blijft. |
| Storage bucket policies | N/A | Geen Storage in deze feature. |
| TypeScript strict mode | PASS | Nieuwe code volledig getypeerd; bestaande geannoteerde `UntypedClient`-patronen blijven. |
| Eén Supabase-client per omgeving | PASS | Geen nieuwe client; de filter gebruikt de bestaande `usePosts()`- en `usePillars()`-data. |
| Geen nieuwe dependencies | PASS | Alleen bestaande React-, Tailwind-, TanStack Query- en shadcn/ui-API's. |
| Regressietest-regel AGENTS.md | PASS | Nieuwe pure tests voor filter, opties en fallback; bestaande E2E-tests voor opslaan, bewerken, verwijderen en soortenbeheer blijven groen; pipeline-tests worden vervangen door filtertests. |
| Geen gegevensverlies | PASS | Alleen weergave; geen verwijdering van posts, soorten of velden. |
| Bestaande onderdelen ongewijzigd | PASS | Overzicht, soortenbeheer, detailvenster en statusregels blijven functioneel gelijk. |

**Resultaat**: geen constitution-violations. Geen complexity tracking nodig.

## Project Structure

### Documentation (this feature)

```text
specs/030-content-ideas-type-filter/
├── plan.md                  # Dit bestand
├── spec.md                  # Feature-specificatie
├── research.md              # Phase 0 — beslissingen en alternatieven
├── data-model.md            # Phase 1 — bestaande entiteiten en afgeleide filtermodellen
├── contracts/
│   └── ui-components.md     # Phase 1 — component-, staat- en toegankelijkheidscontract
├── quickstart.md            # Phase 1 — handmatige en automatische verificatie
├── checklists/
│   └── requirements.md      # Tijdens /speckit.specify aangemaakt
└── tasks.md                 # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── app/(dashboard)/content/
│   ├── loading.tsx                  # TE WIJZIGEN — skeleton: composer, filter, lijst
│   └── page.tsx                     # ONGEWIJZIGD — bestaande SSR-prefetch pillars + posts
├── components/content/
│   ├── ContentView.tsx              # TE WIJZIGEN — filterstate, afgeleide lijst, pijplijn verwijderen
│   ├── IdeaFilterBar.tsx            # NIEUW — filteropties + beschrijvingsstrook
│   ├── IdeaList.tsx                 # TE WIJZIGEN — zichtbaar/totaal, retry, gefilterde lege staat
│   ├── PipelineBlock.tsx            # VERWIJDEREN — pijplijnblok vervalt
│   ├── IdeaComposer.tsx             # ONGEWIJZIGD
│   ├── IdeaEditorDialog.tsx         # ONGEWIJZIGD
│   ├── ContentOverview.tsx          # ONGEWIJZIGD
│   ├── PillarsDialog.tsx            # ONGEWIJZIGD — korte beschrijving blijft hier bewerkbaar
│   └── colors.ts                    # ONGEWIJZIGD — pillarkleuren en statusbadges hergebruiken
├── lib/content/
│   ├── ideas.ts                     # TE WIJZIGEN — filtertypen/helpers; pijplijnhelpers verwijderen
│   └── queries.ts                   # ONGEWIJZIGD — levert al alle posts en soorten
├── hooks/useContent.ts              # ONGEWIJZIGD — bestaande cache-updates en invalidaties
├── actions/content.ts               # ONGEWIJZIGD
└── types/database.types.ts          # ONGEWIJZIGD

tests/e2e/
├── content-ideas-logic.spec.ts      # TE WIJZIGEN — filterlogica; pijplijntests verwijderen
└── content-ideas.spec.ts            # TE WIJZIGEN — filter- en beschrijving-E2E; pijplijn-E2E verwijderen

AGENTS.md                            # TE WIJZIGEN — SPECKIT-planverwijzing naar dit plan
```

**Structure Decision**: bestaande single-project Next.js-layout. Het nieuwe presentational component hoort in de bestaande content-domeinmap `src/components/content/`; de pure filterlogica hoort in de bestaande `src/lib/content/ideas.ts`, naast `countIdeasByPillar`. Er komen geen nieuwe mappen, packages, queries of migraties.

## Implementation Phases

### Phase 1 — Pure filterlogica + unit-tests

1. Breid `src/lib/content/ideas.ts` uit met:
   - `export type IdeaFilter = { kind: 'all' } | { kind: 'none' } | { kind: 'pillar'; pillarId: string }`.
   - `export const ALL_IDEA_FILTER: IdeaFilter = { kind: 'all' }`.
   - `export interface IdeaFilterOption { filter: IdeaFilter; label: string; count: number; color: PillarColor | null; archived: boolean }`.
   - `buildIdeaFilterOptions(counts: IdeaCounts): IdeaFilterOption[]` — "Alle soorten" met `counts.total`, daarna alle rijen uit `counts.rows` in de bestaande volgorde (inclusief 0 en gearchiveerd), met "Geen soort" voor `pillarId === null`.
   - `matchesIdeaFilter(post, filter, knownPillarIds)` — `all` matcht alles; `none` matcht een lege of onbekende `pillar_id`; `pillar` matcht alleen de bekende `pillarId`.
   - `filterIdeas(posts, filter, knownPillarIds)` — filtert zonder de invoerarray te muteren en behoudt de bestaande volgorde.
   - `resolveIdeaFilter(filter, { knownPillarIds, hasUnassigned })` — geeft de invoer terug als die geldig is, anders `ALL_IDEA_FILTER`. Zo verdwijnt een niet-beschikbare "Geen soort" of onbekende soort automatisch.
   - `ideaFilterLabel(filter, pillarNameById)` — "Alle soorten", "Geen soort" of de soortnaam; onbekende soort valt terug op "Geen soort".
2. Breid `tests/e2e/content-ideas-logic.spec.ts` uit met tests voor:
   - `buildIdeaFilterOptions`: "Alle soorten" met totaal; alle soorten inclusief 0 en gearchiveerd; "Geen soort" alleen bij niet-toegewezen posts.
   - `matchesIdeaFilter`/`filterIdeas`: alle vijf statussen blijven zichtbaar; filter op soort; filter op "Geen soort"; onbekende `pillar_id` telt als "Geen soort"; volgorde blijft behouden; invoerarray wordt niet gemuteerd.
   - `resolveIdeaFilter`: geldige keuze blijft; verdwenen "Geen soort" valt terug op "Alle soorten"; onbekende soort valt terug op "Alle soorten".
   - `ideaFilterLabel`: alle drie de gevallen en de onbekende-soort-fallback.
   - Bestaande `countIdeasByPillar`-tests blijven ongewijzigd.
3. Geen wijziging aan `ContentStatus`, de database, de serveracties of de statusregels.

**Checkpoint**: De filterregels zijn als pure functies bewezen en kunnen door UI en tests worden gedeeld.

### Phase 2 — Filterbalk en beschrijvingsstrook

1. Maak `src/components/content/IdeaFilterBar.tsx`:
   - Sectie met een zichtbare kop "Filter op soort" en een `role="group"` met een toegankelijke naam.
   - Filteropties als native `button`-elementen met `aria-pressed`, een pillarkleur-stip, de naam (afgekapt met `title`), een archiefmarkering en het aantal. "Alle soorten" staat vooraan; "Geen soort" volgt via de bestaande `counts.rows`.
   - Actieve optie: duidelijke achtergrond/tekstcontrast plus `aria-pressed="true"`, niet uitsluitend kleur. Inactieve optie: bestaande outline/kaartstijl. Zichtbare focusring.
   - `flex flex-wrap` met `gap-1.5`, `min-w-0` en afgekapte namen, zodat veel soorten wikkelen en de pagina niet horizontaal scrollt.
   - Beschrijvingsstrook direct onder de filteropties, alleen bij een gekozen soort:
     - Kleurdot, soortnaam, archiefmarkering en een kop "Korte beschrijving".
     - De volledige beschrijving, of de neutrale tekst "Geen korte beschrijving."
     - Bij een lange beschrijving standaard `line-clamp-3` met een knop "Toon volledige beschrijving" / "Toon minder" en `aria-expanded`.
     - Alleen-lezen; bewerken blijft in "Soorten".
   - Laadstaat: skeleton met `data-testid="idea-filter-loading"` en geen definitieve aantallen.
   - Foutstaat (soorten niet geladen): in-app melding "Filteren is tijdelijk niet beschikbaar. De ideeënlijst toont alle ideeën." met "Opnieuw proberen"; geen filteropties en geen beschrijvingsstrook.
   - Data-testids: `idea-filter`, `idea-filter-option`, `idea-filter-count`, `idea-filter-description`, `idea-filter-description-text`, `idea-filter-description-toggle`, `idea-filter-loading`, `idea-filter-error`, `idea-filter-retry`.
2. Pas `src/components/content/IdeaList.tsx` aan:
   - Nieuwe optionele props `totalCount`, `onRetry`, `activeFilterLabel`, `onClearFilter`.
   - Lijstkop toont `posts.length` of `posts.length van totalCount` met `data-testid="idea-list-count"`.
   - Foutstaat: bestaande melding plus een "Opnieuw proberen"-knop met `data-testid="idea-list-retry"`.
   - Algemene lege staat blijft "Nog geen ideeën. Typ hierboven een titel en druk op Enter." met `data-testid="idea-list-empty"`.
   - Geen resultaten door een actief filter: "Geen ideeën voor {activeFilterLabel}." met een knop "Toon alle ideeën" (`data-testid="idea-list-clear-filter"`) en `data-testid="idea-list-empty-filtered"`. De algemene lege staat mag hier niet verschijnen.
3. Hergebruik `pillarColors` en de bestaande kaart-, badge- en focusstijlen; geen nieuwe visuele taal.

**Checkpoint**: De filterbalk en beschrijvingsstrook zijn los renderbaar en de lijst kan zowel de algemene als de gefilterde lege staat tonen.

### Phase 3 — `ContentView` koppelen en pijplijn verwijderen

1. In `src/components/content/ContentView.tsx`:
   - Voeg `const [filter, setFilter] = useState<IdeaFilter>(ALL_IDEA_FILTER)` toe.
   - Behoud `counts = countIdeasByPillar(posts, pillars)` en `pillarById`.
   - Voeg `knownPillarIds`, `effectiveFilter = resolveIdeaFilter(filter, { knownPillarIds, hasUnassigned: counts.unassigned > 0 })`, `visiblePosts = filterIdeas(posts, effectiveFilter, knownPillarIds)`, `filterOptions = buildIdeaFilterOptions(counts)` en `activePillar` toe.
   - Synchroniseer de state met een kleine `useEffect` wanneer `effectiveFilter` afwijkt van `filter` (verdwenen "Geen soort" of onbekende soort), zodat een later terugkerende optie niet onverwacht opnieuw actief wordt.
   - Bepaal `activeFilterLabel` als `null` bij "Alle soorten", anders met `ideaFilterLabel(effectiveFilter, pillarNameById)`.
   - Render `IdeaFilterBar` tussen `IdeaComposer` en `IdeaList`:
     - US1 wiret de ready-state: opties, actieve soort en de doorgegeven props.
     - De skeleton- en foutstaten van de filterbalk volgen in US4 (T018); US1 gaat uit van geladen data.
     - De lijst-retry (`onRetry`) wordt in US1 als prop voorbereid en in US4 getest.
   - Geef `IdeaList` de `visiblePosts`, `totalCount={posts.length}`, `activeFilterLabel`, `onClearFilter={() => setFilter(ALL_IDEA_FILTER)}` en `onRetry={() => { void postsQuery.refetch() }}`.
   - Verwijder de `PipelineBlock`-import en -render.
   - Laat `ContentOverview` de volledige `counts` houden; de filter beïnvloedt het overzicht niet.
2. Verwijder `src/components/content/PipelineBlock.tsx`.
3. Verwijder de pijplijnhelpers uit `src/lib/content/ideas.ts`.
4. Pas `src/app/(dashboard)/content/loading.tsx` aan: de middelste skeleton wordt een compacte filterbalk (bijv. `h-16`) in plaats van het pijplijnblok; de composer- en lijstskeleton blijven.
5. Controleer dat `useContent.ts` en `actions/content.ts` ongewijzigd blijven: de bestaande `setQueryData` + `invalidateQueries` na postmutaties en de bestaande pillars-invalidatie na soortwijzigingen zijn voldoende.

**Checkpoint**: De pagina toont één ideeënlijst met filter en beschrijvingsstrook; nergens staat nog "Pijplijn" of `data-testid="content-pipeline"`.

### Phase 4 — E2E, kwaliteitscontrole en documentatie

1. Werk `tests/e2e/content-ideas.spec.ts` bij:
   - Verwijder de `content-pijplijn`, `content-pijplijn actualiteit` en `content-pijplijn staten`-describes.
   - Voeg tests toe voor:
     - Geen pijplijn, filterbalk zichtbaar, "Alle soorten" actief, alle ideeën in de lijst.
     - Filteren op soort en op "Geen soort"; alleen de juiste rijen en tellingen.
     - Beschrijvingsstrook: naam, kleur, beschrijving, lege melding, verbergen bij "Alle soorten", lange tekst uitklappen, directe update na wijzigen in "Soorten".
     - Gearchiveerde soort blijft filterbaar met markering.
     - Gefilterde lege staat met "Toon alle ideeën".
     - Toevoegen, van soort wisselen en verwijderen werkt direct door in de tellingen en de gefilterde lijst.
     - "Geen soort" verdwijnt en de filter valt terug op "Alle soorten".
     - 375 px zonder horizontaal scrollen en toetsenbordbediening.
     - Foutstaat van posts (retry) en van soorten (filter tijdelijk niet beschikbaar, lijst blijft zichtbaar).
   - Behoud de bestaande tests voor opslaan, bewerken, verwijderen, soortenbeheer, overzicht, mobiel en legacy.
2. Implementeer in `src/components/content/IdeaFilterBar.tsx` en `src/components/content/ContentView.tsx` de laadskeleton en de soorten-foutstaat, inclusief de renderbeslissing voor 0 soorten en een posts-fout (US4/T018).
2. Werk `tests/e2e/content-ideas-logic.spec.ts` bij volgens Phase 1; verwijder de pijplijntests.
3. Voer uit:
   - `npx tsc --noEmit`
   - `npx eslint src/ --max-warnings 0`
   - `npx playwright test tests/e2e/content-ideas-logic.spec.ts`
   - `npx playwright test tests/e2e/content-ideas.spec.ts`
   - de volledige Playwright-suite
   - `bash scripts/fitness-check.sh`
4. Werk `FEATURES.md` en `FITNESS.md` bij volgens de bestaande agent-workflow; voer de F-01-controle via Supabase MCP uit (RLS ongewijzigd) en de vereiste Snyk-controles.
5. Werk de SPECKIT-verwijzing in `AGENTS.md` bij naar `specs/030-content-ideas-type-filter/plan.md`.

**Checkpoint**: Alle checks groen; geen pijplijnresten; de filter-, beschrijvings- en fallbackflows zijn end-to-end bewezen.

## Risks & Mitigations

| Risico | Mitigatie |
|--------|-----------|
| Een actieve "Geen soort" verdwijnt nadat het laatste losse idee een soort krijgt. | `resolveIdeaFilter` valt terug op "Alle soorten"; een `useEffect` zet ook de state terug, zodat de optie later niet onverwacht opnieuw actief wordt. |
| Een post verwijst naar een niet-bestaande `pillar_id`. | Zowel `countIdeasByPillar` als `matchesIdeaFilter` behandelen een onbekende id als "Geen soort"; dezelfde regel geldt in de lijst en de filter. |
| De beschrijving is verouderd na een wijziging in "Soorten". | `useUpdatePillar` invalideert `contentKeys.pillars` al; de strook leest de actuele `pillarById` en werkt zonder paginavernieuwing bij. |
| De tellingen of gefilterde lijst blijven achter na een postmutatie. | `useCreatePost`, `useUpdatePost` en `useDeletePost` werken de posts-cache bij en invalideren die al; geen nieuwe invalidatie nodig. |
| Veel soorten of lange namen veroorzaken horizontaal scrollen. | `flex flex-wrap`, `min-w-0`, `truncate` en `title`; op 375 px getest. |
| Een laad- of foutstaat toont ten onrechte een lege lijst. | Filter skeleton tijdens initial load; posts-fout toont de bestaande fout met retry; soorten-fout verbergt de filter en toont alle posts met een in-app melding. |
| Het verwijderen van de pijplijn laat tests of dode code achter. | `PipelineBlock.tsx`, de pijplijnhelpers en de pijplijn-describes worden in dezelfde feature verwijderd; `grep` op `pipeline`/`Pijplijn` is onderdeel van de controle. |
| Er sluipt een onbedoelde datamodelwijziging in. | Geen migratie, geen nieuwe kolommen, geen nieuwe query; `src/types/database.types.ts` blijft ongewijzigd. |

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

Geen violations. Geen complexity tracking nodig.

## Post-design Constitution Check

Na uitwerking van de componenten, contracten en teststrategie: **PASS**. De feature voegt geen tabel, kolom, index, query, serveractie, dependency of privileged operatie toe. RLS, secrets, PKCE, Netlify en Storage blijven ongewijzigd. De enige nieuwe code is presentational en pure afgeleide logica; de bestaande datalaag en acties blijven intact. Geen complexity tracking nodig.
