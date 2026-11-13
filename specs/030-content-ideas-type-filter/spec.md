# Feature Specification: Content-ideeën filteren op soort met zichtbare korte beschrijving

**Feature Branch**: `031-content-ideas-type-filter`

**Created**: 2026-11-13

**Status**: Draft

**Input**: User description: "Onder content en dan ideeen en pijlijn wil alleen nog ideeen overhouden en dat deze filterbaar zijn op soorten. Hier wil ik dan ook makkelijk de korte beschrijving zien"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Alleen ideeën, direct filterbaar op soort (Priority: P1)

Ik open "Content" en kom in de weergave "Ideeën". Het aparte blok "Pijplijn" is verdwenen. Boven de ideeënlijst staat één filterbalk met de optie "Alle soorten" en per contentsoort een optie, inclusief het aantal ideeën. Standaard staat "Alle soorten" actief en zie ik al mijn ideeën, ongeacht hun status. Kies ik een soort, dan toont de lijst uitsluitend de ideeën van die soort. Met "Alle soorten" keer ik terug naar de volledige lijst. Een klik op een idee opent nog steeds het bestaande detailvenster.

**Why this priority**: Dit is de kern van de vraag: de pijplijn verdwijnt en de ideeënlijst wordt de centrale plek voor alle ideeën, waarbij de gebruiker zelf op soort kan filteren. Zonder deze stap is er geen eenduidige ideeënlijst en geen filter.

**Independent Test**: Kan volledig getest worden door enkele ideeën met verschillende soorten en statussen aan te maken en de content-pagina te openen: er is geen pijplijnblok, de filterbalk toont alle soorten met de juiste aantallen, en het kiezen van een soort toont precies de bijbehorende ideeën.

**Acceptance Scenarios**:

1. **Given** ik open "Content" en de weergave "Ideeën" is actief, **When** de pagina is geladen, **Then** is er geen blok "Pijplijn" meer zichtbaar en staat boven de ideeënlijst een filterbalk met "Alle soorten" actief.
2. **Given** er zijn 3 soorten en 12 ideeën, **When** ik de filterbalk bekijk, **Then** zie ik "Alle soorten" met 12 en elke soort met het juiste aantal, en toont de lijst standaard alle 12 ideeën.
3. **Given** soort A heeft 4 ideeën en soort B heeft 3 ideeën, **When** ik soort A kies, **Then** toont de lijst precies de 4 ideeën van soort A en geen enkel idee van soort B.
4. **Given** 2 ideeën hebben geen contentsoort, **When** ik de filterbalk bekijk, **Then** staat er een optie "Geen soort" met 2, en die optie toont precies die 2 ideeën.
5. **Given** ik heb een soort gekozen, **When** ik "Alle soorten" kies, **Then** toont de lijst weer alle ideeën.
6. **Given** een idee in de gefilterde lijst, **When** ik erop klik of het met het toetsenbord activeer, **Then** opent het bestaande detailvenster van dat idee.
7. **Given** een idee met status Live, **When** ik de lijst bekijk, **Then** staat het idee gewoon in de lijst en telt het mee in de aantallen; de status bepaalt niet of een idee zichtbaar is.
8. **Given** ik heb soort A gekozen, **When** ik naar "Overzicht" wissel en terugkeer naar "Ideeën", **Then** is soort A nog steeds actief en toont de lijst nog steeds de ideeën van soort A.
9. **Given** een actief filter, **When** ik de lijstkop bekijk, **Then** toont die het aantal zichtbare ideeën en is het totale aantal ideeën beschikbaar.

---

### User Story 2 - De korte beschrijving van de gekozen soort meteen zien (Priority: P1)

Zodra ik een contentsoort kies, verschijnt tussen de filterbalk en de lijst een strook met de naam, de kleur en de korte beschrijving van die soort. Ik hoef daarvoor niet naar "Soorten" of een idee te openen. Heeft de soort geen korte beschrijving, dan staat er een neutrale melding. Kies ik "Alle soorten", dan verdwijnt de strook weer. Wijzig ik de korte beschrijving in "Soorten", dan past de strook zich direct aan.

**Why this priority**: Dit is de tweede expliciete wens van de gebruiker: bij het filteren op soort wil hij de korte beschrijving gemakkelijk kunnen zien. Zonder deze strook moet hij steeds het soortenbeheer openen om te weten waar een soort voor staat.

**Independent Test**: Kan volledig getest worden door een soort met en een soort zonder korte beschrijving te kiezen en te controleren dat de juiste tekst, naam en kleur direct zichtbaar zijn, en dat een wijziging in "Soorten" zonder paginavernieuwing doorwerkt.

**Acceptance Scenarios**:

1. **Given** soort A heeft de korte beschrijving "Praktische tips voor ondernemers", **When** ik soort A kies, **Then** is die volledige beschrijving direct zichtbaar in de strook onder de filterbalk.
2. **Given** soort B heeft geen korte beschrijving, **When** ik soort B kies, **Then** toont de strook een neutrale melding dat er geen korte beschrijving is.
3. **Given** ik heb een soort gekozen met een korte beschrijving, **When** ik "Alle soorten" kies, **Then** is er geen beschrijvingsstrook voor één soort meer zichtbaar.
4. **Given** de korte beschrijving van de gekozen soort wordt gewijzigd in "Soorten", **When** ik terugkeer naar de ideeënweergave, **Then** toont de strook direct de nieuwe tekst zonder de pagina te vernieuwen.
5. **Given** een gearchiveerde soort met een korte beschrijving, **When** ik die soort kies, **Then** zijn de beschrijving en de archiefmarkering zichtbaar en blijven de bijbehorende ideeën in de lijst staan.
6. **Given** een zeer lange korte beschrijving, **When** ik de strook bekijk, **Then** blijft de tekst leesbaar zonder de lijst onbruikbaar te maken en is de volledige tekst bereikbaar.

---

### User Story 3 - Filter, aantallen en lijst blijven kloppen na wijzigingen (Priority: P2)

Wanneer ik een idee toevoeg, bewerk, van soort verander of verwijder, passen de filteraantallen en de gefilterde lijst zich direct aan. Hetzelfde geldt wanneer ik een soort aanmaak, hernoem, van kleur verander, archiveer of heractiveer. Is de gekozen soort na een wijziging leeg, dan zie ik een duidelijke lege staat met de mogelijkheid om alle ideeën te tonen. Verdwijnt de optie "Geen soort" omdat er geen ideeën zonder soort meer zijn, dan valt de filter terug op "Alle soorten" en blijft elk idee zichtbaar.

**Why this priority**: Een filter dat verouderde aantallen of een verkeerde lijst toont, is erger dan geen filter. Zonder directe bijwerking kan de gebruiker niet op het overzicht vertrouwen.

**Independent Test**: Kan volledig getest worden door achtereenvolgens een idee toe te voegen, van soort te wisselen, te verwijderen en een soort te hernoemen, terwijl telkens de filteraantallen, de beschrijvingsstrook en de zichtbare lijst worden gecontroleerd.

**Acceptance Scenarios**:

1. **Given** filter A is actief, **When** ik een idee van soort A opsla, **Then** verschijnt het direct in de lijst en stijgt het aantal van A met 1.
2. **Given** filter A is actief, **When** ik een idee van soort B opsla, **Then** verschijnt het niet in de gefilterde lijst, blijft het aantal van A gelijk en stijgt het aantal van B met 1.
3. **Given** filter A is actief en een idee hoort bij A, **When** ik de soort van dat idee wijzig naar B, **Then** verdwijnt het direct uit de lijst, daalt het aantal van A met 1 en stijgt het aantal van B met 1.
4. **Given** filter A is actief en het laatste idee van A wordt verwijderd, **When** de verwijdering is bevestigd, **Then** toont de lijst een lege staat voor soort A met een actie om alle ideeën te tonen, en staat het aantal van A op 0.
5. **Given** filter A is actief, **When** ik soort A hernoem, **Then** blijven de ideeën van A zichtbaar en tonen de filteroptie en de beschrijvingsstrook direct de nieuwe naam.
6. **Given** filter A is actief, **When** ik soort A archiveer, **Then** blijft de optie A met archiefmarkering bestaan en blijven de ideeën van A zichtbaar.
7. **Given** de optie "Geen soort" is actief en het laatste idee zonder soort krijgt een soort, **When** de wijziging is opgeslagen, **Then** verdwijnt de optie "Geen soort", valt de filter terug op "Alle soorten" en blijven alle ideeën zichtbaar.
8. **Given** een actie mislukt, **When** de foutmelding verschijnt, **Then** blijven de filterkeuze, de aantallen en de lijst ongewijzigd en kan ik de actie opnieuw proberen.

---

### User Story 4 - Bruikbaar bij veel soorten, weinig ruimte en een haperende verbinding (Priority: P3)

Ook wanneer ik veel contentsoorten of veel ideeën heb, blijft de filterbalk overzichtelijk en zijn alle opties bereikbaar. Op een smal scherm blijven de filterbalk, de beschrijvingsstrook en de lijst leesbaar zonder horizontaal scrollen van de pagina. Met het toetsenbord kan ik alle opties bedienen, en bij het laden of bij een fout verschijnt een eerlijke melding in plaats van een misleidende lege lijst.

**Why this priority**: De dagelijkse waarde blijft behouden wanneer de lijst groeit of de verbinding hapert. Dit is vooral kwaliteit en robuustheid, niet de eerste reden om de feature te bouwen.

**Independent Test**: Kan getest worden met veel soorten en ideeën, op een scherm van 375 px breed, met alleen het toetsenbord en met een trage of mislukte laadsituatie; controleer dat alle opties bereikbaar zijn en dat geen misleidende lege staat verschijnt.

**Acceptance Scenarios**:

1. **Given** er zijn 20 contentsoorten, **When** ik de filterbalk bekijk, **Then** zijn alle opties bereikbaar door te wikkelen of binnen de filterbalk te scrollen, zonder horizontaal scrollen van de pagina.
2. **Given** een scherm van 375 px breed, **When** ik de ideeënweergave bekijk, **Then** zijn de filterbalk, de beschrijvingsstrook en de lijst leesbaar en is er geen horizontaal scrollen van de pagina.
3. **Given** ik gebruik alleen het toetsenbord, **When** ik door de filteropties navigeer, **Then** zijn alle opties bereikbaar en zichtbaar gefocust, en kan ik met Enter of Space een optie kiezen.
4. **Given** de ideeën worden nog geladen, **When** ik de weergave bekijk, **Then** zie ik een laadmelding en niet de lege staat; de filteraantallen worden niet als definitief gepresenteerd.
5. **Given** het laden van de ideeën is mislukt, **When** ik de weergave bekijk, **Then** zie ik de bestaande foutmelding met de mogelijkheid om het opnieuw te proberen, en niet een lege lijst.
6. **Given** de contentsoorten kunnen niet worden geladen, **When** ik de weergave bekijk, **Then** blijft de lijst alle ideeën tonen en verschijnt een in-app melding dat filteren tijdelijk niet beschikbaar is, met de mogelijkheid om het opnieuw te proberen.
7. **Given** een zeer lange soortnaam, **When** ik de filterbalk bekijk, **Then** wordt de naam in de optie afgekapt en blijft de volledige naam bereikbaar.
8. **Given** een actief filter, **When** ik de filterbalk bekijk zonder kleur te kunnen onderscheiden, **Then** is de actieve optie ook via een andere visuele aanwijzing en voor hulpsoftware herkenbaar.
9. **Given** een bevestiging of foutmelding, **When** die verschijnt, **Then** staat die in de app zelf en opent er geen browserdialoogvenster.
10. **Given** er zijn geen contentsoorten, **When** ik de ideeënweergave open, **Then** is er geen filterbalk en staan alle ideeën in de lijst.

---

### Edge Cases

- **Er zijn nog geen contentsoorten**: de filterbalk wordt niet getoond; alle ideeën staan gewoon in de lijst.
- **Alle ideeën hebben status Live**: ze blijven allemaal in de lijst staan en tellen mee; er is geen aparte niet-live-weergave meer.
- **Een soort heeft 0 ideeën**: de soort staat met 0 in de filterbalk; kiezen toont een lege staat voor die soort.
- **Er zijn geen ideeën zonder soort**: de optie "Geen soort" wordt niet getoond.
- **De actieve optie "Geen soort" verdwijnt**: de filter valt terug op "Alle soorten"; er verdwijnt geen idee uit beeld.
- **De actieve soort wordt gearchiveerd**: de optie blijft bestaan met archiefmarkering en de ideeën blijven zichtbaar.
- **De actieve soort wordt hernoemd of van kleur veranderd**: de selectie blijft actief en de nieuwe naam en kleur zijn direct zichtbaar.
- **De korte beschrijving is leeg**: de strook toont een neutrale melding.
- **De korte beschrijving is zeer lang**: de strook blijft leesbaar en de volledige tekst blijft bereikbaar.
- **Een idee wordt toegevoegd terwijl een andere soort is gefilterd**: het idee verschijnt niet in de gefilterde lijst, maar de aantallen van beide soorten kloppen direct.
- **Een idee wisselt van soort terwijl de oude of nieuwe soort is gefilterd**: het idee verhuist direct naar de juiste lijst en de aantallen veranderen mee.
- **Het laatste idee van de actieve soort wordt verwijderd**: de lege staat voor die soort verschijnt met een actie om alle ideeën te tonen.
- **Een actie mislukt**: de filterkeuze, de aantallen en de lijst blijven ongewijzigd; de gebruiker kan het opnieuw proberen.
- **Zeer veel soorten of ideeën**: alle filteropties blijven bereikbaar en de lijst blijft bruikbaar; er is geen maximum.
- **Mobiel scherm**: de filterbalk wikkelt of scrollt binnen de balk; de pagina zelf scrollt niet horizontaal.
- **Twee tabbladen tegelijk**: de laatste opslag wint; na het opnieuw laden van de gegevens kloppen filter, beschrijving en lijst met de laatst opgeslagen situatie.
- **De weergave "Overzicht" en het beheer "Soorten"**: deze blijven ongewijzigd werken en blijven alle soorten en aantallen tonen.

## Requirements *(mandatory)*

### Functional Requirements

*Eén ideeënlijst*

- **FR-001**: De weergave "Ideeën" MOET één lijst met alle bewaarde ideeën bevatten; het aparte blok "Pijplijn" verdwijnt volledig.
- **FR-002**: Er MOGEN GEEN pijplijnspecifieke elementen meer zichtbaar zijn: geen kop "Pijplijn", geen telling van niet-live ideeën en geen lege-pijplijnmelding.
- **FR-003**: De lijst MOET alle ideeën tonen, ongeacht status (Idee, Concept, Klaar, Gepland of Live); de status is geen filter en bepaalt niet welke ideeën standaard zichtbaar zijn.
- **FR-004**: De status MOET als label op de ideeënrij zichtbaar blijven; de bestaande volgorde (nieuwste eerst) en het bestaande detailvenster blijven ongewijzigd.
- **FR-005**: De weergave "Overzicht" en het beheer "Soorten" MOETEN blijven bestaan en blijven werken zoals voorheen.

*Filteren op soort*

- **FR-006**: Boven de ideeënlijst MOET een filterbalk staan met de optie "Alle soorten" en per contentsoort een optie.
- **FR-007**: "Alle soorten" is de standaardkeuze bij het openen van de pagina en toont alle ideeën.
- **FR-008**: Elke filteroptie MOET het aantal ideeën van die optie tonen, geteld over alle statussen.
- **FR-009**: Alle contentsoorten MOETEN als filteroptie verschijnen, ook soorten met 0 ideeën en gearchiveerde soorten; een gearchiveerde soort krijgt een archiefmarkering.
- **FR-010**: De optie "Geen soort" MOET verschijnen zodra er minstens één idee zonder contentsoort is, met het juiste aantal.
- **FR-011**: Er is precies één filteroptie tegelijk actief; een klik of toetsenbordactie op een optie maakt die optie actief en heft de vorige op.
- **FR-012**: Bij een actieve soort MOET de lijst uitsluitend de ideeën van die soort tonen; bij "Geen soort" uitsluitend de ideeën zonder soort; bij "Alle soorten" alle ideeën.
- **FR-013**: De filterkeuze MAG NIET worden opgeslagen; bij een nieuwe paginaweergave start de lijst met "Alle soorten". Binnen dezelfde paginaweergave blijft de keuze behouden wanneer tussen "Ideeën" en "Overzicht" wordt gewisseld.
- **FR-014**: De filter MUTATIE GEEN gegevens: hij verandert, verplaatst of verwijdert geen ideeën en past geen status aan.
- **FR-015**: De lijstkop MOET bij een actief filter het aantal zichtbare ideeën tonen en het totale aantal ideeën beschikbaar houden.
- **FR-016**: Bij een lege gefilterde lijst MOET een duidelijke lege staat verschijnen die de gekozen soort noemt en een actie biedt om alle ideeën te tonen; de algemene lege staat "Nog geen ideeën" MAG hier niet verschijnen.
- **FR-017**: Als de optie "Geen soort" verdwijnt omdat er geen ideeën zonder soort meer zijn, MOET de filter automatisch terugvallen op "Alle soorten" en MOETEN alle ideeën zichtbaar blijven.
- **FR-018**: Als een gearchiveerde soort actief is, MOETEN de bijbehorende ideeën zichtbaar blijven en MOET de archiefmarkering in de filter en in de beschrijvingsstrook staan.
- **FR-019**: Als de actieve soort wordt hernoemd of van kleur veranderd, MOET de selectie actief blijven en MOETEN de nieuwe naam en kleur direct zichtbaar zijn.

*Korte beschrijving*

- **FR-020**: Bij een actieve soort MOET de korte beschrijving van die soort zichtbaar zijn in een aparte strook tussen de filterbalk en de lijst, zonder de soort te openen of naar "Soorten" te gaan.
- **FR-021**: De strook MOET de naam van de soort, de kleur en de volledige korte beschrijving tonen; bij een gearchiveerde soort ook de archiefmarkering.
- **FR-022**: Als de soort geen korte beschrijving heeft, MOET de strook een neutrale melding tonen dat er geen korte beschrijving is.
- **FR-023**: Bij "Alle soorten" MAG er geen beschrijvingsstrook voor één soort zichtbaar zijn.
- **FR-024**: Een lange korte beschrijving MOET leesbaar blijven zonder de lijst onbruikbaar te maken; de volledige tekst MOET bereikbaar blijven.
- **FR-025**: De korte beschrijving is in de ideeënweergave alleen-lezen; bewerken gebeurt in "Soorten".
- **FR-026**: Na het wijzigen van de korte beschrijving in "Soorten" MOET de strook direct de nieuwe tekst tonen, zonder de pagina te vernieuwen.

*Actualiteit*

- **FR-027**: Na het toevoegen van een idee MOETEN de filteraantallen en de gefilterde lijst direct kloppen; een idee van de actieve soort verschijnt, een idee van een andere soort verschijnt niet in de gefilterde lijst.
- **FR-028**: Na het wijzigen van de soort van een idee MOET het idee direct uit de oude filter verdwijnen en in de nieuwe filter verschijnen; de aantallen veranderen mee.
- **FR-029**: Na het verwijderen van een idee MOETEN de aantallen direct dalen en MOET de lijst direct bijwerken; als de actieve filter leeg raakt, verschijnt de lege staat voor die filter.
- **FR-030**: Na het aanmaken, hernoemen, van kleur wijzigen, archiveren of heractiveren van een soort MOETEN de filteropties, aantallen, beschrijvingsstrook en lijst direct kloppen.
- **FR-031**: Na een mislukte actie MOETEN de filterkeuze, de aantallen en de lijst ongewijzigd blijven en MOET de gebruiker de actie opnieuw kunnen proberen.
- **FR-032**: Voor de wijzigingen in FR-027 tot en met FR-031 MAG GEEN handmatige paginavernieuwing nodig zijn.

*Staten, schaal en toegankelijkheid*

- **FR-033**: Zolang de ideeën laden MOET de lijst een laadmelding tonen en MOGEN de filteraantallen niet als definitief of misleidend worden getoond; de lege staat MAG NIET verschijnen.
- **FR-034**: Bij een laadfout van de ideeën MOET de bestaande foutmelding met de mogelijkheid om het opnieuw te proberen zichtbaar zijn en MAG de lege staat niet verschijnen.
- **FR-035**: Als de contentsoorten niet geladen kunnen worden, MOET de lijst alle ideeën blijven tonen en MOET een in-app melding verschijnen dat filteren tijdelijk niet beschikbaar is, met de mogelijkheid om het opnieuw te proberen; de filterbalk MAG dan geen onjuiste aantallen tonen.
- **FR-036**: Zijn er geen contentsoorten, dan MOET de filterbalk verborgen zijn en MOET de lijst alle ideeën tonen.
- **FR-037**: De filterbalk MOET bij veel soorten alle opties bereikbaar houden door te wikkelen of binnen de balk te scrollen, zonder horizontaal scrollen van de pagina.
- **FR-038**: De filterbalk, de beschrijvingsstrook en de lijst MOETEN bruikbaar zijn op desktop en op mobiel (minimaal 375 px breed) zonder horizontaal scrollen van de pagina.
- **FR-039**: De filteropties MOETEN met het toetsenbord bereikbaar en bedienbaar zijn, met een zichtbare focus; de actieve optie MOET ook zonder kleur waarneembaar zijn.
- **FR-040**: De filtergroep MOET een toegankelijke naam hebben en de actieve optie en de aantallen MOETEN voor hulpsoftware begrijpelijk zijn.
- **FR-041**: Meldingen MOETEN in de app zelf verschijnen; er MOGEN GEEN browserdialoogvensters worden gebruikt.
- **FR-042**: De bestaande statuswaarden, het bestaande detailvenster en de bestaande gegevens MOETEN ongewijzigd blijven; er komen geen nieuwe gegevensvelden bij.

### Key Entities

- **Idee**: Een bewaard contentidee met titel, optionele contentsoort, idee-tekst, bron-URL, notities, status en aanmaakmoment. De status is een van Idee, Concept, Klaar, Gepland of Live en bepaalt niet of het idee in de lijst staat.
- **Contentsoort**: Een categorie met naam, korte beschrijving, kleur, archiefstatus en volgorde. De korte beschrijving is de tekst die in de beschrijvingsstrook verschijnt wanneer de soort als filter actief is.
- **Filterkeuze**: Een afgeleide weergavetoestand, geen opgeslagen gegeven. Precies één optie is actief: "Alle soorten", een specifieke soort of "Geen soort". De keuze verandert geen idee of soort.
- **Pijplijn**: Bestond als apart overzicht van niet-live ideeën en is geen onderdeel meer van de feature.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Bij het openen van "Content" is er één ideeënlijst en zijn er 0 zichtbare pijplijnelementen; 100% van de bewaarde ideeën, inclusief live ideeën, staat in die lijst.
- **SC-002**: De filterbalk toont 100% van de contentsoorten plus "Alle soorten" en, wanneer van toepassing, "Geen soort"; de aantallen komen exact overeen met de werkelijkheid.
- **SC-003**: Het kiezen van een soort toont binnen 1 seconde 100% van de ideeën van die soort en 0% van de andere soorten, zonder de pagina te vernieuwen.
- **SC-004**: De korte beschrijving van de gekozen soort is binnen 2 seconden zichtbaar zonder "Soorten" of een idee te openen; 90% van de testgebruikers vindt deze binnen 5 seconden.
- **SC-005**: Na het toevoegen, bewerken, van soort wisselen of verwijderen van een idee, en na het wijzigen van een soort, kloppen de filteraantallen, de beschrijvingsstrook en de lijst binnen 1 seconde, zonder handmatige paginavernieuwing.
- **SC-006**: 0 ideeën verdwijnen uit de lijst door hun status; live en niet-live ideeën zijn gelijkwaardig zichtbaar en telbaar.
- **SC-007**: Op een scherm van 375 px breed zijn de filterbalk, de beschrijvingsstrook en de lijst bruikbaar zonder horizontaal scrollen van de pagina, en zijn alle filteropties bereikbaar.
- **SC-008**: 90% van de testgebruikers kan binnen 5 seconden een soort filteren en de bijbehorende korte beschrijving lezen.
- **SC-009**: De weergave "Overzicht" en het beheer "Soorten" blijven 100% van de soorten en aantallen tonen; hun totalen blijven gelijk aan die van de ideeënlijst.

## Assumptions

- **Pijplijn**: Met "pijplijn" wordt het bestaande blok "Pijplijn" binnen de weergave "Ideeën" bedoeld. Dat blok verdwijnt; de weergave "Overzicht" blijft bestaan en verandert niet.
- **Korte beschrijving**: Met "korte beschrijving" wordt het bestaande veld "Korte beschrijving" van een contentsoort bedoeld, niet de idee-tekst van een individueel idee.
- **Filtermodus**: Er is één actieve filteroptie tegelijk. Gecombineerde filters of meerdere soorten tegelijk zijn buiten scope.
- **Standaardkeuze**: "Alle soorten" is actief bij het openen van de pagina en toont alle ideeën, inclusief live ideeën.
- **Aantallen**: Alle aantallen tellen alle statussen mee; er is geen aparte telling voor niet-live ideeën.
- **Gearchiveerde soorten**: Deze blijven als filteroptie bestaan met een archiefmarkering, zodat hun ideeën bereikbaar blijven.
- **Soorten met 0 ideeën**: Deze worden ook als filteroptie getoond, met aantal 0.
- **Geen soorten**: Zonder contentsoorten is filteren niet zinvol en wordt de filterbalk verborgen.
- **Filterkeuze wordt niet bewaard**: De keuze geldt alleen tijdens de huidige paginaweergave en wordt niet opgeslagen of tussen sessies onthouden.
- **Geen nieuwe gegevens**: De feature gebruikt de bestaande ideeën, soorten en korte beschrijvingen; er komen geen nieuwe velden bij en de filterkeuze wordt niet opgeslagen.
- **Bestaande onderdelen**: De bestaande statuswaarden, het detailvenster, de volgorde (nieuwste eerst), het soortenbeheer en het overzicht blijven ongewijzigd.
- **Schaal**: De app is persoonlijk gebruik; doorgaans enkele honderden ideeën en tientallen soorten, maximaal enkele duizenden ideeën. De filter en lijst moeten daar redelijk mee omgaan.
- **Apparaat**: Desktop en mobiel vanaf 375 px zijn in scope; er is geen aparte native app.
- **Meerdere tabbladen**: De laatste opslag wint, conform de bestaande gewoonte in de app; er is geen realtime conflictmelding.
- **Meldingen**: Bevestigingen en foutmeldingen verschijnen in de app zelf; er worden geen browserdialoogvensters gebruikt.

## Out of Scope

- Meerdere soorten tegelijk filteren of gecombineerde filters.
- Filteren op status, zoeken, sorteren of andere filtervelden.
- De korte beschrijving rechtstreeks in de ideeënweergave bewerken; dat blijft in "Soorten".
- Nieuwe gegevensvelden, het opslaan van de filterkeuze of het onthouden van filters tussen sessies.
- Wijzigingen aan de weergave "Overzicht", het beheer "Soorten", het detailvenster of de bestaande statusregels.
- Nieuwe statussen, statusovergangen of een publicatieproces.
- Notificaties, herinneringen of automatisch publiceren.
- Het verwijderen van soorten; archiveren blijft de enige manier om een soort uit te zetten.
- Analytics, AI-schrijfhulp, bijlagen of video-upload.
