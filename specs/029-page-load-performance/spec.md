# Feature Specification: Kortere laadtijd van pagina's

**Feature Branch**: `029-page-load-performance`

**Created**: 2026-11-06

**Status**: Draft

**Input**: User description: "Kortere laadtijd van pagina's, vooral bij een koude start op mobiel. Dezelfde app, minder wachten. Geen functionele wijzigingen."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Snellere koude start op mobiel (Priority: P1)

Als adviseur open ik Darwin op mijn telefoon en zie ik het startscherm sneller, omdat de app minder code vooraf laadt en minder verzoeken na elkaar doet.

**Why this priority**: Dit is het eerste contact met de app. Elke seconde die hier verloren gaat, raakt iedere gebruiker bij ieder eerste bezoek.

**Independent Test**: Open `/` in een verse mobiele browsersessie met netwerkthrottling. Meet welke code en welke gegevensverzoeken voor de eerste weergave nodig zijn. Het scenario levert waarde als het startscherm aantoonbaar minder voorwerk doet, ook zonder de latere pagina's te optimaliseren.

**Acceptance Scenarios**:

1. **Given** een uitgelogde of net ingestapte gebruiker op een koude mobiele browser, **When** de gebruiker `/` opent, **Then** wordt het profiel precies één keer opgehaald en worden sessie, profiel en de chunk van de bestemmingspagina gelijktijdig gestart in plaats van na elkaar.
2. **Given** dezelfde koude start, **When** de eerste pagina verschijnt, **Then** is er geen JavaScript geladen dat alleen voor andere pagina's nodig is.
3. **Given** een gebruiker die al eerder op de app is geweest, **When** hij de app opnieuw opent, **Then** komen de ongewijzigde statische bestanden uit de browsercache en worden ze niet opnieuw gedownload.

---

### User Story 2 - Pagina's wisselen zonder herladen van net geziene data (Priority: P1)

Als adviseur wissel ik tussen pagina's zonder dat gegevens die ik net heb gezien opnieuw worden geladen. Na een wijziging zie ik direct de nieuwe stand.

**Why this priority**: Paginawissels zijn de meest voorkomende interactie. Herhaald ophalen van dezelfde data kost tijd en maakt de app traag aanvoelen, ook als de eerste load al snel is.

**Independent Test**: Bezoek een pagina, wissel binnen 30 seconden naar een andere pagina en terug. Controleer dat de eerder geziene gegevens niet opnieuw worden opgehaald. Wijzig daarna een record en controleer dat de nieuwe stand direct zichtbaar is.

**Acceptance Scenarios**:

1. **Given** een pagina met gegevens die minder dan 30 seconden geleden zijn opgehaald, **When** de gebruiker naar een andere pagina en terug navigeert, **Then** worden die gegevens niet opnieuw opgehaald.
2. **Given** een pagina met gegevens die minder dan 30 seconden geleden zijn opgehaald, **When** de gebruiker naar een ander tabblad gaat en terugkomt, **Then** worden die gegevens niet opnieuw opgehaald.
3. **Given** een gebruiker die een record toevoegt, wijzigt of verwijdert, **When** de actie is voltooid, **Then** tonen alle betrokken pagina's direct de nieuwe stand zonder handmatige verversing.

---

### User Story 3 - Lijsten en gesprekken openen zonder merkbare wachttijd (Priority: P1)

Als adviseur open ik lijsten en gesprekken zonder merkbare wachttijd, ook als mijn organisatie meer gesprekken en documenten krijgt.

**Why this priority**: De waarde van de app moet niet afnemen naarmate de organisatie groeit. Dit is de schaalbaarheidseis achter de snelheidswinst.

**Independent Test**: Open de lijstpagina's met een representatieve dataset en meet de tijd tot de lijst bruikbaar is. Herhaal met een grotere dataset en controleer dat de tijd niet evenredig meegroeit met kolommen of rijen die de lijst niet toont.

**Acceptance Scenarios**:

1. **Given** een lijst met veel records, **When** de gebruiker de lijst opent, **Then** worden alleen de kolommen opgehaald die de lijst daadwerkelijk toont.
2. **Given** een organisatie met veel gesprekken en documenten, **When** een lijst of gesprek wordt geopend, **Then** blijven de databasequeries voorspelbaar snel doordat filters en koppelingen gebruikmaken van de juiste indexen.
3. **Given** een pagina die gegevens via de server ophaalt, **When** de pagina wordt geopend, **Then** volgt er na de eerste weergave geen tweede, opeenvolgende ophaalactie voor dezelfde pagina.

---

### User Story 4 - Tweede bezoek laadt vrijwel geen code opnieuw (Priority: P2)

Als terugkerende gebruiker laad ik bij een tweede bezoek vrijwel geen code opnieuw.

**Why this priority**: Dit verlaagt de terugkerende kosten van elk bezoek, maar is minder kritisch dan de eerste indruk en de paginawissels.

**Independent Test**: Open de app, sluit het tabblad en open de app opnieuw. Controleer in het netwerkpaneel dat ongewijzigde JavaScript- en CSS-bestanden uit de cache komen.

**Acceptance Scenarios**:

1. **Given** een eerdere succesvolle paginalading, **When** de gebruiker de app binnen de cacheperiode opnieuw opent, **Then** worden de ongewijzigde statische bestanden niet opnieuw gedownload.

---

### Edge Cases

- Een pagina wordt geopend terwijl de sessie net is verlopen: de gebruiker gaat naar het inlogscherm, zonder dat de app eerst alle paginacode of alle paginaqueries start.
- Een pagina-chunk kan niet worden geladen: de gebruiker ziet de bestaande foutafhandeling, geen nieuwe foutmelding of lege pagina.
- Een wijziging vindt plaats terwijl een andere pagina nog in de cache staat: de betrokken cache wordt direct ongeldig gemaakt, zodat de gebruiker nooit een oude stand ziet.
- Een pagina wordt voor het eerst geopend en de data is nog niet eerder opgehaald: de bestaande laadweergave blijft zichtbaar tot de pagina klaar is.
- De service worker bestaat niet of is niet actief: navigaties verlopen zoals nu, zonder interceptie.
- Een analytics-integratie is niet aanwezig: er verandert niets aan wat gemeten wordt.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Bij een koude start op `/` MUST het profiel precies één keer worden opgehaald. Er MAG geen tweede profielverzoek volgen na de eerste weergave.
- **FR-002**: Elke pagina behalve het inlogscherm MUST als eigen code-eenheid worden geleverd. De code-eenheid van de huidige pagina MUST gelijktijdig met sessie en profiel starten, niet erna.
- **FR-003**: De app MUST bij een paginawissel gegevens die minder dan 30 seconden oud zijn hergebruiken. Na een wijziging door de gebruiker MUSTEN de betrokken gegevens direct zijn bijgewerkt.
- **FR-004**: Het ophalen van gegevens MUST bij terugkeer naar het tabblad geen extra verzoek doen voor gegevens die nog binnen de 30-secondengrens vallen.
- **FR-005**: Lijstqueries MUSTEN alleen de kolommen ophalen die de lijst toont. Grote tekstvelden en configuratievelden die alleen detailschermen nodig hebben, MOETEN buiten de lijstquery blijven.
- **FR-006**: Een pagina MUST na de eerste weergave geen tweede, opeenvolgende ophaalactie uitvoeren voor gegevens die al tijdens de eerste weergave konden worden opgehaald.
- **FR-007**: De database MUST voor alle RLS-policies de gebruikersidentiteit één keer per query evalueren in plaats van per rij.
- **FR-008**: Elke foreign key in het schema `public` MUST een index hebben die de foreign key afdekt, zodat queries en cascade-acties bij groei voorspelbaar blijven.
- **FR-009**: De RLS MUST zich exact hetzelfde gedragen als voorheen: dezelfde gebruikers zien dezelfde rijen, dezelfde acties blijven toegestaan of geweigerd.
- **FR-010**: Een service worker MAG geen navigaties onderscheppen. Pushmeldingen MUSTEN blijven werken zoals voorheen; als er geen service worker is, verandert er niets.
- **FR-011**: Er MOETEN geen nieuwe npm-dependencies bijkomen.
- **FR-012**: Er MAG geen wijziging zijn in UI-tekst, schermindeling, rechten of wat een analytics-integratie meet. Tijdens het laden van een pagina-chunk blijft de bestaande laadweergave zichtbaar.
- **FR-013**: Ongewijzigde statische bestanden MOETEN bij een tweede bezoek uit de browsercache komen.

### Key Entities *(include if feature involves data)*

- **Profiel**: de naam, rol en avatar van de ingelogde gebruiker. Wordt één keer per request opgehaald en daarna gedeeld met de shell en de pagina.
- **Pagina-chunk**: de code die alleen voor één route nodig is. Elke route heeft er één; de chunk van de huidige route wordt parallel met sessie en profiel gestart.
- **Querycache**: de client-side opslag van eerder opgehaalde gegevens, met een houdbaarheid van minimaal 30 seconden en een expliciete invalidatie na elke wijziging.
- **RLS-policy**: de databaseregel die bepaalt welke rijen een gebruiker mag zien of wijzigen. De policy blijft inhoudelijk gelijk; alleen de evaluatie wordt efficiënter.
- **Foreign key-index**: een database-index die koppelkolommen snel doorzoekbaar maakt.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Bij een koude start op `/` wordt het profiel precies één keer opgehaald; in het netwerk- en databaselogboek is geen tweede profielquery zichtbaar.
- **SC-002**: De code-eenheid van de doelpagina start gelijktijdig met sessie en profiel; er is geen opeenvolgende keten van sessie → profiel → platformrol → paginazichtbaar.
- **SC-003**: Bij een paginawissel binnen 30 seconden worden geen gegevens opnieuw opgehaald die al in de cache staan. Na een wijziging is de nieuwe stand binnen 1 seconde zichtbaar op de betrokken pagina's.
- **SC-004**: De performance-adviseur van Supabase meldt nul `auth_rls_initplan`-meldingen en nul `unindexed_foreign_keys`-meldingen in het schema `public`.
- **SC-005**: De RLS-verificatie en alle bestaande Playwright-tests blijven groen. Er is geen wijziging in zichtbare rijen, toegestane acties of rechten.
- **SC-006**: De eerste laadtijd van routes die geen browser-databaseclient nodig hebben daalt meetbaar; geen enkele route wordt zwaarder. De gedeelde JavaScript-basis groeit niet.
- **SC-007**: Bij een tweede bezoek worden ongewijzigde statische bestanden niet opnieuw gedownload.
- **SC-008**: Er zijn geen nieuwe npm-dependencies; `package.json` en `package-lock.json` blijven ongewijzigd.
- **SC-009**: Er is geen wijziging in UI-tekst, schermindeling, rechten of analytics-metingen. De bestaande laadweergaven blijven zichtbaar tijdens het laden.
- **SC-010**: De service worker onderschept geen navigaties en pushmeldingen werken als voorheen; als er geen service worker is, is dit aantoonbaar niet van toepassing.

## Assumptions

- **Werkelijke techniek**: de repository bevat een Next.js 15 App Router-applicatie (React 18, TypeScript, Supabase, TanStack Query), geen Vite/React-SPA. Vermoedens uit de opdracht die uitsluitend voor een Vite-SPA gelden, worden in de planfase als niet van toepassing vastgesteld. De functionele bedoeling — minder code vooraf, minder opeenvolgende verzoeken — blijft ongewijzigd.
- **Analytics**: er is geen PostHog-SDK of andere analytics-SDK in de applicatie opgenomen. PostHog komt alleen voor als externe link in de navigatie. Er valt dus niets te wijzigen aan wat analytics meet.
- **Service worker**: er is geen service worker in de repository en er is geen registratie in de app. Pushmeldingen zijn in deze codebase niet geïmplementeerd. De eis blijft als invariant gelden: als er later een service worker komt, mag die geen navigaties onderscheppen.
- **Platformrol**: er is geen `is_platform_admin`-query en geen `platform-admin`-functie in de applicatie. Het profiel wordt al één keer per request in de dashboardlayout opgehaald en via React `cache` gedeeld. De eis "profiel en platformrol gelijktijdig" is daarom in de huidige code niet van toepassing; de eis "profiel precies één keer" wel.
- **RLS-verificatie**: `scripts/rls-verify.mjs` was bij de start niet aanwezig en is inmiddels toegevoegd. Het script verifieert de RLS via de Management API met een echte `authenticated`-claim; daarnaast blijven de Supabase performance-adviseur, de F-01-controle en de Playwright-suite leidend.
- **Dataomvang**: de huidige dataset is klein (ongeveer 140 kaarten, 200 urenregels en 10 contentposts). De database-optimalisaties zijn daarom nu vooral een schaal- en correctheidseis; de merkbare winst zit in minder code, minder opeenvolgende verzoeken en cachegebruik.
- **Geen functionele wijzigingen**: dezelfde schermen, teksten, rechten en datacontracten. Optimalisaties mogen de interne laadstrategie veranderen, niet het gedrag dat de gebruiker ziet.

## Out of Scope

- Edge Functions: cold start en regio.
- Cloudflare Workers en n8n.
- Het Supabase-project verhuizen.
- Server-side rendering introduceren of verwijderen.
- Offline-modus of precaching.
- Wijzigingen aan wat PostHog of een andere analytics-integratie meet.
- Nieuwe schermen, nieuwe laadanimaties of nieuwe UI-teksten.
- Nieuwe npm-dependencies.
- Functionele wijzigingen aan rechten, datamodel of gebruikersstromen.
