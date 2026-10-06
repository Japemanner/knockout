# Feature Specification: Command Center gesterde items als kanban bord

**Feature Branch**: `022-command-center-starred-kanban`

**Created**: 2026-10-06

**Status**: Draft

**Input**: User description: "zorg dat Command center de gesterde item ook in een kanban bord laat zien. wanneer er daar 1 verplaatst word, wordt ie op de het andere bord ook verplaatst."

## Clarifications

### Session 2026-10-06

- Q: Hoe toont het command center de gesterde items als kanban bord? → A: Één aggregatiebord met vaste kolommen Backlog, Doing en Done; kaarten uit alle borden staan door elkaar per kolom, met het bronbord als label op elke kaart.
- Q: Geldt sleep-interactie ook voor de volgorde binnen een kolom? → A: Alleen kolomverplaatsing telt; binnen een kolom wordt automatisch gesorteerd op bronbord (kaarten van hetzelfde bord bij elkaar).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Gesterde items als kanban bord op het command center (Priority: P1)

Als gebruiker open ik het command center en zie daar mijn gesterde items niet langer als platte lijst, maar als een kanban bord. De kaarten op dit bord zijn dezelfde kaarten als die op mijn reguliere borden liggen (geen kopie): elke kaart op het command center-bord is de bestaande, gesterde kaart uit één van mijn borden. Ik zie per kaart ten minste de titel en uit welk bord hij komt.

**Why this priority**: Dit is de kern van het verzoek — het command center moet de gesterde items als kanban bord tonen. Zonder deze story levert de feature geen waarde op.

**Independent Test**: Kan volledig getest worden door kaarten op verschillende borden te sterren, het command center te openen en te controleren dat alle gesterde kaarten als bord-weergave zichtbaar zijn (en niet-gesterde kaarten ontbreken).

**Acceptance Scenarios**:

1. **Given** de gebruiker heeft op meerdere borden kaarten gesterd, **When** de gebruiker het command center opent, **Then** ziet hij een kanban bord-weergave met al zijn gesterde kaarten.
2. **Given** het command center-bord met gesterde items, **When** de gebruiker bekijkt de kaarten, **Then** is bij elke kaart zichtbaar van welk bord (en eventueel welke kolom) hij afkomstig is.
3. **Given** de gebruiker verwijdert de ster van een kaart op een regulier bord, **When** de gebruiker het command center herlaadt, **Then** verdwijnt die kaart uit het command center-bord.
4. **Given** de gebruiker geeft een nieuwe kaart een ster op een regulier bord, **When** de gebruiker het command center herlaadt, **Then** verschijnt die kaart op het command center-bord.

---

### User Story 2 - Kaart verplaatsen op het command center-bord sync met het bronbord (Priority: P1)

Als gebruiker sleep ik een gesterde kaart naar een andere kolom op het command center-bord. Deze verplaatsing wordt direct doorgevoerd op het bronbord: de kaart ligt daarna in dezelfde kolom op het bronbord (met dezelfde kolomnaam) als waar ik hem op het command center heb neergezet. De wijziging is persistent na herladen. Binnen een kolom kan ik de volgorde niet zelf wijzigen; kaarten worden automatisch gegroepeerd op bronbord.

**Why this priority**: Dit is het tweede deel van het verzoek — verplaatsen op het command center moet leiden tot dezelfde verplaatsing op het bronbord. Zonder sync raakt de gebruiker zijn borden kwijt aan onduidelijke staat.

**Independent Test**: Kan volledig getest worden door een gesterde kaart op het command center-bord naar een andere kolom te slepen, daarna het bronbord te openen en te controleren dat de kaart daar in de overeenkomstige kolom ligt (ook na herladen).

**Acceptance Scenarios**:

1. **Given** een gesterde kaart ligt in kolom Backlog op het bronbord, **When** de gebruiker deze kaart op het command center-bord naar kolom Doing sleept, **Then** ligt de kaart daarna in kolom Doing op het bronbord.
2. **Given** een kaart is op het command center verplaatst naar een andere kolom, **When** de gebruiker het bronbord herlaadt of later opnieuw opent, **Then** is de nieuwe kolom persistent bewaard.
3. **Given** een kaart is op het command center verplaatst, **When** de gebruiker op de kaart klikt (op het command center of het bronbord), **Then** opent de kaartdetail-weergave van dezelfde kaart.

---

### User Story 3 - Omgekeerde sync: verplaatsen op het bronbord zichtbaar op command center (Priority: P2)

Als gebruiker verplaats ik een gesterde kaart op het bronbord (bijv. van Doing naar Done). Wanneer ik daarna het command center open, zie ik de kaart in de kolom die overeenkomt met zijn nieuwe kolom op het bronbord. Beide weergaven tonen altijd dezelfde, actuele status van de kaart.

**Why this priority**: Tweeweg-consistentie maakt het command center-bord betrouwbaar als weergave van de werkelijke staat. Waardevol, maar de primaire wens is de sync van het command center naar het bronbord; zonder dit deel blijft het bord bruikbaar (na herladen is alles weer kloppend).

**Independent Test**: Kan volledig getest worden door een gesterde kaart op het bronbord te verplaatsen, het command center te openen en te controleren dat de kaart daar in de overeenkomstige kolom staat.

**Acceptance Scenarios**:

1. **Given** een gesterde kaart ligt in kolom Doing op het bronbord, **When** de gebruiker de kaart op het bronbord naar Done verplaatst, **Then** toont het command center-bord de kaart in de kolom Done (bij volgend openen/herladen).
2. **Given** een gesterde kaart is verplaatst op het bronbord, **When** de gebruiker het command center-bord bekijkt, **Then** is de getoonde kolom altijd in sync met de daadwerkelijke kolom van de kaart.

---

### User Story 4 - Kolommen van het command center-bord volgen de vaste bordstructuur (Priority: P2)

Als gebruiker zie ik op het command center-bord dezelfde vaste kolommen als op mijn reguliere borden: Backlog, Doing en Done. Kaarten worden in de kolom getoond die overeenkomt met de kolom op hun bronbord. Een kolom waarin geen gesterde kaarten liggen is leeg maar zichtbaar.

**Why this priority**: Consistentie met de vaste bordstructuur (Backlog, Doing, Done) maakt het bord direct herkenbaar zonder extra instructies. Dit volgt uit de bestaande bordconventie in de applicatie.

**Independent Test**: Kan volledig getest worden door het command center te openen en te controleren dat het bord precies de kolommen Backlog, Doing en Done toont, in die volgorde.

**Acceptance Scenarios**:

1. **Given** het command center-bord, **When** de gebruiker het bord bekijkt, **Then** toont het precies de kolommen Backlog, Doing en Done, in die volgorde.
2. **Given** een gesterde kaart ligt in kolom Done op het bronbord, **When** de gebruiker het command center-bord bekijkt, **Then** ligt de kaart in de kolom Done van het command center-bord.
3. **Given** er liggen geen gesterde kaarten in Backlog, **When** de gebruiker het command center-bord bekijkt, **Then** is de Backlog-kolom leeg maar zichtbaar.

---

### User Story 5 - Lege staat van het command center-bord (Priority: P3)

Als gebruiker zonder gesterde kaarten open ik het command center. In plaats van een leeg bord zonder uitleg zie ik een vriendelijke lege staat die uitlegt dat gesterde kaarten hier verschijnen, met een verwijzing naar hoe ik een kaart kan sterren. Zodra ik een kaart ster, verschijnt deze op het bord.

**Why this priority**: Voorkomt verwarring bij nieuwe gebruikers en gebruikers zonder sterren, maar de feature is ook zonder deze lege staat functioneel.

**Independent Test**: Kan volledig getest worden door alle sterren uit te zetten, het command center te openen en de lege-state-melding te controleren; daarna een kaart te sterren en te verifiëren dat deze op het bord verschijnt.

**Acceptance Scenarios**:

1. **Given** de gebruiker heeft geen gesterde kaarten, **When** de gebruiker het command center opent, **Then** toont het bord een lege staat met uitleg (bijv. "Geen gesterde items. Klik op de ster bij een kaart om 'm hier te zien.").
2. **Given** de lege staat is zichtbaar, **When** de gebruiker een kaart op een regulier bord sterart en het command center herlaadt, **Then** verschijnt de kaart op het command center-bord en verdwijnt de lege staat.

---

### Edge Cases

- Wat gebeurt er als de kolomnaam op het bronbord niet exact overeenkomt met Backlog/Doing/Done (bijv. afwijkende spelling of een hernoemde kolom)? De kaart wordt getoond in de beste match; een kaart die niet aan een vaste kolom kan worden toegewezen valt terug op de eerste kolom (Backlog) tot de gebruiker hem verplaatst.
- Wat gebeurt er als de gebruiker een kaart op het command center versleept terwijl dezelfde kaart op het bronbord net is verplaatst (tegelijkertijd open in twee tabs)? Laatste schrijf-actie wint; geen real-time conflictdetectie, conform de bestaande applicatie-conventie.
- Wat gebeurt er als een kaart tijdens het verplaatsen op het command center niet meer bestaat (bijv. tegelijk verwijderd in een ander tabblad)? De verplaatsing mislukt met een duidelijke foutmelding en de kaart verdwijnt uit de weergave.
- Wat gebeurt er als een gesterde kaart gearchiveerd wordt op het bronbord? De kaart verdwijnt uit het command center-bord (gearchiveerde kaarten verschijnen niet).
- Wat gebeurt er als het bronbord of de bronkolom van een gesterde kaart verwijderd wordt? Geen kaart raakt verloren; de kaart valt terug op een resterende kolom (conform bestaand bordgedrag) en het command center toont de kaart in de daarbijbehorende kolom.
- Wat gebeurt er als een sleep-actie op het command center niet kan worden opgeslagen (netwerkstoring)? De gebruiker krijgt een foutmelding en de kaart keert terug naar zijn oorspronkelijke positie (optimistische UI met rollback, conform de bestaande applicatie).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Het command center MOET de gesterde items weergeven als een kanban bord (kolom-weergave met sleepbare kaarten) in plaats van een platte lijst.
- **FR-002**: Het command center-bord MOET precies de kolommen Backlog, Doing en Done tonen, in die volgorde.
- **FR-003**: Het command center-bord MOET uitsluitend de kaarten tonen die momenteel gesterd zijn; de ster-status op het bronbord bepaalt de zichtbaarheid.
- **FR-004**: Elke kaart op het command center-bord MOET zichtbaar maken uit welk bord (en kolom) hij afkomstig is.
- **FR-005**: Het systeem MOET toestaan dat de gebruiker een kaart op het command center-bord naar een andere kolom versleept.
- **FR-006**: Het systeem MOET bij een verplaatsing op het command center-bord dezelfde kaart op het bronbord verplaatsen naar de overeenkomstige kolom (Backlog/Doing/Done).
- **FR-007**: Het systeem MOET de verplaatsing (vanuit het command center) persistent opslaan, zodat de kaart na herladen in de nieuwe kolom ligt op zowel het command center-bord als het bronbord.
- **FR-008**: Het systeem MOET het command center-bord bij (her)laden actueel laten zijn: kolom-wijzigingen die op een bronbord zijn gemaakt, worden op het command center-bord weergegeven.
- **FR-009**: Het systeem MOET een lege staat tonen wanneer er geen gesterde kaarten zijn, met uitleg hoe een kaart gesterd kan worden.
- **FR-010**: Het systeem MOET bij een mislukte verplaatsing (serverfout of verdwenen kaart) een foutmelding tonen en de kaart terugplaatsen op zijn oorspronkelijke positie.
- **FR-011**: Het systeem MOET gegarandeerd dat verplaatsen op het command center nooit resulteert in een kopie: er blijft altijd precies één kaart, die op beide weergaven dezelfde status heeft.
- **FR-012**: Het systeem MOET de sleep-interactie op het command center-bord beperken tot kolomverplaatsing; de volgorde van kaarten binnen een kolom MOET automatisch worden gesorteerd op bronbord (kaarten van hetzelfde bord bij elkaar) en is niet handmatig aanpasbaar.

### Key Entities

- **Gesterde kaart**: Een bestaande kaart uit een regulier bord met ster-status actief. Wordt op het command center-bord getoond in de kolom die overeenkomt met zijn kolom op het bronbord; is geen kopie, maar dezelfde kaart.
- **Command center-bord**: Een weergave-aggregatie van alle gesterde kaarten met vaste kolommen (Backlog, Doing, Done). Geen afzonderlijke entiteit met eigen kaarten — het toont en muteert uitsluitend bestaande kaarten.
- **Kolom-mapping**: De vaste relatie tussen de kolommen op het command center-bord (Backlog, Doing, Done) en de gelijknamige kolommen op de bronborden.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% van de gesterde kaarten van alle borden is zichtbaar op het command center-bord; 0 niet-gesterde kaarten is zichtbaar.
- **SC-002**: 100% van de verplaatsingen op het command center-bord is binnen 1 seconde zichtbaar op het bronbord (na herladen van het bronbord) en blijft correct na herladen van beide pagina's.
- **SC-003**: 100% van de kolom-wijzigingen op een bronbord is bij het (her)openen van het command center correct doorgevoerd op het command center-bord.
- **SC-004**: Het command center-bord toont in 100% van de gevallen precies de kolommen Backlog, Doing en Done, in die volgorde.
- **SC-005**: Gebruikers kunnen een gesterde kaart binnen 5 seconden vinden op het command center-bord als ze weten in welke kolom hij op het bronbord ligt.
- **SC-006**: Bij 100% van de mislukte sleep-acties keert de kaart terug naar zijn oorspronkelijke positie met een zichtbare foutmelding.
- **SC-007**: Binnen elke kolom op het command center-bord staan kaarten van hetzelfde bronbord in 100% van de gevallen naast elkaar (gegroepeerd op bronbord); handmatige volgorde-binnen-kolom is 0% mogelijk.

## Assumptions

- Het command center-bord is een weergave van bestaande gesterde kaarten; er worden geen nieuwe kaart-entiteiten aangemaakt en geen kaarten gekopieerd.
- De vaste kolomstructuur Backlog, Doing, Done geldt op alle borden (overeenkomend met feature 021); het command center-bord gebruikt exact deze drie kolommen.
- Een verplaatsing op het command center wordt doorgevoerd als een mutatie op de bestaande kaart op het bronbord (zelfde kaart-id, nieuwe kolom).
- Sleep-interactie op het command center geldt uitsluitend voor kolomverplaatsing; de volgorde binnen een kolom wordt automatisch gesorteerd op bronbord (kaarten van hetzelfde bord bij elkaar) en is niet handmatig aanpasbaar.
- De bronbord- en kolomnaam-indicatie op elke kaart is voldoende context voor de gebruiker; verdere kaartdetails zijn zichtbaar via de bestaande kaartdetail-weergave.
- Wanneer de kolom op het bronbord niet exact "backlog", "doing" of "done" heet (hoofdletterongevoelig), wordt de beste match gebruikt; kaarten zonder match vallen terug op Backlog tot de gebruiker ze verplaatst.
- De sync tussen bronbord en command center is bij (her)laden actueel (geen real-time push); dit is consistent met de rest van de applicatie.
- Tegelijkertijd slepen in twee tabs lost de laatste schrijf-actie laten winnen, conform de bestaande race-condition-conventie in de applicatie.
- De bestaande functionaliteit van de /starred pagina blijft ongewijzigd; deze feature vervangt uitsluitend de weergave van gesterde items op het command center.