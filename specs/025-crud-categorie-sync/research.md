# Research: CRUD-categorieën en Supabase-sync

**Feature**: 025-crud-categorie-sync | **Datum**: 2026-10-29 | **Status**: afgerond

Geen NEEDS CLARIFICATION-markers. Beide scope-vragen uit de spec zijn op 2026-10-29 voorgelegd en beantwoord (zie spec, Clarifications). Onderstaande beslissingen zijn gevalideerd tegen de bestaande code (`src/app/(dashboard)/crud/`, `src/actions/crud-overviews.ts`, `src/actions/local-db.ts`, `src/lib/column-filters.ts`) en de besluiten in `/decisions/`.

## Onderzoeksvragen en beslissingen

### 1. Waar worden categorieën opgeslagen?

**Decision**: aparte tabel `kk_crud_categories` (naam, positie, eigenaar) plus een nullable `category_id` op `kk_crud_overviews` met `ON DELETE SET NULL`.

**Rationale**: hernoemen van een categorie is dan één update (alle overzichten volgen automatisch via de referentie); verwijderen laat overzichten bestaan (spec FR-008) en "ongecategoriseerd" is simpel `IS NULL` — geen enkele migratie van bestaande overzichten nodig.

**Alternatieven afgewezen**:
- Categorie als tekstveld op `kk_crud_overviews` — hernoemen vereist een massa-update, geen leegstaat of positie per categorie, typeertrend naar inconsistente namen.
- Categorie als array-veld — spec zegt expliciet: één overzicht hoort hooguit bij één categorie.

### 2. Hoe werkt categoriewissel in de UI?

**Decision**: URL-parameter `?category=<uuid>` met server-side filteren; de tabrij bestaat uit `<Link>`s (Next.js prefetch + werkende back-knop). De tab "Alle" is de pagina zonder parameter.

**Rationale**: het CRUD-tabblad is volledig server-rendered met ISR (`revalidate = 60`); URL-state past in dat patroon zonder het dataflow-besluit voor de CRUD-module te doorbreken. Elke URL-variant krijgt een eigen ISR-cache — persoonlijk volume (weinig categorieën) maakt dat verwaarloosbaar.

**Alternatieven afgewezen**:
- Client-state filtering (alle overzichten naar de browser sturen) — doorbreekt de server-render-conventie van deze module en verschaft data die de geselecteerde categorie niet nodig heeft.
- Aparte route `/crud/categorie/[id]` — meer routing-oppervlak zonder meerwaarde; `searchParams` volstaat.

### 3. Wat is er nu eigenlijk "verouderd" — waarom bestaat de delete+recreate-workaround?

**Analyse**: de detailpagina heeft `revalidate = 60` (ISR). Mutatie-actions (`updateCrudOverview`) revalideren alleen `/crud`, nooit de detailroute. Schemawijzigingen van buiten de app (Supabase-dashboard) triggeren helemaal geen revalidatie. De gebruiker ziet dus oude kolommen tot de ISR-venster verstreken én een nieuw request binnenkomt — praktisch: "nooit" tijdens een open sessie. De gevonden workaround: overzicht verwijderen en opnieuw aanmaken (dat revalideert `/crud` en creëert een nieuwe route-cache).

**Decision**: een expliciete sync-action. Server actions worden niet ge-ISR-cached, dus de RPC-call binnen de action haalt altijd verse metadata op. De action (a) haalt meta op, (b) saneert de kolominstellingen tegen de actuele kolommen, (c) persiteert alleen bij wijzigingen en (d) revalideert de detailroute expliciet — de gevonden workaround verdwijnt.

### 4. Saneert de sync ook instellingen, of alleen de weergave?

**Decision**: ook instellingen. Anders blijven verwijderde kolommen hangen in `hidden_columns`, `column_order` en `column_filters`. Filters zijn al opschoonbaar via de bestaande `pruneStaleFilters` (feature 018, FR-012); verborgen kolommen en volgorde krijgen een eigen prune. Beide zitten in één pure functie `pruneColumnSettings` in `src/lib/crud/schema-sync.ts` — unit-testbaar volgens de decimal-helper-conventie.

**Alternatief afgewezen**: alleen revalideren en bij renderen filteren — instellingen blijven dan vervuilen en de kolom-zichtbaarheid-dialoog toont dode kolommen.

### 5. Migratienummering?

**Decision**: `024_crud_categories.sql`. De hoogste toegepaste migratie is `022_content_calendar.sql`; nummer `023` is in het plan van `specs/024-post-bijlagen` gereserveerd voor `023_content_attachments.sql` (gepland, nog niet toegepast). 024 vermijdt een collisie zodra bijlagen landt.

### 6. Posities en volgorde van categorieën?

**Decision**: `position int not null default 0`, append met `MAX(position) + 1` — identiek aan het bestaande patroon voor `kk_crud_overviews`. Handmatig herordenen valt buiten scope (spec-assumptie); de kolom ligt klaar voor een vervolgfeature.

### 7. Wat gebeurt er bij verwijderen van een categorie?

**Decision**: `ON DELETE SET NULL` op `category_id` (veilige standaard, FR-008: overzichten blijven bestaan en worden ongecategoriseerd onder "Alle"). De bevestigingsdialoog noemt dit gedrag expliciet, zodat de gebruiker niet schrikt.

**Alternatief afgewezen**: cascade verwijderen van overzichten — destructief en tegen FR-008; blokkeren van verwijderen bij niet-lege categorie — dwingt eerst handmatig verplaatsen, geen toegevoegde waarde.

### 8. Nieuwe kolommen na sync: zichtbaar of verborgen?

**Decision**: direct zichtbaar (spec FR-012). Een nieuwe kolom staat per definitie niet in `hidden_columns`; kolommen buiten `column_order` plaatsen achteraan conform bestaand gedrag (features 015/019). Verbergen kan daarna via de bestaande kolom-zichtbaarheid-dialoog.

### 9. Feedback van de sync-knop?

**Decision**: de action retourneert `{ added, removed }` (kolomnamen); de knop toont "Structuur bijgewerkt (n toegevoegd, m verwijderd)" of "Structuur is actueel" bij geen wijziging — dit dekt ook de edge case "sync zonder dat er iets is gewijzigd: geslaagd, geen fout" uit de spec.

## Conclusie

Alle onderzoeksvragen beantwoord. Implementatie: 1 migratie (tabel + kolom + RLS + indexen), 1 nieuw lib-bestand (pure helpers), 5 nieuwe server actions (3 categorie + verplaatsen + sync) plus uitbreidingen op 3 bestaande actions, 2 nieuwe componenten + 3 componentwijzigingen, 2 testbestanden. Geen nieuwe dependencies, geen service-role, geen Edge Functions. Prerequisite: geen.