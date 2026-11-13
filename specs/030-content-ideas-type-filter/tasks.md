---
description: "Taaklijst voor feature 030 — content-ideeën filteren op soort"
---

# Tasks: Content-ideeën filteren op soort met zichtbare korte beschrijving

**Input**: Design documents from `/specs/030-content-ideas-type-filter/`

**Prerequisites**: `plan.md` (verplicht), `spec.md` (verplicht), `research.md`, `data-model.md`, `contracts/ui-components.md`, `quickstart.md`

**Tests**: De tests zijn opgenomen omdat `AGENTS.md` een Playwright-regressietest per feature verplicht. Ze worden na de implementatie van de betreffende user story geschreven en groen gemaakt; er is geen TDD-volgorde vereist.

**Organization**: Taken zijn gegroepeerd per user story, zodat elke story afzonderlijk implementeerbaar en testbaar is.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Kan parallel lopen (andere bestanden, geen afhankelijkheid van een nog niet afgeronde taak)
- **[Story]**: Bij welke user story de taak hoort (`US1`, `US2`, `US3`, `US4`)
- Exacte bestandspaden staan in elke taakbeschrijving

## Path Conventions

- Single-project Next.js-app: `src/` en `tests/` in de repository-root.
- Documentatie: `specs/030-content-ideas-type-filter/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Vaststellen dat de bestaande app en tests groen zijn voordat de feature begint.

- [x] T001 Controleer de baseline in de repository-root: voer `npx tsc --noEmit` en `npx eslint src/ --max-warnings 0` uit en bevestig dat de bestaande contenttests in `tests/e2e/content-ideas.spec.ts` en `tests/e2e/content-ideas-logic.spec.ts` groen zijn.
- [x] T002 [P] Bevestig dat er geen nieuwe dependencies, migratie of typescript-wijziging nodig is: vergelijk `package.json`, `src/types/database.types.ts` en `supabase/migrations/` met `specs/030-content-ideas-type-filter/plan.md`; er worden in deze fase geen bestanden gewijzigd.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: De pure filterlogica waar alle user stories op steunen.

**⚠️ CRITICAL**: Geen user story kan beginnen voordat deze fase klaar is.

- [x] T003 Voeg in `src/lib/content/ideas.ts` de filtermodellen en pure helpers toe: `IdeaFilter`, `ALL_IDEA_FILTER`, `IdeaFilterOption`, `buildIdeaFilterOptions`, `matchesIdeaFilter`, `filterIdeas`, `resolveIdeaFilter` en `ideaFilterLabel`; verwijder de pijplijnhelpers `isPipelineStatus`, `selectPipelinePosts`, `pipelineViewState` en `PipelineViewState`.
- [x] T004 Werk `tests/e2e/content-ideas-logic.spec.ts` bij: verwijder de pijplijnimports en -describes en voeg tests toe voor `buildIdeaFilterOptions`, `matchesIdeaFilter`, `filterIdeas`, `resolveIdeaFilter` en `ideaFilterLabel`, inclusief onbekende `pillar_id`, 0-soorten, gearchiveerde soorten, volgorde en het niet muteren van de invoerarray; laat de bestaande `countIdeasByPillar`-tests staan.

**Checkpoint**: De filterregels zijn als pure functies bewezen; de UI kan beginnen.

---

## Phase 3: User Story 1 — Alleen ideeën, direct filterbaar op soort (Priority: P1) 🎯 MVP

**Goal**: De pijplijn verdwijnt; "Ideeën" wordt één lijst met alle statussen en een single-select filter op contentsoort met tellingen en een gefilterde lege staat.

**Independent Test**: Open `/content`, controleer dat er geen "Pijplijn" of `data-testid="content-pipeline"` meer is, dat "Alle soorten" actief is en dat het kiezen van een soort precies de bijbehorende ideeën toont.

### Tests for User Story 1

- [x] T005 [P] [US1] Voeg in `tests/e2e/content-ideas.spec.ts` E2E-tests toe voor: geen pijplijn, filterbalk zichtbaar, "Alle soorten" standaard actief, alle statussen in de lijst, filteren op een soort, filteren op "Geen soort", tellingen per optie, `x van y` in de lijstkop, de gefilterde lege staat met "Toon alle ideeën", en het behouden van de filterkeuze bij wisselen naar "Overzicht" en terug; behoud de bestaande tests voor opslaan, bewerken, verwijderen, soortenbeheer, overzicht, mobiel en legacy.

### Implementation for User Story 1

- [x] T006 [P] [US1] Maak `src/components/content/IdeaFilterBar.tsx` met de ready-state filteropties: "Alle soorten", elke soort met kleurdot, archiefmarkering en aantal, en "Geen soort"; gebruik native buttons met `aria-pressed`, een zichtbare focusring en `flex flex-wrap`; voeg de testids `idea-filter`, `idea-filter-option` en `idea-filter-count` toe. De beschrijvingsstrook volgt in US2.
- [x] T007 [P] [US1] Pas `src/components/content/IdeaList.tsx` aan met de optionele props `totalCount`, `activeFilterLabel`, `onClearFilter` en `onRetry`; voeg `data-testid="idea-list-count"` toe, toon `x van y` bij een actief filter, voeg de gefilterde lege staat met "Toon alle ideeën" toe (`idea-list-empty-filtered`, `idea-list-clear-filter`), behoud de algemene lege staat (`idea-list-empty`) en voeg een retryknop toe aan de foutstaat (`idea-list-retry`).
- [x] T008 [US1] Pas `src/components/content/ContentView.tsx` aan: voeg `filter`-state met `ALL_IDEA_FILTER` toe, behoud `counts` en `pillarById`, voeg `knownPillarIds`, `effectiveFilter`, `visiblePosts`, `filterOptions`, `activePillar` en `activeFilterLabel` toe, render `IdeaFilterBar` tussen `IdeaComposer` en `IdeaList`, geef `IdeaList` de gefilterde posts en nieuwe props, en verwijder de `PipelineBlock`-import en -render.
- [x] T009 [US1] Verwijder `src/components/content/PipelineBlock.tsx`; controleer met een zoekactie dat er in `src/` geen verwijzingen naar `PipelineBlock`, `content-pipeline` of `pipeline-*` meer zijn.
- [x] T010 [P] [US1] Pas `src/app/(dashboard)/content/loading.tsx` aan: vervang de middelste skeleton door een compacte filterbalk-skeleton en behoud de composer- en lijstskeleton.

**Checkpoint**: User Story 1 is zelfstandig bruikbaar en testbaar; de pijplijn is volledig verdwenen.

---

## Phase 4: User Story 2 — De korte beschrijving van de gekozen soort meteen zien (Priority: P1)

**Goal**: Bij een gekozen soort verschijnt een alleen-lezen strook met naam, kleur, archiefmarkering en korte beschrijving; lange tekst is uitklapbaar.

**Independent Test**: Kies een soort met een beschrijving en controleer dat de tekst direct zichtbaar is; kies een soort zonder beschrijving en controleer de neutrale melding; kies "Alle soorten" en controleer dat de strook verdwijnt.

### Tests for User Story 2

- [x] T011 [P] [US2] Voeg in `tests/e2e/content-ideas.spec.ts` E2E-tests toe voor: beschrijvingsstrook met naam, kleur en tekst; "Geen korte beschrijving" bij een lege beschrijving; geen strook bij "Alle soorten" of "Geen soort"; archiefmarkering bij een gearchiveerde soort; uitklappen van een lange beschrijving; directe update na het wijzigen van de beschrijving in "Soorten".

### Implementation for User Story 2

- [x] T012 [US2] Breid `src/components/content/IdeaFilterBar.tsx` uit met de `PillarDescription`-strook: kleurdot, soortnaam, archiefmarkering, kop "Korte beschrijving", de tekst of "Geen korte beschrijving.", en bij een lange tekst `line-clamp-3` met een "Toon volledige beschrijving"/"Toon minder"-knop en `aria-expanded`; reset de uitklapstate bij een andere soort en voeg `idea-filter-description`, `idea-filter-description-text` en `idea-filter-description-toggle` toe.
- [x] T013 [US2] Werk `src/components/content/ContentView.tsx` bij zodat `activePillar` aan `IdeaFilterBar` wordt doorgegeven en de strook alleen bij een gekozen, bestaande soort verschijnt.

**Checkpoint**: User Stories 1 en 2 werken samen; de korte beschrijving is zonder extra klikken zichtbaar.

---

## Phase 5: User Story 3 — Filter, aantallen en lijst blijven kloppen (Priority: P2)

**Goal**: Na toevoegen, bewerken, van soort wisselen, verwijderen en soortwijzigingen kloppen de filteropties, aantallen, beschrijving en lijst direct; een verdwenen "Geen soort" valt terug op "Alle soorten".

**Independent Test**: Voeg een idee toe binnen en buiten de actieve filter, wissel van soort, verwijder het laatste idee van een soort en wijzig een soortnaam; controleer telkens de tellingen, de beschrijvingsstrook en de zichtbare lijst.

### Tests for User Story 3

- [x] T014 [US3] Voeg in `tests/e2e/content-ideas.spec.ts` E2E-tests toe voor actualiteit: een nieuw idee van de actieve soort verschijnt direct en de telling stijgt; een idee van een andere soort verschijnt niet; een soortwissel verplaatst het idee en werkt beide tellingen bij; verwijderen werkt de lijst en tellingen bij; hernoemen, van kleur wijzigen, archiveren en heractiveren werken direct door; het laatste losse idee een soort geven laat "Geen soort" verdwijnen en zet de filter terug op "Alle soorten"; een mislukte mutatie laat de filter, tellingen en lijst ongewijzigd en kan opnieuw worden geprobeerd.

### Implementation for User Story 3

- [x] T015 [US3] Voeg in `src/components/content/ContentView.tsx` een `useEffect` toe die de ruwe `filter`-state gelijkzet aan `effectiveFilter` wanneer `resolveIdeaFilter` terugvalt op `ALL_IDEA_FILTER` (verdwenen "Geen soort" of onbekende soort), zodat een later terugkerende optie niet onverwacht opnieuw actief wordt; laat de bestaande React Query-invalidaties in `src/hooks/useContent.ts` ongemoeid.

**Checkpoint**: De filter, tellingen, beschrijving en lijst blijven na elke mutatie consistent.

---

## Phase 6: User Story 4 — Bruikbaar bij veel soorten, weinig ruimte en een haperende verbinding (Priority: P3)

**Goal**: De filterbalk blijft bruikbaar bij veel soorten, op 375 px en met het toetsenbord; laad- en foutstaten zijn eerlijk en bieden een retry.

**Independent Test**: Test met 20 soorten op 375 px, navigeer met alleen het toetsenbord, en simuleer een posts- en een soorten-fout; controleer dat alle opties bereikbaar zijn en dat geen misleidende lege lijst verschijnt.

### Tests for User Story 4

- [x] T016 [P] [US4] Voeg in `tests/e2e/content-ideas.spec.ts` E2E-tests toe voor: 20 soorten en lange namen op 375 px zonder horizontaal scrollen van de pagina; toetsenbordselectie met Enter/Space en zichtbare focus; de posts-fout met `idea-list-error` en `idea-list-retry`; de soorten-fout met `idea-filter-error` en `idea-filter-retry` terwijl de lijst alle posts toont; de laadskeleton `idea-filter-loading`; geen filterbalk bij 0 soorten.

### Implementation for User Story 4

- [x] T017 [US4] Harden `src/components/content/IdeaFilterBar.tsx` voor veel soorten en lange namen: `flex flex-wrap`, `gap-1.5`, `min-w-0`, `truncate`, `title` en `break-words`, zodat de filterbalk wikkelt en de pagina niet horizontaal scrollt.
- [x] T018 [US4] Voeg in `src/components/content/IdeaFilterBar.tsx` de laadskeleton (`idea-filter-loading`) en de soorten-foutstaat (`idea-filter-error`, `idea-filter-retry`) toe; werk `src/components/content/ContentView.tsx` bij zodat de filterbalk verborgen is bij 0 soorten en bij een posts-fout, de skeleton toont tijdens initial load, en de foutstaat toont bij een soorten-fout terwijl `IdeaList` alle posts blijft tonen.

**Checkpoint**: Alle vier user stories zijn onafhankelijk getest en de filter is robuust op mobiel en bij fouten.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Kwaliteitscontrole, documentatie en oplevering.

- [x] T019 [P] Voer `npx tsc --noEmit` en `npx eslint src/ --max-warnings 0` uit en los eventuele fouten op in de gewijzigde bestanden.
- [x] T020 [P] Voer `npx playwright test tests/e2e/content-ideas-logic.spec.ts` en `npx playwright test tests/e2e/content-ideas.spec.ts` uit en los eventuele fouten op.
- [x] T021 Voer de volledige suite `npx playwright test` uit en los regressies op.
- [x] T022 Voer `bash scripts/fitness-check.sh` uit, doe de F-01 RLS-controle via Supabase MCP en de vereiste Snyk-controles; werk `FITNESS.md` bij. **Status**: fitness-check, F-01 (RLS true op beide contenttabellen) en `FITNESS.md` gereed; Snyk MCP was niet beschikbaar en is als gap vastgelegd.
- [x] T023 Werk `FEATURES.md` bij met de nieuwe filter- en beschrijvingsfunctionaliteit; controleer dat de SPECKIT-verwijzing in `AGENTS.md` naar `specs/030-content-ideas-type-filter/plan.md` wijst; bevestig met `git diff -- src/types/database.types.ts src/actions/content.ts src/lib/content/queries.ts supabase/` dat er geen datamodel-, actie- of migratiewijziging is.
- [ ] T024 Voer de handmatige quickstart in `specs/030-content-ideas-type-filter/quickstart.md` uit op desktop en 375 px; controleer de filter, beschrijvingsstrook, fallback, lege staten, toetsenbord en foutstaten, en controleer dat "Overzicht" en "Soorten" (hernoemen, archiveren, beschrijving wijzigen) ongewijzigd werken. **Open**: login-gated; uitvoeren met een geauthenticeerde sessie.
- [x] T025 Commit de feature met een conventioneel bericht, bijvoorbeeld `feat(content): ideeën filteren op soort met korte beschrijving`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Geen dependencies; kan direct starten.
- **Foundational (Phase 2)**: Depends op Setup; **blokkeert alle user stories**.
- **User Stories (Phase 3–6)**: Allemaal afhankelijk van Foundational.
  - US1 is de eerste deliverable en de MVP.
  - US2 bouwt voort op de filterbalk van US1.
  - US3 bouwt voort op de state van US1 en de strook van US2 voor de actualiteitstests.
  - US4 hardent de componenten van US1/US2.
- **Polish (Phase 7)**: Depends op alle gewenste user stories.

### User Story Dependencies

- **US1 (P1)**: Start na Foundational; geen dependency op andere stories.
- **US2 (P1)**: Start na US1 (de filterbalk moet bestaan); de strook is zelfstandig testbaar.
- **US3 (P2)**: Start na US1; gebruikt de bestaande React Query-invalidaties en de filterstate.
- **US4 (P3)**: Start na US1/US2; hardent de bestaande componenten.

### Within Each User Story

- Modellen/helpers vóór componenten.
- Componenten vóór de container die ze samenbrengt.
- Implementatie vóór de bijbehorende E2E-tests (regressietests conform AGENTS.md, geen TDD-volgorde).
- Elke story eindigt met een checkpoint waarop hij zelfstandig getest kan worden.

### Parallel Opportunities

- T001 en T002 kunnen naast elkaar.
- T003 en T004 zijn sequentieel (T004 test T003).
- Binnen US1: T006 en T007 kunnen parallel (verschillende bestanden); T010 kan parallel met T009 zodra T008 klaar is.
- Binnen US2: T011 kan parallel met T012 starten (testbestand vs. component), maar T013 hangt af van T012.
- Binnen US4: T016 kan parallel met T017 starten (testbestand vs. component), maar T018 hangt af van T017.
- Polish-taken T019 en T020 kunnen parallel; T021–T025 zijn sequentieel.

---

## Parallel Example: User Story 1

```text
# Na T003/T004 (foundational) kunnen deze twee componenten parallel:
Task: "T006 [P] [US1] Maak src/components/content/IdeaFilterBar.tsx"
Task: "T007 [P] [US1] Pas src/components/content/IdeaList.tsx aan"

# Daarna, afhankelijk van T008:
Task: "T009 [US1] Verwijder src/components/content/PipelineBlock.tsx"
Task: "T010 [P] [US1] Pas src/app/(dashboard)/content/loading.tsx aan"
```

---

## Implementation Strategy

### MVP First (User Story 1 + User Story 2)

De gebruiker vroeg expliciet om zowel de filter als de zichtbare korte beschrijving; beide zijn P1. De technische MVP is **US1** (één lijst + filter). De praktische MVP voor deze opdracht is **US1 + US2** (filter + beschrijvingsstrook).

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational.
3. Complete Phase 3: US1 — één lijst en filter.
4. **STOP en VALIDEER**: test US1 zelfstandig.
5. Complete Phase 4: US2 — beschrijvingsstrook.
6. **STOP en VALIDEER**: test US1 + US2 samen.

### Incremental Delivery

1. Setup + Foundational → basis staat.
2. US1 → één lijst met filter → deploy/demo.
3. US2 → korte beschrijving zichtbaar → deploy/demo.
4. US3 → actualiteit en fallback → deploy/demo.
5. US4 → schaal, mobiel en foutstaten → deploy/demo.
6. Polish → kwaliteitscontrole en commit.

### Parallel Team Strategy

Met meerdere ontwikkelaars:

1. Team doet Setup + Foundational samen.
2. Daarna:
   - Developer A: US1 (filterbalk + lijst + container).
   - Developer B: US2 (beschrijvingsstrook) na de basis van `IdeaFilterBar`.
   - Developer C: US4 (responsiveness en foutstaten) na US1/US2.
3. US3 (actualiteit) volgt zodra US1/US2 staan; de tests kunnen parallel met US4 worden voorbereid.

---

## Notes

- `[P]` betekent: verschillende bestanden en geen dependency op een nog niet afgeronde taak.
- De `[Story]`-labels houden de taken traceerbaar naar de specificatie.
- Er komen geen nieuwe dependencies, queries, serveracties, RLS-policies of migraties bij.
- De bestaande `useContent.ts`-invalidaties blijven de actualiteit garanderen; wijzig ze niet zonder bewijs dat ze tekortschieten.
- Verwijder de pijplijn niet half: component, helpers, tests en testids verdwijnen in dezelfde feature.
- Test na elke story op 375 px en met het toetsenbord.
- Commit na een logische groep taken; gebruik conventionele commit-berichten.
