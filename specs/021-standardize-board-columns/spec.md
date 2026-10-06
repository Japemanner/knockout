# Feature Specification: Standaardisatie van bordkolommen (Backlog, Doing, Done)

**Feature Branch**: `021-standardize-board-columns`

**Created**: 2026-10-06

**Status**: Draft

**Input**: User description: "zorg dat alle borden alleen de kolommen backlog, doing en done heeft. done moet altijd ingeklapt zijn."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Nieuw bord krijgt vaste kolommen (Priority: P1)

Als gebruiker maak ik een nieuw bord aan. Het bord krijgt automatisch precies drie kolommen: **Backlog**, **Doing** en **Done** — in die volgorde. Ik kan geen afwijkende kolomstructuur meer krijgen bij het aanmaken van een bord.

**Why this priority**: Dit is de kern van het verzoek. Elke nieuwe situatie (nieuw bord) moet gegarandeerd de vaste kolomstructuur tonen; zonder dit is de feature niet waarneembaar.

**Independent Test**: Kan volledig getest worden door een nieuw bord aan te maken en te controleren dat het bord precies drie kolommen heeft (Backlog, Doing, Done) en geen andere kolommen bevat.

**Acceptance Scenarios**:

1. **Given** een ingelogde gebruiker, **When** deze een nieuw bord aanmaakt, **Then** bevat het bord precies de kolommen Backlog, Doing en Done, in die volgorde.
2. **Given** een nieuw aangemaakt bord, **When** de gebruiker het bord opent, **Then** is er geen kolom met een andere naam (zoals Review) aanwezig.

---

### User Story 2 - De Done-kolom is standaard ingeklapt (Priority: P1)

Als gebruiker open ik een bord. De kolom **Done** is altijd ingeklapt: ik zie alleen de kolomtitel (en eventueel het aantal kaarten), niet de kaarten zelf. Ik kan de kolom handmatig uitklappen om afgeronde kaarten te bekijken, en opnieuw inklappen.

**Why this priority**: Direct onderdeel van het verzoek en dagelijks zichtbaar bij elk bordbezoek. Dit zorgt voor rustigere borden en minder scrollwerk, omdat afgeronde werk zichtbaar maar niet opdringerig is.

**Independent Test**: Kan volledig getest worden door een bord te openen en te verifiëren dat de Done-kolom ingeklapt is, de kaarten toont na uitklappen en opnieuw inklapbaar is.

**Acceptance Scenarios**:

1. **Given** een bord met kaarten in de Done-kolom, **When** de gebruiker het bord opent, **Then** is de Done-kolom ingeklapt en zijn de kaarten niet zichtbaar.
2. **Given** een ingeklapte Done-kolom, **When** de gebruiker op de kolomkop klikt, **Then** klapt de kolom uit en zijn de kaarten zichtbaar.
3. **Given** een uitgeklapte Done-kolom, **When** de gebruiker opnieuw op de kolomkop klikt, **Then** klapt de kolom weer in.

---

### User Story 3 - Bestaande borden worden omgezet naar de vaste kolommen (Priority: P2)

Als gebruiker met bestaande borden wil ik dat al mijn borden dezelfde vaste kolomstructuur krijgen (Backlog, Doing, Done). Mijn bestaande kaarten gaan hierbij niet verloren: kaarten uit een verwijderde kolom worden verplaatst zodat ze altijd bereikbaar blijven. Ik hoef niets handmatig te doen.

**Why this priority**: Consistentie over álle borden — het verzoek zegt expliciet "alle borden". Bestaande data mag nooit verloren gaan, daarom volgt dit direct na de nieuwe-bord-gedragingen.

**Independent Test**: Kan getest worden door een bestaand bord te openen (of de migratie eenmalig te laten draaien) en te controleren dat het bord alleen Backlog, Doing en Done bevat en alle eerder aanwezige kaarten nog zichtbaar zijn (in de juiste kolom).

**Acceptance Scenarios**:

1. **Given** een bestaand bord met kolommen Backlog, Doing, Review en Done, **When** de aanpassing wordt toegepast, **Then** bevat het bord alleen Backlog, Doing en Done.
2. **Given** een bestaand bord met kaarten in de kolom Review, **When** de aanpassing wordt toegepast, **Then** zijn deze kaarten verplaatst naar een bestaande kolom (standaard Doing) en nog steeds zichtbaar.
3. **Given** een bestaand bord met een afwijkende kolomnaam (bijv. "Te doen"), **When** de aanpassing wordt toegepast, **Then** bevat het bord uitsluitend de kolommen Backlog, Doing en Done.

---

### User Story 4 - Kolommen beheren binnen de vaste structuur (Priority: P3)

Als gebruiker wil ik kaarten nog steeds kunnen verplaatsen tussen Backlog, Doing en Done (slepen of anderszins), en kolomnamen niet per ongeluk kunnen wijzigen of kolommen kunnen verwijderen, zodat de vaste structuur behouden blijft.

**Why this priority**: Biedt duidelijkheid over de grenzen van de feature nadat de vaste structuur er staat. Voorkomt dat de vaste structuur per ongeluk breekt en behoudt de kernfunctionaliteit van het bord.

**Independent Test**: Kan getest worden door een kaart tussen de drie kolommen te verplaatsen en te verifiëren dat de kolomstructuur ongewijzigd blijft.

**Acceptance Scenarios**:

1. **Given** een bord met de vaste kolommen, **When** de gebruiker een kaart van Backlog naar Doing versleept, **Then** verplaatst de kaart correct en blijft de kolomstructuur Backlog, Doing, Done.
2. **Given** een bord met de vaste kolommen, **When** de gebruiker probeert een kolom te verwijderen, **Then** wordt dit voorkomen (of geweigerd), zodat de vaste structuur behouden blijft.

---

### Edge Cases

- Wat gebeurt er met kaarten die in een kolom liggen die wordt verwijderd bij de omzetting? (Ze moeten verplaatst worden naar een resterende kolom, zodat geen kaart verloren raakt.)
- Wat gebeurt er met een bord dat al precies Backlog, Doing en Done heeft? (Geen wijziging nodig; het bord blijft ongemoeid.)
- Wat gebeurt er als de Done-kolom om een andere reden niet bestaat op een bord (bijv. handmatig aangepast vóór de aanpassing)? (De borden-omzetting zorgt dat alsnog een Done-kolom bestaat, die dan ingeklapt is.)
- Wat gebeurt er als een kolomnaam afwijkt qua hoofdlettergebruik (bijv. "done" i.p.v. "Done")? (De kolom moet toch als de Done-kolom worden herkend en ingeklapt zijn.)
- Wat gebeurt er als een gebruiker een uitgeklapte Done-kolom wil blijven gebruiken tijdens een sessie? (Handmatig uit- en inklappen blijft mogelijk; alleen de beginstatus is altijd ingeklapt.)
- Wat gebeurt er bij het opnieuw openen van een bord nadat de gebruiker Done had uitgeklapt? (De kolom staat dan weer ingeklapt; inklapstatus wordt niet bewaard.)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Het systeem MOET elk nieuw aangemaakt bord voorzien van precies de kolommen Backlog, Doing en Done, in die volgorde.
- **FR-002**: Het systeem MOET bij het openen van een bord de kolom met de naam Done standaard ingeklapt tonen, ongeacht de status van eerdere sessies.
- **FR-003**: Het systeem MOET toestaan dat de gebruiker de Done-kolom handmatig uit- en inklapt, waarbij de kaarten pas zichtbaar zijn als de kolom is uitgeklapt.
- **FR-004**: Het systeem MOET alle bestaande borden omzetten naar de vaste kolomstructuur (alleen Backlog, Doing, Done) als onderdeel van de aanpassing.
- **FR-005**: Het systeem MOET bij de omzetting van een bestaand bord alle kaarten behouden: kaarten uit een verwijderde kolom worden verplaatst naar een resterende kolom (standaard Doing).
- **FR-006**: Het systeem MOET voorkomen dat kaarten verloren raken tijdens de omzetting van kolommen.
- **FR-007**: Het systeem MOET de Done-kolom correct herkend worden ongeacht hoofdlettergebruik van de kolomnaam.
- **FR-008**: Het systeem MOET de vaste kolomnamen van nieuwe borden ongewijzigd laten; gebruikers kunnen kolommen niet zo wijzigen of verwijderen dat de vaste structuur (Backlog, Doing, Done) verloren gaat.

### Key Entities

- **Bord (Board)**: Een kanbanbord van een gebruiker. Heeft een naam en bevat altijd precies de kolommen Backlog, Doing en Done na deze aanpassing.
- **Kolom (Column)**: Een vaste status-groepering op een bord, met een vaste naam (Backlog, Doing of Done) en een vaste positie. De Done-kolom heeft de bijzondere eigenschap dat deze standaard ingeklapt is.
- **Kaart (Card)**: Een werkitem binnen een kolom. Kaarten kunnen tussen de drie vaste kolommen worden verplaatst en blijven altijd in precies één kolom liggen.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% van de nieuw aangemaakte borden bevat precies de kolommen Backlog, Doing en Done (verifieerbaar door een bord aan te maken en de kolommen te controleren).
- **SC-002**: 100% van de bestaande borden toont na de aanpassing uitsluitend de kolommen Backlog, Doing en Done.
- **SC-003**: Bij het openen van een bord is de Done-kolom in 100% van de gevallen ingeklapt.
- **SC-004**: 0 kaarten raken verloren bij de omzetting van bestaande borden; alle eerder zichtbare kaarten blijven zichtbaar in één van de drie vaste kolommen.
- **SC-005**: Gebruikers kunnen in ten minste 95% van de gevallen binnen 10 seconden een kaart herkennen als afgerond, doordat de Done-kolom zichtbaar maar ingeklapt is (kolomtitel en aantal kaarten blijven zichtbaar).
- **SC-006**: Het uit- en inklappen van de Done-kolom reageert direct (waarneembaar binnen 1 seconde na klik).

## Assumptions

- "Alle borden" betekent: alle borden van alle gebruikers, zowel nieuwe als bestaande; bestaande borden worden eenmalig omgezet naar de vaste structuur.
- "Ingeklapt" betekent: de kolomtitel en het aantal kaarten blijven zichtbaar, maar de kaarten zelf zijn verborgen tot de gebruiker de kolom uitklapt.
- Kaarten uit verwijderde kolommen (bijv. Review) worden verplaatst naar Doing, tenzij een andere bestemming logischer is; geen kaart wordt verwijderd.
- De vaste kolomnamen worden exact gebruikt: Backlog, Doing en Done (met deze hoofdlettervorm voor toning), waarbij de herkenning van de Done-kolom niet gevoelig is voor hoofdlettergebruik in bestaande data.
- De huidige manier van aanmaken van borden (met vier kolommen, waaronder Review) wordt vervangen door de vaste drie-kolommenstructuur.
- Handmatig uit- en inklappen van de Done-kolom blijft mogelijk; de beginstatus is altijd ingeklapt, en de inklapstatus wordt niet per gebruiker of sessie bewaard.
- Kolommen toevoegen, verwijderen of hernoemen buiten de vaste drie om is buiten scope van deze feature; de vaste structuur wordt behouden.
- De omzetting van bestaande borden gebeurt als één keer doorlopen proces per bord, zonder verdere handmatige actie van de gebruiker.