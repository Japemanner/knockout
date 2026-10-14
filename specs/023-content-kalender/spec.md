# Feature Specification: LinkedIn content-kalender

**Feature Branch**: `023-content-kalender`

**Created**: 2026-10-14

**Status**: Draft

**Input**: User description: "Voeg aan Knockout een LinkedIn content-kalender toe waarmee ik mijn LinkedIn-posts plan, schrijf en bijhoud. Alleen voor mijn persoonlijke LinkedIn-profiel. Knockout publiceert niets zelf: ik plan posts in LinkedIn zelf in en houd in Knockout bij wat er gepland en live staat." (Volledige opdracht met user stories, randgevallen en succescriteria stond vooraf vast in de opdrachtomschrijving.)

## Clarifications

### Session 2026-10-14

De opdracht bevatte vooraf vastgestelde keuzes; er zijn geen open vragen blijven staan:

- Publiceren gebeurt handmatig in LinkedIn. Knockout is de planning en de schrijfplek; de status "Gepland" zet ik zelf. Reden: de LinkedIn-API kan in LinkedIn ingeplande posts niet uitlezen en heeft geen veld voor ingepland publiceren.
- Contentsoorten hangen aan vaste slots per weekdag; de kalender toont lege slots zodat gaten direct zichtbaar zijn; per week afwijken mag.
- De volledige posttekst staat in Knockout.
- Hoofdweergave: maandraster met een ideeënbak ernaast.
- Navigatie: nieuw item "Content" in de linkerbalk, direct onder "Uren".
- Contentsoorten en slots maak ik zelf aan in de app; er komt geen startset mee.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Contentsoorten en weekslots beheren (Priority: P1)

Ik leg vast welke soorten content ik post en op welke vaste dagen en tijden. Een contentsoort heeft: naam (verplicht), doelgroep, korte beschrijving en een kleur (keuze uit 8 vaste kleuren). Per contentsoort kies ik nul of meer weekdagen (maandag t/m zondag), elk met een eigen tijd (standaard 08:00); elke dag kan per slot aan of uit. Een contentsoort kan ik archiveren, niet verwijderen: gearchiveerde soorten krijgen geen nieuwe lege slots meer en bestaande posts met die soort blijven zichtbaar. Beheer gebeurt in een dialoog "Soorten & slots" vanaf de kalenderpagina.

**Why this priority**: Contentsoorten met vaste weekslots zijn het fundament van de kalender: zonder soorten en slots is er geen kalenderstructuur, geen kleurcodering en geen gaten-signaal. Alle andere stories bouwen hierop voort.

**Independent Test**: Kan volledig getest worden door in de dialoog "Soorten & slots" een contentsoort met een weekslot aan te maken (bijv. woensdag 08:00) en te controleren dat de kalender op elke woensdag vanaf vandaag een leeg slot met die naam en tijd toont.

**Acceptance Scenarios**:

1. **Given** geen contentsoorten, **When** ik "Praktijk financieel adviseurs" aanmaak met slot woensdag 08:00, **Then** toont de kalender op elke woensdag vanaf vandaag een leeg slot met die naam en tijd.
2. **Given** een soort met slots, **When** ik de soort archiveer, **Then** verdwijnen de lege slots van die soort uit de kalender en blijven de posts staan.
3. **Given** een slot dat ik vandaag aanmaak, **When** ik een maand terugblader, **Then** zie ik daar geen lege slots van dit slot (slots gelden pas vanaf de dag dat ze zijn aangemaakt).

---

### User Story 2 - Maandkalender met posts en lege slots (Priority: P1)

Ik open "Content" in de linkerbalk en zie de huidige maand als raster van hele weken (maandag t/m zondag, dagen buiten de maand gedimd). Bovenaan staan: vorige/volgende maand, "Vandaag", "Nieuwe post" en "Soorten & slots".

In elke dagcel zie ik:

- **Posts**: kleurstreep van de contentsoort, tijd, titel (afgekapt), statusbadge. Gesorteerd op tijd. Bij meer dan 3 items: 3 items + "+n"; een klik toont alles.
- **Lege slots**: gestippeld kader in de kleur van de soort met "Soortnaam · 08:00". Een klik maakt een nieuwe post aan met datum, tijd en soort ingevuld en status Concept, en opent de editor.
- **Gemiste slots**: een leeg slot op een datum vóór vandaag wordt grijs getoond als "gemist" en is niet klikbaar.
- **Verlopen post**: een post met datum vóór vandaag en status Idee, Concept of Klaar krijgt een rode markering.

Wanneer is een slot gevuld: per ISO-week en per contentsoort tel ik de slotvoorkomens en de posts met een datum in die week. De slots van die soort in die week worden op volgorde (datum, tijd) gevuld door de posts op volgorde (datum, tijd). Gevolg: verplaats ik de woensdagpost naar donderdag in dezelfde week, dan is het woensdagslot nog steeds gevuld en verschijnt er geen gat.

**Why this priority**: De maandkalender is de hoofdweergave en de kern van de feature: hier zie ik in één oogopslag wat gepland staat en waar gaten vallen. Zonder deze story levert de feature geen waarde op.

**Independent Test**: Kan volledig getest worden door een contentsoort met weekslots aan te maken, een post op een slot-datum te zetten en te controleren dat gevulde slots geen leeg slot meer tonen terwijl ongevulde slots (ook in andere weken en over maandgrenzen) als leeg slot blijven staan.

**Acceptance Scenarios**:

1. **Given** een woensdagslot en een post van die soort op donderdag in dezelfde week, **When** ik de kalender bekijk, **Then** staat er op woensdag geen leeg slot.
2. **Given** een soort met slots op dinsdag en donderdag en één post op dinsdag, **When** ik de week bekijk, **Then** staat donderdag als leeg slot.
3. **Given** een post zonder contentsoort, **When** ik de kalender bekijk, **Then** staat de post op zijn datum en vult hij geen slot.
4. **Given** ik klik in de linkerbalk op "Content", **Then** opent de kalender op de huidige maand; het item staat direct onder "Uren".

---

### User Story 3 - Post schrijven en status bijhouden (Priority: P1)

Een klik op een post opent de editor met: titel (intern, verplicht), contentsoort, format (Tekst, Afbeelding, Carrousel, Video, Poll), status, datum, tijd, posttekst, bron-URL (artikel of bron waar de post op voortbouwt), LinkedIn-URL en notities.

Rond de posttekst biedt de editor:

- Een tekenteller "1.234 / 3.000"; boven 3.000 rood.
- Een hook-preview: de tekst tot de eerste van (a) het derde regeleinde of (b) 210 tekens, gevolgd door "…meer". Label: "Opening in de feed (benadering)".
- Een knop "Kopieer tekst" die de posttekst op het klembord zet met een zichtbare bevestiging.

Statussen, in deze volgorde: Idee, Concept, Klaar, Gepland, Live. Vrij te wisselen, met deze regels:

- Klaar, Gepland en Live vereisen een niet-lege posttekst van maximaal 3.000 tekens.
- Gepland en Live vereisen een datum en tijd.
- Bij overgang naar Gepland legt Knockout het moment vast waarop ik de post in LinkedIn heb ingepland; terug naar een lagere status wist dat moment.
- Live zonder LinkedIn-URL krijgt op de kaart een badge "URL ontbreekt". Een ingevulde LinkedIn-URL moet beginnen met `https://www.linkedin.com/`.

Opslaan gaat expliciet (knop "Opslaan" en Ctrl/Cmd+S). Sluiten met niet-opgeslagen wijzigingen vraagt eerst bevestiging in de app (geen browserdialoog). Verwijderen van een post vraagt bevestiging.

**Why this priority**: De editor is de schrijfplek en de plek waar de LinkedIn-statusadministratie plaatsvindt — het dagelijkse werk in de kalender. Zonder editor kan ik wel zien maar niet werken.

**Independent Test**: Kan volledig getest worden door een post te openen, tekst te schrijven, de tekenteller/hook-preview/kopieerknop te controleren, de statusregels te doorlopen (te lange tekst weigeren bij Klaar, ontbrekende datum weigeren bij Gepland) en te controleren dat opslaan expliciet gaat met bevestiging bij sluiten met wijzigingen.

**Acceptance Scenarios**:

1. **Given** een post met 3.100 tekens, **When** ik status Klaar kies, **Then** weigert de app dat met de melding dat de tekst te lang is; opslaan als Concept lukt wel.
2. **Given** een post zonder datum, **When** ik status Gepland kies, **Then** vraagt de app om datum en tijd.
3. **Given** een post met status Live en zonder URL, **Then** toont de kaart "URL ontbreekt".
4. **Given** een post met tekst, **When** ik "Kopieer tekst" klik, **Then** staat de exacte posttekst op het klembord.

---

### User Story 4 - Ideeënbak en slepen (Priority: P2)

Naast het maandraster staat de ideeënbak: alle posts zonder datum, nieuwste bovenaan. Bovenin een invoerveld: titel typen + Enter maakt een nieuw idee (status Idee, geen datum).

Slepen werkt volgens vaste regels:

- Idee → dagcel: krijgt die datum. Heeft die dag een leeg slot van de soort van de post, dan neemt de post de tijd van dat slot over; anders blijft de bestaande tijd, en zonder tijd wordt het 08:00. Status blijft gelijk.
- Post → andere dagcel: zelfde tijdregel.
- Post → ideeënbak: datum en tijd worden gewist. Alleen voor Idee, Concept en Klaar.
- Posts met status Gepland mogen naar een andere dag, met de melding "Pas de datum ook aan in LinkedIn". Dezelfde melding verschijnt bij een datum- of tijdwijziging van een geplande post in de editor.
- Posts met status Live zijn niet sleepbaar.
- Een geplande post naar de ideeënbak slepen wordt geweigerd met een melding.

**Why this priority**: De ideeënbak met slepen maakt de workflow vloeiend (idee → geplande post zonder tussenstappen), maar de kalender is ook zonder slepen volledig bruikbaar via de editor.

**Independent Test**: Kan volledig getest worden door via het invoerveld een idee aan te maken, het naar een dagcel te slepen (met en zonder bijpassend leeg slot), een geplande post te verslepen met de LinkedIn-melding, en de weigeringen (Live sleepbaar? nee; Gepland → ideeënbak? geweigerd) te controleren.

**Acceptance Scenarios**:

1. **Given** een idee zonder soort, **When** ik het op een dag zonder slots sleep, **Then** krijgt het die datum en tijd 08:00 en blijft het status Idee.
2. **Given** een geplande post, **When** ik hem naar een andere dag sleep, **Then** verschuift hij en zie ik "Pas de datum ook aan in LinkedIn".
3. **Given** een slepende actie die op de server mislukt, **Then** springt de post terug naar zijn oude plek en zie ik een foutmelding.

---

### User Story 5 - Mobiele weergave (Priority: P3)

Onder 768 px breed wordt het raster een lijst per dag (alleen dagen met posts of slots), met de ideeënbak eronder. Slepen is mobiel niet nodig; de datum wijzigt via de editor.

**Why this priority**: Mobiel is een lees- en bijwerk-weergave, geen volledige planning-omgeving; de feature is volledig bruikbaar zonder dit onderdeel.

**Independent Test**: Kan volledig getest worden door de content-pagina op een smal scherm (onder 768 px) te openen en te controleren dat de daglijst alleen dagen met posts of slots toont en de ideeënbak eronder staat; datumwijziging via de editor blijft werken.

**Acceptance Scenarios**:

1. **Given** een scherm smaller dan 768 px, **When** ik de content-pagina open, **Then** zie ik een lijst per dag met alleen de dagen die posts of slots hebben, met de ideeënbak eronder.
2. **Given** mobiele weergave, **When** ik een post wil verplaatsen, **Then** wijzig ik de datum via de editor (slepen is mobiel niet beschikbaar).

---

### Edge Cases

- Twee posts op dezelfde dag: beide tonen, op tijd gesorteerd.
- Meer posts van een soort in een week dan slots: de extra posts tonen gewoon, zonder gat of fout.
- Slot-template gewijzigd (andere dag of tijd): geldt voor alle weken vanaf de aanmaakdatum van het slot; het verleden wordt niet terugwerkend herzien.
- Gearchiveerde soort: posts tonen de soortnaam gedimd.
- Datums en tijden zijn lokale Nederlandse tijd; zomer- en wintertijd mogen niets verschuiven.
- Week over een maandgrens: slotmatching gebeurt per ISO-week, dus posts en slots aan weerszijden van de maandgrens horen bij dezelfde week.
- Een post met een datum maar zonder tijd toont geen tijdlabel en sorteert binnen die dag na de posts mét tijd.
- Een sleep-actie die op de server mislukt: de post veert terug naar zijn oude plek met een foutmelding.
- Gelijktijdig open in twee tabs: de laatste schrijfactie wint, conform de bestaande applicatie-conventie; geen real-time conflictdetectie.
- Een post met status Gepland of Live in het verleden krijgt géén rode verlopen-markering (die geldt alleen voor Idee, Concept en Klaar).

## Requirements *(mandatory)*

### Functional Requirements

*Contentsoorten en weekslots*

- **FR-001**: Het systeem MOET contentsoorten ondersteunen met: naam (verplicht), doelgroep, korte beschrijving en een kleur uit 8 vaste kleuren.
- **FR-002**: Het systeem MOET per contentsoort nul of meer weekdagen (maandag t/m zondag) laten instellen, elk met een eigen tijd (standaard 08:00), die per dag aan of uit gezet kunnen worden.
- **FR-003**: Het systeem MOET een contentsoort kunnen archiveren (niet verwijderen); gearchiveerde soorten krijgen geen nieuwe lege slots en bestaande posts met die soort blijven zichtbaar.
- **FR-004**: Beheer van soorten en slots MOET plaatsvinden in een dialoog "Soorten & slots" die vanaf de kalenderpagina opent.
- **FR-005**: Weekslots MOETEN pas gelden vanaf de dag van aanmaak van het slot; op eerdere datums toont de kalender geen lege slots van dat slot.
- **FR-006**: Het systeem MOET zonder startset aan contentsoorten werken; de kalender begint zonder soorten.

*Maandkalender*

- **FR-007**: De applicatie MOET in de linkerbalk een navigatie-item "Content" tonen, direct onder "Uren"; een klik opent de kalender op de huidige maand.
- **FR-008**: De kalender MOET de maand tonen als raster van hele weken (maandag t/m zondag), met dagen buiten de maand gedimd.
- **FR-009**: Bovenaan de kalender MOET beschikbaar zijn: navigatie naar vorige en volgende maand, knop "Vandaag", knop "Nieuwe post" en knop "Soorten & slots".
- **FR-010**: Elke dagcel MOET de posts van die dag tonen met een kleurstreep van de contentsoort, de tijd, de afgekaptte titel en een statusbadge, gesorteerd op tijd.
- **FR-011**: Bij meer dan 3 items in een dagcel MOET de kalender 3 items tonen plus "+n"; een klik toont alle items van die dag.
- **FR-012**: Elke dagcel MOET de ongevulde slotvoorkomens van die dag tonen als gestippeld kader in de kleur van de soort, met "Soortnaam · tijd".
- **FR-013**: Een klik op een leeg slot MOET een nieuwe post aanmaken met datum, tijd en contentsoort ingevuld en status Concept, en de editor openen.
- **FR-014**: Een leeg slot op een datum vóór vandaag MOET grijs als "gemist" worden getoond en niet klikbaar zijn.
- **FR-015**: Een post met datum vóór vandaag en status Idee, Concept of Klaar MOET een rode verlopen-markering krijgen.
- **FR-016**: Het systeem MOET slotvoorkomens per ISO-week en per contentsoort vullen: de voorkomens in die week op volgorde (datum, tijd) koppelen aan de posts van die soort met een datum in die week op volgorde (datum, tijd); ongekoppelde voorkomens toont de kalender als leeg slot.
- **FR-017**: Een post zonder contentsoort MOET op zijn eigen datum in het raster tonen en MAG GEEN slot vullen.
- **FR-018**: Posts zonder datum MOGEN NIET in het maandraster verschijnen; ze horen bij de ideeënbak.

*Post-editor en statussen*

- **FR-019**: De post-editor MOET deze velden bevatten: titel (intern, verplicht), contentsoort, format (Tekst, Afbeelding, Carrousel, Video, Poll), status, datum, tijd, posttekst, bron-URL, LinkedIn-URL en notities.
- **FR-020**: De post-editor MOET bij de posttekst een tekenteller "n / 3.000" tonen die boven 3.000 tekens rood kleurt.
- **FR-021**: De post-editor MOET een hook-preview tonen: de tekst tot de eerste van het derde regeleinde of 210 tekens, gevolgd door "…meer", met als label "Opening in de feed (benadering)".
- **FR-022**: De post-editor MOET een knop "Kopieer tekst" hebben die de exacte posttekst op het klembord zet en een zichtbare bevestiging toont.
- **FR-023**: De statussen MOETEN in vaste volgorde zijn: Idee, Concept, Klaar, Gepland, Live, vrij te wisselen, waarbij Klaar, Gepland en Live een niet-lege posttekst van maximaal 3.000 tekens vereisen en Gepland en Live een datum en tijd vereisen.
- **FR-024**: Bij overgang naar Gepland MOET het systeem het moment vastleggen waarop de post in LinkedIn is ingepland; een overgang naar een lagere status MOET dat moment wissen.
- **FR-025**: Een post met status Live zonder LinkedIn-URL MOET op de kaart een badge "URL ontbreekt" tonen; een ingevulde LinkedIn-URL MOET beginnen met `https://www.linkedin.com/`.
- **FR-026**: Opslaan MOET expliciet gaan: via de knop "Opslaan" en via Ctrl/Cmd+S.
- **FR-027**: Sluiten van de editor met niet-opgeslagen wijzigingen MOET eerst om bevestiging vragen in een in-app dialoog (geen browserdialoog); verwijderen van een post MOET om bevestiging vragen.

*Ideeënbak en slepen*

- **FR-028**: Naast het maandraster MOET een ideeënbak staan met alle posts zonder datum, nieuwste bovenaan, met bovenin een invoerveld waarmee titel typen + Enter een nieuw idee (status Idee, geen datum) aanmaakt.
- **FR-029**: Slepen van een post of idee naar een dagcel MOET de post die datum geven met de tijdregel: de tijd van een leeg slot van de soort van de post op die dag, anders de bestaande tijd van de post, anders 08:00; de status blijft gelijk.
- **FR-030**: Slepen naar de ideeënbak MOET datum en tijd wissen en MAG alleen bij status Idee, Concept of Klaar; een geplande post naar de ideeënbak slepen MOET geweigerd worden met een melding.
- **FR-031**: Een post met status Gepland MOET naar een andere dag versleept mogen worden, met de melding "Pas de datum ook aan in LinkedIn"; bij een datum- of tijdwijziging van een geplande post in de editor MOET dezelfde melding verschijnen.
- **FR-032**: Posts met status Live MOGEN NIET sleepbaar zijn.
- **FR-033**: Bij een mislukte sleep-actie (serverfout) MOET de post terugkeren naar zijn oorspronkelijke plek met een zichtbare foutmelding.

*Mobiel*

- **FR-034**: Onder 768 px breed MOET de kalender een lijst per dag tonen (alleen dagen met posts of slots) met de ideeënbak eronder; slepen is mobiel niet nodig en de datum wijzigt via de editor.

### Key Entities

- **Contentsoort**: Vaste categorie content met naam (verplicht), doelgroep, korte beschrijving, kleur (uit 8 vaste kleuren), archief-status en nul of meer weekslots. Bepaalt de kleurcodering in de kalender.
- **Weekslot**: Vast slot van een contentsoort op één weekdag (maandag t/m zondag) met een eigen tijd (standaard 08:00) en een aan/uit-stand. Heeft een aanmaakmoment: het slot geldt pas vanaf die dag.
- **Post**: Een geplande, geschreven of gepubliceerde LinkedIn-post met titel (intern, verplicht), contentsoort (optioneel), format (Tekst, Afbeelding, Carrousel, Video, Poll), status (Idee, Concept, Klaar, Gepland, Live), optionele datum en tijd, volledige posttekst, bron-URL, LinkedIn-URL, notities en het moment waarop de post in LinkedIn is ingepland (bij status Gepland). Zonder datum hoort de post bij de ideeënbak.
- **Slotvoorkomen**: Een berekend leeg slot op een concrete datum, afgeleid van een weekslot. Is "open" (datum ≥ vandaag) of "gemist" (datum < vandaag) en wordt per ISO-week en per contentsoort gevuld volgens de koppelregel.
- **Ideeënbak**: Weergave van alle posts zonder datum, nieuwste bovenaan. Geen afzonderlijk opgeslagen entiteit — het is een filter op posts.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Ik kan vier weken vooruit plannen — alle slots gevuld of bewust leeg — zonder de content-pagina te verlaten (0 paginanavigaties voor het plannen van vier opeenvolgende weken).
- **SC-002**: Elk leeg slot in de komende vier weken is zichtbaar zonder te klikken (100% van de open slots in de komende vier weken staat direct zichtbaar in het raster).
- **SC-003**: Van een post met status Klaar naar LinkedIn kost één klik: de knop "Kopieer tekst" plaatst de exacte volledige posttekst op het klembord.
- **SC-004**: Na het initiële laden van de content-pagina verstuurt de applicatie geen aanvullende verzoeken naar de server voor het lezen van de getoonde data (kalender, slots en ideeënbak renderen vanuit de reeds geladen data).

## Assumptions

- De feature geldt uitsluitend voor het persoonlijke LinkedIn-profiel van de ingelogde gebruiker; alle content-data is privé per gebruiker (geen andere accounts, geen bedrijfspagina's, geen meerdere gebruikers).
- Per contentsoort is er maximaal één slot per weekdag; een weekdag wijzig je als één slot (andere tijd of aan/uit), niet als twee parallelle slots.
- De knop "Nieuwe post" (bovenaan de kalender) opent de editor voor een nieuwe post zonder datum en met status Idee; datum en tijd geef ik daarna zelf via de editor of via slepen.
- Gearchiveerde contentsoorten zijn bij het aanmaken of wijzigen van posts niet kiesbaar als soort; bestaande posts behouden hun soort en tonen de soortnaam gedimd.
- Het inplan-moment bij de overgang naar Gepland is een momentopname van "nu" op het moment van de statuswijziging; wordt de post later opnieuw Gepland, dan wordt het moment opnieuw vastgelegd. Bewaking of herinneringen op dat moment zijn buiten scope.
- De rode verlopen-markering geldt uitsluitend voor posts met status Idee, Concept of Klaar op een datum vóór vandaag; Gepland en Live in het verleden krijgen geen markering.
- De weekindeling is ISO: weken lopen van maandag t/m zondag; slotmatching en het weekbegrip gelden over maandgrenzen heen.
- De 210-tekens- en 3-regeleinden-regel zijn benaderingen van de afkaping in de LinkedIn-feed; het label "benadering" dekt dat af.
- De grens van 3.000 tekens geldt bij de statusovergangen naar Klaar, Gepland en Live; een Concept mag tijdelijk langer zijn.
- Datums en tijden zijn lokale Nederlandse tijd; de wisseling tussen zomer- en wintertijd verschuift niets in de weergave.
- Bij gelijktijdig bewerken in twee tabs wint de laatste schrijfactie, conform de bestaande applicatie-conventie; geen real-time conflictdetectie.
- Bevestigingsvragen (sluiten met niet-opgeslagen wijzigingen, post verwijderen) zijn in-app dialogen; de applicatie gebruikt geen browserdialogen.
- Buiten scope: publiceren via de LinkedIn-API, herinneringen (n8n, Slack, mail), Command Center-widget, AI-schrijfhulp, statistieken en analytics-import, andere LinkedIn-accounts of bedrijfspagina's, bijlagen (aparte vervolgfeature), video-upload, terugkerende series, meerdere gebruikers.