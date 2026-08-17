# Feature Specification: Save Success Checkmark

**Feature Branch**: `013-save-success-checkmark`

**Created**: 2026-08-17

**Status**: Draft

**Input**: User description: "pas het volgende aan onder borden en dan op de kaarten. Dat wanneer ik op 'opslaan' heb gedrukt en het opgeslagen is. Dan wil ik op de plaats van het knop 'Opslaan' een groen vinkje zien"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Saved state shows green checkmark on card detail (Priority: P1)

Wanneer een gebruiker een kaart opent vanuit een bord, wijzigingen aanbrengt (titel, beschrijving, deadline, sterren, kolom-verplaatsing) en op de knop "Opslaan" klikt, wordt de wijziging opgeslagen. Zodra het opslaan succesvol is voltooid, verandert de knop "Opslaan" op zijn plek in een groen vinkje. Hierdoor krijgt de gebruiker directe visuele bevestiging dat zijn wijzigingen zijn opgeslagen zonder dat hij een aparte melding hoeft te lezen.

**Why this priority**: Dit is de kern van het gevraagde verzoek: op de kaartdetail-dialoog moet de opslagknop direct worden vervangen door een groen vinkje na succes. Dit levert directe waarde: de gebruiker weet zonder twijfel dat het opslaan is gelukt.

**Independent Test**: Open een bord, open een kaart, wijzig een veld, klik op "Opslaan" en controleer dat de knop direct verandert in een groen vinkje.

**Acceptance Scenarios**:

1. **Given** een geopende kaartdetail-dialoog met onopgeslagen wijzigingen, **When** de gebruiker op "Opslaan" klikt en het opslaan slaagt, **Then** wordt de knop "Opslaan" vervangen door een groen vinkje op dezelfde positie.
2. **Given** het groene vinkje is zichtbaar na een succesvolle opslag, **When** de gebruiker daarna opnieuw een veld wijzigt, **Then** verandert het groene vinkje weer terug naar de knop "Opslaan" zodat de gebruiker weet dat er nieuwe onopgeslagen wijzigingen zijn.
3. **Given** een geopende kaartdetail-dialoog met onopgeslagen wijzigingen, **When** de gebruiker op "Opslaan" klikt maar het opslaan faalt, **Then** blijft de knop "Opslaan" zichtbaar (geen groen vinkje) en wordt de gebruiker geïnformeerd dat het opslaan is mislukt.

---

### User Story 2 - Saved state shows green checkmark on board settings (Priority: P2)

Wanneer een gebruiker bord-instellingen bewerkt (bijvoorbeeld de naam van een bord of andere bordinstellingen) en op "Opslaan" klikt, wordt de wijziging opgeslagen. Zodra het opslaan succesvol is voltooid, verandert de knop "Opslaan" op zijn plek in een groen vinkje als visuele bevestiging.

**Why this priority**: Het verzoek noemt expliciet "onder borden" naast "op de kaarten". Dit dekt de bewerkingsknop in de bordinstellingen / bordbewerkingen. P2 omdat het dezelfde interactie is als P1 maar op een andere locatie in de interface.

**Independent Test**: Open de bordinstellingen / bordbewerking, wijzig een veld, klik op "Opslaan" en controleer dat de knop verandert in een groen vinkje.

**Acceptance Scenarios**:

1. **Given** een geopend formulier voor bordbewerking met onopgeslagen wijzigingen, **When** de gebruiker op "Opslaan" klikt en het opslaan slaagt, **Then** wordt de knop "Opslaan" vervangen door een groen vinkje op dezelfde positie.
2. **Given** het groene vinkje is zichtbaar na een succesvolle opslag, **When** de gebruiker daarna opnieuw een veld wijzigt, **Then** verandert het groene vinkje weer terug naar de knop "Opslaan".
3. **Given** een geopend formulier voor bordbewerking met onopgeslagen wijzigingen, **When** het opslaan faalt, **Then** blijft de knop "Opslaan" zichtbaar (geen groen vinkje) en wordt de gebruiker geïnformeerd dat het opslaan is mislukt.

---

### User Story 3 - Automatic recovery of the save button (Priority: P3)

Nadat het groene vinkje is getoond, herstelt de interface zich vanzelf: het vinkje blijft een korte, vaste tijd zichtbaar en verandert daarna vanzelf weer in de knop "Opslaan" zonder dat de gebruiker een handeling hoeft uit te voeren, zodat het volgende opslag-moment weer op dezelfde plek beschikbaar is.

**Why this priority**: Voorkomt dat de gebruiker in de war raakt doordat het vinkje oneindig blijft staan terwijl er niets meer op te slaan is. P3 omdat het een afronding is van de hoofdinteractie — functioneel werkt het al met P1/P2, dit maakt het robuust.

**Independent Test**: Sla een kaart of bord succesvol op en controleer dat het groene vinkje na een korte periode vanzelf weer terug verandert in de knop "Opslaan".

**Acceptance Scenarios**:

1. **Given** het groene vinkje is zichtbaar na een succesvolle opslag en de gebruiker wijzigt niets meer, **When** een korte, vaste periode verstrekt, **Then** verandert het groene vinkje vanzelf weer in de knop "Opslaan".
2. **Given** het groene vinkje is zichtbaar, **When** de gebruiker de dialoog sluit en opent, **Then** is bij het opnieuw openen weer de knop "Opslaan" zichtbaar (het vinkje is niet persistent).

---

### Edge Cases

- Wat gebeurt er als de gebruiker meerdere keren snel achter elkaar op "Opslaan" klikt? Het groene vinkje mag pas verschijnen nadat de laatste opslag succesvol is; tussentijdse klikken worden genegeerd of geblokkeerd zolang er een opslag loopt.
- Wat gebeurt er als de gebruiker een veld wijzigt terwijl het groene vinkje nog zichtbaar is? Het vinkje moet direct worden vervangen door de knop "Opslaan" zodat zichtbaar is dat er opnieuw onopgeslagen wijzigingen zijn.
- Wat gebeurt er als de gebruiker de dialoog sluit terwijl het opslaan nog loopt? Het opslaan moet niet worden afgebroken; bij sluiten wordt er geen groen vinkje getoond.
- Wat gebeurt er als het opslaan deels slaagt (bijv. kaartgegevens wel, maar een gerelateerd veld niet)? Er wordt geen groen vinkje getoond; de gebruiker krijgt een foutmelding.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Het systeem MOET na een succesvolle opslag van een kaart in de kaartdetail-dialoog de knop "Opslaan" direct vervangen door een groen vinkje op dezelfde positie.
- **FR-002**: Het systeem MOET na een succesvolle opslag van een bordbewerking de knop "Opslaan" direct vervangen door een groen vinkje op dezelfde positie.
- **FR-003**: Het systeem MOET het groene vinkje direct weer vervangen door de knop "Opslaan" zodra de gebruiker na een succesvolle opslag opnieuw een veld wijzigt.
- **FR-004**: Het systeem MAG het groene vinkje ALLEEN tonen als de opslag daadwerkelijk succesvol is voltooid; bij een mislukte opslag blijft de knop "Opslaan" zichtbaar en krijgt de gebruiker een foutmelding.
- **FR-005**: Het systeem MOET het groene vinkje na een korte, vaste periode vanzelf weer laten terugkeren naar de knop "Opslaan", zodat een volgende opslag op dezelfde plek mogelijk blijft.
- **FR-006**: Het systeem MOET het groene vinkje verbergen en de knop "Opslaan" tonen telkens wanneer een dialoog of formulier opnieuw wordt geopend, ongeacht de vorige opslaatstatus.
- **FR-007**: Het systeem MOET voorkomen dat het groene vinkje wordt getoond als de gebruiker de dialoog sluit vóórdat de opslag is voltooid.
- **FR-008**: Het systeem MOET het gedrag consistent toepassen op alle bewerkingsplekken die onder "borden" en "kaarten" vallen, ongeacht het specifieke formulier.

### Key Entities *(include if feature involves data involved)*

- **Kaart**: Een werkitem op een bord met velden zoals titel, beschrijving, deadline, ster-status en kolom. Bewaard in de bestaande kaartenopslag; wijzigingen worden opgeslagen via de bestaande opslagactie.
- **Bord**: Een kanban-bord met eigen instellingen (bijv. naam). Bewaard in de bestaande bordenopslag; wijzigingen worden opgeslagen via de bestaande opslagactie.
- **Opslagstatus (UI-status)**: Een tijdelijke, lokaal bijgehouden toestand die aangeeft of de laatste opslag succesvol was ("saved"). Deze status is puur visueel en wordt niet persistent opgeslagen.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In 100% van de gevallen waarin een kaart of bord succesvol wordt opgeslagen, verandert de knop "Opslaan" direct (binnen 1 seconde na succes) in een groen vinkje op dezelfde positie.
- **SC-002**: In 100% van de gevallen waarin het opslaan mislukt, blijft de knop "Opslaan" zichtbaar en wordt er geen groen vinkje getoond.
- **SC-003**: Gebruikers zien binnen 2 seconden nadat ze een veld hebben gewijzigd na een succesvolle opslag weer de knop "Opslaan" in plaats van het groene vinkje.
- **SC-004**: Ten minste 90% van de testgebruikers bevestigt dat de visuele bevestiging (het groene vinkje) hen duidelijk maakt dat de wijziging is opgeslagen, zonder dat ze een aparte melding hoeven te lezen.

## Assumptions

- De bestaande opslagfunctionaliteit voor kaarten en borden blijft ongewijzigd; deze feature voegt alleen een visuele bevestigingsstaat toe na een reeds werkende opslag.
- "Borden" verwijst naar de bewerkingsformulieren voor bordinstellingen (naam, etc.); "kaarten" verwijst naar de kaartdetail-dialoog die wordt geopend vanaf een bord.
- Het groene vinkje is een tijdelijke UI-staat (enkele seconden), geen persistente status; na een korte periode of bij een nieuwe wijziging herstelt de knop "Opslaan" vanzelf.
- De feature is beperkt tot de bewerkingsknoppen onder "borden" en "kaarten" zoals beschreven; bewerkingsknoppen in andere modules (zoals urenregistratie, CRUD-tabbladen, DB-explorer, command center) vallen buiten scope, tenzij de gebruiker deze expliciet wil toevoegen in een latere fase.
- Een "groen vinkje" wordt visueel voorgesteld als een vinkje-icoon in een groene kleur (voorbeeld: een CheckIcon in een groene tint), passend bij het bestaande ontwerpsysteem.
- Foutafhandeling bij mislukte opslag blijft zoals momenteel geïmplementeerd (bijv. een foutmelding); dit valt niet onder deze feature.