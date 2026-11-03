# Research: Content-ideeën snel vastleggen en overzicht per soort

**Feature**: 026-content-ideas-views | **Date**: 2026-11-03 | **Spec**: [spec.md](./spec.md)

Dit document legt de technische keuzes vast voor de herstructurering van de content-feature: kalender eruit, twee views (ideeën vastleggen + overzicht per contentsoort), en de velden Format, Datum, Tijd en LinkedIn-URL uit de ideëen-UI.

## 1. Twee views als tabbladen binnen de bestaande route

**Decision**: Beide views leven in de bestaande route `/content` en worden geschakeld met een toegankelijke tablist (`role="tablist"`, `role="tab"`, `aria-selected`, `role="tabpanel"`). De actieve view is lokale state in `ContentView`, met "Ideeën" als default.

**Rationale**: De spec vraagt twee views, geen twee navigatie-items. Eén route betekent één SSR-prefetch en geen extra navigatie- of refetch-kosten. Tabbladen zijn direct herkenbaar en werken op mobiel.

**Alternatives considered**:
- Twee routes (`/content` en `/content/overzicht`): extra navigatie, extra prefetch, en de gedeelde data zou twee keer geladen moeten worden.
- Twee items in de linkerbalk: in strijd met de spec-aanname dat de twee views binnen de content-pagina vallen.
- URL-query (`?view=overzicht`): handig voor deelbare links, maar niet nodig voor een persoonlijke app en voegt state-synchronisatie toe.

## 2. Eén complete posts-query plus een pillars-query

**Decision**: De content-pagina leest nog maar twee datasets: alle posts (nieuwste eerst) en alle contentsoorten (inclusief gearchiveerd, op `position`). De maand- en ideeënbak-queries vervallen.

**Rationale**: Het overzicht moet over alle ideeën tellen, niet over een maandvenster. De lijst moet alle ideeën tonen. Eén posts-query bedient beide views en voorkomt dat dezelfde rijen via twee queries worden opgehaald. De tellingen zijn een pure afleiding van dezelfde data, dus sorteren/filteren kan client-side.

**Alternatives considered**:
- Maandquery behouden en daarnaast een aparte count-query: extra round-trip en twee bronnen die uit sync kunnen raken.
- Een SQL `GROUP BY`-RPC voor de tellingen: minder data-overdracht, maar de lijst heeft de posts toch nodig; de RPC voegt een tweede netwerkcall en invalidatiecomplexiteit toe.
- Data pas laden bij het openen van de overzicht-tab: trager en de tellingen zijn juist direct nodig.

## 3. Supabase-paginering voor de complete lijst

**Decision**: `fetchPosts` haalt posts op in batches van 1.000 via `.range(offset, offset + 999)` en herhaalt tot een batch kleiner is dan 1.000. De volgorde is `created_at DESC`, met `id` als tiebreaker voor een stabiele volgorde.

**Rationale**: Supabase/PostgREST geeft standaard maximaal 1.000 rijen terug. Zonder paginering zouden zowel de lijst als de tellingen stilletjes onvolledig worden. De spec eist dat alle ideeën zichtbaar zijn en precies één keer meetellen. Voor een persoonlijke ideeënbank is een batchlus van 1.000 ruim voldoende en eenvoudiger dan een gepagineerde UI.

**Alternatives considered**:
- `.limit(10000)`: omzeilt de standaardlimiet niet betrouwbaar en is een magic number.
- Infinite scroll of "meer laden": betere keuze boven tienduizenden rijen, maar buiten de gevraagde scope en maakt "alle ideeën tellen" complexer.
- Count-RPC plus een gelimiteerde lijst: dekt de tellingen wel, maar niet de eis dat alle ideeën in de lijst staan.

## 4. Tellingen client-side als pure functie

**Decision**: `countIdeasByPillar(posts, pillars)` in `src/lib/content/ideas.ts` levert per soort een rij met `count`, plus `total` en `unassigned`. Alle soorten komen mee, ook met 0; de groep "Geen soort" verschijnt alleen als er daadwerkelijk ideeën zonder soort zijn.

**Rationale**: De data is al aanwezig; tellen is O(n) en direct. Nieuwe of gewijzigde ideeën verschijnen zonder extra servercall in het overzicht. De functie is puur en daardoor eenvoudig unit-testbaar (zelfde patroon als de oude kalenderlogica).

**Alternatives considered**:
- SQL-aggregatie: extra call, extra invalidatie, en de lijst heeft de posts toch al.
- Per soort een `count`-query: N+1 en traag bij veel soorten.
- Alleen tellen wat in de lijst zichtbaar is: onjuist zodra de lijst ooit wordt ingekort.

## 5. Niet-destructief datamodel

**Decision**: Bestaande kolommen en waarden blijven staan. De content-UI leest en schrijft `format`, `planned_date`, `planned_time`, `linkedin_url` en `scheduled_on_linkedin_at` niet meer, maar verwijdert ze niet. De `kk_content_slots`-tabel blijft bestaan maar wordt niet meer gelezen of beschreven.

**Rationale**: De spec eist expliciet dat geen enkel eerder bewaard item verdwijnt en dat oude waarden bewaard blijven. Een destructieve migratie is onomkeerbaar en levert geen gebruikerswaarde op. Bestaande posts met een datum of status Gepland/Live worden gewoon ideeën.

**Alternatives considered**:
- Kolommen droppen: dataverlies en in strijd met FR-023/FR-024.
- Rijen met een datum verbergen: in strijd met FR-023.
- Slot-tabel droppen: niet nodig en riskant als feature 024 of een latere feature er nog naar verwijst.

## 6. Datum/tijd-constraint uit de database halen

**Decision**: De migratie `supabase/migrations/025_content_ideas.sql` dropt `kk_content_posts_datetime_required` (idempotent), verwijdert de DELETE-policy op `kk_content_pillars` (zodat archiveren de enige weg is) en voegt een index `(user_id, created_at DESC)` toe voor de nieuwe lijstquery.

**Rationale**: De bestaande CHECK-constraint eist datum en tijd zodra de status Gepland of Live is. De nieuwe UI mag de status vrij wijzigen zonder datum/tijd (FR-012) en toont die velden niet meer. Zonder migratie zou zo'n wijziging door de database worden geweigerd. De constraint is een vangnet uit de kalendertijd en heeft geen functie meer.

**Alternatives considered**:
- De statuskeuze beperken tot Idee/Concept/Klaar: in strijd met de spec dat bestaande statussen en waarden behouden blijven en vrij wisselbaar zijn.
- Datum/tijd automatisch invullen: verborgen data en verwarrend gedrag.
- De constraint laten staan en alleen de UI aanpassen: serveracties zouden bij Gepland/Live stuklopen.

## 7. Status behouden, validatie versmallen

**Decision**: De statuswaarden Idee, Concept, Klaar, Gepland en Live blijven bestaan als optioneel label. Een nieuw idee krijgt Idee. De regels dat Gepland/Live een datum en tijd vereisen en dat een LinkedIn-URL met `https://www.linkedin.com/` moet beginnen, vervallen. De bestaande tekstregel blijft: Klaar/Gepland/Live vereisen een niet-lege tekst van maximaal 3.000 tekens.

**Rationale**: De gebruiker noemde alleen Format, Datum, Tijd en LinkedIn-URL als velden die mogen verdwijnen, niet de status. De status en de tekenteller/hook-preview/kopieerknop zijn bestaande, nuttige functies. De tekstregel is onafhankelijk van de verdwenen velden en voorkomt lege "Klaar"-items. De serveractie en de editor gebruiken dezelfde pure validatiefunctie, zodat een API-bypass geen ongeldige status oplevert.

**Alternatives considered**:
- Status volledig verwijderen: niet gevraagd, kost bestaande data/functionaliteit en raakt de bestaande editor onnodig.
- Alle statusregels laten vallen: dan kan een leeg idee op Klaar/Gepland/Live staan, wat de tekenteller en de bestaande betekenis ondermijnt.
- Status beperken tot Idee: te beperkend voor bestaande data.

## 8. Kalendercode en drag-and-drop verwijderen

**Decision**: Verwijder `MonthGrid.tsx`, `DayCell.tsx`, `SlotPlaceholder.tsx`, `PostChip.tsx`, `IdeasPanel.tsx`, `calendar.ts`, de maand-/ideeënbak-queries, de slot- en verplaats-actions, de bijbehorende hooks en de kalender-E2E/unit-tests. Vervang ze door de nieuwe ideeëncomponenten en `src/lib/content/ideas.ts`.

**Rationale**: Dode kalendercode blijft anders rondslingeren, houdt `@dnd-kit`-imports en verouderde tests in stand, en maakt het onduidelijk welke code de actieve feature is. De nieuwe feature heeft geen raster, slots of drag nodig. `@dnd-kit` blijft als package bestaan voor de kanban-feature.

**Alternatives considered**:
- Kalendercomponenten laten staan maar niet renderen: verwarrend, extra bundle en tests die blijven falen.
- `calendar.ts` hergebruiken voor teksthelpers: de naam en de helft van de exports zijn kalender-specifiek; een nieuwe, kleine `ideas.ts` is duidelijker.

## 9. Vastlegformulier: titel-only opslaan, Enter in het titelveld

**Decision**: Het formulier toont titel (verplicht), contentsoort en idee-tekst direct; bron-URL en notities zitten achter een ingeklapt "Meer details". Opslaan kan met de knop, met Enter in het titelveld en met Ctrl/Cmd+Enter vanuit het hele formulier. Enter in de tekstarea slaat niet op. Tijdens een lopende opslag is de knop geblokkeerd.

**Rationale**: Zo is een idee met alleen een titel in twee handelingen bewaard, terwijl de optionele velden beschikbaar blijven. Enter in een tekstarea mag geen idee opslaan, anders verlies je regelovergangen. De blokkade voorkomt dubbele items bij snel achter elkaar drukken.

**Alternatives considered**:
- Alle velden altijd zichtbaar: langzamer en visueel zwaarder.
- Alleen titel + soort: de spec noemt ook idee-tekst, bron-URL en notities als onderdeel van het idee.
- Alleen een knop: minder snel dan Enter.

## 10. Archiveren blijft, met server-side controle

**Decision**: Contentsoorten blijven archiveerbaar en heractiveerbaar; verwijderen blijft verboden. Bij `createPost` en bij een gewijzigde `pillar_id` in `updatePost` controleert de serveractie dat de soort van de gebruiker is en niet gearchiveerd. Een bestaande post die al een gearchiveerde soort heeft, mag die soort houden.

**Rationale**: De UI filtert gearchiveerde soorten uit de keuzelijst, maar een open tab of een directe API-call kan alsnog een gearchiveerde soort meesturen. Server-side controle maakt FR-021 betrouwbaar. De uitzondering voor de bestaande soort voorkomt dat een oud idee niet meer opgeslagen kan worden.

**Alternatives considered**:
- Alleen client-side filteren: omzeilbaar en dus onbetrouwbaar.
- Elke post met een gearchiveerde soort bij opslaan blokkeren: maakt oude ideeën onbewerkbaar.

## 11. Datumweergave met vaste Amsterdamse tijdzone

**Decision**: De aanmaakdatum in de lijst wordt geformatteerd met `Intl.DateTimeFormat('nl-NL', { timeZone: 'Europe/Amsterdam', day: 'numeric', month: 'short', year: 'numeric' })` in een pure helper.

**Rationale**: De client component wordt ook op de server gerenderd. Zonder vaste tijdzone kan de server (UTC) een andere dag tonen dan de browser (Amsterdam), met een hydration-mismatch tot gevolg. Deze aanpak volgt het bestaande `Intl`-patroon uit `src/lib/hours/dates.ts`.

**Alternatives considered**:
- `toLocaleDateString()` zonder tijdzone: gevoelig voor server/client-verschil.
- `date-fns` met lokale tijd: dezelfde mismatch en extra import voor één label.
- De datum weglaten: de spec vraagt de aanmaakdatum in de lijst.

## 12. Teststrategie: pure unit-tests plus login-gated E2E

**Decision**: Nieuwe `tests/e2e/content-ideas-logic.spec.ts` test de pure functies (`countIdeasByPillar`, `validateStatusChange`, `charCount`, `hookPreview`, datumformattering). Nieuwe `tests/e2e/content-ideas.spec.ts` test de gebruikersflows met de bestaande login-skip-guard. De kalendertests worden verwijderd.

**Rationale**: Het bestaande project gebruikt Playwright zowel voor pure functietests (directe imports) als voor E2E. De login-skip-guard is verplicht volgens AGENTS.md. Data-correctheid wordt gecontroleerd door na opslaan te herladen en de telling in het overzicht te vergelijken. Unieke namen met `Date.now()` voorkomen botsingen bij parallelle tests.

**Alternatives considered**:
- Vitest introduceren: nieuwe tooling voor dezelfde dekking; niet nodig.
- Alleen E2E: traag en de tellingen/validatieregels zijn beter als pure unit-tests te testen.
- Alleen unit-tests: de mutant-flows (opslaan, herladen, tellen) moeten end-to-end bewezen worden.

## 13. Deterministische preservatie: whitelist-helper plus vaste fixture

**Decision**: `buildPostWritePayload(patch)` in `src/lib/content/ideas.ts` is de enige plek die bepaalt welke keys naar `kk_content_posts` gaan. Daarnaast komt er een vaste fixture `tests/fixtures/legacy-content.sql` met één post die `planned_date`, `planned_time`, `format`, `linkedin_url`, `scheduled_on_linkedin_at` en status `gepland` heeft. De preservatietest faalt als de fixture ontbreekt of als de legacy-kolommen zichtbaar worden.

**Rationale**: Zonder fixture kan een preservatietest groen zijn omdat er simpelweg geen legacy-rijen zijn (vacuous truth). De whitelist maakt daarnaast op code-niveau onmogelijk dat een insert/update per ongeluk een legacy-kolom overschrijft, ook als een aanroeper een onverwachte patch meestuurt. Samen dekken ze zowel de bestaande-data-zichtbaarheid (FR-023/SC-005) als de niet-overschrijfgarantie (FR-024).

**Alternatives considered**:
- Alleen een E2E-test op bestaande data: niet deterministisch en kan leeg slagen.
- Alleen een unit-test op de whitelist: bewijst niet dat bestaande rijen zichtbaar blijven en meetellen.
- Een service-role seedscript in Playwright: vereist een service-role key in de testomgeving en botst met de secret-regel uit AGENTS.md.
