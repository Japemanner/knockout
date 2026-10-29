# Tasks: CRUD-categorieën en Supabase-sync

**Input**: Design documents from `/specs/025-crud-categorie-sync/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/server-actions.md, contracts/ui-components.md

**Organization**: Taken gegroepeerd per user story (US1 categorieën P1, US2 beheren P2, US3 sync P1), uitvoerbaar zodra de foundational fase (migratie + types) is vervuld. US3 is volledig onafhankelijk van US1/US2 en kan parallel lopen.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: parallel uitvoerbaar (andere bestanden, geen dependencies)
- Padconventie: single project — `src/`, `tests/`, `supabase/` op repository-root

---

## Phase 1: Foundational (blokkeert alle user stories)

**Purpose**: Databaselaag gereed

- [x] T001 Schrijf de idempotente migratie `supabase/migrations/024_crud_categories.sql` volgens [data-model.md](./data-model.md): tabel `kk_crud_categories` (PK, `user_id` FK `ON DELETE CASCADE`, `name`, `position`, timestamps), index `(user_id, position)`, `updated_at`-trigger, RLS + vier policies (003-patroon, elk `DROP POLICY IF EXISTS`), `category_id` op `kk_crud_overviews` (`ADD COLUMN IF NOT EXISTS`, `ON DELETE SET NULL`) + index
- [ ] T002 Pas de migratie toe via de Supabase MCP en verifieer direct: RLS actief op `kk_crud_categories` + vier policies aanwezig (F-01), `category_id` bestaat op `kk_crud_overviews`; draai `npm run types:update` (of voeg de types handmatig toe conform de 023-tussenoplossing) — `src/types/database.types.ts`
  - *Status 2026-10-29*: types zijn handmatig toegevoegd (tussenoplossing); open: migratie `024_crud_categories.sql` toepassen via SQL Editor/MCP + F-01-verificatie + `npm run types:update`. Tot die tijd degradeert /crud gracieel (categorieën blijven leeg).

**Checkpoint**: databaselaag gereed — user stories kunnen starten

---

## Phase 2: User Story 1 — Categorieën aanmaken en horizontaal tonen (Priority: P1) 🎯 MVP

**Goal**: Categorieën als horizontale tabrij boven het overzichten-grid; nieuw CRUD overzicht aanmaken binnen de geselecteerde categorie

**Independent Test**: twee categorieën aanmaken, overzicht binnen een categorie aanmaken; tabs staan in één horizontale rij; elk tab toont alleen zijn eigen overzichten; "Alle" toont alles

- [x] T003 [US1] Maak `src/actions/crud-categories.ts`: `createCrudCategory({ name })` — trim + niet-leeg validatie (FR-002), positie `MAX(position)+1` per gebruiker, insert met `user_id`, `revalidatePath('/crud')`, `{ id, error }`-retour
- [x] T004 [US1] Maak `src/components/crud/CategoryTabs.tsx`: horizontale rij (`flex gap-2 overflow-x-auto`, FR-003), tab "Alle" (`/crud`) + categorietabs als `<Link>` (`?category=<id>`) met actieve markering, "+"-knop met aanmaakdialoog (lege naam inline geweigerd, FR-002), toast + `router.refresh()` na mutatie
- [x] T005 [US1] Wijzig `src/app/(dashboard)/crud/page.tsx`: categorieën (`position` ascending) + overzichten via `Promise.all`, `searchParams.category` server-side filteren (`.eq('category_id', id)`), `CategoryTabs` renderen, leegstaat-bericht per categorie
- [x] T006 [US1] Wijzig `src/components/crud/CreateCrudButton.tsx` + `CreateCrudDialog.tsx`: categorie-select ("Geen categorie" + categorieën, vooringevuld met de actieve tab, FR-005); breid `createCrudOverview` in `src/actions/crud-overviews.ts` uit met `category_id` inclusief ownership-check op `kk_crud_categories`
- [x] T007 [US1] Schrijf E2E-deel 1 in `tests/e2e/crud-categorieen.spec.ts` (login-skip-guards): categorie aanmaken → tab verschijnt in dezelfde horizontale rij; overzicht binnen de categorie aanmaken → zichtbaar onder de categorietab, niet onder een andere; "Alle" toont alles

**Checkpoint**: US1 zelfstandig functioneel en testbaar

---

## Phase 3: User Story 2 — Categorieën hernoemen en beheren (Priority: P2)

**Goal**: Hernoemen, verplaatsen van overzichten tussen categorieën en verwijderen van categorieën (overzichten blijven bestaan)

**Independent Test**: categorie hernoemen (persisteert na herladen), overzicht verplaatsen (bron-/doelgrid sync), categorie verwijderen (overzichten blijven onder "Alle")

- [x] T008 [US2] Breid `src/actions/crud-categories.ts` uit: `renameCrudCategory({ categoryId, name })` (trim-validatie, ownership) en `deleteCrudCategory({ categoryId })` (ownership; database lost overzichten op via `ON DELETE SET NULL`, FR-008)
- [x] T009 [US2] Voeg het hover-menu per categorietab toe in `CategoryTabs.tsx`: hernoemen (dialoog met huidige naam, direct zichtbaar resultaat, FR-006) en verwijderen (bevestiging met de tekst "Overzichten blijven bestaan en worden ongecategoriseerd", FR-008)
- [x] T010 [US2] Voeg het verplaats-menu toe in `src/components/crud/CrudOverviewCard.tsx` (overflow-menu MoreVertical: "Verplaatsen naar…" met categorielijst + "Geen categorie", FR-007) en maak `setCrudOverviewCategory({ crudId, categoryId })` in `src/actions/crud-overviews.ts` (ownership overzicht én categorie); toast + `router.refresh()` na mutatie
- [x] T011 [US2] Schrijf E2E-deel 2 in `tests/e2e/crud-categorieen.spec.ts`: hernoemen persisteert na herladen; verplaatsen laat het overzicht uit het bron- en in het doelgrid verschijnen (UI-verifieerbaar na herladen); verwijderen van een categorie met overzichten → overzichten blijven bestaan onder "Alle"

**Checkpoint**: US1 + US2 onafhankelijk werkend

---

## Phase 4: User Story 3 — Supabase-sync: nieuwe kolommen en types ophalen (Priority: P1)

**Goal**: Sync-knop op de CRUD-detailpagina die de actuele tabelstructuur ophaalt en instellingen saneert — zonder delete + recreate

**Independent Test**: kolom toevoegen in de database → één klik → kolom zichtbaar, instellingen behouden; kolom verwijderen → verdwijnt zonder fout; zonder wijzigingen → "Structuur is actueel"

*Opmerking*: US3 raakt géén categorie-bestanden en kan parallel aan US1/US2 lopen na Phase 1.

- [x] T012 [US3] Maak `src/lib/crud/schema-sync.ts` (pure functies, geen 'use server'): `diffColumns(previous, current)` → `{ added, removed }` en `pruneColumnSettings({ hiddenColumns, columnOrder, filters }, currentColumns)` → gesaneerde instellingen (filters via bestaande `pruneStaleFilters`, volgorde behoudt relatieve ordening, FR-013)
- [x] T013 [P] [US3] Schrijf unit-tests in `tests/e2e/crud-schema-sync-logic.spec.ts` (decimal-helper-conventie): kolommen toegevoegd/verwijderd, filters en volgorde behouden op bestaande kolommen, verwijderde kolommen opgeruimd, hernoemde kolom = verwijderd + nieuw (spec edge case)
- [x] T014 [US3] Implementeer `syncCrudOverviewSchema({ crudId })` in `src/actions/crud-overviews.ts` volgens [contracts/server-actions.md](./contracts/server-actions.md): overzicht ophalen → `getLocalTableMeta` → `pruneColumnSettings` → alleen bij wijziging persisteren → `revalidatePath('/crud/' + crudId)` + `revalidatePath('/crud')` → `{ added, removed }`; foutpad wist niets (FR-014)
- [x] T015 [US3] Maak `src/components/crud/SyncSchemaButton.tsx` (spinner/disabled, toast "Structuur bijgewerkt (n toegevoegd, m verwijderd)" of "Structuur is actueel", destructive fout-toast, `router.refresh()` — FR-010/FR-011/FR-015) en render de knop in `src/app/(dashboard)/crud/[crudId]/page.tsx` naast `ColumnVisibilityDialog` en `CrudDetailActions`
- [x] T016 [US3] Schrijf E2E-deel 3 in `tests/e2e/crud-categorieen.spec.ts`: sync-knop zichtbaar op de detailpagina; klik → succes-toast (happy path incl. revalidatie — AGENTS.md-regel voor het nieuwe `revalidatePath`)

**Checkpoint**: US3 zelfstandig functioneel en testbaar

---

## Phase 5: Polish & after-feature checks (AGENTS.md verplicht)

**Purpose**: Kwaliteitspoorten en documentatie

- [x] T017 Verifieer `npx tsc --noEmit` en `npx eslint src/ --max-warnings 0` groen; draai de volledige Playwright-regressiesuite via `@playwright-tester` (bestaande specs + de twee nieuwe bestanden)
- [ ] T018 Voer de handchecks uit [quickstart.md](./quickstart.md) (US1/US2/US3-scenario's, inclusief live schemadrift)
- [x] T019 [P] `@feature-tracker` → FEATURES.md bijwerken
- [x] T020 [P] `@fitness-checker` → `scripts/fitness-check.sh` + F-01 via Supabase MCP (RLS `kk_crud_categories`), F-10 N/A, Snyk F-16/F-17 indien beschikbaar → FITNESS.md
- [x] T021 Commit met conventional message (`feat(crud): categorieën en Supabase-schema-sync`) nadat alle checks groen zijn

---

## Dependencies & Execution Order

### Phase-dependencies

- **Phase 1 (migratie + types)**: geen dependencies — **blokkeert alle user stories**
- **US1 (Phase 2)**: afhankelijk van Phase 1; US2 bouwt door op US1-bestanden (`CategoryTabs`, categorie-actions)
- **US2 (Phase 3)**: afhankelijk van US1 (T003-T005)
- **US3 (Phase 4)**: alleen afhankelijk van Phase 1 — **kan parallel aan US1/US2** (raakt geen categorie-bestanden)
- **Phase 5**: na alle gewenste stories

### Within each user story

- Actions vóór componenten; componenten vóór paginaintegratie; E2E-taak binnen het story na de implementatietaken (AGENTS.md after-feature patroon)
- Commit na elke story of logische groep; stories onafhankelijk leverbaar

### Parallel opportunities

- T012 + T013 (lib + unit-tests) parallel aan T003-T00011 (andere bestanden)
- T019 + T020 parallel in Phase 5
- US3 volledig parallel aan US1/US2 na Phase 1

## Notes

- Migratie uitsluitend via Supabase MCP toepassen (AGENTS.md); F-01 direct verifiëren
- Server actions via `getAuthenticatedClient()`; geen service-role, geen tweede client
- Foutafhandeling: `{ error }`-returns + destructive toasts; geen browserdialogen
- F-15-warnings (conventional format) zijn bekend en niet blokkerend