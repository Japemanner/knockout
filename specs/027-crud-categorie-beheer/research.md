# Research: Centraal categoriebeheer op het CRUD-tabblad

**Feature**: 027-crud-categorie-beheer | **Date**: 2026-11-03 | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

Dit document legt de technische keuzes vast voor het vervangen van het hover-gebaseerde categoriebeheer door één centraal beheerpaneel op `/crud`. Er zijn geen `NEEDS CLARIFICATION`-punten uit de Technical Context overgebleven.

## 1. Beheervorm: één dialoog op de bestaande pagina

**Decision**: Het beheer leeft in één in-app dialoog (`CategoryManagerDialog`) die opent vanuit de paginakop van `/crud`. De dialoog bevat de volledige lijst, het aanmaakformulier, inline hernoemen en de verwijderbevestiging.

**Rationale**: De spec eist een knop naast "Nieuwe CRUD" en centrale bediening. De bestaande `Dialog` (max. 85vh, intern scrollbaar) is al het patroon voor `ColumnVisibilityDialog` en de categorie-dialogs van feature 025. Eén dialoog betekent geen routing-, ISR- of state-synchronisatie en werkt op touch zodra de trigger een gewone knop is.

**Alternatives considered**:
- **Aparte route** (`/crud/categorieen`): extra navigatie, extra server-render en een terugweg die de actieve `?category=`-filter moet herstellen. Voegt complexiteit toe zonder gebruikerswinst.
- **Inline uitklapbaar paneel boven het grid**: duwt de overzichten naar beneden, oogt op mobiel als een tweede pagina en vraagt eigen open/dicht-state.
- **Bottom sheet**: mobiel vriendelijk, maar er is geen bestaand sheet-component; een nieuwe UI-primitief voor één scherm is overkill.

## 2. Hergebruik van de bestaande server actions en het revalidatiepatroon

**Decision**: `createCrudCategory`, `renameCrudCategory` en `deleteCrudCategory` blijven ongewijzigd. Na een geslaagde actie doet het paneel `router.refresh()`; de actions doen zelf al `revalidatePath('/crud')`.

**Rationale**: De acties valideren al op lege namen, scopen op `user_id`, zetten de positie en laten overzichten bestaan dankzij `ON DELETE SET NULL`. Het CRUD-tabblad is een server component; het bestaande patroon (server action + revalidatie + refresh) houdt de pagina consistent en voorkomt een tweede datalaag. De dialoog blijft tijdens `router.refresh()` gemount (state blijft behouden) en krijgt nieuwe props.

**Alternatives considered**:
- **React Query/optimistic updates** (zoals content/uren): een andere datalaag voor één klein paneel, met eigen cache-keys en invalidatie. De CRUD-module gebruikt bewust server components.
- **Lokale state bijwerken zonder refresh**: de tellingen en de tabrij komen uit server-props; lokale synchronisatie zou twee bronnen waarheid geven.
- **Nieuwe acties of RPC's**: geen functionele noodzaak; bestaande acties dekken alles.

## 3. Telling per categorie afleiden uit de bestaande overzichten-query

**Decision**: `page.tsx` bouwt met één `Map<string, number>` het aantal overzichten per categorie uit `allOverviews` en geeft `{ id, name, overviewCount }[]` aan het paneel.

**Rationale**: De pagina laadt alle overzichten toch al voor het grid en de filtering. Tellen is O(n) en kost geen extra round-trip. De telling is altijd consistent met wat het grid toont, ook direct na een verplaatsing of verwijdering.

**Alternatives considered**:
- **Per categorie een `count`-query**: N+1 en trager bij veel categorieën.
- **SQL `GROUP BY`-RPC**: extra call en extra invalidatie voor data die al in het geheugen staat.
- **Client-side tellen in het paneel**: zou de volledige overzichtenlijst als prop nodig hebben; de server kent de telling al.

## 4. Hernoemen inline, verwijderen als bevestigingsweergave in hetzelfde paneel

**Decision**: Hernoemen gebeurt inline in de rij (input + Opslaan/Annuleren, Enter/Escape). Verwijderen schakelt het paneel naar een bevestigingsweergave met categorienaam en gevolg; annuleren brengt de lijst terug.

**Rationale**: Inline hernoemen is één tik minder dan een geneste dialoog en houdt de context zichtbaar. Een tweede `Dialog` boven de eerste geeft twee overlays met dezelfde z-index en twee Escape-listeners; op mobiel is dat foutgevoelig. Een bevestigingsweergave binnen hetzelfde paneel is even duidelijk en technisch veilig.

**Alternatives considered**:
- **Geneste bevestigingsdialoog**: overlay-stacking, Escape sluit beide, focus raakt zoek.
- **`window.confirm`**: in strijd met het bestaande in-app dialoogpatroon en niet stylebaar.
- **Direct verwijderen met undo-toast**: vraagt een extra herstelactie en een tijdelijke "verwijderd"-status; de spec eist expliciete bevestiging.

## 5. `CategoryTabs` degraderen tot server-rendered navigatie

**Decision**: `CategoryTabs.tsx` verliest `'use client'`, alle state en alle beheer-dialogs. Het blijft een rij met `Link`s ("Alle" + categorieën) en de bestaande actieve styling/scroll-gedrag.

**Rationale**: De beheeracties verhuizen naar het paneel; resterende client-state in de tabs zou dode code en een tweede beheerpad zijn. Een server component verkleint de bundle en maakt hover-afhankelijkheid onmogelijk.

**Alternatives considered**:
- **Client component houden en de iconen verbergen op mobiel**: laat twee beheerpaden bestaan en lost hover op met media-query-hacks.
- **Tabs en beheer in één component houden**: één groot component met twee verantwoordelijkheden; slechter testbaar.

## 6. Responsieve paginakop met één actiegroep

**Decision**: De kop wordt `flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`; de twee knoppen zitten samen in `flex flex-wrap items-center gap-2`, met "Categorieën beheren" (outline) vóór "Nieuwe CRUD" (primary).

**Rationale**: Op 375 px passen titel en twee knoppen niet op één regel. Door de acties als groep te laten wrappen blijven beide knoppen zichtbaar en naast elkaar, zonder ze achter een overloopmenu of hover te verstoppen (FR-002). De primaire actie blijft visueel dominant.

**Alternatives considered**:
- **Alleen een icoon op mobiel**: compacter, maar de betekenis gaat verloren en de spec noemt het label.
- **Overloopmenu (`…`)**: verbergt de nieuwe centrale ingang — precies het probleem dat deze feature oplost.
- **Knop in de tabrij**: de tabrij is scrollbaar en op mobiel juist de plek waar de huidige ingang onvindbaar is.

## 7. Modal-semantiek toevoegen aan de gedeelde `Dialog`

**Decision**: Het paneel in `src/components/ui/dialog.tsx` krijgt `role="dialog"` en `aria-modal="true"`. Gedrag (Escape, overlay-click, afmetingen) blijft ongewijzigd. Knoppen in het beheerpaneel krijgen expliciete `aria-label`s; icoonknoppen krijgen geen hover-only zichtbaarheid.

**Rationale**: Zonder rol is de dialoog voor screenreaders een gewone div en zijn Playwright-selectors op `getByRole('dialog')` onbetrouwbaar (de bestaande tests gebruiken die rol al). De wijziging is één regel per attribuut en raakt alle dialogs op dezelfde voorspelbare manier.

**Alternatives considered**:
- **Alleen de nieuwe component voorzien van een rol-wrapper**: omzeilt het gedeelde component en laat bestaande dialogs ontoegankelijk.
- **Volledige focus-trap + `aria-labelledby`-plumbing**: betere a11y, maar een grotere wijziging in een gedeeld component; buiten de kern van deze feature. Wel als verbeterpunt genoteerd.

## 8. Tests: herschrijven zonder hover, plus een mobiele viewport

**Decision**: `tests/e2e/crud-categorieen.spec.ts` wordt herschreven met helpers die het paneel openen en alle acties via zichtbare knoppen uitvoeren. Nieuwe tests: tellingen en een `test.describe` met `test.use({ viewport: { width: 375, height: 667 } })` voor de mobiele flow.

**Rationale**: De huidige tests leunen op `hover()` en `div.group`, precies het gedrag dat verdwijnt. Een viewport-test is de enige betrouwbare manier om "geen hover nodig" en "beide knoppen zichtbaar" te bewaken. Login-skip-guards blijven nodig omdat de suite ook zonder sessie draait.

**Alternatives considered**:
- **Alleen handmatig mobiel testen**: niet regressiebestendig; AGENTS.md eist een test bij gewijzigde flows.
- **Een extra Playwright-project voor mobiel**: draait de hele suite dubbel; een viewport per describe is gerichter.
- **Unit-test op de telhelper**: de telling is een triviale Map-pass; een E2E die de gerenderde tekst controleert dekt het gedrag dat de gebruiker ziet.

## 9. Geen migratie, geen nieuwe types

**Decision**: De bestaande migratie `024_crud_categories.sql` en de types `CrudCategory` / `CRUDOverview.category_id` blijven ongewijzigd bruikbaar. Er komt geen nieuwe migratie.

**Rationale**: Alle benodigde velden (naam, positie, eigenaar, `category_id` met `ON DELETE SET NULL`) en policies bestaan. De nieuwe telling is afgeleid en hoeft niet opgeslagen te worden. Dit houdt de feature klein en voorkomt onnodige schemawijzigingen.

**Alternatives considered**:
- **`overview_count` denormaliseren**: extra kolom, trigger en invalidatie voor een berekening die O(n) is op een persoonlijke dataset.
- **Nieuwe index**: de bestaande indexen (`user_id, position` en `user_id, category_id`) dekken de queries.
