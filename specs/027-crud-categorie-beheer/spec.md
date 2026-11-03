# Feature Specification: Centraal categoriebeheer op het CRUD-tabblad

**Feature Branch**: `027-crud-categorie-beheer`

**Created**: 2026-11-03

**Status**: Draft

**Input**: User description: "Pas onder CRUD de categorie functie aan. Ik wil centraal de categorieen kunnen aanpassen ipv per categorie want dat werkt niet op mobiel. Maar hiervoor naast + nieuwe CRUD een knop"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Categorieën centraal beheren vanaf de CRUD-pagina (Priority: P1)

Als gebruiker open ik het CRUD-tabblad en zie in de paginakop, direct naast de knop "Nieuwe CRUD", een knop "Categorieën beheren". Met één tik of klik opent een beheerpaneel met al mijn categorieën, elk met de naam en het aantal overzichten eronder. Dit paneel werkt op elk schermformaat, ook op een telefoon waar geen hover bestaat. De categorietabs boven het grid zijn daarna puur navigatie: geen potlood- of prullenbakicoontjes meer die alleen bij hover verschijnen.

**Why this priority**: Dit is de kern van het verzoek. Het huidige bewerken zit verstopt achter hover-iconen op de tabs en is op mobiel daardoor onbereikbaar. Zonder centrale, altijd zichtbare ingang levert de wijziging geen waarde.

**Independent Test**: Kan volledig getest worden door op een smal scherm (telefoonbreedte) de CRUD-pagina te openen, op "Categorieën beheren" te tikken en te controleren dat het paneel opent, alle categorieën met naam en aantal overzichten toont en dat op de tabs zelf geen bewerkingsiconen meer verschijnen.

**Acceptance Scenarios**:

1. **Given** ik ben op het CRUD-tabblad, **When** ik de paginakop bekijk, **Then** staat de knop "Categorieën beheren" direct naast de knop "Nieuwe CRUD" en is die zichtbaar zonder hover.
2. **Given** ik tik op "Categorieën beheren", **When** het paneel opent, **Then** zie ik al mijn categorieën in aanmaakvolgorde, elk met de naam en het aantal CRUD overzichten dat eronder valt.
3. **Given** ik bekijk de categorietabs boven het grid op een touchscreen, **When** ik een tab aanraak, **Then** wisselt alleen het actieve filter en verschijnen er geen bewerkingsacties die hover vereisen.
4. **Given** ik heb nog geen categorieën, **When** ik het beheerpaneel open, **Then** zie ik een leegstaat met een uitnodiging om mijn eerste categorie aan te maken.
5. **Given** ik heb twintig categorieën, **When** ik het beheerpaneel open, **Then** zijn alle categorieën en hun acties bereikbaar door binnen het paneel te scrollen.

---

### User Story 2 - Categorieën toevoegen en hernoemen in het beheerpaneel (Priority: P1)

Als gebruiker maak ik in het beheerpaneel een nieuwe categorie aan door een naam in te voeren en te bevestigen. Een bestaande categorie hernoem ik op dezelfde plek. De nieuwe of gewijzigde naam is direct zichtbaar in het paneel én in de categorietabrij, en blijft behouden nadat ik de pagina opnieuw laad.

**Why this priority**: Aanmaken en hernoemen zijn de dagelijkse handelingen die nu op mobiel niet lukken. Samen met de centrale ingang maken ze de feature bruikbaar; verwijderen is minder frequent en kan als aparte slice worden gebouwd.

**Independent Test**: Kan volledig getest worden door in het beheerpaneel een categorie "Klanten" aan te maken, die te hernoemen naar "Relaties" en te controleren dat de nieuwe naam direct in het paneel en in de tabrij staat en na herladen behouden blijft.

**Acceptance Scenarios**:

1. **Given** het beheerpaneel is open, **When** ik een nieuwe categorie met de naam "Klanten" aanmaak en bevestig, **Then** verschijnt "Klanten" direct in het paneel en als tab, achter de bestaande categorieën.
2. **Given** de categorie "Klanten", **When** ik de naam wijzig in "Relaties" en bevestig, **Then** tonen paneel en tab direct "Relaties" en blijft die naam behouden na herladen van de pagina.
3. **Given** ik laat de naam leeg of vul alleen spaties in, **When** ik probeer op te slaan, **Then** verschijnt een duidelijke melding en wordt er niets aangemaakt of gewijzigd.
4. **Given** ik hernoem de categorie waarop ik nu gefilterd ben, **When** ik opsla, **Then** blijft het filter op die categorie actief en toont de tab de nieuwe naam.
5. **Given** ik maak een categorie aan met dezelfde naam als een bestaande categorie, **When** ik bevestig, **Then** is dat toegestaan en staan beide categorieën als aparte regels en tabs.

---

### User Story 3 - Categorieën verwijderen met behoud van overzichten (Priority: P2)

Als gebruiker verwijder ik een categorie vanuit het beheerpaneel. Voordat de verwijdering doorgaat, zie ik een bevestiging met de naam van de categorie en de uitleg dat de overzichten blijven bestaan. Na bevestigen verdwijnt de categorie en haar tab, maar blijven alle CRUD overzichten beschikbaar onder "Alle".

**Why this priority**: Verwijderen is nodig om het categorieoverzicht schoon te houden, maar is een sporadische en risicovolle handeling. De feature levert ook zonder dit onderdeel al volledige waarde.

**Independent Test**: Kan volledig getest worden door een categorie met twee overzichten te verwijderen en te controleren dat de categorie en haar tab verdwijnen, terwijl beide overzichten onder "Alle" zichtbaar blijven.

**Acceptance Scenarios**:

1. **Given** de categorie "Relaties" met twee overzichten, **When** ik in het beheerpaneel op verwijderen tik, **Then** verschijnt een in-app bevestiging die "Relaties" bij naam noemt en uitlegt dat de overzichten blijven bestaan.
2. **Given** de bevestiging staat open, **When** ik annuleer, **Then** blijft de categorie ongewijzigd bestaan.
3. **Given** ik bevestig de verwijdering, **When** de actie is voltooid, **Then** verdwijnen de categorie en haar tab en blijven beide overzichten zichtbaar onder "Alle".
4. **Given** ik verwijder de categorie waarop ik nu gefilterd ben, **When** de verwijdering is voltooid, **Then** toont de pagina weer "Alle" met al mijn overzichten.
5. **Given** een categorie zonder overzichten, **When** ik die verwijder en bevestig, **Then** verdwijnt de categorie zonder verdere gevolgen.

---

### Edge Cases

- Een categorie zonder overzichten toont aantal 0 in het beheerpaneel en mag gewoon verwijderd worden.
- Na het verwijderen van de actieve categorie valt de pagina terug op "Alle"; overzichten zonder categorie blijven altijd zichtbaar onder "Alle".
- Een naam die alleen uit spaties bestaat geldt als leeg en wordt geweigerd; er wordt niets opgeslagen.
- Zeer lange categorienamen blijven leesbaar (volledige naam beschikbaar) zonder dat de bewerk- en verwijderacties uit beeld of buiten bereik raken.
- Bij veel categorieën scrollt het paneel intern; geen enkele categorie of actie valt buiten het bereik van het paneel.
- Op een smal scherm blijven de knoppen "Categorieën beheren" en "Nieuwe CRUD" beide zichtbaar en bedienbaar; geen van beide verdwijnt achter een hover- of overloopmenu.
- Een mislukte actie (netwerk- of serverfout) toont een duidelijke foutmelding en laat de bestaande categorieën, tabs en overzichten ongewijzigd; het paneel blijft bruikbaar.
- Gelijktijdig open in twee browsersessies: de laatste schrijfactie wint, conform de bestaande applicatieconventie; geen real-time conflictdetectie.
- Twee categorieën met dezelfde naam blijven toegestaan en als afzonderlijke regels en tabs bruikbaar.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: De CRUD-pagina MOET in de paginakop, direct naast de knop "Nieuwe CRUD", een knop "Categorieën beheren" tonen.
- **FR-002**: De knop "Categorieën beheren" MOET op elk schermformaat zichtbaar en met één tik of klik bedienbaar zijn, zonder hover en zonder verborgen menu.
- **FR-003**: Een tik of klik op de knop MOET een in-app beheerpaneel openen met alle categorieën van de gebruiker in aanmaakvolgorde, elk met naam en het aantal CRUD overzichten dat eronder valt.
- **FR-004**: De categorietabrij boven het grid MOET uitsluitend navigatie zijn: geen "+", hernoem- of verwijderknoppen op de tabs en geen acties die hover vereisen. Alle categoriebeheer gebeurt in het beheerpaneel.
- **FR-005**: In het beheerpaneel MOET de gebruiker een nieuwe categorie met een naam kunnen aanmaken; een lege of alleen uit spaties bestaande naam MOET geweigerd worden met een duidelijke melding en zonder iets op te slaan.
- **FR-006**: Een nieuw aangemaakte categorie MOET direct in het beheerpaneel én in de categorietabrij verschijnen, zonder handmatige herlaadactie.
- **FR-007**: In het beheerpaneel MOET de gebruiker de naam van een bestaande categorie kunnen wijzigen; de nieuwe naam MOET direct in het paneel en in de bijbehorende tab zichtbaar zijn en behouden blijven na herladen.
- **FR-008**: Het beheerpaneel MOET per categorie een verwijderactie bieden die pas na bevestiging in een in-app dialoog wordt uitgevoerd; de bevestiging MOET de categorienaam noemen en uitleggen dat de overzichten blijven bestaan.
- **FR-009**: Verwijderen van een categorie MAG NOOIT de CRUD overzichten verwijderen; de overzichten worden ongecategoriseerd en blijven zichtbaar onder "Alle".
- **FR-010**: Na het verwijderen van de categorie waarop gefilterd is, MOET de pagina terugvallen op de weergave "Alle".
- **FR-011**: Het beheerpaneel MOET bij veel categorieën intern scrollbaar zijn, zodat alle categorieën en acties bereikbaar blijven, ook op een smal scherm.
- **FR-012**: Categorieën MOETEN per gebruiker opgeslagen en afgeschermd blijven: een gebruiker ziet en beheert uitsluitend zijn eigen categorieën.
- **FR-013**: Elke geslaagde categorieactie MOET een korte visuele bevestiging tonen en MOET paneel, tabrij en grid direct actueel maken.
- **FR-014**: Elke mislukte categorieactie MOET een duidelijke foutmelding tonen en de bestaande categorieën, tabs en overzichten ongewijzigd laten.
- **FR-015**: De bestaande werking van de categorietabs MOET behouden blijven: één horizontale, bij ruimtegebrek horizontaal scrollbare rij met "Alle" vooraan, die het grid filtert op de gekozen categorie.

### Key Entities

- **CRUD-categorie** (bestaand): Benoemde groep van CRUD overzichten op het CRUD-tabblad. Attributen: naam (verplicht), positie (aanmaakvolgorde), eigenaar. Wordt in deze feature uitsluitend via het centrale beheerpaneel aangemaakt, hernoemd en verwijderd.
- **CRUD overzicht** (bestaand): Overzicht binnen het CRUD-tabblad met een optionele verwijzing naar precies één categorie. Blijft bestaan wanneer zijn categorie wordt verwijderd en is dan zichtbaar onder "Alle". Het aantal overzichten per categorie wordt in het beheerpaneel getoond.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Op een scherm van 375 pixels breed kan ik het categoriebeheer openen en een categorie hernoemen met uitsluitend tikken, binnen 15 seconden en zonder enige hoverbeweging.
- **SC-002**: 100% van de categorieacties (aanmaken, hernoemen, verwijderen) is uitvoerbaar op een touchscreen; geen enkele actie is afhankelijk van hover.
- **SC-003**: Een nieuwe of gewijzigde categorienaam is binnen 2 seconden zichtbaar in het beheerpaneel en in de categorietabrij, en blijft behouden na herladen van de pagina.
- **SC-004**: Het verwijderen van een categorie leidt in 100% van de gevallen niet tot verlies van CRUD overzichten; alle overzichten blijven zichtbaar onder "Alle".
- **SC-005**: Alle categorieën en hun acties blijven bereikbaar en bedienbaar bij minimaal 20 categorieën op een scherm van 375 pixels breed.
- **SC-006**: Een mislukte categorieactie levert in 100% van de gevallen een zichtbare foutmelding op zonder dat bestaande categorieën, tabs of overzichten veranderen.

## Assumptions

- Het centrale categoriebeheer is een in-app dialoog op de CRUD-pagina, geen aparte pagina of route, conform het bestaande dialoogpatroon van de applicatie.
- De knop staat in de paginakop naast "Nieuwe CRUD" met het label "Categorieën beheren"; op smalle schermen blijven beide knoppen zichtbaar (eventueel compacter), nooit verborgen achter hover of een overloopmenu.
- De losse "+"-knop in de categorietabrij komt te vervallen: aanmaken gebeurt uitsluitend in het beheerpaneel, zodat er één centrale plek is voor alle categoriebeheer.
- Het verplaatsen van een overzicht naar een andere categorie blijft via het bestaande menu op de overzichtskaart verlopen en wordt niet naar het beheerpaneel verhuisd.
- Categorieën behouden hun aanmaakvolgorde; handmatig herordenen (bijvoorbeeld slepen) valt buiten deze feature.
- Dubbele categorienamen blijven toegestaan, conform de bestaande naamgeving bij borden en overzichten.
- Verwijderen gebeurt altijd één categorie tegelijk en altijd na bevestiging; bulkverwijdering valt buiten scope.
- Het aantal overzichten per categorie is informatief; sorteren of filteren binnen het beheerpaneel valt buiten scope.
- Bestaande functionaliteit blijft ongewijzigd: filteren via de categorietabs, de categorie vooraf invullen bij "Nieuwe CRUD" en de bestaande kaartacties.
- Buiten scope: categorieën op andere tabbladen, categoriekleuren of -iconen, handmatig herordenen van categorieën, bulkverwijdering en real-time samenwerking tussen sessies.
