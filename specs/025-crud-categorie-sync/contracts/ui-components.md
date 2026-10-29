# UI Components Contract: 025-crud-categorie-sync

**Feature**: 025-crud-categorie-sync | **Datum**: 2026-10-29

Stijl en interacties volgen de bestaande CRUD-componenten (shadcn/ui, in-app dialogen, toasts via `useToast`, `router.refresh()` na mutaties — geen browserdialogen).

## Nieuw: `CategoryTabs.tsx` (client)

**Props**: `categories: { id: string; name: string }[]` · `activeCategoryId: string | null` · `crudCount: number` (aantal overzichten in de actieve selectie, voor de leegstaat)

- Eén horizontale rij: `flex items-center gap-2 overflow-x-auto` (nooit verticaal gestapeld, FR-003); passen de tabs niet, dan scrollt alleen de rij.
- Tab "Alle": `<Link href="/crud">`; categorietabs: `<Link href={/crud?category=<id>}>`; actieve tab visueel gemarkeerd met de bestaand knop/tab-stijl.
- "+"-knop rechts in de rij: opent aanmaakdialoog met naamveld (Enter = opslaan); lege naam → inline foutmelding, dialoog blijft open (FR-002).
- Hover-menu per categorietab (pencil + trash):
  - **Hernoemen** — dialoog met huidige naam vooringevuld; na opslaan toont de tab direct de nieuwe naam (FR-006).
  - **Verwijderen** — bevestigingsdialoog met expliciete tekst: *"Overzichten in deze categorie blijven bestaan en worden ongecategoriseerd."* (FR-008).
- Na elke geslaagde mutatie: toast + `router.refresh()`; fout: destructive toast.

## Gewijzigd: `CreateCrudButton.tsx` + `CreateCrudDialog.tsx`

**Nieuwe props**: `categories: { id: string; name: string }[]` · `defaultCategoryId: string | null` (de geselecteerde tab).

- Dialoog krijgt een select "Categorie" boven het tabelveld, opties: "Geen categorie" (default als `defaultCategoryId` leeg is) + alle categorieën; vooringevuld met de actieve tab (FR-005).
- `onCreate` breidt uit met `category_id: string | null` → `createCrudOverview`.
- Overige flow (tabelkeuze, naam-auto-invulling, interactie) ongewijzigd.

## Gewijzigd: `CrudOverviewCard.tsx`

- Hover-icon rechtsboven wordt een overflow-menu (`MoreVertical`): **"Verplaatsen naar…"** (lijst categorieën + "Geen categorie", FR-007) en **"Verwijderen"** (bestaande bevestigingsdialoog ongewijzigd).
- Na verplaatsen: toast met doelcategorie + `router.refresh()` zodat bron- en doelgrid sync lopen.
- Kaartinhoud (icoon, naam, tabel) ongewijzigd.

## Nieuw: `SyncSchemaButton.tsx` (client)

**Props**: `crudId: string`

- Knop "Synchroniseren" (RefreshCw-icoon, variant outline) in de actiebalk van de detailpagina, naast `ColumnVisibilityDialog` en `CrudDetailActions`.
- Klik: knop disabled + spinner → `syncCrudOverviewSchema({ crudId })`:
  - succes met wijzigingen: toast *"Structuur bijgewerkt (n toegevoegd, m verwijderd)"*;
  - succes zonder wijzigingen: toast *"Structuur is actueel"*;
  - fout: destructive toast met de foutmelding (FR-014), niets gewist;
  - daarna altijd `router.refresh()` zodat de tabel met de nieuwe structuur rendert (FR-011/FR-012).

## Gewijzigd: pagina's

### `src/app/(dashboard)/crud/page.tsx`

- `searchParams.category` uitlezen (Promise, Next 15-conventie); `Promise.all` voor categorieën (`position` ascending) en overzichten.
- Server-side filter: actieve categorie → `.eq('category_id', id)`; "Alle" → geen filter.
- Render: header met `CategoryTabs` + `CreateCrudButton` (met categorie-props), daaronder het bestaande grid met `CrudOverviewCard`s (nieuwe prop: categorielijst voor het verplaats-menu).
- Leegstaat: bestaande melding, aangevuld met categorienaam indien een categorie geselecteerd is (edge case 1).

### `src/app/(dashboard)/crud/[crudId]/page.tsx`

- `SyncSchemaButton` toevoegen in alle actiebalk-varianten (gelukt, meta-fout blijft zonder knop).
- Kopregel en error-states ongewijzigd.