# Tasks: Centraal categoriebeheer op het CRUD-tabblad

**Input**: Design documents from `/specs/027-crud-categorie-beheer/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: Inclusief, omdat AGENTS.md een regressietest verplicht bij gewijzigde pagina-queries en server-actie-aanroepen. De bestaande suite `tests/e2e/crud-categorieen.spec.ts` wordt herschreven; er komen geen nieuwe testbestanden bij.

**Organization**: Taken zijn gegroepeerd per user story. US1 levert de centrale ingang en het paneel als leesbare slice; US2 en US3 bouwen op hetzelfde componentbestand voort en zijn daarom sequentieel binnen dat bestand, maar elk apart demo- en testbaar.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: kan parallel (ander bestand, geen afhankelijkheid van een nog niet afgeronde taak)
- **[Story]**: US1, US2 of US3
- Alle paden zijn repository-relatief

## Path Conventions

Single project (bestaand): `src/` en `tests/` in de repository-root. Geen backend/frontend-split, geen migratie.

---

## Phase 1: Setup

**Purpose**: Vaststellen dat de bestaande basis klopt; er wordt niets geïnstalleerd of gemigreerd.

- [X] T001 [P] Controleer via Supabase MCP dat `kk_crud_categories` RLS heeft met de vier user-scoped policies en dat `kk_crud_overviews.category_id` de `ON DELETE SET NULL`-FK heeft; noteer de uitkomst voor de latere F-01-check (T018) in `specs/027-crud-categorie-beheer/quickstart.md` (geen migratie uitvoeren)
- [X] T002 [P] Verifieer dat `src/actions/crud-categories.ts` (create/rename/delete), `src/types/database.types.ts` (`CrudCategory`, `CRUDOverview.category_id`) en `playwright.config.ts` ongewijzigd bruikbaar zijn; noteer eventuele afwijkingen in `specs/027-crud-categorie-beheer/plan.md`

**Checkpoint**: Basis bevestigd — er is geen schema- of dependency-werk nodig.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Gedeelde modal-semantiek waar het beheerpaneel en de tests op leunen.

**⚠️ CRITICAL**: US1 kan pas betrouwbaar worden getest nadat deze fase klaar is.

- [X] T003 Voeg `role="dialog"` en `aria-modal="true"` toe aan het paneel-div in `src/components/ui/dialog.tsx`; laat afmetingen, Escape-afhandeling en overlay-click ongewijzigd

**Checkpoint**: De gedeelde Dialog heeft correcte modal-semantiek; alle bestaande dialogs blijven werken.

---

## Phase 3: User Story 1 - Categorieën centraal beheren vanaf de CRUD-pagina (Priority: P1) 🎯 MVP-deel 1

**Goal**: Een altijd zichtbare knop "Categorieën beheren" naast "Nieuwe CRUD" opent een paneel met alle categorieën, hun naam en het aantal overzichten. De tabrij is daarna puur navigatie.

**Independent Test**: Open `/crud` op 375 px, tik op "Categorieën beheren" en controleer dat het paneel alle categorieën met naam en telling toont en dat de tabs geen beheericonen meer hebben.

### Implementation for User Story 1

- [X] T004 [US1] Maak `src/components/crud/CategoryManagerDialog.tsx` aan met het contract uit `contracts/ui-components.md`: `'use client'`, props `categories: { id; name; overviewCount }[]` en `activeCategoryId`, een trigger-`Button` (`variant="outline"`, `Settings2`-icoon, label "Categorieën beheren") en een `Dialog` met titel "Categorieën beheren"
- [X] T005 [US1] Bouw in `src/components/crud/CategoryManagerDialog.tsx` de lijstweergave: alle categorieën in prop-volgorde, naam met `min-w-0 break-words`, telling als `0 overzichten` / `1 overzicht` / `n overzichten`, leegstaat "Nog geen categorieën. Maak je eerste categorie hierboven aan.", en `max-h-[85vh] overflow-y-auto` op de `DialogContent`
- [X] T006 [P] [US1] Simplificeer `src/components/crud/CategoryTabs.tsx` tot een server component: verwijder `'use client'`, alle `useState`, de drie `Dialog`s, de `+`-knop en de hover-iconen; behoud "Alle", de categorielinks met `?category=<id>`, actieve styling, `shrink-0`, `whitespace-nowrap` en `overflow-x-auto`
- [X] T007 [US1] Werk `src/app/(dashboard)/crud/page.tsx` bij: leid `overviewCount` per categorie af met één `Map<string, number>` over `allOverviews`, geef `{ id, name, overviewCount }[]` door aan `CategoryManagerDialog`, en vervang de losse `CreateCrudButton` in de kop door een responsive actiegroep (`flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between` met binnenin `flex flex-wrap items-center gap-2`: eerst manager, dan `CreateCrudButton`)
- [X] T008 [US1] Maak `/crud`-tests in `tests/e2e/crud-categorieen.spec.ts`: helper `openManager(page)` die op "Categorieën beheren" klikt zonder `hover()`, assertie op de paneeltitel, op de tellingstekst per categorie, op afwezigheid van `+`/potlood/prullenbak op de tabrij, en een `test.describe` met `test.use({ viewport: { width: 375, height: 667 } })` die beide knoppen zichtbaar maakt; behoud de login-skip-guard

**Checkpoint**: De centrale ingang werkt, het paneel toont de juiste data en de tabs zijn navigatie-only — onafhankelijk demo- en testbaar.

---

## Phase 4: User Story 2 - Categorieën toevoegen en hernoemen in het beheerpaneel (Priority: P1) 🎯 MVP-deel 2

**Goal**: In het paneel maakt de gebruiker categorieën aan en hernoemt hij ze inline; de wijziging is direct zichtbaar in paneel en tabrij en blijft na herladen behouden.

**Independent Test**: Maak in het paneel "Klanten" aan, hernoem naar "Relaties", sluit het paneel en herlaad: de tab toont "Relaties".

### Implementation for User Story 2

- [X] T009 [US2] Voeg in `src/components/crud/CategoryManagerDialog.tsx` het aanmaakformulier toe: `Input` met placeholder "Naam voor de nieuwe categorie...", `Button` "Toevoegen" (disabled bij lege/whitespace-invoer of tijdens opslaan), aanroep `createCrudCategory`, succes-toast "Categorie aangemaakt", veld leegmaken, `router.refresh()`, en bij fout een destructieve toast met behoud van de invoer
- [X] T010 [US2] Voeg in `src/components/crud/CategoryManagerDialog.tsx` inline hernoemen toe: per rij een `Button` met `aria-label="Hernoemen: <naam>"`, een `Input` met `aria-label="Nieuwe naam voor <naam>"`, "Opslaan"/"Annuleren", Enter/Escape, aanroep `renameCrudCategory`, succes-toast "Hernoemd", `router.refresh()`, en foutpad met behoud van de invoer
- [X] T011 [US2] Breid `tests/e2e/crud-categorieen.spec.ts` uit: categorie aanmaken via het paneel verschijnt direct in paneel én tabrij; hernoemen werkt zonder hover en blijft zichtbaar na `page.reload()`; een lege of whitespace-naam wordt geweigerd met zichtbare melding; behoud de bestaande preselectie-test voor "Nieuwe CRUD"

**Checkpoint**: Aanmaken en hernoemen werken volledig op touch; de kern van het oorspronkelijke mobiele probleem is opgelost.

---

## Phase 5: User Story 3 - Categorieën verwijderen met behoud van overzichten (Priority: P2)

**Goal**: Verwijderen gebeurt vanuit het paneel via een bevestigingsweergave die de naam en het gevolg noemt; overzichten blijven bestaan onder "Alle".

**Independent Test**: Verwijder een categorie met een overzicht en controleer dat de tab verdwijnt en het overzicht onder "Alle" blijft staan.

### Implementation for User Story 3

- [X] T012 [US3] Voeg in `src/components/crud/CategoryManagerDialog.tsx` de verwijderflow toe: per rij een `Button` met `aria-label="Verwijderen: <naam>"`, een bevestigingsweergave **binnen hetzelfde paneel** met titel "Categorie verwijderen?", de categorienaam en "De overzichten in deze categorie blijven bestaan en worden ongecategoriseerd.", "Annuleren"/"Verwijderen" (destructive), aanroep `deleteCrudCategory`, en na succes `router.refresh()` of `router.push('/crud')` wanneer `activeCategoryId === category.id`
- [X] T013 [US3] Breid `tests/e2e/crud-categorieen.spec.ts` uit: bevestiging noemt de categorienaam; annuleren laat de categorie bestaan; bevestigen verwijdert de tab terwijl het overzicht onder "Alle" zichtbaar blijft; verwijderen van de actieve categorie brengt de pagina terug op "Alle"; werk de bestaande "overzichten blijven bestaan"-test bij naar de nieuwe flow

**Checkpoint**: Alle drie de user stories zijn functioneel en de volledige categorie-suite is groen.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Kwaliteitspoorten uit AGENTS.md en de handmatige verificatie.

- [X] T014 [P] Werk `FEATURES.md` bij voor feature 027 met de nieuwe centrale beheerflow, gewijzigde bestanden en testdekking (via `@feature-tracker` of handmatig volgens het bestaande formaat)
- [X] T015 [P] Draai `npx tsc --noEmit` en `npx eslint src/ --max-warnings 0`; los alle fouten/warnings op
- [ ] T016 [P] Draai `npx playwright test tests/e2e/crud-categorieen.spec.ts` en daarna de volledige suite `npx playwright test`; alle niet-login-gated tests moeten groen zijn
- [ ] T017 Voer de handmatige checks uit `quickstart.md` uit op desktop én 375 px (paneel, aanmaken, hernoemen, verwijderen, actieve categorie, tellingen)
- [ ] T018 Werk `FITNESS.md` bij via `@fitness-checker`: `scripts/fitness-check.sh`, F-01 (RLS) via Supabase MCP en F-10 (geen Storage in deze feature) — verwacht geen nieuwe schemawijzigingen
- [ ] T019 Commit de wijzigingen in `src/components/crud/CategoryManagerDialog.tsx`, `src/components/crud/CategoryTabs.tsx`, `src/app/(dashboard)/crud/page.tsx`, `src/components/ui/dialog.tsx` en `tests/e2e/crud-categorieen.spec.ts` met een conventioneel bericht, bijvoorbeeld `feat(crud): centraal categoriebeheer met beheerpaneel`, en vermeld in de commit-body dat de per-tab hover-acties zijn vervangen

---

## Status (2026-11-03)

- **T001–T015 afgerond.** RLS-basis geverifieerd via Supabase MCP (project `ythjnatklbnjtvvgpwlr`): RLS aan op `kk_crud_categories` en `kk_crud_overviews`, vier user-scoped policies op categorieën, FK `kk_crud_overviews_category_id_fkey` met `confdeltype = n` (`ON DELETE SET NULL`).
- **Scoped typecheck groen**: `tsc` op alleen de 027-bestanden + tests geeft exit 0. `eslint` op de gewijzigde bestanden geeft 0 fouten/warnings. `npm run build` was groen vóór de parallelle 026-wijzigingen.
- **T016 open**: categorie-suite gedraaid — 9/9 overgeslagen wegens ontbrekende login-sessie (verwacht gedrag van de skip-guard). De volledige suite is niet gedraaid zolang feature 026 mid-implementatie is.
- **T017 open**: handmatige 375 px-check vereist een ingelogde sessie.
- **T018 deels**: `bash scripts/fitness-check.sh` gedraaid; F-07 faalt op 33 TypeScript-fouten in `src/app/(dashboard)/content/*` en `src/components/content/*`. Die bestanden horen bij de parallelle feature 026 en werden tijdens deze run door een andere sessie gewijzigd; buiten de scope van 027. `FITNESS.md` is daarom niet bijgewerkt.
- **T019 open**: geen commit uitgevoerd, omdat de working tree ook de in-progress wijzigingen van 024/026 bevat en niet alle kwaliteitspoorten groen zijn.


---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: geen dependencies, kan direct starten
- **Foundational (Phase 2)**: na Setup; T003 blokkeert betrouwbare testselectors voor het paneel
- **US1 (Phase 3)**: na Phase 2; levert het component en de pagina-integratie
- **US2 (Phase 4)**: na US1 (zelfde bestand `CategoryManagerDialog.tsx` en dezelfde testhelpers)
- **US3 (Phase 5)**: na US2 (zelfde bestand en dezelfde bevestigingsstate)
- **Polish (Phase 6)**: na US3

### User Story Dependencies

- **US1 (P1)**: onafhankelijk demo- en testbaar (paneel + tellingen + navigatie-only tabs)
- **US2 (P1)**: bouwt op het US1-component; eigen acceptatietest via aanmaken/hernoemen
- **US3 (P2)**: bouwt op US2 (rij-acties en state); eigen acceptatietest via verwijderen

### Within Each User Story

- Component/skelet vóór uitbreidingen in hetzelfde bestand
- Implementatie vóór de bijbehorende E2E-taken
- Elke story eindigt met een groene, op zichzelf staande test

### Parallel Opportunities

- T001 en T002 (Setup) kunnen parallel
- T003 kan parallel met T004/T005 starten (ander bestand), maar T007 wacht op beide
- T006 (aparte component) kan parallel met T004/T005
- T014, T015 en T016 (Polish) kunnen parallel; T017–T019 zijn sequentieel daarna
- **Niet parallel**: T004/T005/T009/T010/T012 delen `CategoryManagerDialog.tsx`; T008/T011/T013 delen `tests/e2e/crud-categorieen.spec.ts`

---

## Parallel Example: User Story 1

```text
# Na Phase 2, start parallel:
Task T004/T005: CategoryManagerDialog.tsx (lijst + trigger)
Task T006:      CategoryTabs.tsx (navigatie-only)

# Daarna, afhankelijk van beide:
Task T007:      page.tsx (tellingen + actiegroep)
Task T008:      E2E basis (paneel, tellingen, 375 px)
```

---

## Implementation Strategy

### MVP First: US1 + US2 (beide P1)

1. Phase 1: Setup (T001–T002)
2. Phase 2: Foundational (T003)
3. Phase 3: US1 (T004–T008) → **STOP en VALIDEER** op 375 px
4. Phase 4: US2 (T009–T011) → **STOP en VALIDEER** aanmaken/hernoemen
5. Dit is de MVP: het mobiele probleem is opgelost; verwijderen volgt als P2

### Incremental Delivery

1. US1 → centrale ingang + inzicht (demo)
2. US2 → aanmaken en hernoemen (kernwaarde)
3. US3 → verwijderen met bevestiging (afronding)
4. Polish → kwaliteitspoorten en commit

---

## Notes

- [P] = ander bestand, geen afhankelijkheid
- Geen migratie, geen nieuwe packages, geen nieuwe server actions
- Elke categorieactie moet zonder hover werken; gebruik in tests nooit `.hover()`
- Login-skip-guards zijn verplicht in elke E2E-test
- Commit na een logische groep, uiterlijk na T019
