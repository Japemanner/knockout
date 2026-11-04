# Feature Specification: Bijlagen bij een post

**Feature Branch**: `024-post-bijlagen`

**Created**: 2026-10-14

**Status**: Draft

**Input**: User description: "Voeg aan de LinkedIn content-kalender in Knockout (feature 023) bijlagen toe aan posts: afbeeldingen en PDF-carrousels, zodat alles wat ik voor een post nodig heb op één plek staat. In de post-editor staat een sectie 'Bijlagen'. Uploaden van JPG, PNG of PDF, maximaal 20 MB per bestand. Een post heeft óf maximaal 20 afbeeldingen, óf precies één PDF; geen combinatie (LinkedIn staat dat in één post ook niet toe). Een upload die deze regel breekt wordt geweigerd met uitleg. Afbeeldingen tonen als thumbnail, PDF's als bestandsnaam met icoon. Elke bijlage kan ik downloaden en verwijderen (met bevestiging). Volgorde van afbeeldingen kan ik aanpassen door te slepen; die volgorde gebruik ik bij het uploaden in LinkedIn. In de kalender toont een post met bijlagen een klein paperclip-icoon met het aantal. Verwijder ik een post, dan verdwijnen de bijlagen ook uit de opslag. Bijlagen zijn privé: alleen ik kan ze zien." (Volledige opdracht met user story, acceptatiescenario's en buiten-scope stond vooraf vast in de opdrachtomschrijving.)

## Clarifications

### Session 2026-10-14

De opdracht bevatte vooraf vastgestelde keuzes; er zijn geen open vragen blijven staan:

- De afbeeldingen-óf-PDF-regel volgt LinkedIn: een post kan óf meerdere afbeeldingen (max 20) óf precies één PDF (document/carrousel) bevatten, nooit een combinatie. Weigeringen leggen deze regel uit aan de gebruiker.
- Weigering van te grote of verkeerde bestanden gebeurt vóórdat er iets wordt verstuurd; er is geen "rest-verbruik" van de upload.
- De volgorde van afbeeldingen is de presentatievolgorde die ik bij het uploaden in LinkedIn aanhoud; Knockout publiceert niets zelf.
- Bijlagen zijn gekoppeld aan de post en privé per gebruiker; er zijn geen openbare links.
- Buiten scope: video, bewerken van afbeeldingen, automatisch PDF's genereren, delen van bijlagen via openbare links.
- De opdracht omschrijft één user story (P1); voor onafhankelijke testbaarheid is deze opgesplitst in het uploaden/beheren (P1) en de volgorde/kalender-signalering (P2).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Bijlagen uploaden en beheren (Priority: P1)

In de post-editor staat een sectie "Bijlagen". Hier upload ik JPG-, PNG- of PDF-bestanden, maximaal 20 MB per bestand. Een post heeft óf maximaal 20 afbeeldingen, óf precies één PDF — geen combinatie; een upload die deze regel breekt weigert de app met uitleg. Afbeeldingen tonen als thumbnail, een PDF als bestandsnaam met icoon. Elke bijlage kan ik downloaden en verwijderen; verwijderen vraagt eerst bevestiging. Verwijder ik de post, dan verdwijnen de bijlagen ook uit de opslag. Bijlagen zijn privé: alleen ik kan ze zien en openen.

**Why this priority**: Bijlagen bij de post horen bij de schrijfplek — alles wat ik voor een post nodig heb staat op één plek. Zonder deze story blijft de editor beperkt tot tekst en moet ik bestanden elders bewaren; de kernwaarde van de feature valt weg.

**Independent Test**: Kan volledig getest worden door een post te openen, twee PNG's te uploaden (twee thumbnails in uploadvolgorde), een PDF-bij een afbeeldingspost te proberen te uploaden (geweigerd met uitleg), een bestand van 25 MB aan te bieden (geweigerd vóór versturen), en vervolgens de post te verwijderen en te controleren dat de bestanden ook uit de opslag zijn verdwenen.

**Acceptance Scenarios**:

1. **Given** een post zonder bijlagen, **When** ik twee PNG's upload, **Then** zie ik twee thumbnails in de gekozen volgorde.
2. **Given** een post met een PDF, **When** ik een afbeelding upload, **Then** weigert de app dat met uitleg.
3. **Given** een bestand van 25 MB, **Then** weigert de app de upload vóórdat er iets wordt verstuurd.
4. **Given** een post met bijlagen, **When** ik de post verwijder, **Then** zijn de bestanden ook uit de opslag verdwenen.
5. **Given** een post met één afbeelding, **When** ik een tweede, gelijknamige afbeelding upload, **Then** bestaan beide bijlagen naast elkaar en tonen beide een thumbnail.

---

### User Story 2 - Volgorde en kalender-signalering (Priority: P2)

De volgorde van afbeeldingen pas ik aan door te slepen; die volgorde houd ik aan bij het uploaden in LinkedIn. In de kalender toont een post met bijlagen een klein paperclip-icoon met het aantal bijlagen, zodat ik in één oogopslag zie welke posts klaarstaan mét materiaal.

**Why this priority**: Zonder slepen is de volgorde de uploadvolgorde (bruikbaar, maar bij carrousels met veel beelden bewerkelijk); het paperclip-icoon is signalering, geen functionaliteit. De feature levert zonder deze story volledige waarde op.

**Independent Test**: Kan volledig getest worden door een post met drie afbeeldingen te openen, de derde naar de eerste plek te slepen (volgorde direct zichtbaar en na herladen ongewijzigd), en de kalender te openen (paperclip-icoon met aantal zichtbaar op de postchip).

**Acceptance Scenarios**:

1. **Given** een post met drie afbeeldingen, **When** ik de derde naar de eerste plek sleep, **Then** staat hij vooraan en is de volgorde na herladen ongewijzigd.
2. **Given** een post met twee bijlagen, **When** ik de kalender bekijk, **Then** toont de postchip een paperclip-icoon met "2".
3. **Given** een post zonder bijlagen, **When** ik de kalender bekijk, **Then** toont de postchip géén paperclip-icoon.

---

### Edge Cases

- Niet-ondersteund bestandstype (bijv. GIF, WEBP, HEIC): geweigerd met uitleg dat alleen JPG, PNG en PDF zijn toegestaan.
- De 21e afbeelding: geweigerd (max 20), met uitleg.
- Een tweede PDF: geweigerd (max één PDF per post), met uitleg.
- Afbeelding bij een post met PDF, óf PDF bij een post met afbeeldingen: geweigerd met uitleg van de óf-regel.
- Bestand van 25 MB: geweigerd vóórdat er iets wordt verstuurd; niets wordt geüpload.
- Gelijknamige bestanden: beide blijven bestaan naast elkaar; de weergave toont de bestandsnaam.
- Een mislukte upload (bijv. netwerkfout halverwege registratie) laat geen achtergebleven bestanden in de opslag achter.
- Verwijderen van één bijlage mislukt: de bijlage blijft staan en de app toont een foutmelding.
- Verplaats ik een post tussen kalender en ideeënbak, dan behoudt de post zijn bijlagen (de koppeling ligt bij de post, niet bij de datum).
- Een post zonder bijlagen toont in de editor een lege bijlagen-sectie met de regels als hulptekst (max 20 afbeeldingen óf 1 PDF, max 20 MB per bestand).
- Bij gelijktijdig open in twee tabs wint de laatste schrijfactie, conform de bestaande applicatie-conventie; geen real-time conflictdetectie.

## Requirements *(mandatory)*

### Functional Requirements

*Uploaden en beheren*

- **FR-001**: De post-editor MOET een sectie "Bijlagen" bevatten die de bijlagen van de getoonde post toont.
- **FR-002**: Het systeem MOET uploads accepteren van JPG (image/jpeg), PNG (image/png) en PDF (application/pdf) met een maximale grootte van 20 MB per bestand; andere bestandstypes of grotere bestanden MOETEN geweigerd worden vóórdat er iets wordt verstuurd, met uitleg.
- **FR-003**: Het systeem MOET de óf-regel afdwingen: een post heeft óf maximaal 20 afbeeldingen, óf precies één PDF, nooit een combinatie; een upload die de regel breekt MOET geweigerd worden met uitleg van de regel.
- **FR-004**: Afbeeldingen MOETEN als thumbnail worden getoond; een PDF MOET als bestandsnaam met PDF-icoon worden getoond.
- **FR-005**: Elke bijlage MOET te downloaden zijn.
- **FR-006**: Elke bijlage MOET te verwijderen zijn, met een bevestigingsvraag vóór definitief verwijderen.
- **FR-007**: Het verwijderen van een post MOET ook alle bijlagen van die post uit de opslag verwijderen; er blijven geen bestanden achter.
- **FR-008**: Bijlagen MOETEN privé zijn: alleen de eigenaar van de post kan ze zien, openen, downloaden, wijzigen en verwijderen.

*Volgorde en kalender*

- **FR-009**: De volgorde van afbeeldingen MOET aanpasbaar zijn door te slepen; de gekozen volgorde MOET bewaard blijven na sluiten en herladen.
- **FR-010**: De kalender MOET bij een post met bijlagen een klein paperclip-icoon met het aantal bijlagen op de postchip tonen; een post zonder bijlagen toont géén icoon.

### Key Entities

- **Bijlage**: Een bestand (JPG, PNG of PDF) dat bij één post hoort. Kenmerken: bestandstype (afbeelding of PDF), bestandsnaam, bestandsgrootte, volgordepositie (alleen zinvol bij afbeeldingen) en het moment van aanmaken. Een post heeft óf maximaal 20 afbeeldings-bijlagen, óf precies één PDF-bijlage. Leeft en verdwijnt met de post; is privé van de eigenaar.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Alles wat ik voor een post nodig heb staat op één plek: van post openen tot een eerste bijlage geüpload is, verlaat ik de editor niet (0 extra navigaties).
- **SC-002**: 100% van de afwijzingen (verkeerd type, te groot, óf-regel, 21e afbeelding, tweede PDF) is vóór versturen zichtbaar met uitleg van de reden.
- **SC-003**: Na het verwijderen van een post is 0% van de bijlagebestanden nog aanwezig in de opslag.
- **SC-004**: De getoonde volgorde van afbeeldingen is de volgorde die ik bij het uploaden in LinkedIn aanhoud — in de editor, na herladen en in de downloadbare vorm (eerst geselecteerde afbeelding eerst).

## Assumptions

- De feature bouwt voort op de content-kalender (feature 023): posts, editor en postchip bestaan; deze feature voegt de bijlagen-functionaliteit daaraan toe.
- Upload kan via de bestandskeuze-knop en via slepen-neerzetten in de bijlagen-sectie; beide volgen dezelfde regels.
- De 20 MB-grens geldt per bestand; er is geen extra grens op het totaal per post.
- De volgorde geldt alleen voor afbeeldingen; één PDF kent geen volgorde.
- De bevestiging bij het verwijderen van een bijlage is een in-app dialoog (bestaande conventie; geen browserdialoog).
- Het paperclip-icoon met aantal staat op de bestaande postchip in de kalender en de ideeënbak (beide tonen dezelfde post); de mobiele weergave (onder 768 px) toont het icoon mee.
- Bestandsnamen mogen spaties en unicode bevatten; de weergave toont de originele bestandsnaam.
- Downloaden opent het bestand in een nieuw tabblad of slaat het op volgens de browser-instellingen; er is geen aparte "opslaan als"-dialoog in de app.
- Bijlagen zijn uitsluitend voorbereiding van de eigen LinkedIn-post; Knockout publiceert niets en deelt niets via openbare links.
- Bij gelijktijdig bewerken in twee tabs wint de laatste schrijfactie, conform de bestaande applicatie-conventie.
- Buiten scope: video-upload, bewerken/croppen van afbeeldingen, automatisch PDF's genereren (bijv. uit tekst), delen van bijlagen via openbare links, uploaden namens een ander of een bedrijfspagina.