---
description: "Takenlijst voor feature 028-content-ideas-pipeline"
---

# Tasks: Content-pijplijn met niet-live ideeën

**Input**: Design documents from `/specs/028-content-ideas-pipeline/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ui-components.md, quickstart.md

**Tests**: Opgenomen omdat `AGENTS.md` regressietests verplicht stelt voor wijzigingen aan paginadata en omdat de pijplijn een nieuwe, zichtbare afgeleide view is. De tests zijn geen TDD-opdracht; ze horen bij de acceptatie van elke user story.

**Organization**: Taken zijn gegroepeerd per user story. US1 (P1) is de MVP: het blok zelf. US2 (P2) borgt de directe actualiteit en US3 (P3) maakt het blok robuust bij veel/geen items, fouten en mobiel gebruik. US2 en US3 bouwen voort op hetzelfde component als US1 en worden daarom na US1 uitgevoerd.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Kan parallel draaien (ander bestand, geen afhankelijkheid van een nog niet afgeronde taak)
- **[Story]**: User story uit `spec.md` (US1, US2, US3)
- Exacte bestandspaden staan in elke taak

## Path Conventions

Single-project Next.js-app: `src/`, `tests/`, `specs/` in de repository-root.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Vaststellen dat de bestaande content-baseline groen is voordat er iets verandert.

- [X] T001 Controleer de bestaande content-baseline: voer `npx tsc --noEmit`, `npm run lint` en `npx playwright test tests/e2e/content-ideas-logic.spec.ts tests/e2e/content-ideas.spec.ts` uit en noteer eventuele bestaande fouten; de relevante bestanden zijn `tests/e2e/content-ideas.spec.ts` en `tests/e2e/content-ideas-logic.spec.ts`.

**Checkpoint**: De bestaande content-tests en typechecks zijn groen; eventuele bestaande fouten zijn bekend en niet door deze feature veroorzaakt.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: De pure selectieregel waar alle user stories op steunen.

**⚠️ CRITICAL**: Geen user story kan beginnen voordat deze fase klaar is.

- [X] T002 [P] Voeg in `tests/e2e/content-ideas-logic.spec.ts` tests toe voor `isPipelineStatus` en `selectPipelinePosts`: alle vijf statussen (alleen `live` valt af), de volgorde blijft behouden, een lege lijst geeft een lege pijplijn, en de invoerarray wordt niet gemuteerd.
- [X] T003 Implementeer `isPipelineStatus(status: ContentStatus)` en `selectPipelinePosts<T extends Pick<ContentPost, 'status'>>(posts: T[]): T[]` in `src/lib/content/ideas.ts`; filter op `status !== 'live'`, behoud de volgorde en muteer de invoerarray niet.
- [X] T004 Draai `npx playwright test tests/e2e/content-ideas-logic.spec.ts` en los fouten op in `src/lib/content/ideas.ts` en `tests/e2e/content-ideas-logic.spec.ts`.

**Checkpoint**: De selectieregel is als pure functie bewezen en wordt door UI en tests gedeeld.

---

## Phase 3: User Story 1 - In één oogopslag zien wat er nog in de pijplijn zit (Priority: P1) 🎯 MVP

**Goal**: Een blok "Pijplijn" tussen het invoerformulier en de volledige ideeënlijst, met alle niet-live ideeën, een count en klikbare rijen naar de bestaande editor.

**Independent Test**: Open `/content`, maak een titel-only idee aan en controleer dat het direct in het blok staat; zet een ander idee op Live en controleer dat het niet in het blok maar wel in de volledige lijst staat; klik op een pijplijnrij en controleer dat de editor opent.

### Tests for User Story 1

- [X] T005 [P] [US1] Voeg in `tests/e2e/content-ideas.spec.ts` een `content-pijplijn`-describe toe met de bestaande login-skip-guard: het blok is zichtbaar tussen composer en `idea-list`, de kop is "Pijplijn", de count klopt, alleen niet-live rijen staan in het blok, een nieuw titel-only idee verschijnt direct, en een klik op `pipeline-row` opent `idea-editor`; scope alle assertions op `content-pipeline` en `pipeline-row`.

### Implementation for User Story 1

- [X] T006 [US1] Maak `src/components/content/PipelineBlock.tsx` met een sectie, kop "Pijplijn", count, compacte rijen (titel, statusbadge, pillarkleur/soort of "Geen soort"), een native button per rij, een basis lege staat en de testids uit `specs/028-content-ideas-pipeline/contracts/ui-components.md`.
- [X] T007 [US1] Integreer in `src/components/content/ContentView.tsx`: bereken `pipelinePosts` met `useMemo(() => selectPipelinePosts(posts), [posts])`, render `PipelineBlock` tussen `IdeaComposer` en `IdeaList`, en geef `posts`, `hasAnyPosts`, `pillarById`, `onOpen`, `isLoading`, `isError` en `onRetry` mee; laat `IdeaList` en het overzicht ongewijzigd.
- [X] T008 [US1] Draai `npx playwright test tests/e2e/content-ideas.spec.ts` en los US1-fouten op in `src/components/content/PipelineBlock.tsx` en `src/components/content/ContentView.tsx`.

**Checkpoint**: US1 is volledig bruikbaar en onafhankelijk getest; dit is de MVP. Stop hier en valideer voordat je verdergaat.

---

## Phase 4: User Story 2 - De pijplijn blijft kloppen na wijzigingen (Priority: P2)

**Goal**: Statuswijzigingen, verwijderingen en het hernoemen/archiveren van soorten werken direct door in het blok, zonder paginavernieuwing, terwijl de volledige lijst alle ideeën blijft tonen.

**Independent Test**: Zet een idee achtereenvolgens op Concept, Live en Gepland en controleer telkens dat het blok en de count direct kloppen, dat het idee in de volledige lijst blijft staan en dat er geen `page.reload()` nodig is.

### Tests for User Story 2

- [X] T009 [P] [US2] Voeg in `tests/e2e/content-ideas.spec.ts` tests toe voor directe actualiteit: status Live verwijdert uit het blok maar laat het in `idea-list` staan; Live → Gepland voegt terug; verwijderen haalt uit beide; soort hernoemen, kleur wijzigen en archiveren werken direct door; en de count-delta's kloppen zonder `page.reload()`.

### Implementation for User Story 2

- [X] T010 [US2] Borg in `src/components/content/ContentView.tsx` en `src/components/content/PipelineBlock.tsx` dat het blok volledig door props wordt aangestuurd: geen lokale kopie van posts, count en rijen altijd uit `pipelinePosts`, zodat de bestaande React Query-cache-updates direct zichtbaar zijn.
- [X] T011 [US2] Draai `npx playwright test tests/e2e/content-ideas.spec.ts` en los US2-fouten op in `src/components/content/ContentView.tsx` en `src/components/content/PipelineBlock.tsx`.

**Checkpoint**: US1 en US2 werken beide onafhankelijk; de pijplijn blijft actueel na elke mutatie.

---

## Phase 5: User Story 3 - Het blok blijft bruikbaar bij veel of geen ideeën (Priority: P3)

**Goal**: Het blok heeft eerlijke laad-, fout- en leegstaten, een retry, interne scroll bij veel items en blijft bruikbaar op 375 px en met het toetsenbord.

**Independent Test**: Test met veel niet-live ideeën, een mislukte refetch, een lege pijplijn en een smal scherm; controleer dat het blok blijft werken, alle items bereikbaar zijn en een fout nooit als lege pijplijn wordt getoond.

### Tests for User Story 3

- [X] T012 [P] [US3] Voeg in `tests/e2e/content-ideas.spec.ts` tests toe voor laden, fout + retry, de lege staat (alle live / nog geen ideeën), 375 px zonder horizontaal scrollen, toetsenbordfocus en een lange titel; gebruik `page.route` voor een mislukte refetch en sla de lege-staat-assertie over als de testdataset dat niet deterministisch toelaat.

### Implementation for User Story 3

- [X] T013 [US3] Implementeer in `src/components/content/PipelineBlock.tsx` (met de pure `pipelineViewState`-helper) de staatvolgorde laden → fout zonder data → leeg → rijen, inclusief skeleton, "Kon de pijplijn niet laden." met retry, een foutbanner met bestaande rijen, en de twee lege-teksten uit `specs/028-content-ideas-pipeline/contracts/ui-components.md`.
- [X] T014 [US3] Implementeer in `src/components/content/PipelineBlock.tsx` interne scroll (`max-h-72`, mobiel `max-h-64`), `truncate`, responsieve wrapping, `section`/`aria-labelledby`, `ul`/`li`, focusring en `aria-live` op de count.
- [X] T015 [US3] Draai `npx playwright test tests/e2e/content-ideas.spec.ts` en los US3-fouten op in `src/components/content/PipelineBlock.tsx`.

**Checkpoint**: Alle drie user stories zijn onafhankelijk functioneel; het blok is robuust bij veel/geen items, fouten en mobiel gebruik.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Typechecks, volledige regressie, documentatie en kwaliteitspoorten.

- [X] T016 Draai `npx tsc --noEmit` en `npm run lint` en los fouten op in `src/components/content/PipelineBlock.tsx`, `src/components/content/ContentView.tsx`, `src/lib/content/ideas.ts`, `tests/e2e/content-ideas-logic.spec.ts` en `tests/e2e/content-ideas.spec.ts`.
- [X] T017 Draai `npx playwright test` en de handmatige stappen uit `specs/028-content-ideas-pipeline/quickstart.md`; los regressies op in de content-bestanden.
- [X] T018 [P] Werk `FEATURES.md` bij met het pijplijnblok via `@feature-tracker`.
- [X] T019 [P] Draai `scripts/fitness-check.sh`, Supabase MCP F-01/F-10 en Snyk F-16/F-17 via `@fitness-checker` en werk `FITNESS.md` bij.
- [X] T020 Commit de feature met `feat(content): pijplijnblok met niet-live ideeën`; voeg de inhoud van `specs/028-content-ideas-pipeline/` en de gewijzigde contentbestanden toe.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Geen afhankelijkheden; kan direct starten.
- **Foundational (Phase 2)**: Depends on Setup completion; blokkeert alle user stories.
- **User Story 1 (Phase 3)**: Depends on Foundational completion.
- **User Story 2 (Phase 4)**: Depends on US1 completion (het blok moet bestaan om actualiteit te testen).
- **User Story 3 (Phase 5)**: Depends on US1 completion; wordt na US2 uitgevoerd omdat US3 dezelfde component- en testbestanden raakt.
- **Polish (Phase 6)**: Depends on alle gewenste user stories.

### User Story Dependencies

- **US1 (P1)**: Onafhankelijk na Foundational; levert de MVP.
- **US2 (P2)**: Bouwt voort op US1; geen nieuwe query of actie, alleen borging en tests van directe actualiteit.
- **US3 (P3)**: Bouwt voort op US1; voegt staten, schaal en toegankelijkheid toe aan hetzelfde component.

### Within Each User Story

- Tests eerst schrijven (T005, T009, T012), daarna implementeren.
- Component vóór integratie (T006 vóór T007).
- Integratie vóór de story-testrun (T007 vóór T008).
- Elke story eindigt met een groene gerichte testrun voordat de volgende prioriteit start.

### Parallel Opportunities

- T002 kan parallel met andere voorbereiding, maar Foundational moet af zijn vóór US1.
- Binnen US1 kan T005 (testbestand) onafhankelijk worden voorbereid; T006-T008 volgen daarna sequentieel.
- Binnen US2 kan T009 (testbestand) onafhankelijk worden voorbereid; T010-T011 volgen daarna sequentieel.
- Binnen US3 kan T012 (testbestand) onafhankelijk worden voorbereid; T013-T015 volgen daarna sequentieel.
- T018 (`FEATURES.md`) en T019 (`FITNESS.md`) kunnen na T017 parallel.
- T006, T010, T013 en T014 raken allemaal `PipelineBlock.tsx`; voer ze in de aangegeven volgorde uit. T007 en T010 raken beide `ContentView.tsx`; ook sequentieel.

---

## Parallel Example: User Story 1

```bash
# T005 (testbestand) kan onafhankelijk worden voorbereid; daarna is de implementatie sequentieel:
# T005 tests → T006 PipelineBlock → T007 ContentView-integratie → T008 gerichte testrun.
Task: "T005 Voeg pijplijn-E2E-tests toe in tests/e2e/content-ideas.spec.ts"
```

## Parallel Example: User Story 2

```bash
# T009 (testbestand) kan onafhankelijk worden voorbereid; daarna:
# T009 tests → T010 props-borging → T011 gerichte testrun.
Task: "T009 Voeg Live/Gepland/verwijderen/soort-tests toe in tests/e2e/content-ideas.spec.ts"
```

## Parallel Example: User Story 3

```bash
# T012 (testbestand) kan onafhankelijk worden voorbereid; daarna:
# T012 tests → T013 staten → T014 scroll/toegankelijkheid → T015 gerichte testrun.
Task: "T012 Voeg laad-/fout-/leeg-/mobiel-/toetsenbordtests toe in tests/e2e/content-ideas.spec.ts"
```

## Parallel Example: Polish

```bash
# T018 en T019 raken verschillende documenten en kunnen na T017 samen.
Task: "T018 Werk FEATURES.md bij via @feature-tracker"
Task: "T019 Werk FITNESS.md bij via @fitness-checker"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Doorloop Phase 1: Setup.
2. Doorloop Phase 2: Foundational (verplicht).
3. Doorloop Phase 3: US1.
4. **STOP en VALIDEER**: test US1 onafhankelijk met `npx playwright test tests/e2e/content-ideas.spec.ts`.
5. Demo/deploy het blok als de MVP.

### Incremental Delivery

1. Setup + Foundational → basis staat.
2. US1 → pijplijnblok zichtbaar en klikbaar → valideer → demo (MVP).
3. US2 → directe actualiteit bewezen → valideer → demo.
4. US3 → robuuste staten, scroll en mobiel → valideer → demo.
5. Polish → typechecks, volledige suite, documentatie en commit.

### Parallel Team Strategy

Deze feature is klein en raakt één component; één developer is het efficiëntst. Alleen het voorbereiden van testbestanden en de documentatietaken (T018/T019) kunnen overlappen; de implementatietaken in dezelfde component of `ContentView` worden sequentieel uitgevoerd.

---

## Notes

- [P] taken = verschillende bestanden, geen afhankelijkheid.
- [Story] labels maken de herkomst per user story traceerbaar.
- Elke story is onafhankelijk testbaar; US2 en US3 bouwen wel op het component uit US1.
- Gebruik unieke titels met `Date.now()` in E2E en test relatieve aantallen, niet het globale totaal.
- Voor status Live is een niet-lege idee-tekst verplicht.
- De bestaande `idea-row`-tests moeten groen blijven; `pipeline-row` is een aparte testid.
- Geen migratie, geen nieuwe query en geen nieuwe serveractie in deze feature.
- Commit na elke logische groep; de laatste commit gebruikt `feat(content): pijplijnblok met niet-live ideeën`.

## Task Format Validation

- Alle 20 taken gebruiken `- [ ] Txxx` met optionele `[P]`/`[US?]` en een concrete beschrijving met bestandspad.
- Setup- en Polish-taken hebben geen story-label; US1-, US2- en US3-taken hebben het juiste label.
- [P] staat alleen bij taken met een ander bestand en zonder afhankelijkheid van een nog niet afgeronde taak.
- Elke taak noemt minstens één concreet bestandspad.




