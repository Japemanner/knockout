# Implementation Plan: CRUD-categorieën en Supabase-sync

**Branch**: `025-crud-categorie-sync` | **Date**: 2026-10-29 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/025-crud-categorie-sync/spec.md` (na vastgestelde clarifications) + het bestaande CRUD-tabblad (004, uitgebreid met 005/015/018) + besluit `2026-07-23-crud-postgrest-migration.md` (metadata via PostgREST-RPC's).

## Summary

Twee uitbreidingen op het CRUD-tabblad:

1. **Categorieën** — nieuwe tabel `kk_crud_categories` (RLS, user-scoped) met een nullable `category_id` op `kk_crud_overviews` (`ON DELETE SET NULL`). De overzichtspagina krijgt een horizontale tabrij ("Alle" + één tab per categorie) boven het bestaande grid, met aanmaken, hernoemen en verwijderen van categorieën (verwijderen laat overzichten bestaan) en verplaatsen van overzichten tussen categorieën. Categoriewissel verloopt via de URL-parameter `?category=<uuid>`, zodat de server-rendering en het bestaande ISR-patroon van het CRUD-tabblad ongewijzigd blijven.
2. **Sync-knop** — op de detailpagina een knop "Synchroniseren" die via de bestaande metadata-RPC's de actuele tabelstructuur ophaalt, de kolominstellingen (verborgen kolommen, volgorde, filters) tegen de actuele kolommen opschoont en de detailroute revalideert. Schemawijzigingen zijn daarmee zichtbaar in één klik — zonder het overzicht te verwijderen en opnieuw aan te maken.

**Prerequisite**: geen — bouwt direct voort op het bestaande CRUD-tabblad. Migratienummering houdt rekening met de reservering van `023` door `specs/024-post-bijlagen`: deze feature gebruikt **024**.

## Technical Context

**Language/Version**: TypeScript 5.6 (strict) + React 18 + Next.js 15 (App Router)

**Primary Dependencies**: @supabase/ssr (bestaand), @supabase/supabase-js v2 (bestaand), shadcn/ui + lucide-react (bestaand) — geen nieuwe packages

**Storage**: Supabase PostgreSQL — 1 nieuwe tabel `kk_crud_categories` (RLS, user-scoped) + `category_id`-kolom op `kk_crud_overviews`; geen Supabase Storage in deze feature

**Testing**: Playwright — unit-patroon voor pure functies (`tests/e2e/crud-schema-sync-logic.spec.ts`, decimal-helper-conventie) + E2E met login-skip-guards (`tests/e2e/crud-categorieen.spec.ts`)

**Target Platform**: Web (Netlify, Node-runtime server actions), desktop-first

**Project Type**: Next.js App Router web application (server components + server actions)

**Performance Goals**: overzichtspagina blijft 2 parallelle reads (categorieën + overzichten); categoriewissel is puur navigatie (Link + prefetch, ISR per URL-variant) zonder client-state; sync-knop is één action-round-trip plus één revalidatie

**Constraints**: CRUD-module behoudt het bestaande ISR + `revalidatePath`-patroon (het uren-besluit `2026-09-22-uren-reads-browser-client.md` geldt voor de uren/content-reads; de CRUD-pagina's blijven server components met mutatie-actions); metadata via de bestaande SECURITY DEFINER-RPC's met authenticated client (besluit `2026-07-23-crud-postgrest-migration.md`); één Supabase-client per omgeving

**Scale/Scope**: 1 migratie, 1 nieuw actions-bestand, 1 nieuw lib-bestand (pure helpers), 2 nieuwe componenten, 4 gewijzigde bestanden, 2 testbestanden; persoonlijk gebruik — typisch <10 categorieën, <50 overzichten

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

*De constitutie in `.specify/memory/constitution.md` is nog een ongevulde template; conform de werkwijze van 022/023 gelden de non-negotiable rules uit AGENTS.md als gates.*

| Gate | Status | Note |
|------|--------|------|
| RLS on every table | PASS | `kk_crud_categories` RLS + vier policies (003-patroon); F-01-check na migratie via Supabase MCP |
| No secrets in client code | PASS | geen nieuwe env-waarden; actions via `getAuthenticatedClient()` |
| Edge Functions for privileged ops | N/A | user-owned operaties; sync hergebruikt bestaande RPC's, géén service-role |
| PKCE auth flow | PASS | ongewijzigd; hergebruik bestaande client-setup |
| Netlify SPA redirects | N/A | geen routing-wijzigingen |
| Storage bucket policies | N/A | geen storage in deze feature |
| TypeScript strict mode | PASS | `database.types.ts` bijwerken na migratie (`npm run types:update`, of handmatige tussenoplossing conform 023) |
| Eén Supabase-client | PASS | alle actions via `getAuthenticatedClient()` — geen tweede instantie |

Geen constitution violations. Geen complexity tracking nodig.

## Project Structure

### Documentation (this feature)

```text
specs/025-crud-categorie-sync/
├── plan.md              # Dit bestand
├── research.md          # Phase 0 output — beslissingen + alternatieven
├── data-model.md        # Phase 1 output — tabel, kolom, RLS, migratie
├── contracts/
│   ├── server-actions.md  # Phase 1 output — acties + sync-flow
│   └── ui-components.md   # Phase 1 output — component-contract
├── quickstart.md        # Phase 1 output — verificatie-instructies
├── checklists/
│   └── requirements.md  # Tijdens /speckit.specify aangemaakt
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── app/(dashboard)/crud/
│   ├── page.tsx                        # WIJZIGEN — categorieën laden, ?category-filter, tabrij
│   └── [crudId]/page.tsx               # WIJZIGEN — SyncSchemaButton in de actiebalk
├── components/crud/
│   ├── CategoryTabs.tsx                # NIEUW — horizontale tabs + aanmaken/hernoemen/verwijderen
│   ├── SyncSchemaButton.tsx            # NIEUW — sync-knop met spinner + toast-feedback
│   ├── CreateCrudButton.tsx            # WIJZIGEN — categorie-props doorgeven
│   ├── CreateCrudDialog.tsx            # WIJZIGEN — categorie-select (vooringevuld)
│   └── CrudOverviewCard.tsx            # WIJZIGEN — menu: verplaatsen naar categorie + verwijderen
├── actions/
│   ├── crud-categories.ts              # NIEUW — create/rename/delete categorie
│   └── crud-overviews.ts               # WIJZIGEN — category_id + syncCrudOverviewSchema + setCrudOverviewCategory
├── lib/crud/
│   └── schema-sync.ts                  # NIEUW — pure helpers diffColumns/pruneColumnSettings
└── types/
    └── database.types.ts               # GEWIJZIGD — kk_crud_categories + category_id

supabase/migrations/
└── 024_crud_categories.sql             # NIEUW — tabel + kolom + RLS + indexen (idempotent)

tests/e2e/
├── crud-schema-sync-logic.spec.ts      # NIEUW — unit-patroon op schema-sync.ts
└── crud-categorieen.spec.ts            # NIEUW — E2E met login-skip-guards
```

**Structure Decision**: Single-project layout (bestaand). Componenten in de bestaande `src/components/crud/`-domeinmap; pure logica in nieuwe `src/lib/crud/`; categorie-mutaties in één nieuw actions-bestand `crud-categories.ts`; de sync-action hoort bij de bestaande overviews-actions; migratie 024 (023 is gereserveerd voor 024-post-bijlagen).

## Implementation Phases

### Phase 1 — Migratie `supabase/migrations/024_crud_categories.sql` (idempotent)

Zie [data-model.md](./data-model.md). Toepassen via Supabase MCP; daarna RLS verifiëren (F-01) en `npm run types:update`.

### Phase 2 — Pure helpers `src/lib/crud/schema-sync.ts`

- `diffColumns(previous, current)` → `{ added, removed }`
- `pruneColumnSettings({ hiddenColumns, columnOrder, filters }, currentColumns)` → gesaneerde instellingen (filters via bestaande `pruneStaleFilters` uit `src/lib/column-filters.ts`)
- Unit-tests (`crud-schema-sync-logic.spec.ts`): toegevoegde/verwijderde kolommen, behoud van volgorde en filters op bestaande kolommen, hernoemde kolom = oud weg + nieuw zichtbaar (edge case uit de spec)

### Phase 3 — Server actions

1. `src/actions/crud-categories.ts` — `createCrudCategory`, `renameCrudCategory`, `deleteCrudCategory` (positie = MAX+1 per gebruiker; delete laat overzichten bestaan via `ON DELETE SET NULL`)
2. `src/actions/crud-overviews.ts` — `category_id` in get/create/update; nieuw `setCrudOverviewCategory(crudId, categoryId | null)`; nieuw `syncCrudOverviewSchema(crudId)`: meta ophalen via bestaande RPC's → `pruneColumnSettings` → alleen bij wijziging persisteren → detailroute + overzicht revalideren → `{ added, removed }` retourneren

Zie [contracts/server-actions.md](./contracts/server-actions.md).

### Phase 4 — Categorieën-UI (US1 + US2)

1. `CategoryTabs.tsx` — tab "Alle" + categorietabs als Links (`?category=<id>`), één horizontale rij met `overflow-x-auto` (FR-003), "+"-knop met aanmaakdialoog (lege naam geweigerd, FR-002), hovermenu per tab voor hernoemen (direct zichtbaar resultaat, FR-006) en verwijderen (bevestiging die noemt dat overzichten blijven bestaan, FR-008)
2. `page.tsx` — categorieën + overzichten parallel laden, server-side filteren op `?category`, leegstaat-bericht per categorie
3. `CreateCrudButton`/`CreateCrudDialog` — categorie-select met "Geen categorie", vooringevuld vanuit de geselecteerde tab (FR-005)
4. `CrudOverviewCard` — overflow-menu: "Verplaatsen naar…" (categorielijst + "Geen categorie", FR-007) en het bestaande verwijderen

### Phase 5 — Sync-knop (US3)

1. `SyncSchemaButton.tsx` — knop "Synchroniseren" in de actiebalk van de detailpagina; klik → `syncCrudOverviewSchema` → toast "Structuur bijgewerkt (n toegevoegd, m verwijderd)" of "Structuur is actueel"; fout → destructive toast, niets gewist (FR-014/FR-015); daarna `router.refresh()`
2. `[crudId]/page.tsx` — knop renderen naast `ColumnVisibilityDialog` en `CrudDetailActions`

### Phase 6 — Types, tests & after-feature checks

1. `database.types.ts` bijwerken (`npm run types:update`, of handmatig conform de 023-tussenoplossing)
2. `crud-schema-sync-logic.spec.ts` (unit) + `crud-categorieen.spec.ts` (E2E): categorie aanmaken → tab zichtbaar; hernoemen persisteert na herladen; overzicht verplaatsen → verdwijnt uit bron- en verschijnt in doelcategorie; categorie verwijderen → overzichten blijven onder "Alle"; sync-knop klik → succes-toast. Skip-guards conform het bestaande login-patroon
3. Regressieregels AGENTS.md: gewijzigde server actions → mutaties UI-verifieerbaar na herladen; `revalidatePath` op de detailroute is nieuw → E2E verifieert verse weergave na sync-klik; `tsc --noEmit` + `npx eslint src/ --max-warnings 0`; `@feature-tracker` → FEATURES.md; fitness-check incl. F-01 via Supabase MCP → FITNESS.md

## Risk Analysis

| Risico | Impact | Mitigatie |
|--------|--------|-----------|
| ISR-cache toont na sync nog oude structuur | Gebruiker ziet geen verandering | sync-action revalideert expliciet `/crud/[crudId]`; knop doet `router.refresh()`; pruning is unit-getest |
| Verwijderde categorie blijft als tab staan (cache) | Overzichten lijken "kwijt" | `revalidatePath('/crud')` in elke categorie-action; RLS garandeert alleen eigen categorieën |
| `category_id` verwijst naar categorie van een ander (request-tampering) | Data-inkslag over gebruikersgrens | action valideert ownership vóór update; RLS op beide tabellen is vangnet |
| Categoriewissel voelt traag (server-round-trip) | UX-verslechtering | Link-prefetch + ISR per URL-variant; persoonlijk volume klein |
| Sync op verwijderde/onbereikbare tabel | Onduidelijke fout of dataverlies | action retourneert fout zonder iets te wijzigen (FR-014); bestaande error-weergave op de detailpagina blijft |
| Migratie-collisie met 024-post-bijlagen | Dubbele migratienummers | deze feature gebruikt 024; 023 blijft gereserveerd voor bijlagen (notitie in data-model.md) |
| Kolom hernoemd in de database | Oude instellingen lijken "verloren" | edge case is expliciet gedocumenteerd: gedrag = verwijderd + nieuw (spec); pruning ruimt het oude referentie op |

## Out of Scope

- Categorieën op het Borden-tabblad of andere tabbladen (clarification 2026-10-29)
- Globale "alles synchroniseren"-knop (clarification 2026-10-29)
- Automatisch synchroniseren (op interval of bij het openen van de pagina)
- Handmatig herordenen van categorietabs (slepen) — `position`-kolom ligt klaar voor een vervolgfeature
- Interactietype "Formulier"; externe databaseverbindingen (bestaand beleid)
- Nieuwe tabellen verschijnen automatisch in bestaande overzichten — nieuwe tabellen zijn al direct kiesbaar bij het aanmaken van een nieuw overzicht (bestaand gedrag)