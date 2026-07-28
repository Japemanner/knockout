# Feature Specification: Uren-tab privacy-toggle voor eurobedragen

**Feature Branch**: `011-uren-privacy-toggle`

**Created**: 2026-07-28

**Status**: Draft

**Input**: User description: "Maak in de uren tab een button waarbij alle getallen in euro's onzichtbaar worden als ik erop druk. Als ik op het kantoor zit hoeft namelijk niet iedereen mijn omzet en mijn omzet per gemaakte uren te zien. Gebruik het euro-teken en als monetaire bedragen niet zichtbaar zijn moet er een schuine streep door het euro-teken staan."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Privacy-toggle verbergt eurobedragen (Priority: P1)

Als freelancer werk ik soms vanuit een gedeeld kantoor waar collega's of voorbijgangers mee kunnen lezen op mijn scherm. Ik wil met één druk op de knop in de uren-tab alle financiële bedragen (omzet, omzet per gewerkte uren, uurtarieven en regeltotalen) verbergen, zodat niemand anders mijn inkomsten kan zien. In plaats van elk bedrag toont het systeem een €-symbool met een diagonale streep erdoor. Als ik de knop nogmaals indruk, verschijnen de exacte originele bedragen weer.

**Why this priority**: Dit is de kern van het verzoek — het directe privacy-probleem op het kantoor. Zonder deze story levert de feature geen waarde op.

**Independent Test**: Kan volledig getest worden door de toggle in te schakelen en te controleren dat alle zichtbare euro-bedragen in de uren-tab zijn vervangen door het €-symbool met streep, en door de toggle uit te schakelen en te controleren dat alle originele bedragen weer exact zichtbaar zijn.

**Acceptance Scenarios**:

1. **Given** de uren-tab is geopend en toont omzetcijfers, uurtarieven en regeltotalen, **When** de gebruiker de privacy-toggle aanzet, **Then** worden alle euro-bedragen onzichtbaar en toont elke verborgen plek enkel een €-symbool met een diagonale streep erdoor.
2. **Given** de privacy-toggle staat aan en alle bedragen zijn verborgen, **When** de gebruiker de toggle uitzet, **Then** verschijnen alle originele bedragen weer exact zoals voorheen, zonder afrondings- of formatverlies.
3. **Given** de uren-tab toont een urenregel zonder uurtarief (tarief = 0 of leeg), **When** de privacy-toggle wordt aangezet, **Then** wordt op die regel geen €-symbool met streep getoond (er is immers niets financieels te verbergen).
4. **Given** de privacy-toggle staat aan, **When** de gebruiker opent het bewerk-dialoogvenster van een urenregel of opdrachtgever, **Then** blijft functionele invoer mogelijk; de weergave van bedragen in het dialoog past zich aan de privacy-stand aan.

---

### User Story 2 - Voorkeur blijft bewaard tussen sessies (Priority: P2)

Ik wil dat de privacy-voorkeur die ik in de uren-tab instel, bewaard blijft in mijn browser. Zo hoef ik op het kantoor de toggle maar één keer aan te zetten; bij een volgend bezoek aan de uren-tab staat de privacy-stand nog steeds aan. Schakel ik hem uit, dan blijft hij ook uit tot ik hem weer aanzet.

**Why this priority**: Maakt dagelijks gebruik frictionloos. Belangrijk, maar pas waardevol nadat de basis-toggle (P1) werkt.

**Independent Test**: Toggle aanzetten, de pagina of browser sluiten, de uren-tab opnieuw openen — de toggle staat nog aan. Hetzelfde geldt voor de "uit"-stand.

**Acceptance Scenarios**:

1. **Given** de gebruiker heeft de privacy-toggle aangezet, **When** de gebruiker sluit de browser en opent later de uren-tab opnieuw, **Then** staat de privacy-toggle nog steeds aan en zijn de bedragen direct verborgen.
2. **Given** de gebruiker heeft de privacy-toggle uitgezet, **When** de gebruiker herlaadt de uren-tab, **Then** staan de bedragen direct zichtbaar.

---

### Edge Cases

- Wat gebeurt er bij een urenregel zonder uurtarief (tarief = 0 of leeg)? Geen €-symbool of streep tonen — er is geen financieel bedrag te verbergen.
- Hoe gedraagt de toggle zich in bewerk- en beheerdialogen? Functionele invoer moet mogelijk blijven; alleen de weergave van bedragen wordt aangepast aan de privacy-stand.
- Wat gebeurt er bij lange sessies met meerdere open secties in de uren-tab? Een toggle-wissel moet direct zichtbaar zijn in alle reeds geladen secties (dashboard, geschiedenis, dialogen) zonder dat de pagina herladen hoeft te worden.
- Wat als de browser-opslag niet beschikbaar is (bv. privémodus)? De toggle werkt dan alleen voor de huidige sessie en valt terug naar "bedragen zichtbaar" bij volgend bezoek; dit mag de werking binnen de sessie niet verstoren.
- Wat toont de toggle zelf als indicator van de huidige stand? De knop moet visueel onderscheid maken tussen "aan" en "uit" (bijv. ingedrukte/actieve status, icoon-variant of label).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Het systeem MOET een zichtbare schakelknop (toggle) tonen in de kop van de uren-tab, naast de bestaande actieknoppen.
- **FR-002**: Wanneer de privacy-toggle actief is MOETEN alle euro-bedragen in de uren-tab verborgen worden, te weten: totale omzet (week en maand), dagtotalen in de geschiedenis, uurtarieven per urenregel, en berekende regeltotalen.
- **FR-003**: Op de plek van een verborgen bedrag MOET het systeem een €-symbool met een diagonale streep erdoor tonen, zonder cijfers of tekst.
- **FR-004**: Het systeem MOET de huidige schakelstand visueel herkenbaar maken, zodat de gebruiker in één oogopslag ziet of bedragen verborgen of zichtbaar zijn.
- **FR-005**: Het systeem MOET de privacy-voorkeur per browser bewaren, zodat de stand bewaard blijft tussen sessies en pagina-herladingen.
- **FR-006**: Een wissel van de toggle-stand MOET direct doorwerken in alle reeds geladen secties van de uren-tab (dashboard, geschiedenis en open dialogen) zonder dat de pagina herladen hoeft te worden.
- **FR-007**: Bij het uitzetten van de toggle MOETEN alle bedragen exact hun oorspronkelijke waarde en formattering terugkrijgen.
- **FR-008**: De privacy-toggle MAG geen invloed hebben op andere tabbladen dan de uren-tab.
- **FR-009**: Urenregels zonder financieel bedrag (tarief = 0 of leeg) MOGEN bij actieve privacy-stand geen €-symbool met streep tonen.

### Key Entities *(include if feature involves data)*

- **Privacy-voorkeur**: Een booleaanse gebruikersvoorkeur "verberg euro-bedragen in de uren-tab", opgeslagen per browser. Waarde is "aan" (bedragen verborgen) of "uit" (bedragen zichtbaar). Geldt uitsluitend voor de uren-tab.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% van de zichtbare euro-bedragen in de uren-tab is verborgen (en vervangen door het €-symbool met streep) wanneer de privacy-toggle aan staat.
- **SC-002**: Een wissel van de toggle-stand is binnen 1 seconde zichtbaar in alle open secties van de uren-tab.
- **SC-003**: Na terugzetten van de toggle naar "uit" tonen alle bedragen exact hun oorspronkelijke waarde, inclusief oorspronkelijke decimalen en formattering.
- **SC-004**: Na herladen van de uren-tab staat de toggle in 95%+ van de gevallen in dezelfde stand als bij de vorige sessie (afhankelijk van beschikbaarheid van browser-opslag).
- **SC-005**: De privacy-stand beïnvloedt nul andere tabbladen — alleen de uren-tab toont aangepaste bedragen.

## Assumptions

- De privacy-voorkeur wordt lokaal in de browser opgeslagen (geen server-side profielvoorkeur nodig voor v1).
- De toggle geldt alleen voor de uren-tab; andere tabbladen blijven ongemoeid.
- Bij het bewerken in dialogen blijft functionele invoer mogelijk; alleen de weergave van bedragen verbergt zich.
- Een €-teken met diagonale streep is voldoende als placeholder; er is geen aanvullende tekst zoals "verborgen" nodig.
- Browser-opslag is in de meeste gevallen beschikbaar; bij uitzondering (privémodus) valt de toggle terug naar sessie-scoped werking.