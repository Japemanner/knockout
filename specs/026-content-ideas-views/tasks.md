---
description: "Takenlijst voor feature 026-content-ideas-views"
---

# Tasks: Content-ideeën snel vastleggen en overzicht per soort

**Input**: Design documents from `/specs/026-content-ideas-views/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Opgenomen omdat AGENTS.md regressietests verplicht stelt voor wijzigingen aan Supabase-actions, paginadata en revalidatie. De tests zijn geen TDD-opdracht; ze horen bij de acceptatie van elke user story.

**Organization**: Taken zijn gegroepeerd per user story zodat elke story afzonderlijk implementeerbaar en testbaar is. US3 (soortenbeheer) staat vóór US2 (overzicht), omdat de soorten-dialog nodig is om de tellingen in US2 met eigen testdata te verifiëren. De prioriteit uit de spec (US2 P1, US3 P2) blijft inhoudelijk ongewijzigd.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Kan parallel draaien (ander bestand, geen afhankelijkheid van een nog niet afgeronde taak)
- **[Story]**: User story uit `spec.md` (US1, US2, US3, US4)
- Exacte bestandspaden staan in elke taak

## Path Conventions

Single-project Next.js-app: `src/`, `supabase/`, `tests/` in de repository-root.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: De niet-destructieve migratie en de type-documentatie klaarzetten.

- [x] T001 Maak `supabase/migrations/025_content_ideas.sql` met een idempotente `DROP CONSTRAINT IF EXISTS kk_content_posts_datetime_required` op `kk_content_posts`, `DROP POLICY IF EXISTS "Users can delete own content pillars" ON kk_content_pillars`, en `CREATE INDEX IF NOT EXISTS idx_kk_content_posts_user_created ON kk_content_posts (user_id, created_at DESC)`.
- [x] T002 Pas `supabase/migrations/025_content_ideas.sql` toe via Supabase MCP of de SQL Editor en verifieer dat de constraint weg is, de DELETE-policy op `kk_content_pillars` weg is, de index bestaat en RLS op `kk_content_pillars`, `kk_content_posts` en `kk_content_slots` nog aanstaat.
- [x] T003 Documenteer in `src/types/database.types.ts` dat `format`, `planned_date`, `planned_time`, `linkedin_url` en `scheduled_on_linkedin_at` legacy-kolommen zijn die de content-UI niet meer leest of schrijft; laat `ContentFormat` en `ContentSlot` bestaan voor de bestaande tabellen.

**Checkpoint**: De database accepteert statuswijzigingen zonder datum/tijd en de types zijn gedocumenteerd.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Pure logica, queries, hooks en server actions waar alle user stories op steunen.

**⚠️ CRITICAL**: Geen user story kan beginnen voordat deze fase klaar is.

- [x] T004 [P] Maak `src/lib/content/ideas.ts` met `MAX_BODY_LENGTH`, `HOOK_CHAR_LIMIT`, `charCount`, `hookPreview`, `statusLabel`, `validateStatusChange` (alleen de tekstregel voor Klaar/Gepland/Live), `buildPostWritePayload` (whitelist voor title/pillar_id/body/status/source_url/notes), `countIdeasByPillar` en `formatIdeaDate` volgens `data-model.md`.
- [x] T005 [P] Schrijf `tests/e2e/content-ideas-logic.spec.ts` met pure tests voor `countIdeasByPillar` (0-soorten, gearchiveerd, "Geen soort", totaal, volgorde), `validateStatusChange` (tekstregel; Gepland/Live zonder datum/tijd toegestaan), `buildPostWritePayload` (legacy-keys via een cast worden genegeerd), `charCount`, `hookPreview` en `formatIdeaDate`.
- [x] T006 [P] Herschrijf `src/lib/content/queries.ts` naar `contentKeys = { pillars, posts }`, `fetchPillars(supabase, userId)` (alle soorten, incl. gearchiveerd, op `position`/`name`) en `fetchPosts(supabase, userId)` (alle posts, `created_at DESC` + `id`, paginering in batches van 1.000 via `.range()`); verwijder `PillarWithSlots`, `fetchPillarsWithSlots`, `fetchMonthPosts` en `fetchIdeas`.
- [x] T007 [P] Herschrijf `src/hooks/useContent.ts` naar `usePillars`, `usePosts`, `useCreatePillar`, `useUpdatePillar`, `useSetPillarArchived`, `useCreatePost`, `useUpdatePost` en `useDeletePost`; werk de posts-cache direct bij (prepend/vervang/verwijder) en invalideer `contentKeys.posts`; verwijder alle slot- en verplaats-hooks.
- [x] T008 [P] Herschrijf `src/actions/content.ts`: behoud `createPillar`, `updatePillar`, `setPillarArchived` en `deletePost`; versmal `createPost`/`updatePost` tot titel, soort, body, status, bron-URL en notities; schrijf via `buildPostWritePayload`; voeg server-side controle toe dat een nieuw gekozen soort bestaat, van de gebruiker is en niet gearchiveerd is (een ongewijzigde gearchiveerde soort mag blijven); valideer de status met `validateStatusChange`; verwijder `upsertSlot`, `deleteSlot`, `movePost` en alle schrijfacties op legacy-kolommen.
- [x] T009 Herschrijf `src/app/(dashboard)/content/page.tsx` naar een SSR-prefetch van `contentKeys.pillars` en `contentKeys.posts` met `fetchPillars`/`fetchPosts`; verwijder `monthGridRange`, `amsterdamTodayISO` en de `initialYm`-prop.
- [x] T010 Voer `npx tsc --noEmit` uit en los alle typefouten op die door de nieuwe foundational code zijn ontstaan.

**Checkpoint**: De datalaag, pure logica en pagina-prefetch zijn gereed; user stories kunnen starten.

---

## Phase 3: User Story 1 - Ideeën snel vastleggen (Priority: P1) 🎯 MVP

**Goal**: Een compacte vastlegweergave met titel-only opslaan, een lijst van alle ideeën en een detail-editor zonder Format, Datum, Tijd en LinkedIn-URL.

**Independent Test**: Open `/content`, typ alleen een titel en druk op Enter; het idee staat direct in de lijst, overleeft een reload, het formulier is leeg en gefocust, en nergens verschijnen de vier verboden velden.

### Tests for User Story 1

- [x] T011 [P] [US1] Voeg in `tests/e2e/content-ideas.spec.ts` de US1-tests toe: standaard tab "Ideeën", titel-only opslaan via Enter, zichtbaar in de lijst, persistent na `reload()`, formulier leeg + focus terug, lege titel geblokkeerd, mislukte opslag + retry (netwerk aborteren via `page.route`), dubbel Enter geeft één idee, verwijderbevestiging, sluiten-met-wijzigingen-bevestiging, en geen Format/Datum/Tijd/LinkedIn-URL in composer of editor (met login-skip-guard).

### Implementation for User Story 1

- [x] T012 [P] [US1] Maak `src/components/content/IdeaComposer.tsx`: titel (autofocus, verplicht), contentsoort, idee-tekst; bron-URL en notities achter "Meer details"; Enter in titel en Ctrl/Cmd+Enter submit, geen submit vanuit de tekstarea; pending-blokkade, inline titelfout, leegmaken + focus + toast na succes, inhoud behouden bij fout.
- [x] T013 [P] [US1] Maak `src/components/content/IdeaList.tsx`: alle posts nieuwste eerst, kleurstip + soortnaam of "Geen soort", statusbadge, aanmaakdatum via `formatIdeaDate`, archiefmarkering, toetsenbord-bedienbare rij die de editor opent, en lege/laad-/foutstaat.
- [x] T014 [P] [US1] Maak `src/components/content/IdeaEditorDialog.tsx` op basis van `PostEditorDialog.tsx`: titel, soort, status, idee-tekst, bron-URL en notities; behoud tekenteller, hook-preview, "Kopieer tekst", Ctrl/Cmd+S, in-app sluit- en verwijderbevestiging; verwijder Format/Datum/Tijd/LinkedIn-URL en de bijbehorende meldingen.
- [x] T015 [US1] Herschrijf `src/components/content/ContentView.tsx` naar de shell met een toegankelijke tablist ("Ideeën" default, "Overzicht" voorlopig als leeg paneel), `usePillars()`/`usePosts()`, `pillarById`, editor-state en de composer/lijst/editor; voeg de `data-testid`-haken uit `contracts/ui-components.md` toe.
- [x] T016 [US1] Verwijder `src/components/content/PostEditorDialog.tsx` zodra `IdeaEditorDialog` alle gebruiken heeft overgenomen.
- [ ] T017 [US1] Draai `npx playwright test tests/e2e/content-ideas.spec.ts` (of de US1-scenario's handmatig via `quickstart.md` stap 2 en 4) en los fouten op.

**Checkpoint**: US1 is volledig bruikbaar en onafhankelijk getest; dit is de MVP.

---

## Phase 4: User Story 3 - Contentsoorten beheren zonder weekslots (Priority: P2)

**Goal**: Soorten aanmaken, bewerken (naam, doelgroep, beschrijving, kleur), archiveren en heractiveren — zonder weekdagen, tijden of slots.

**Independent Test**: Maak een soort aan, wijzig de kleur en naam, archiveer hem; de soort verdwijnt uit de composer en blijft in de lijst met de nieuwe naam en archiefmarkering zichtbaar. Er is nergens een weekdag- of tijdveld. De overzichtscontrole volgt in US2.

### Tests for User Story 3

- [x] T018 [P] [US3] Voeg in `tests/e2e/content-ideas.spec.ts` de US3-tests toe: soort aanmaken, kleur/naam wijzigen, archiveren, niet meer kiesbaar in de composer, wel zichtbaar met "(gearchiveerd)" in de lijst, heractiveren; controleer dat geen weekdag-/tijdvelden bestaan. De overzichtscontrole hoort bij T023 (US2).

### Implementation for User Story 3

- [x] T019 [P] [US3] Herschrijf `src/components/content/PillarsDialog.tsx`: props `ContentPillar[]`, titel "Contentsoorten", nieuwe soort (naam + kleur), bestaande soort bewerken (naam, doelgroep, beschrijving, kleurkeuze), archiveren/heractiveren; verwijder alle `ContentSlot`-, weekdag-, tijd- en `upsertSlot`/`deleteSlot`-code.
- [x] T020 [US3] Werk `src/components/content/ContentView.tsx` bij: "Soorten"-knop en `PillarsDialog` wiring; geef de composer alleen niet-gearchiveerde soorten en de editor de actieve soorten plus de huidige (mogelijk gearchiveerde) soort.
- [x] T021 [US3] Controleer en test in `src/actions/content.ts` dat `createPost` en een gewijzigde `pillar_id` in `updatePost` een gearchiveerde of onbekende soort weigeren, terwijl een bestaande gearchiveerde soort bij een ongewijzigde post mag blijven.
- [ ] T022 [US3] Draai `npx playwright test tests/e2e/content-ideas.spec.ts` (of `quickstart.md` stap 5) en los fouten op.

**Checkpoint**: Soortenbeheer is volledig, zonder restanten van de kalender.

---

## Phase 5: User Story 2 - Overzicht van ideeën per contentsoort (Priority: P1)

**Goal**: Een tweede view met het aantal ideeën per contentsoort, inclusief 0-soorten, archiefmarkering, "Geen soort" en een totaal.

**Independent Test**: Maak met de soorten-dialog twee unieke soorten met verschillende aantallen en één idee zonder soort; het overzicht toont per soort het juiste aantal, een 0-soort blijft zichtbaar en het totaal klopt.

### Tests for User Story 2

- [x] T023 [P] [US2] Voeg in `tests/e2e/content-ideas.spec.ts` de US2-tests toe: aantallen per unieke soort, 0-soort zichtbaar, "Geen soort" bij een idee zonder soort, totaal, directe update na toevoegen, een gearchiveerde soort met archiefmarkering en het juiste aantal, en een 375px-viewport zonder horizontaal scrollen — met assertions per `data-testid`/`data-pillar-id`.

### Implementation for User Story 2

- [x] T024 [P] [US2] Maak `src/components/content/ContentOverview.tsx`: rijen uit `counts.rows` (alle soorten, ook 0), "Geen soort" alleen bij `unassigned > 0`, totaalrij, archiefmarkering, optionele relatieve balk met het aantal als primaire tekst, lege staat met verwijzing naar soortenbeheer, en de `data-testid`-haken.
- [x] T025 [US2] Werk `src/components/content/ContentView.tsx` bij: bereken `counts` met `useMemo(() => countIdeasByPillar(posts, pillars))` en render `ContentOverview` in het "Overzicht"-tabpaneel.
- [ ] T026 [US2] Draai `npx playwright test tests/e2e/content-ideas.spec.ts` (of `quickstart.md` stap 5) en los fouten op.

**Checkpoint**: US1, US3 en US2 werken samen; het overzicht is direct na mutaties actueel.

---

## Phase 6: User Story 4 - Bestaande content blijft bereikbaar (Priority: P2)

**Goal**: Alle bestaande posts, inclusief die met datum, tijd, format, LinkedIn-URL of status Gepland/Live, verschijnen als idee en tellen mee; oude waarden blijven bewaard maar zijn niet meer zichtbaar.

**Independent Test**: Vergelijk de lijst met alle bestaande items en het totaal in het overzicht; geen enkel item ontbreekt en nergens verschijnen de vier verboden velden.

### Tests for User Story 4

- [x] T027 [P] [US4] Maak `tests/fixtures/legacy-content.sql` met een idempotente insert van één post met een vaste titel, `planned_date`, `planned_time`, `format`, `linkedin_url`, `scheduled_on_linkedin_at` en status `gepland`, plus cleanup-regels; voeg in `tests/e2e/content-ideas.spec.ts` een preservatietest toe die na het toepassen van de fixture de titel in de lijst en het totaal vindt, de vier verboden velden niet ziet, en faalt als de fixture ontbreekt.

### Implementation for User Story 4

- [x] T028 [US4] Controleer en harden (verificatie van T006) `src/lib/content/queries.ts`/`src/hooks/useContent.ts`: `fetchPosts` heeft geen datumfilter, haalt alle pagina's op en sorteert stabiel op `created_at DESC` + `id`.
- [x] T029 [US4] Controleer en harden (verificatie van T008) `src/actions/content.ts`: `createPost`/`updatePost` gebruiken `buildPostWritePayload` en schrijven nooit naar `format`, `planned_date`, `planned_time`, `linkedin_url` of `scheduled_on_linkedin_at`, ook niet bij een gedeeltelijke patch; voeg een regressietest toe als die nog ontbreekt.
- [ ] T030 [US4] Voer `quickstart.md` stap 6 uit met de fixture en de bestaande data en noteer het resultaat in de commit message of het verificatieblok van `quickstart.md` (lijst = totaal, geen verboden velden, bestaande waarden niet gewijzigd).

**Checkpoint**: Alle vier user stories zijn functioneel en bestaande data is aantoonbaar behouden.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Kalenderresten verwijderen, kwaliteit borgen en de feature afronden.

- [x] T031 Verwijder `src/components/content/MonthGrid.tsx`, `src/components/content/DayCell.tsx`, `src/components/content/SlotPlaceholder.tsx`, `src/components/content/PostChip.tsx` en `src/components/content/IdeasPanel.tsx`.
- [x] T032 Verwijder `src/lib/content/calendar.ts`.
- [x] T033 Verwijder `tests/e2e/content-calendar.spec.ts` en `tests/e2e/content-calendar-logic.spec.ts`.
- [x] T034 Werk `src/components/layout/AppShell.tsx` bij: het nav-item "Content" blijft direct onder "Uren"; vervang het kalendericoon door een lichtbol-/idee-icoon (FR-002/FR-003: geen kalenderassociatie meer).
- [x] T035 [P] Draai `npx tsc --noEmit` en `npm run lint`; los alle fouten en warnings op (ESLint met `--max-warnings 0`).
- [ ] T036 [P] Draai de volledige Playwright-suite `npx playwright test`; los regressies op en bevestig dat de login-gated tests netjes skippen.
- [x] T037 Werk `FEATURES.md` bij via de feature-tracker met de nieuwe content-ideeënfeature, verwijderde kalender en migratie 025.
- [x] T038 Draai de fitness-check (`scripts/fitness-check.sh`, Supabase MCP F-01 voor RLS, Snyk SAST/SCA) en werk `FITNESS.md` bij.
- [x] T039 [P] Doe een laatste grep-controle: geen `calendar`, `planned_date`, `planned_time`, `linkedin_url`, `post.format`, `ContentFormat`, `movePost`, `upsertSlot` of `@dnd-kit`-imports meer in `src/components/content/`, `src/lib/content/` en `src/actions/content.ts`, behalve de gedocumenteerde legacy-types; sluit `formatIdeaDate` uit van de `format`-check.
- [ ] T040 Voer de handmatige `quickstart.md`-checklist uit op desktop en 375 px en bevestig alle FR/SC-punten.
- [x] T041 Commit met een conventionele message, bijvoorbeeld `feat(content): ideeënbank met twee views en overzicht per soort`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Geen dependencies; start direct.
- **Foundational (Phase 2)**: Depends op Setup; blokkeert alle user stories.
- **User Stories (Phase 3 t/m 6)**: Start na Foundational.
  - US1 is de MVP en gaat voor.
  - US3 volgt na US1, omdat de soorten-dialog de testdata voor US2 levert.
  - US2 volgt na US3 en de tab-shell uit US1.
  - US4 is deels verificatie en kan na US1/US2 starten.
- **Polish (Phase 7)**: Depends op alle gewenste user stories.

### User Story Dependencies

- **US1 (P1)**: Na Foundational; geen dependency op andere stories. Levert de MVP.
- **US3 (P2)**: Na Foundational + US1 (voor de tab-shell en de composer); levert de soorten-dialog. US3 is onafhankelijk van US2; de overzichtscontrole is naar T023 verplaatst.
- **US2 (P1)**: Na Foundational + US1 + US3; gebruikt dezelfde posts-data en de soorten-dialog voor testdata.
- **US4 (P2)**: Na Foundational + US1/US2 (voor lijst en overzicht); is vooral preservatie en hardening. T027 vereist dat `tests/fixtures/legacy-content.sql` is toegepast; T030 documenteert de apply/cleanup.

### Within Each User Story

- Tests eerst schrijven (mogen falen tot de implementatie klaar is).
- Componenten bouwen vóór de wiring in `ContentView.tsx`.
- Per story afronden met de bijbehorende Playwright-scenario's.
- Story pas afvinken als de onafhankelijke test slaagt.

### Parallel Opportunities

- **Setup**: T001 kan direct; T002 volgt op T001; T003 is onafhankelijk.
- **Foundational**: T004, T006, T007 en T008 raken verschillende bestanden en kunnen parallel; T005 kan na T004 parallel met T006–T009; T009 volgt op T006; T010 is de checkpoint.
- **US1**: T012, T013 en T014 raken verschillende componenten en kunnen parallel; T011 (test) kan parallel worden geschreven; T015 volgt daarna.
- **US3**: T019 kan parallel met US1-componenten; T018 (test) parallel; T020 volgt op T015/T019.
- **US2**: T024 kan parallel met US3-componenten; T023 (test) parallel; T025 volgt op T015/T024.
- **US4**: T027, T028 en T029 raken verschillende bestanden en kunnen parallel.
- **Polish**: T035 en T036 kunnen parallel na T031–T034; T039 kan parallel met T037/T038.

---

## Parallel Example: User Story 1

```text
# Tests en componenten tegelijk starten (verschillende bestanden):
Task: "T011 [US1] US1 E2E-tests in tests/e2e/content-ideas.spec.ts"
Task: "T012 [US1] IdeaComposer in src/components/content/IdeaComposer.tsx"
Task: "T013 [US1] IdeaList in src/components/content/IdeaList.tsx"
Task: "T014 [US1] IdeaEditorDialog in src/components/content/IdeaEditorDialog.tsx"
```

```text
# Daarna de shell en de oude editor opruimen:
Task: "T015 [US1] ContentView herschrijven"
Task: "T016 [US1] PostEditorDialog verwijderen"
```

---

## Parallel Example: Foundational

```text
Task: "T004 [P] src/lib/content/ideas.ts"
Task: "T006 [P] src/lib/content/queries.ts"
Task: "T007 [P] src/hooks/useContent.ts"
Task: "T008 [P] src/actions/content.ts"
```

```text
# Na T004:
Task: "T005 [P] tests/e2e/content-ideas-logic.spec.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Rond Phase 1 (migratie + types) af.
2. Rond Phase 2 (foundational) af.
3. Bouw US1: composer, lijst, editor en de tab-shell.
4. **STOP en VALIDEER**: titel-only opslaan, reload, geen verboden velden.
5. Dit is de eerst bruikbare oplevering.

### Incremental Delivery

1. Setup + Foundational → datalaag en migratie gereed.
2. US1 → snel ideeën vastleggen (MVP).
3. US3 → soortenbeheer zonder slots.
4. US2 → overzicht per contentsoort.
5. US4 → preservatie van bestaande content.
6. Polish → kalenderresten weg, tests groen, docs en fitness.

### Parallel Team Strategy

- Een ontwikkelaar doet Setup + Foundational.
- Daarna: ontwikkelaar A US1, ontwikkelaar B US3 (dialog), ontwikkelaar C US4 (preservatie); US2 volgt zodra de soorten-dialog en de tab-shell staan.
- `ContentView.tsx` is het enige gedeelde bestand; wijzig dat sequentieel of spreek de volgorde af.

---

## Notes

- [P] taken raken verschillende bestanden en hebben geen onderlinge dependency.
- [US1]–[US4] verwijzen naar de user stories in `spec.md`.
- Elke story is afzonderlijk testbaar; US1 is de MVP.
- Na elke logische groep: `npx tsc --noEmit` en de relevante Playwright-scenario's.
- Commit na een logische groep, niet na elke afzonderlijke regel.
- Vermijd destructieve data-acties: geen kolommen, rijen of de slottabel verwijderen.
- Terminologie: UI-copy gebruikt "idee" en "soort"; code en database gebruiken `post` en `pillar`. Houd die scheiding aan in nieuwe bestanden en tests.
