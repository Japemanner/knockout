# Contract: UI-componenten — categoriebeheer

**Feature**: 027-crud-categorie-beheer

## `CategoryManagerDialog` (nieuw)

**Bestand**: `src/components/crud/CategoryManagerDialog.tsx` — `'use client'`

```ts
interface CategoryWithCount {
  id: string
  name: string
  overviewCount: number
}

interface CategoryManagerDialogProps {
  categories: CategoryWithCount[]
  activeCategoryId: string | null
}
```

### Trigger

- Rendert een `Button` met `variant="outline"`, tekst **"Categorieën beheren"** en een `Settings2`-icoon.
- De knop is altijd zichtbaar en focusbaar; geen `hover`-voorwaarde, geen `title`-only label.
- Klik/tik opent de dialoog met `aria`-semantiek van de gedeelde `Dialog` (`role="dialog"`, `aria-modal="true"`).

### Weergaven (state-machine)

```text
lijst --"Toevoegen" (geldige naam)--> lijst (nieuwe rij achteraan)
lijst --"Hernoemen: <naam>"--> hernoem-modus (input in de rij)
hernoem-modus --"Opslaan" (geldige naam)--> lijst
hernoem-modus --"Annuleren" / Escape--> lijst
lijst --"Verwijderen: <naam>"--> bevestigingsweergave
bevestigingsweergave --"Annuleren"--> lijst
bevestigingsweergave --"Verwijderen"--> lijst zonder categorie (of navigatie naar /crud)
```

### Lijstweergave

| Element | Contract |
|---|---|
| Titel | `DialogTitle` "Categorieën beheren" |
| Aanmaakveld | `Input` met placeholder `Naam voor de nieuwe categorie...`, label "Nieuwe categorie" |
| Aanmaakknop | `Button` "Toevoegen"; disabled bij lege/whitespace-invoer of tijdens opslaan |
| Lege staat | "Nog geen categorieën. Maak je eerste categorie hierboven aan." |
| Rij | Naam (mag wrappen/afkappen, `min-w-0`), telling als `0 overzichten` / `1 overzicht` / `n overzichten` |
| Hernoemknop | `Button` met `aria-label="Hernoemen: <naam>"`, `Pencil`-icoon, zichtbaar zonder hover |
| Verwijderknop | `Button` met `aria-label="Verwijderen: <naam>"`, `Trash2`-icoon, zichtbaar zonder hover |
| Scroll | Lijst en dialoog samen scrollbaar (`max-h-[85vh] overflow-y-auto`); alle rijen/acties bereikbaar |
| Volgorde | Exact de volgorde van de `categories`-prop (aanmaakvolgorde uit de server) |

### Hernoem-modus

- De rij toont een `Input` met `aria-label="Nieuwe naam voor <naam>"`, gevuld met de huidige naam.
- Knoppen "Opslaan" (disabled bij lege/whitespace naam of tijdens opslaan) en "Annuleren".
- `Enter` = opslaan, `Escape` = annuleren.
- Na succes: toast "Hernoemd" met de nieuwe naam, `router.refresh()`, terug naar de lijst.
- Na fout: destructieve toast, de input en waarde blijven staan.

### Bevestigingsweergave (verwijderen)

- Vervangt de lijst **binnen dezelfde dialoog**; er opent geen tweede dialoog.
- Toont: titel "Categorie verwijderen?", de categorienaam en de tekst "De overzichten in deze categorie blijven bestaan en worden ongecategoriseerd."
- Knoppen "Annuleren" (terug naar lijst) en "Verwijderen" (`variant="destructive"`, disabled tijdens de actie).
- Na succes: toast "Categorie verwijderd" met "De overzichten zijn ongecategoriseerd behouden"; `router.refresh()`; als `activeCategoryId === category.id` dan `router.push('/crud')`.
- Na fout: destructieve toast; de lijst blijft intact en de bevestigingsweergave blijft staan tot de gebruiker annuleert.

### Toegankelijkheid en touch

- Geen enkele actie is afhankelijk van hover; alle knoppen hebben een minimale hoogte van 36 px (`Button`-default `h-9`) en een expliciet label.
- Iconen zijn decoratief; het `aria-label` bevat de categorienaam zodat rijen uniek selecteerbaar zijn.
- De dialoog sluit via Escape en via klik op de overlay (bestaand gedrag van `Dialog`).

## `CategoryTabs` (gewijzigd)

**Bestand**: `src/components/crud/CategoryTabs.tsx` — server component (geen `'use client'`)

```ts
interface CategoryTabsProps {
  categories: { id: string; name: string }[]
  activeCategoryId: string | null
}
```

| Element | Contract |
|---|---|
| "Alle" | `Link href="/crud"`, actief wanneer `activeCategoryId === null` |
| Categorietab | `Link` naar `/crud?category=<id>`, actief bij match |
| Layout | Eén horizontale rij, `flex items-center gap-1.5 overflow-x-auto`, tabs `shrink-0 whitespace-nowrap`; nooit verticaal stapelen |
| Acties | **Geen** `+`, geen hernoemen, geen verwijderen, geen dialogs, geen hover-iconen |
| Behoud | Actieve stijl (`border-primary bg-primary text-primary-foreground`) en hoverstijl voor niet-actieve tabs |

## `src/app/(dashboard)/crud/page.tsx` (gewijzigd)

| Aspect | Contract |
|---|---|
| Data | Blijft 2 parallelle queries (categorieën op `position`, overzichten op `position`) |
| Telling | `Map<string, number>` over `allOverviews`; `overviewCount` per categorie; geen extra query |
| Kop | `flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between` |
| Actiegroep | `flex flex-wrap items-center gap-2` met eerst `CategoryManagerDialog`, dan `CreateCrudButton` |
| Tabs | Ongewijzigde aanroep `CategoryTabs` + bestaand `?category=`-filter en leegstaat-berichten |
| Grid | Ongewijzigd |

## `src/components/ui/dialog.tsx` (gewijzigd)

- Het paneel-div krijgt `role="dialog"` en `aria-modal="true"`.
- Afmetingen (`w-full max-w-lg max-h-[85vh] overflow-auto`), Escape-afhandeling en overlay-click blijven exact gelijk.
- Geen nieuwe varianten of props; alle bestaande aanroepen blijven werken.

## Niet gewijzigd

- `CreateCrudButton.tsx` / `CreateCrudDialog.tsx`: de categorie-select en de voorinvulling blijven zoals ze zijn.
- `CrudOverviewCard.tsx`: het kaartmenu (verplaatsen/verwijderen) blijft ongewijzigd; het is geen onderdeel van dit beheerpaneel.
- `createCrudCategory` / `renameCrudCategory` / `deleteCrudCategory`: contracten ongewijzigd (zie [server-actions.md](./server-actions.md)).
