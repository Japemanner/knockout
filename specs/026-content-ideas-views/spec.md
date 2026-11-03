# Feature Specification: Content-ideeën snel vastleggen en overzicht per soort

**Feature Branch**: `026-content-ideas-views`

**Created**: 2026-11-03

**Status**: Draft

**Input**: User description: "pas de content feature aan, het moet meer worden om ideeën makkelijk op te slaan. Verwijder dus de kalender view. als ik een nieuwe opsla mogen de kolommen Format, datum, tijd, linkedin URL verdwijnen. Ik dat ik 2 views heb. 1 om makkelijk en snel nieuwe posts toe te voegen en 1 om te kijken hoeveel ideeën ik per content soort heb"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ideeën snel vastleggen (Priority: P1)

Ik open "Content" in de linkerbalk en kom direct in de vastlegweergave. Bovenaan staat een compact formulier met een titel (verplicht), een contentsoort (optioneel), een veld voor de idee-tekst, een bron-URL en notities. Ik typ een titel, kies eventueel een soort en druk op Enter of op "Opslaan". Het idee wordt bewaard, het formulier maakt zich leeg en de cursor staat weer in het titelveld, klaar voor het volgende idee. Onder het formulier staan mijn eerder bewaarde ideeën, nieuwste bovenaan; een klik opent een idee om het aan te vullen of te verwijderen.

De velden Format, Datum, Tijd en LinkedIn-URL komen in de content-omgeving niet meer voor. De kalender is verdwenen: geen maandraster, geen maandnavigatie, geen lege of gemiste slots en geen slepen.

**Why this priority**: Snel ideeën kunnen vastleggen is de kern van deze wijziging. Zonder deze weergave levert de feature geen waarde; de kalender en de planningvelden zijn juist de onderdelen die het vastleggen in de weg zaten.

**Independent Test**: Kan volledig getest worden door de content-pagina te openen, een idee met alleen een titel op te slaan en te controleren dat het direct in de lijst staat, dat het formulier leeg en gefocust is en dat nergens Format, Datum, Tijd, LinkedIn-URL of een kalender zichtbaar is.

**Acceptance Scenarios**:

1. **Given** ik open "Content", **When** de pagina laadt, **Then** zie ik standaard de vastlegweergave met bovenaan het invoerformulier en daaronder de bewaarde ideeën.
2. **Given** ik typ alleen een titel, **When** ik op Enter druk of op "Opslaan" klik, **Then** is het idee bewaard met status Idee, staat het bovenaan de lijst en is het formulier leeg met de cursor in het titelveld.
3. **Given** ik kies een contentsoort voordat ik opsla, **When** het idee is bewaard, **Then** toont het idee in de lijst de naam en kleur van die soort.
4. **Given** ik laat de titel leeg of typ alleen spaties, **When** ik probeer op te slaan, **Then** verschijnt een inline melding bij het titelveld en wordt er niets bewaard.
5. **Given** een bewaard idee, **When** ik erop klik, **Then** opent een detailweergave met titel, contentsoort, idee-tekst, bron-URL en notities, zonder Format, Datum, Tijd of LinkedIn-URL.
6. **Given** ik pas een idee aan of verwijder het, **When** ik opsla of verwijderen bevestig, **Then** zijn de lijst en het overzicht direct bijgewerkt.

---

### User Story 2 - Overzicht van ideeën per contentsoort (Priority: P1)

Ik schakel binnen de content-pagina naar de tweede weergave "Overzicht". Daar zie ik per contentsoort hoeveel ideeën ik heb. Soorten zonder ideeën staan er ook bij met 0, zodat ik direct zie welke soort nog leeg is. Onderaan zie ik het totaal en, als die er zijn, het aantal ideeën zonder contentsoort.

**Why this priority**: Het overzicht is de tweede helft van de gevraagde feature: het maakt zichtbaar waar mijn ideeën zich verzamelen en welke soorten achterblijven. Zonder dit overzicht is er geen antwoord op de vraag "hoeveel ideeën heb ik per content soort".

**Independent Test**: Kan volledig getest worden door enkele ideeën aan verschillende soorten toe te kennen en te controleren dat het overzicht per soort het juiste aantal toont, inclusief soorten met 0 en het totaal.

**Acceptance Scenarios**:

1. **Given** 3 ideeën van soort A en 2 van soort B, **When** ik het overzicht open, **Then** toont het overzicht A met 3, B met 2 en een totaal van 5.
2. **Given** een contentsoort zonder ideeën, **When** ik het overzicht open, **Then** staat die soort er met 0 tussen.
3. **Given** ideeën zonder contentsoort, **When** ik het overzicht open, **Then** zie ik die ideeën als aparte groep "Geen soort" met het juiste aantal.
4. **Given** ik voeg in de vastlegweergave een idee toe, **When** ik naar het overzicht schakel, **Then** is het aantal van die soort direct met 1 verhoogd zonder de pagina te vernieuwen.
5. **Given** een gearchiveerde contentsoort met bestaande ideeën, **When** ik het overzicht open, **Then** staat de soort met een archiefmarkering en het juiste aantal in het overzicht.

---

### User Story 3 - Contentsoorten beheren zonder weekslots (Priority: P2)

Ik beheer mijn contentsoorten vanuit de content-pagina: ik maak een soort aan met naam (verplicht), doelgroep, korte beschrijving en een kleur, en ik kan een soort archiveren of heractiveren. Weekdagen en tijden horen niet meer bij een soort, want er is geen kalender meer. Gearchiveerde soorten zijn niet kiesbaar bij een nieuw idee, maar bestaande ideeën houden hun soort.

**Why this priority**: De soorten zijn nodig om ideeën te groeperen en het overzicht betekenis te geven. Het beheer is echter een eenmalige of sporadische handeling; de dagelijkse waarde zit in vastleggen en tellen.

**Independent Test**: Kan volledig getest worden door een soort aan te maken, de naam en kleur te wijzigen, de soort te archiveren en te controleren dat de soort niet meer kiesbaar is bij een nieuw idee maar in het overzicht en bij bestaande ideeën blijft staan, zonder dat ergens weekdagen of tijden opduiken.

**Acceptance Scenarios**:

1. **Given** ik open het soortenbeheer, **When** het venster verschijnt, **Then** zie ik naam, doelgroep, beschrijving, kleur en archiveren, en nergens weekdagen of tijden.
2. **Given** een actieve soort, **When** ik die archiveer, **Then** is de soort niet meer kiesbaar bij een nieuw idee en blijven bestaande ideeën en het aantal in het overzicht ongewijzigd.
3. **Given** een gearchiveerde soort, **When** ik die heractiveer, **Then** is de soort weer kiesbaar bij een nieuw idee.
4. **Given** ik wijzig de naam van een soort, **When** ik opsla, **Then** tonen bestaande ideeën en het overzicht direct de nieuwe naam.

---

### User Story 4 - Bestaande content blijft bereikbaar (Priority: P2)

Alles wat ik vóór deze wijziging in de content-omgeving heb bewaard, blijft bestaan. Ook posts die een datum, tijd, format of LinkedIn-URL hadden, verschijnen gewoon in de ideeënlijst en tellen mee in het overzicht. De oude planninggegevens worden niet meer getoond of bewerkt, maar gaan ook niet verloren.

**Why this priority**: De overstap mag geen gegevens laten verdwijnen. Zonder deze garantie is het niet veilig om de kalender uit te zetten.

**Independent Test**: Kan volledig getest worden door te controleren dat elk vóór de wijziging bewaard item in de ideeënlijst staat en meetelt in het overzicht, en dat er nergens een datum-, tijd-, format- of LinkedIn-URL-veld verschijnt.

**Acceptance Scenarios**:

1. **Given** een bestaand item met een datum en een LinkedIn-URL, **When** ik de content-pagina open, **Then** staat het item in de ideeënlijst en telt het mee in het overzicht.
2. **Given** een bestaand item met status Gepland of Live, **When** ik het open, **Then** kan ik titel, soort, tekst, bron-URL en notities bewerken zonder datum, tijd, format of LinkedIn-URL te zien.
3. **Given** de wijziging is doorgevoerd, **When** ik het totaal van de ideeënlijst vergelijk met het totaal van het overzicht, **Then** is dat gelijk en ontbreekt er geen enkel eerder bewaard item.

---

### Edge Cases

- **Titel van alleen spaties**: er wordt niets bewaard en het titelveld krijgt een melding.
- **Dubbel opslaan door snel achter elkaar op Enter te drukken**: er ontstaat precies één idee per bewuste opslag; tijdens het opslaan is de opslagactie tijdelijk geblokkeerd.
- **Opslaan mislukt**: de ingevulde tekst blijft staan, er verschijnt een foutmelding en ik kan het opnieuw proberen zonder mijn invoer kwijt te raken.
- **Nog geen contentsoorten**: vastleggen werkt gewoon; het soortveld biedt alleen "Geen soort" aan en het overzicht toont een uitnodiging om een soort aan te maken.
- **Soort wordt gearchiveerd terwijl de vastlegweergave openstaat**: de soort verdwijnt uit de keuzelijst; was die soort al gekozen, dan wordt opslaan geweigerd met de melding dat een gearchiveerde soort niet kiesbaar is, zodat de gebruiker een andere soort of "Geen soort" kiest.
- **Zeer veel ideeën**: de lijst blijft bruikbaar en het overzicht blijft correct tellen; er is geen maximum aantal ideeën.
- **Zeer lange titel**: de lijst kapt de titel af; de volledige titel blijft in de detailweergave zichtbaar.
- **Idee zonder soort**: telt mee in het totaal en in de groep "Geen soort", niet bij een specifieke soort.
- **Gearchiveerde soort met ideeën**: blijft zichtbaar in de lijst en in het overzicht, met archiefmarkering; alleen nieuwe toewijzingen zijn niet mogelijk.
- **Bestaand item met een datum in het verleden**: krijgt geen verlopen-markering meer en gedraagt zich als elk ander idee.
- **Twee tabbladen tegelijk**: de laatste opslag wint, conform de bestaande applicatiegewoonte; er is geen realtime conflictmelding.
- **Mobiel scherm**: vastleggen en overzicht zijn volledig bruikbaar; het formulier staat bovenaan en de lijst eronder.
- **Verwijderen van een idee**: vraagt om bevestiging in de app; het aantal in het overzicht daalt direct.

## Requirements *(mandatory)*

### Functional Requirements

*Navigatie en weergaven*

- **FR-001**: De content-pagina MOET precies twee weergaven hebben: "Ideeën" (vastleggen) en "Overzicht" (aantallen per contentsoort); beide zijn met één klik bereikbaar en "Ideeën" is de standaardweergave.
- **FR-002**: De kalenderweergave MOET volledig verdwijnen: geen maandraster, maandnavigatie, lege of gemiste slots, weekslots, slepen of verlopen-markeringen.
- **FR-003**: Het navigatie-item "Content" MOET in de linkerbalk blijven staan, direct onder "Uren", en MOET de vastlegweergave openen.

*Snel vastleggen*

- **FR-004**: De vastlegweergave MOET bovenaan een formulier tonen met: titel (verplicht), contentsoort (optioneel), idee-tekst (optioneel), bron-URL (optioneel) en notities (optioneel). Titel, contentsoort en idee-tekst staan direct zichtbaar; bron-URL en notities MOGEN achter een "Meer details"-toggle staan.
- **FR-005**: Het formulier en de detailweergave MOGEN GEEN velden Format, Datum, Tijd of LinkedIn-URL bevatten.
- **FR-006**: Opslaan MOET mogelijk zijn met alleen een niet-lege titel (na het verwijderen van omringende spaties); alle andere velden zijn optioneel.
- **FR-007**: Opslaan MOET kunnen via de knop "Opslaan", via Enter in het titelveld en via Ctrl/Cmd+Enter; een nieuw idee krijgt status Idee en er worden geen format-, datum-, tijd- of LinkedIn-URL-waarden gezet.
- **FR-008**: Na een geslaagde opslag MOET het formulier leeg zijn, moet de cursor weer in het titelveld staan, verschijnt een bevestiging en staat het nieuwe idee bovenaan de lijst; de gebruiker blijft in de vastlegweergave.
- **FR-009**: Na een mislukte opslag MOET de ingevulde inhoud behouden blijven, MOET een foutmelding zichtbaar zijn en MOET opnieuw opslaan mogelijk zijn zonder dubbele items.
- **FR-010**: De vastlegweergave MOET alle bewaarde ideeën tonen, nieuwste bovenaan, met titel, contentsoort (naam en kleur) of "Geen soort", en de aanmaakdatum.
- **FR-011**: Een klik op een idee MOET een detailweergave openen waarin titel, contentsoort, idee-tekst, bron-URL en notities bewerkbaar zijn; verwijderen MOET met bevestiging gaan en sluiten met niet-opgeslagen wijzigingen MOET om bevestiging vragen.
- **FR-012**: De status MOET als optioneel label behouden blijven, standaard Idee bij een nieuw idee, en MOET vrij gewijzigd kunnen worden zonder dat daarvoor een datum, tijd of LinkedIn-URL nodig is. De bestaande tekstregel voor Klaar, Gepland en Live (niet-leeg, maximaal 3.000 tekens) blijft van kracht.

*Overzicht*

- **FR-013**: De overzichtweergave MOET per contentsoort het aantal ideeën tonen, inclusief soorten met 0 ideeën.
- **FR-014**: Het overzicht MOET een totaal aantal ideeën tonen en, wanneer er ideeën zonder contentsoort zijn, een aparte groep "Geen soort" met het juiste aantal.
- **FR-015**: Het overzicht MOET alle bewaarde ideeën meetellen, ongeacht hun status.
- **FR-016**: De aantallen MOETEN direct na toevoegen, bewerken, verwijderen of hernoemen van een soort bijgewerkt zijn, zonder de pagina handmatig te vernieuwen.
- **FR-017**: Een gearchiveerde contentsoort MOET in het overzicht zichtbaar blijven met archiefmarkering en met het juiste aantal.

*Contentsoorten*

- **FR-018**: Gebruikers MOETEN contentsoorten kunnen aanmaken en bewerken met naam (verplicht), doelgroep, korte beschrijving en een kleur uit de bestaande vaste kleuren.
- **FR-019**: Gebruikers MOETEN contentsoorten kunnen archiveren en heractiveren; verwijderen is niet toegestaan, zodat aantallen en bestaande ideeën behouden blijven.
- **FR-020**: Het beheer van contentsoorten MAG GEEN weekdagen, tijden of andere slotinstellingen meer bevatten.
- **FR-021**: Een gearchiveerde contentsoort MAG NIET kiesbaar zijn bij een nieuw idee; bestaande ideeën behouden hun soort en tonen de soortnaam.
- **FR-022**: Een wijziging van de naam of kleur van een soort MOET direct zichtbaar zijn bij bestaande ideeën en in het overzicht.

*Bestaande content*

- **FR-023**: Alle vóór deze wijziging bewaarde content MOET zichtbaar blijven in de ideeënlijst en MOET meetellen in het overzicht; geen enkel item mag verdwijnen.
- **FR-024**: De waarden van Format, Datum, Tijd en LinkedIn-URL van bestaande items MOETEN bewaard blijven, maar MOGEN in de content-omgeving niet meer getoond of bewerkt worden.
- **FR-025**: Bestaande items met een datum of met status Gepland of Live MOETEN als gewoon idee behandeld worden, zonder kalendergedrag of verlopen-markering.

*Kwaliteit en toegankelijkheid*

- **FR-026**: Beide weergaven MOETEN bruikbaar zijn op desktop en op mobiel (smaller dan 768 px), met het vastlegformulier bovenaan en zonder horizontaal scrollen.
- **FR-027**: Bevestigingen en foutmeldingen MOETEN in de app zelf verschijnen; er MOGEN GEEN browserdialoogvensters gebruikt worden.
- **FR-028**: Formuliervelden MOETEN een zichtbaar label hebben en met het toetsenbord bedienbaar zijn; na opslaan MOET de focus terugkeren naar het titelveld.

### Key Entities

- **Idee (voorheen post)**: Een bewaard contentidee met titel (verplicht), optionele contentsoort, idee-tekst, bron-URL, notities, status en aanmaakmoment. Een idee zonder contentsoort valt in de groep "Geen soort". Oude planningsvelden (format, datum, tijd, LinkedIn-URL, inplanmoment) kunnen op bestaande items aanwezig zijn maar horen niet meer bij de zichtbare betekenis van een idee.
- **Contentsoort**: Een vaste categorie met naam (verplicht), doelgroep, korte beschrijving, kleur, archiefstatus en volgorde. Bepaalt de groepering in de lijst en het overzicht. Heeft geen weekdagen of tijden meer.
- **Weekslot**: Bestond alleen voor de kalender en is geen onderdeel meer van de feature; bestaande slotgegevens hebben geen invloed meer op de weergave of op aantallen.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Vanaf het openen van "Content" kan een idee met alleen een titel in minder dan 10 seconden bewaard zijn, met maximaal twee handelingen (titel typen en Enter).
- **SC-002**: 100% van de bewaarde ideeën staat in de ideeënlijst en wordt precies één keer meegeteld in het overzicht.
- **SC-003**: De aantallen in het overzicht komen binnen 1 seconde na opslaan overeen met de werkelijkheid, zonder de pagina te vernieuwen.
- **SC-004**: Er zijn 0 kalenderelementen (maandraster, maandnavigatie, slots, slepen) en 0 velden Format, Datum, Tijd of LinkedIn-URL zichtbaar in de content-omgeving.
- **SC-005**: 0 eerder bewaarde content-items gaan verloren door deze wijziging.
- **SC-006**: 100% van de contentsoorten, inclusief soorten met 0 ideeën, is zichtbaar in het overzicht.
- **SC-007**: Beide weergaven zijn op een scherm van 375 px breed zonder horizontaal scrollen te gebruiken.

## Assumptions

- De twee views zijn twee tabbladen binnen de bestaande content-pagina, geen twee nieuwe items in de linkerbalk.
- "Ideeën" is de standaardweergave bij het openen van "Content".
- "Post" en "idee" verwijzen naar hetzelfde item: alles wat in de content-omgeving bewaard is, is een idee en telt mee in het overzicht, ongeacht de status.
- De wijziging is niet-destructief: bestaande velden en waarden blijven bewaard, maar Format, Datum, Tijd en LinkedIn-URL worden niet meer getoond of bewerkt.
- Weekslots en alle kalenderlogica vervallen; bestaande slotgegevens worden genegeerd en er komen geen nieuwe slots bij.
- Een nieuw idee mag zonder contentsoort worden opgeslagen en verschijnt dan onder "Geen soort".
- De status blijft bestaan als optioneel label met de bestaande waarden; de regels die datum, tijd of LinkedIn-URL vereisen vervallen omdat die velden niet meer bestaan.
- Contentsoorten worden gearchiveerd, niet verwijderd; archiveren is de enige manier om een soort "uit" te zetten.
- Het beheer van contentsoorten blijft bereikbaar vanuit de content-pagina, maar zonder weekdagen en tijden.
- Er is geen maximum aantal ideeën; een lange titel wordt in de lijst afgekapt en blijft volledig zichtbaar in de detailweergave.
- Bij gelijktijdig bewerken in twee tabbladen wint de laatste opslag, conform de bestaande applicatiegewoonte; er is geen realtime conflictdetectie.
- Buiten scope: kalender en planning, slepen, publiceren of inplannen via LinkedIn, herinneringen, analytics, AI-schrijfhulp, bijlagen (aparte feature 024), video-upload, terugkerende series en meerdere gebruikers.
