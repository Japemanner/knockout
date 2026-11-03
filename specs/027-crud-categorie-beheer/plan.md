# Implementation Plan: Centraal categoriebeheer op het CRUD-tabblad

**Branch**: `027-crud-categorie-beheer` | **Date**: 2026-11-03 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/027-crud-categorie-beheer/spec.md` + de bestaande CRUD-categorie-implementatie uit feature 025 (`CategoryTabs.tsx`, `src/actions/crud-categories.ts`, migratie `024_crud_categories.sql`) en de codebase-conventies uit AGENTS.md.

## Summary

De categorieën op het CRUD-tabblad worden niet langer per tab beheerd (hover-iconen, onbruikbaar op touch), maar centraal vanuit één beheerpaneel:

1. **Ingang** — in de paginakop van `/crud`, direct naast "Nieuwe CRUD", komt een tweede knop "Categorieën beheren". Beide knoppen zitten in één actiegroep die op smalle schermen als geheel netjes wrapping toepast; geen van beide verdwijnt ooit achter hover.
2. **Beheerpaneel** — één in-app dialoog toont alle categorieën in aanmaakvolgorde met hun naam en het aantal overzichten. In hetzelfde paneel maakt de gebruiker categorieën aan, hernoemt ze inline en verwijdert ze via een bevestigingsstap die de categorienaam en het gevolg (overzichten blijven bestaan) expliciet noemt.
3. **Tabs blijven navigatie** — `CategoryTabs.tsx` verliest alle beheeracties en wordt een server component met alleen Links. Het horizontale, scrollbare tabgedrag en het `?category=<id>`-filter blijven exact zoals ze zijn.

Er is **geen databasemigratie nodig**: de tabellen, RLS-policies, indexen en de `ON DELETE SET NULL`-relatie bestaan al. De bestaande server actions (`createCrudCategory`, `renameCrudCategory`, `deleteCrudCategory`) worden hergebruikt. Het aantal overzichten per categorie wordt server-side afgeleid uit de overzichten die de pagina toch al parallel ophaalt — geen extra query en geen nieuwe RPC. Geen nieuwe packages.

## Technical Context

**Language/Version**: TypeScript 5.6 (strict) + React 18.3 + Next.js 15.1 (App Router)

**Primary Dependencies**: bestaande `@supabase/ssr`, `@supabase/supabase-js` v2, Tailwind CSS v3, de eigen shadcn-geïnspireerde UI-componenten (`Button`, `Input`, `Dialog`), `lucide-react` (`Settings2`, `Pencil`, `Trash2`, `Plus`), `useToast` — **geen nieuwe packages**

**Storage**: Supabase PostgreSQL. Bestaande tabellen `kk_crud_categories` en `kk_crud_overviews` (beide RLS, user-scoped). Geen migratie, geen Storage.

**Testing**: Playwright. Bestaand bestand `tests/e2e/crud-categorieen.spec.ts` wordt herschreven naar de nieuwe UI (geen hover-flows) en uitgebreid met een mobiele viewport-test (375 px) en een tellingstest. Login-skip-guards blijven behouden.

**Target Platform**: Web (Netlify, Node-runtime server actions), desktop + mobiel vanaf 375 px

**Project Type**: Next.js App Router web application (server component + client component + server actions)

**Performance Goals**:
- `/crud` blijft 2 parallelle reads (categorieën + overzichten); tellingen zijn een O(n)-pass over dezelfde data, geen extra round-trip.
- Elke categorieactie is één server-action-round-trip plus één revalidatie; het paneel blijft open en werkt bij met de nieuwe server-props.
- Geen client-side datafetching of extra React Query-cache voor deze pagina.

**Constraints**:
- CRUD-module behoudt het bestaande patroon: server component + server actions + `revalidatePath('/crud')` + `router.refresh()`.
- RLS blijft de grens; elke actie werkt met `getAuthenticatedClient()` en eigendomscontrole.
- Eén Supabase-client per omgeving; geen nieuwe client.
- TypeScript strict; geen `any`.
- Geen browserdialogen (`window.confirm`); bevestiging gebeurt in-app.
- Mobiel: geen enkele categorieactie mag afhankelijk zijn van hover; dialoog is intern scrollbaar (`max-h-[85vh]`).
- Toegankelijkheid: dialoog krijgt `role="dialog"` + `aria-modal="true"`; alle icoonknoppen krijgen een expliciet `aria-label`.

**Scale/Scope**: persoonlijk gebruik — typisch <10 categorieën en <50 overzichten. 1 nieuw component, 3 gewijzigde bestanden (waarvan 1 gedeelde UI-component), 1 herschreven testbestand. Geen migratie, geen nieuwe acties.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

*De constitutie in `.specify/memory/constitution.md` is nog een ongevulde template; conform de werkwijze van 025/026 gelden de non-negotiable rules uit AGENTS.md als gates.*

| Gate | Status | Note |
|------|--------|------|
| RLS on every table | PASS | Geen schemawijziging; `kk_crud_categories` en `kk_crud_overviews` behouden hun bestaande RLS + policies. F-01-controle via Supabase MCP na de feature. |
| No secrets in client code | PASS | Geen nieuwe env-waarden; alle mutaties via server actions met de authenticated client. |
| Edge Functions for privileged ops | N/A | Alle operaties zijn user-owned; geen service-role nodig. |
| PKCE auth flow | PASS | Ongewijzigd; bestaande client-setup blijft. |
| Netlify SPA redirects | N/A | Geen routing-wijzigingen; `/crud` en `?category=` blijven. |
| Storage bucket policies | N/A | Geen Storage in deze feature. |
| TypeScript strict mode | PASS | Nieuwe props lokaal getypeerd; bestaande `CrudCategory`/`CRUDOverview`-types worden hergebruikt. |
| Eén Supabase-client | PASS | Server actions via `getAuthenticatedClient()`; geen tweede instantie. |
| Regressietest-regel AGENTS.md | PASS | Gewijzigde server-actie-aanroepen en pagina-query: bestaande E2E wordt herschreven; nieuwe mobiele test en tellingstest dekken de gewijzigde flows. |
| Mobiel/touch (AGENTS.md kwaliteitseis) | PASS | Alle categorieacties via altijd zichtbare knoppen; 375 px-test in Playwright. |

Geen constitution-violations. Geen complexity tracking nodig.

**Post-design re-check (na Phase 1)**: de ontwerpen in [data-model.md](./data-model.md) en [contracts/](./contracts/) voegen geen tabel, kolom, policy, client of privileged operatie toe. De gates blijven ongewijzigd PASS/N/A; er is geen complexity tracking nodig.

## Project Structure

### Documentation (this feature)

```text
specs/027-crud-categorie-beheer/
├── plan.md                  # Dit bestand
├── spec.md                  # Feature-specificatie
├── research.md              # Phase 0 — beslissingen + alternatieven
├── data-model.md            # Phase 1 — bestaande entiteiten, geen migratie
├── contracts/
│   ├── server-actions.md    # Phase 1 — hergebruikte actiecontracten
│   └── ui-components.md     # Phase 1 — component- en UI-contract
├── quickstart.md            # Phase 1 — handmatige + automatische verificatie
├── checklists/
│   └── requirements.md      # Tijdens /speckit.specify aangemaakt
└── tasks.md                 # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── app/(dashboard)/crud/
│   └── page.tsx                        # WIJZIGEN — tellingen per categorie afleiden,
│                                       #   actiegroep in de kop (Beheren + Nieuwe CRUD)
├── components/crud/
│   ├── CategoryManagerDialog.tsx       # NIEUW — knop + beheerpaneel (lijst, aanmaken,
│   │                                   #   inline hernoemen, bevestigde verwijdering)
│   ├── CategoryTabs.tsx                # WIJZIGEN — alleen navigatie (server component,
│   │                                   #   geen hover-iconen, geen + knop, geen dialogs)
│   ├── CreateCrudButton.tsx            # ONGEWIJZIGD — blijft de primaire actie
│   └── CrudOverviewCard.tsx            # ONGEWIJZIGD — verplaatsen blijft via kaartmenu
├── components/ui/
│   └── dialog.tsx                      # WIJZIGEN — role="dialog" + aria-modal="true"
├── actions/
│   └── crud-categories.ts              # HERGEBRUIK — create/rename/delete (geen wijziging)
└── types/
    └── database.types.ts               # HERGEBRUIK — CrudCategory + CRUDOverview.category_id

tests/e2e/
└── crud-categorieen.spec.ts            # WIJZIGEN — nieuwe UI, mobiele viewport, tellingen
```

**Structure Decision**: Single-project layout (bestaand). Het beheerpaneel volgt het patroon van `ColumnVisibilityDialog.tsx`: één client-component dat zowel de trigger-knop als de dialoog bevat. `CategoryTabs` wordt bewust gedegradeerd tot een pure server-rendered navigatierij. De gedeelde `Dialog` krijgt alleen modal-semantiek; er komen geen nieuwe UI-primitieven.

## Implementation Phases

### Phase 1 — Beheerpaneel `CategoryManagerDialog.tsx` (US1 + US2 + US3)

1. **Trigger**: `<Button variant="outline"><Settings2 /> Categorieën beheren</Button>` in de paginakop; opent de dialoog. Altijd zichtbaar, geen hover.
2. **Lijst**: alle categorieën in de aangeleverde volgorde, per regel naam + telling (`0 overzichten` / `1 overzicht` / `n overzichten`) + twee knoppen met `aria-label` (`Hernoemen: <naam>`, `Verwijderen: <naam>`). Leegstaat bij nul categorieën.
3. **Aanmaken**: invoerveld + "Toevoegen"; lege/whitespace-naam geblokkeerd en met toast gemeld; na succes `router.refresh()`, veld leeg, paneel blijft open.
4. **Hernoemen**: inline — de regel wordt een `Input` met "Opslaan"/"Annuleren" (Enter/Escape ondersteund). Na succes `router.refresh()` en directe feedback via toast.
5. **Verwijderen**: de dialoog schakelt naar een bevestigingsweergave binnen hetzelfde paneel (geen geneste dialoog): categorienaam + "De overzichten in deze categorie blijven bestaan en worden ongecategoriseerd." Bij bevestigen de bestaande `deleteCrudCategory`; daarna `router.push('/crud')` als de actieve categorie werd verwijderd, anders `router.refresh()`.
6. **Foutpad**: bij elke actie een destructieve toast, de lijst en invoerwaarden blijven staan, niets wordt lokaal "optimistisch" verwijderd.

Zie [contracts/ui-components.md](./contracts/ui-components.md).

### Phase 2 — Pagina-integratie `src/app/(dashboard)/crud/page.tsx`

1. Leid per categorie het aantal overzichten af uit `allOverviews` (één pass, `Map<string, number>`), zonder extra query.
2. Geef `{ id, name, overviewCount }[]` door aan `CategoryManagerDialog`.
3. Vervang de losse `CreateCrudButton` in de kop door een actiegroep:
   ```text
   <div className="flex flex-wrap items-center gap-2">
     <CategoryManagerDialog … />
     <CreateCrudButton … />
   </div>
   ```
   en maak de kop zelf responsive (`flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`) zodat beide knoppen op 375 px zichtbaar en naast elkaar blijven.
4. `CategoryTabs`-aanroep en gridfilter blijven ongewijzigd.

### Phase 3 — Tabs simplificeren `src/components/crud/CategoryTabs.tsx`

- Verwijder `'use client'`, alle `useState`, de drie dialogs, de `+`-knop en de hover-iconen.
- Behoud exact: "Alle"-link, categorielinks met `?category=<id>`, actieve stijl, `shrink-0`, `overflow-x-auto`, `whitespace-nowrap`.
- Resultaat: één horizontale, scrollbare navigatierij zonder verborgen acties (FR-004/FR-015).

### Phase 4 — Modal-semantiek `src/components/ui/dialog.tsx`

- Voeg `role="dialog"` en `aria-modal="true"` toe aan het paneel-div (bestaande `max-w-lg max-h-[85vh] overflow-auto` blijft).
- Geen focus-trap bouwen in deze feature; wel controleren dat Escape en de overlay-click ongewijzigd sluiten.
- Risico is bewust klein: alle bestaande dialogs krijgen dezelfde semantiek; de bestaande Playwright-selectors `getByRole('dialog')` worden hierdoor eindelijk correct.

### Phase 5 — Tests `tests/e2e/crud-categorieen.spec.ts`

1. Helpers herschrijven: `openManager()`, `createCategory()` (via paneel), `renameCategory()`, `deleteCategory()` (via bevestigingsweergave) — **zonder `hover()`**.
2. Bestaande dekking behouden: tabrij + "Alle", filteren, preselectie bij "Nieuwe CRUD", verwijderen houdt overzichten, sync-knop.
3. Nieuw: tellingen kloppen (`1 overzicht` na toewijzen via het bestaande kaartmenu op desktop).
4. Nieuw: mobiele test met `test.use({ viewport: { width: 375, height: 667 } })` — knop zichtbaar, paneel bruikbaar, hernoemen en verwijderen zonder hover; sluit de skip-guard correct af.
5. Login-skip-guards (`page.url().includes('/login')`) blijven verplicht; geen test die zonder sessie faalt.

### Phase 6 — Kwaliteitschecks (AGENTS.md)

- `npx tsc --noEmit` en `npx eslint src/ --max-warnings 0`.
- `npx playwright test tests/e2e/crud-categorieen.spec.ts` (en minimaal één bestaande CRUD-suite als regressie).
- `@feature-tracker` → FEATURES.md bijwerken; `@fitness-checker` → `scripts/fitness-check.sh` + F-01 (RLS) via Supabase MCP; FITNESS.md bijwerken.
- Handmatige mobiele controle volgens [quickstart.md](./quickstart.md).

## Risk Analysis

| Risico | Impact | Mitigatie |
|--------|--------|-----------|
| Lijst in het paneel toont na een actie nog oude namen/tellingen | Gebruiker twijfelt of de actie slaagde | `revalidatePath('/crud')` in de acties + `router.refresh()`; paneel blijft open en krijgt nieuwe server-props. |
| Geneste dialogs (bevestiging boven beheerpaneel) | Escape sluit beide lagen, onduidelijke focus, slechte mobiele UX | Bevestiging is een aparte weergave **binnen** hetzelfde paneel, geen tweede `Dialog`. |
| Twee knoppen passen niet op 375 px | "Categorieën beheren" valt weg of wordt onbereikbaar | Actiegroep met `flex-wrap`; kop stapelt titel en acties op smalle schermen; mobiele Playwright-test bewaakt dit. |
| `role="dialog"` op de gedeelde Dialog beïnvloedt andere schermen | Regressie in bestaande dialogs of tests | Alleen semantiek toevoegen (geen gedragswijziging); bestaande dialogs roken met de CRUD-suite en één extra suite. |
| Verwijderen van de actieve categorie laat een lege filter-URL achter | Gebruiker ziet leeg grid | Bestaand gedrag behouden: `router.push('/crud')` wanneer `deleteTarget.id === activeCategoryId`. |
| Naam met alleen spaties of een mislukte servercall | Lege categorie of stille fout | Trim in de actie (bestaat al) + client-side disable; destructieve toast met de foutmelding; geen optimistische update. |
| Positienummering (`count` als volgende positie) kan na verwijderen dupliceren | Volgorde kan in theorie afwijken | Bestaand gedrag, niet verergerd door deze feature; als follow-up genoteerd (`MAX(position)+1`). |
| Kaartacties (verplaatsen/verwijderen van overzichten) blijven hover-only | Op mobiel kun je een overzicht nog niet aan een categorie toewijzen | Buiten deze spec (aanname: verplaatsen blijft via kaartmenu). Expliciet als follow-up opgenomen; categoriebeheer zelf is volledig touch-bedienbaar. |

## Out of Scope

- Categorieën op andere tabbladen (Borden, Content, Uren).
- Handmatig herordenen van categorieën (slepen) en bulkverwijdering.
- Categoriekleuren, iconen of sorteren/filteren binnen het beheerpaneel.
- Overzichten verplaatsen vanuit het beheerpaneel (blijft via het kaartmenu).
- Automatisch synchroniseren of real-time updates tussen browsertabs.
- Nieuwe databasetabellen, kolommen, indexen of migraties.
- Hover-only kaartacties touch-bedienbaar maken (aanbevolen follow-up, aparte feature).
- `position`-strategie van categorieën herzien (follow-up: `MAX(position)+1` in plaats van `COUNT(*)`).
