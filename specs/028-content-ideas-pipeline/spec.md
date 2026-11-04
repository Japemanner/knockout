# Feature Specification: Content-pijplijn met niet-live ideeën

**Feature Branch**: `028-content-ideas-pipeline`

**Created**: 2026-11-03

**Status**: Draft

**Input**: User description: "maak onder content boven de ideeen een blokje met daarin het ideen dat nog niet live is. ik wil zo zien wat ik nog in de pijpleiding heb"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - In één oogopslag zien wat er nog in de pijplijn zit (Priority: P1)

Ik open "Content" en kom in de weergave "Ideeën". Tussen het invoerformulier en de ideeënlijst staat een apart blok "Pijplijn". In de kop zie ik hoeveel ideeën nog niet live zijn. Daaronder staan die ideeën als compacte rijen, met per rij de titel, de status en de contentsoort (of "Geen soort"). Ideeën met status Live staan niet in dit blok. Een klik op een rij opent het bestaande detailvenster, zodat ik het idee direct kan aanvullen of van status kan veranderen.

**Why this priority**: Dit is de kern van de vraag: zonder dit blok moet de gebruiker de volledige ideeënlijst doorspitten om te zien wat nog niet gepubliceerd is. Het blok maakt de pijplijn direct zichtbaar en is op zichzelf al bruikbaar.

**Independent Test**: Kan volledig getest worden door enkele ideeën met verschillende statussen aan te maken en de content-pagina te openen: het blok toont uitsluitend de niet-live ideeën, het juiste aantal, de juiste titels en statussen, en een klik op een rij opent het detailvenster.

**Acceptance Scenarios**:

1. **Given** ik open "Content" en de weergave "Ideeën" is actief, **When** de pagina is geladen, **Then** staat het blok "Pijplijn" zichtbaar boven de ideeënlijst en onder het invoerformulier.
2. **Given** er zijn 3 niet-live ideeën en 2 live ideeën, **When** ik het blok bekijk, **Then** toont het blok precies de 3 niet-live ideeën en een aantal van 3, en komen de 2 live ideeën er niet in voor.
3. **Given** een niet-live idee in het blok, **When** ik erop klik of het met het toetsenbord activeer, **Then** opent het bestaande detailvenster van dat idee.
4. **Given** er zijn geen niet-live ideeën, **When** ik het blok bekijk, **Then** blijft het blok zichtbaar met een duidelijke melding dat de pijplijn leeg is en een aantal van 0.
5. **Given** een niet-live idee zonder contentsoort, **When** ik het blok bekijk, **Then** staat bij die rij "Geen soort"; bij een gearchiveerde soort staat de soortnaam met een archiefmarkering.
6. **Given** ik bewaar een nieuw idee met alleen een titel, **When** de opslag is gelukt, **Then** verschijnt dat idee direct in het pijplijnblok met status Idee, zonder de pagina te vernieuwen.

---

### User Story 2 - De pijplijn blijft kloppen na wijzigingen (Priority: P2)

Wanneer ik een idee van status verander, verwijder of een contentsoort hernoem, past het pijplijnblok zich direct aan. Zodra een idee Live wordt, verdwijnt het uit de pijplijn; zet ik een live idee terug naar een eerdere status, dan komt het weer in de pijplijn. De volledige ideeënlijst blijft intussen alle ideeën tonen, inclusief live ideeën.

**Why this priority**: Een pijplijn die verouderde informatie toont, is erger dan geen pijplijn. Zonder directe bijwerking kan de gebruiker niet vertrouwen op wat hij ziet.

**Independent Test**: Kan volledig getest worden door een idee achtereenvolgens op Concept, Live en Gepland te zetten en telkens te controleren dat het pijplijnblok en het aantal direct kloppen, terwijl het idee in de volledige lijst blijft staan.

**Acceptance Scenarios**:

1. **Given** een idee met status Concept staat in het blok, **When** ik de status opsla als Live, **Then** verdwijnt het idee direct uit het blok en daalt het aantal met 1, maar blijft het in de volledige ideeënlijst staan.
2. **Given** een live idee staat niet in het blok, **When** ik de status opsla als Gepland, **Then** verschijnt het idee direct in het blok en stijgt het aantal met 1.
3. **Given** een niet-live idee in het blok, **When** ik het verwijder en de verwijdering bevestig, **Then** verdwijnt het direct uit het blok en uit de volledige lijst.
4. **Given** een idee in het blok hoort bij een contentsoort, **When** ik de naam of kleur van die soort wijzig, **Then** toont het blok direct de nieuwe naam en kleur.
5. **Given** een statuswijziging of verwijdering mislukt, **When** de foutmelding verschijnt, **Then** blijft het blok ongewijzigd en kan ik het opnieuw proberen.
6. **Given** ik wijzig een status in een ander tabblad, **When** ik terugkeer en de gegevens opnieuw worden geladen, **Then** toont het blok de laatst opgeslagen status, conform de bestaande gewoonte dat de laatste opslag wint.

---

### User Story 3 - Het blok blijft bruikbaar bij veel of geen ideeën (Priority: P3)

Ook wanneer ik veel ideeën heb of juist helemaal geen niet-live ideeën, blijft het blok prettig en eerlijk: het toont een laad- of foutmelding in plaats van ten onrechte "leeg", en bij veel rijen blijft het blok overzichtelijk zonder de pagina onhandig lang te maken. Op een mobiel scherm blijven de rijen leesbaar en is er geen horizontaal scrollen.

**Why this priority**: De dagelijkse waarde blijft behouden wanneer de lijst groeit of de verbinding hapert. Dit is vooral kwaliteit en robuustheid, niet de eerste reden om de feature te bouwen.

**Independent Test**: Kan getest worden met een groot aantal niet-live ideeën, met een trage of mislukte laadsituatie, en op een smal scherm; controleer dat het blok blijft werken, alle items bereikbaar zijn en er geen misleidende lege staat verschijnt.

**Acceptance Scenarios**:

1. **Given** er zijn 100 niet-live ideeën, **When** ik het blok bekijk, **Then** zijn alle 100 bereikbaar en blijft het blok binnen een overzichtelijke hoogte door intern te scrollen, zonder horizontaal scrollen.
2. **Given** de ideeën worden nog geladen, **When** ik het blok bekijk, **Then** zie ik een laadmelding en niet de melding dat de pijplijn leeg is.
3. **Given** het laden van de ideeën is mislukt, **When** ik het blok bekijk, **Then** zie ik een foutmelding met de mogelijkheid om het opnieuw te proberen, en niet een lege pijplijn.
4. **Given** een scherm van 375 px breed, **When** ik het blok bekijk, **Then** zijn titel, status en contentsoort leesbaar en is er geen horizontaal scrollen.
5. **Given** een zeer lange titel, **When** ik het blok bekijk, **Then** wordt de titel in de rij afgekapt en is de volledige titel in het detailvenster zichtbaar.
6. **Given** ik gebruik alleen het toetsenbord, **When** ik door het blok navigeer, **Then** zijn de rijen bereikbaar en zichtbaar gefocust, en opent Enter of Space het detailvenster.

---

### Edge Cases

- **Alle ideeën zijn live**: het blok blijft zichtbaar met een lege-pijplijnmelding en aantal 0; de volledige lijst toont alle live ideeën.
- **Er zijn nog helemaal geen ideeën**: het blok toont dezelfde lege-pijplijnmelding; er verschijnt geen foutmelding.
- **Een live idee heeft een datum, tijd of LinkedIn-URL uit het verleden**: het blijft buiten de pijplijn en gedraagt zich in de volledige lijst zoals elk ander idee.
- **Een idee zonder contentsoort**: verschijnt gewoon in de pijplijn met "Geen soort".
- **Een idee van een gearchiveerde contentsoort**: blijft in de pijplijn staan met de soortnaam en een archiefmarkering.
- **Een idee wordt Live terwijl het detailvenster openstaat**: na opslaan verdwijnt het uit het blok; bij een mislukte opslag blijft het staan.
- **Een idee wordt verwijderd terwijl het detailvenster openstaat**: na bevestigen verdwijnt het uit het blok en uit de volledige lijst.
- **Zeer veel niet-live ideeën**: alle items blijven bereikbaar via intern scrollen; het blok duwt de volledige ideeënlijst niet onbeperkt naar beneden.
- **Zeer lange titel**: de rij kapt af; het detailvenster toont de volledige titel.
- **Twee tabbladen tegelijk**: de laatste opslag wint; het blok toont na het opnieuw laden de laatst opgeslagen situatie.
- **Mobiel scherm**: het blok staat boven de lijst, de rijen blijven leesbaar en er is geen horizontaal scrollen.
- **De volledige ideeënlijst en het overzicht blijven ongewijzigd**: live ideeën blijven daar zichtbaar en tellen mee in het totaal.

## Requirements *(mandatory)*

### Functional Requirements

*Plaats en inhoud*

- **FR-001**: De weergave "Ideeën" van de content-pagina MOET een apart, herkenbaar blok met de titel "Pijplijn" bevatten, geplaatst boven de volledige ideeënlijst en onder het invoerformulier.
- **FR-002**: Het blok MOET precies alle ideeën bevatten waarvan de status niet Live is (Idee, Concept, Klaar en Gepland); er geldt geen andere selectie of filter.
- **FR-003**: Ideeën met status Live MOGEN NIET in het blok verschijnen; zij blijven wel zichtbaar in de volledige ideeënlijst en tellen mee in het overzicht.
- **FR-004**: De kop van het blok MOET het totale aantal niet-live ideeën tonen.
- **FR-005**: Elke rij in het blok MOET minimaal de titel, de status en de contentsoort (of "Geen soort") tonen; bij een gearchiveerde soort MOET een archiefmarkering zichtbaar zijn.
- **FR-006**: De rijen MOETEN nieuwste eerst staan, gelijk aan de volgorde van de volledige ideeënlijst.
- **FR-007**: Een klik op een rij, of Enter/Space vanaf het toetsenbord, MOET het bestaande detailvenster van dat idee openen; het blok heeft geen eigen editor.
- **FR-008**: Het blok MOET alleen in de weergave "Ideeën" voorkomen en NIET in de weergave "Overzicht".
- **FR-009**: De volledige ideeënlijst MOET ongewijzigd blijven functioneren: alle ideeën, inclusief live, blijven zichtbaar en bewerkbaar, en de bestaande volgorde en bediening veranderen niet.
- **FR-010**: Het blok is een alleen-lezen overzicht; wijzigingen verlopen via het bestaande detailvenster.

*Actualiteit*

- **FR-011**: Na het opslaan van een nieuw idee MOET dat idee direct in het blok verschijnen wanneer de status niet Live is, zonder de pagina handmatig te vernieuwen.
- **FR-012**: Na een statuswijziging naar Live MOET het idee direct uit het blok verdwijnen; na een statuswijziging van Live naar een niet-live status MOET het direct verschijnen; het aantal in de kop MOET direct meeveranderen.
- **FR-013**: Na het verwijderen van een niet-live idee MOET het direct uit het blok verdwijnen en MOET het aantal direct dalen.
- **FR-014**: Na het hernoemen, van kleur wijzigen of archiveren van een contentsoort MOETEN de betrokken rijen in het blok direct de nieuwe naam, kleur of archiefmarkering tonen.
- **FR-015**: Na een mislukte opslag, statuswijziging of verwijdering MOET het blok ongewijzigd blijven en MOET de gebruiker de actie opnieuw kunnen proberen.
- **FR-016**: Voor alle wijzigingen in FR-011 tot en met FR-015 MAG GEEN handmatige paginavernieuwing nodig zijn.

*Staten, schaal en toegankelijkheid*

- **FR-017**: Wanneer er geen niet-live ideeën zijn, MOET het blok zichtbaar blijven met een duidelijke melding dat de pijplijn leeg is en een aantal van 0.
- **FR-018**: Tijdens het laden MOET het blok een laadmelding tonen en MAG het NIET de lege-pijplijnmelding tonen.
- **FR-019**: Bij een laadfout MOET het blok een foutmelding tonen met de mogelijkheid om het opnieuw te proberen, en MAG het NIET doen alsof de pijplijn leeg is.
- **FR-020**: Het blok MOET alle niet-live ideeën bevatten, zonder maximum; bij veel rijen MOET het blok intern scrollen, zodat de pagina niet onbeperkt langer wordt en alle items bereikbaar blijven.
- **FR-021**: Het blok MOET bruikbaar zijn op desktop en op mobiel (smaller dan 768 px, minimaal 375 px) zonder horizontaal scrollen.
- **FR-022**: Het blok MOET een toegankelijke kop en een lijststructuur hebben; alle rijen MOETEN met het toetsenbord bereikbaar zijn met een zichtbare focus, en de status MOET niet uitsluitend via kleur worden overgebracht.
- **FR-023**: Meldingen in het blok MOETEN in de app zelf verschijnen; er MOGEN GEEN browserdialoogvensters worden gebruikt.
- **FR-024**: De bestaande statuswaarden en statusregels MOETEN ongewijzigd blijven; er komen geen nieuwe statussen bij en er gaat geen gegevens verloren.
- **FR-025**: Het blok MOET geen invloed hebben op de tellingen van het overzicht: alle ideeën, inclusief live, blijven daar meetellen.

### Key Entities

- **Idee**: Een bewaard contentidee met titel, optionele contentsoort, idee-tekst, bron-URL, notities, status en aanmaakmoment. De status is een van Idee, Concept, Klaar, Gepland of Live.
- **Pijplijn**: Een afgeleid overzicht, geen opgeslagen gegeven, van alle ideeën waarvan de status niet Live is. De pijplijn verandert mee met elke statuswijziging, toevoeging of verwijdering.
- **Contentsoort**: Een categorie met naam, kleur en archiefstatus, gebruikt om ideeën te groeperen en te herkennen. Een gearchiveerde soort blijft zichtbaar bij bestaande ideeën.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Bij het openen van "Content" kan de gebruiker binnen 5 seconden zien hoeveel ideeën nog niet live zijn en welke dat zijn, zonder een idee te openen of de pagina te vernieuwen.
- **SC-002**: Voor elke dataset toont het blok 100% van de niet-live ideeën en 0% van de live ideeën.
- **SC-003**: Een statuswijziging is binnen 1 seconde zichtbaar in het blok, zonder handmatige paginavernieuwing.
- **SC-004**: Een nieuw opgeslagen idee met een niet-live status is binnen 1 seconde in het blok zichtbaar.
- **SC-005**: Bij 200 niet-live ideeën blijven alle items bereikbaar en blijft het blok bruikbaar; op een scherm van 375 px is er geen horizontaal scrollen.
- **SC-006**: In de lege, laad- en foutstaat begrijpt de gebruiker binnen 5 seconden wat de situatie is; geen van deze staten wordt als een lege pijplijn verward.
- **SC-007**: De bestaande volledige ideeënlijst en het overzicht blijven 100% van de ideeën tonen; het aantal in het overzicht verandert niet door deze feature.
- **SC-008**: 90% van de testgebruikers kan binnen 5 seconden een niet-live idee uit het blok aanwijzen als volgende om op te pakken, zonder de volledige ideeënlijst te openen.

## Assumptions

- **Plaatsing**: Het blok staat in de weergave "Ideeën", direct boven de volledige ideeënlijst en onder het invoerformulier. Zo blijft snel vastleggen bovenaan staan en is de pijplijn toch direct zichtbaar.
- **Definitie "nog niet live"**: Alle statussen behalve Live tellen mee: Idee, Concept, Klaar en Gepland. Er is geen aparte "gepubliceerd"-markering nodig.
- **Volgorde**: De rijen staan nieuwste eerst, dezelfde volgorde als de bestaande ideeënlijst.
- **Geen limiet**: Alle niet-live ideeën komen in het blok; bij veel items scrollt het blok intern in plaats van items weg te laten.
- **Bestaande editor**: Het blok opent het bestaande detailvenster; er komt geen tweede bewerkingsvorm.
- **Geen nieuwe gegevens**: De feature gebruikt de bestaande ideeën en statussen; er komen geen nieuwe gegevensvelden bij en de pijplijn wordt niet als apart gegeven opgeslagen.
- **Bestaande lijst en overzicht**: De volledige ideeënlijst en het overzicht blijven ongewijzigd en blijven alle ideeën tonen, inclusief live.
- **Gearchiveerde soorten**: Ideeën van gearchiveerde soorten blijven in de pijplijn staan, met archiefmarkering.
- **Schaal**: De app is persoonlijk gebruik; doorgaans enkele honderden ideeën, maximaal enkele duizenden. Het blok moet daar redelijk mee omgaan.
- **Apparaat**: Desktop en mobiel vanaf 375 px zijn in scope; er is geen aparte native app.
- **Meerdere tabbladen**: De laatste opslag wint, conform de bestaande gewoonte in de app; er is geen realtime conflictmelding.

## Out of Scope

- Nieuwe statussen, statusovergangen of een publicatieproces.
- Een eigen editor, formulier of sleepfunctionaliteit binnen het pijplijnblok.
- Filters, zoeken of sorteren binnen het blok.
- Notificaties, herinneringen of automatisch publiceren.
- Wijzigingen aan de volledige ideeënlijst, het overzicht of de contentsoorten.
- Nieuwe gegevensvelden of het opslaan van de pijplijn als apart gegeven.
