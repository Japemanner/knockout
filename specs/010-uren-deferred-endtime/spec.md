# Feature Specification: Voorwaardelijke eindtijd bij uren-invoer

**Feature Branch**: `011-uren-deferred-endtime`

**Created**: 2026-07-28

**Status**: Draft

**Input**: User description: "Onder uren een voorwaardelijke invoer mogelijk maken. Dat ik dan later de eind tijd toevoeg."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - urenregel opslaan met alleen starttijd (Priority: P1)

Als freelancer begin ik vaak aan een taak en weet ik nog niet wanneer ik klaar ben. Ik wil een urenregel kunnen opslaan met alleen een opdrachtgever, een datum en een starttijd — zonder eindtijd — zodat de regel direct staat geregistreerd en ik later terug kan komen om de eindtijd in te vullen. De urenregel is in deze staat zichtbaar als "lopende" of "nog af te ronden", zodat ik in één oogopslag zie welke regels nog een eindtijd nodig hebben.

**Why this priority**: Dit is de kern van het verzoek — de mogelijkheid om een urenregel zonder eindtijd op te slaan. Zonder deze story levert de feature geen waarde op.

**Independent Test**: Kan volledig getest worden door een urenregel in te voeren met opdrachtgever + datum + starttijd (geen eindtijd), op te slaan, en te controleren dat de regel verschijnt in de historie met een marker dat de eindtijd ontbreekt.

**Acceptance Scenarios**:

1. **Given** het uren-invoerformulier is geopend, **When** de gebruiker vult opdrachtgever + datum + starttijd in en laat de eindtijd leeg, en drukt op opslaan, **Then** wordt de urenregel opgeslagen en verschijnt in de historie met een zichtbare indicatie dat de eindtijd nog ontbreekt.
2. **Given** er bestaat een urenregel zonder eindtijd, **When** de gebruiker opent de bewerkmodus van die regel, **Then** kan de gebruiker de eindtijd invullen en opslaan, waarna de uren automatisch worden berekend en de indicatie verdwijnt.
3. **Given** de gebruiker vult geen starttijd en geen eindtijd in, **When** de gebruiker drukt op opslaan, **Then** wordt de invoer geweigerd met een duidelijke foutmelding (minimaal starttijd is verplicht).

---

### User Story 2 - lopende regels herkenbaar in historie (Priority: P2)

Ik wil in de historie direct kunnen zien welke urenregels nog een eindtijd missen, zodat ik weet welke ik nog moet afronden. Regels zonder eindtijd krijgen een visuele marker (bijv. een badge "Eindtijd open" of een opvallende accent), zodat ze niet tussen de voltooide regels verdwijnen.

**Why this priority**: Maakt het dagelijks gebruik frictionloos — zonder markering zoek je blind naar onvolledige regels. Belangrijk, maar pas waardevol nadat opslaan zonder eindtijd werkt.

**Independent Test**: Maak twee urenregels aan — één met eindtijd en één zonder. Open de historie en controleer dat de regel zonder eindtijd een herkenbare marker heeft die de andere niet heeft.

**Acceptance Scenarios**:

1. **Given** de historie toont zowel volledige als onvolledige urenregels, **When** de gebruiker bekijkt de lijst, **Then** is elke regel zonder eindtijd visueel gemarkeerd (bijv. badge, kleur of icoon) zodat deze direct te onderscheiden is van volledige regels.
2. **Given** een regel zonder eindtijd, **When** de gebruiker vult alsnog de eindtijd in en slaat op, **Then** verdwijnt de marker en verschijnt de regel als volledig, met berekende uren.

---

### User Story 3 - uren pas berekend na eindtijd (Priority: P3)

Zolang een urenregel geen eindtijd heeft, toont het systeem geen vastgesteld aantal uren. Zodra de eindtijd wordt ingevuld, worden de uren automatisch berekend en opgeslagen. Hierdoor tellen onvolledige regels niet mee in de dashboard-voortgang of omzet, totdat ze zijn afgerond.

**Why this priority**: Voorkomt foutieve uren in dashboard en omzet. Logisch vervolg op P1 en P2, maar niet strikt noodzakelijk voor de basisflow.

**Independent Test**: Maak een urenregel zonder eindtijd aan en controleer dat het dashboard geen uren toont voor deze regel. Vul daarna de eindtijd in en controleer dat de uren verschijnen in het dashboard.

**Acceptance Scenarios**:

1. **Given** een urenregel zonder eindtijd bestaat, **When** de gebruiker bekijkt het dashboard, **Then** tellen de uren van deze regel niet mee in de voortgangsbalk of omzet van de opdrachtgever.
2. **Given** een urenregel zonder eindtijd, **When** de gebruiker vult de eindtijd in en slaat op, **Then** worden de uren berekend en tellen ze direct mee in het dashboard en de omzet.

---

### Edge Cases

- Wat als de gebruiker alleen een eindtijd invult (geen starttijd)? Dat is niet toegestaan — starttijd is minimaal vereist; het systeem wijst de invoer af met een foutmelding.
- Wat als de eindtijd vóór de starttijd ligt bij latere aanvulling? Het systeem wijst dit af met dezelfde validatie als bij volledige invoer ("Eindtijd moet na starttijd liggen").
- Wat als een gebruiker een urenregel zonder eindtijd probeert te verwijderen? Dat is toegestaan — verwijderen werkt onafhankelijk van de volledigheid van de regel.
- Wat toont het uren-veld in het invoerformulier als er geen eindtijd is? Het veld blijft leeg of toont een placeholder zoals "Eindtijd ontbreekt", in plaats van een berekend getal.
- Wat als er meerdere regels zonder eindtijd zijn? Elke regel krijgt de marker onafhankelijk; de gebruiker kan ze één voor één afronden via de bewerkmodus.
- Bestaande urenregels met start- én eindtijd blijven ongewijzigd werken — geen migratie van bestaande data nodig.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Het systeem MOET toestaan dat een urenregel wordt opgeslagen met een opdrachtgever, een datum en een starttijd, zonder dat een eindtijd is ingevuld.
- **FR-002**: Het systeem MOET minimaal een starttijd vereisen; een urenregel zonder starttijd mag niet opgeslagen worden.
- **FR-003**: Het systeem MOET een urenregel zonder eindtijd herkenbaar markeren in de historie, zodat deze visueel te onderscheiden is van volledige regels.
- **FR-004**: Het systeem MOET de gebruiker in staat stellen om via de bestaande bewerkmodus alsnog een eindtijd aan een onvolledige regel toe te voegen.
- **FR-005**: Bij opslaan van de eindtijd MOET het systeem de uren automatisch berekenen uit het verschil tussen eind- en starttijd, conform de bestaande logica voor volledige invoer.
- **FR-006**: Het systeem MOET validatie uitvoeren dat de eindtijd na de starttijd ligt, zowel bij aanvullen van een onvolledige regel als bij nieuwe volledige invoer.
- **FR-007**: Het systeem MAG geen vastgesteld aantal uren tonen of opslaan voor een regel zonder eindtijd; de uren blijven open totdat de eindtijd is ingevuld.
- **FR-008**: Het systeem MAG onvolledige urenregels (zonder eindtijd) niet meetellen in de dashboard-voortgang of omzetberekening, totdat de eindtijd is aangevuld.
- **FR-009**: Het systeem MOET bestaande urenregels met start- én eindtijd ongemoeid laten — geen migratie of wijziging van reeds volledige regels.

### Key Entities *(include if feature involves data)*

- **Urenregel (kk_hour_entries)**: Bestaande entiteit. De kolommen `start_time` en `end_time` zijn reeds aanwezig en nullable. Nieuw gedrag: een regel mag opgeslagen worden met `end_time = null`; `hours` mag in dat geval 0 zijn of leeg blijven totdat `end_time` wordt ingevuld. Zodra `end_time` wordt aangevuld, wordt `hours` berekend en bijgewerkt.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% van de urenregels die zijn opgeslagen met alleen een starttijd, verschijnen in de historie met een zichtbare "open" marker.
- **SC-002**: Gebruikers kunnen een onvolledige urenregel binnen 3 acties afronden (open bewerkmodus → vul eindtijd → sla op).
- **SC-003**: Onvolledige regels tellen voor 0% mee in de dashboard-voortgang en omzet, totdat ze zijn afgerond.
- **SC-004**: Bestaande volledige urenregels blijven 100% ongewijzigd functioneren — geen regressie in rendering, bewerkbaarheid of verwijdering.
- **SC-005**: Een urenregel zonder eindtijd kan binnen 5 seconden worden opgeslagen vanaf het invoerformulier.

## Assumptions

- Het datamodel hoeft niet te veranderen: `start_time` en `end_time` zijn al nullable in de database (migratie 008).
- De `hours`-kolom heeft een database-constraint `CHECK (hours > 0)`; voor onvolledige regels zonder eindtijd wordt `hours` op een kleine positieve waarde gezet (bijv. 0.01) of de constraint wordt aangepast, zodat de regel opgeslagen kan worden. De exacte aanpak is een implementatiekeuze.
- Een urenregel zonder eindtijd toont in het invoerformulier geen berekend aantal uren.
- Het afronden van een onvolledige regel gebeurt via de bestaande bewerkmodus in de historie; geen aparte "lopenende regels"-pagina in v1.
- Onvolledige regels blijven staan totdat de gebruiker ze afrondt of verwijdert; het systeem vult niet automatisch iets in.
- Bestaande regels met start- én eindtijd worden niet gemigreerd of gewijzigd.