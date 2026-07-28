# Feature Specification: Top 3 bewerkbare prioriteiten op het command center

**Feature Branch**: `011-command-center-priorities`

**Created**: 2026-07-28

**Status**: Draft

**Input**: User description: "voeg Op command center de top 3 priorieten die ik kan aanpassen."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Top 3 prioriteiten bekijken en bewerken (Priority: P1)

Als freelancer wil ik op het command center (mijn startpagina) een overzicht hebben van mijn huidige top 3 prioriteiten — de drie belangrijkste dingen waar ik me nu op wil richten. Ik kan elke prioriteit als vrije tekst invullen of aanpassen, bijvoorbeeld "1. Offerte Klant X sturen", "2. Blogpost schrijven", "3. Facturen versturen". De prioriteiten staan direct bovenaan op het command center, goed zichtbaar bij opening. Wanneer ik een prioriteit aanpas, wordt de wijziging direct opgeslagen en blijft zichtbaar bij volgend bezoek.

**Why this priority**: Dit is de kern van het verzoek — de top 3 prioriteiten kunnen invullen en aanpassen. Zonder deze story levert de feature geen waarde op.

**Independent Test**: Kan volledig getest worden door het command center te openen, drie velden in te vullen met tekst, op te slaan, en te controleren dat de tekst zichtbaar blijft bij herladen van de pagina.

**Acceptance Scenarios**:

1. **Given** het command center is geopend en toont de welkomstsectie, **When** de gebruiker kijkt bovenaan de pagina, **Then** is een "Top 3 prioriteiten"-sectie zichtbaar met drie invulvelden.
2. **Given** de drie velden zijn leeg of bevatten oude tekst, **When** de gebruiker typt nieuwe tekst in een van de velden, **Then** wordt de tekst direct of na opslaan bewaard en zichtbaar.
3. **Given** de gebruiker heeft prioriteiten ingevuld, **When** de gebruiker herlaadt de pagina of opent het command center later opnieuw, **Then** staan de laatst ingevulde prioriteiten nog steeds in de velden.

---

### User Story 2 - Prioriteit leegmaken of wissen (Priority: P2)

Ik wil een ingevulde prioriteit kunnen wissen (leegmaken) wanneer deze niet meer relevant is, zodat mijn top 3 altijd huidige actuele focuspunten bevat en niet volraakt met oude tekst.

**Why this priority**: Maakt de lijst bruikbaar over tijd. Belangrijk, maar pas waardevol nadat invullen en opslaan werkt.

**Independent Test**: Vul een prioriteit in, sla op, maak het veld leeg, sla opnieuw op — controleer dat het veld leeg is en blijft na herladen.

**Acceptance Scenarios**:

1. **Given** een prioriteit is ingevuld, **When** de gebruiker wist de tekst en slaat op, **Then** is het veld leeg en blijft leeg na herladen.
2. **Given** meerdere prioriteiten zijn ingevuld, **When** de gebruiker wist één ervan, **Then** blijven de andere twee ongewijzigd.

---

### Edge Cases

- Wat als de gebruiker alleen tekst in veld 1 en 3 invult (veld 2 leeg)? Dit is toegestaan — de velden zijn onafhankelijk; veld 2 toont leeg en telt niet als ingevulde prioriteit.
- Wat als de tekst erg lang is? Lange tekst wordt afgekapt of wordt een meerregelig veld; de weergave past zich aan zonder de layout te breken.
- Wat als de gebruiker twee dezelfde teksten invult? Dit is toegestaan — geen validatie op uniekheid.
- Wat als er een netwerkstoring is tijdens opslaan? De gebruiker krijgt een foutmelding en de tekst blijft lokaal zichtbaar totdat opslaan lukt.
- Wat toont de sectie als alle drie de velden leeg zijn? Een lege state met placeholder-tekst zoals "Vul je top 3 prioriteiten in" of een begeleidende lege velden.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Het command center MOET een "Top 3 prioriteiten"-sectie tonen, goed zichtbaar bovenaan de pagina.
- **FR-002**: De sectie MOET precies drie invoervelden bevatten voor vrije tekst, genummerd 1 t/m 3.
- **FR-003**: De gebruiker MOET in elk veld vrije tekst kunnen invoeren of aanpassen.
- **FR-004**: Het systeem MOET de ingevulde prioriteiten opslaan per gebruiker, zodat ze bewaard blijven tussen sessies en pagina-herladingen.
- **FR-005**: Het systeem MOET de prioriteiten tonen bij opening van het command center, inclusief de laatst opgeslagen waarden.
- **FR-006**: De gebruiker MOET een prioriteit kunnen wissen door het veld leeg te maken.
- **FR-007**: De velden MOGEN onafhankelijk van elkaar ingevuld of leeg gelaten worden — geen verplichte volgorde.
- **FR-008**: Het systeem MOET een bevestiging of feedback tonen wanneer de prioriteiten zijn opgeslagen.
- **FR-009**: De sectie MAG alleen zichtbaar zijn op het command center, niet op andere pagina's.

### Key Entities *(include if feature involves data)*

- **Prioriteit**: Een nummer (1, 2 of 3) en een vrije-tekst beschrijving. Behoort toe aan één gebruiker. Opgeslagen per gebruiker — maximaal drie per gebruiker. Bij opslaan wordt de huidige set van drie overschreven; er is geen historie van eerdere prioriteiten in v1.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% van de ingevulde prioriteiten is zichtbaar na herladen van het command center.
- **SC-002**: Gebruikers kunnen alle drie de prioriteiten binnen 10 seconden invullen en opslaan.
- **SC-003**: Een gewiste prioriteit blijft voor 100% leeg na herladen — geen herleving van oude tekst.
- **SC-004**: De "Top 3 prioriteiten"-sectie is binnen 1 seconde zichtbaar bij opening van het command center.
- **SC-005**: De sectie is uitsluitend zichtbaar op het command center (0 andere pagina's tonen de prioriteiten).

## Assumptions

- De prioriteiten worden server-side opgeslagen, gekoppeld aan de ingelogde gebruiker (geen gedeelde prioriteiten tussen gebruikers).
- Elke gebruiker heeft maximaal één set van drie prioriteiten; bij opslaan wordt de bestaande set overschreven.
- De velden zijn vrije tekst — geen koppeling met kanban-kaarten, opdrachtgevers of andere entiteiten.
- Er is geen historie of versiebeheer van prioriteiten in v1; alleen de laatst opgeslagen set is relevant.
- De sectie verschijnt boven de bestaande "Gesterde items"-sectie op het command center.
- Opslaan gebeurt expliciet (bijv. een "Opslaan"-knop) of automatisch bij verlies van focus — de exacte trigger is een implementatiekeuze, zolang de gebruiker weet wanneer het is opgeslagen.