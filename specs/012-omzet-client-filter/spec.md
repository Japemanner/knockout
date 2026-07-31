# Feature Specification: Totale omzet meefilteren met geselecteerde opdrachtgever

**Feature Branch**: `012-omzet-client-filter`

**Created**: 2026-07-31

**Status**: Draft

**Input**: User description: "Onder uren, wanneer ik onder historie een opdrachtgever selecteer pas dan ook het Totale omzet tabblad aan naar deze werkgever."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Totale omzet toont alleen de geselecteerde opdrachtgever (Priority: P1)

Als freelancer selecteer ik in de Historie-sectie van de uren-tab een specifieke opdrachtgever. Ik verwacht dat het "Totale omzet"-kaartje in het dashboard direct meefiltert: de getoonde omzet voor deze week en deze maand betreft dan uitsluitend de urenregels van die opdrachtgever. Zo zie ik in één oogopslag wat een specifieke opdrachtgever mij heeft opgeleverd, zonder losse rapporten te hoeven draaien.

**Why this priority**: Dit is de kern van het verzoek — de koppeling tussen de historie-filter en het omzetkaartje. Zonder deze story levert de feature geen waarde op.

**Independent Test**: Selecteer een opdrachtgever in de Historie-dropdown en controleer dat het "Totale omzet"-kaartje uitsluitend de omzet toont voor urenregels van die opdrachtgever (week- en maandcijfer). Vergelijk eventueel met de som van de zichtbare urenregels in de historie voor dezelfde opdrachtgever en periode.

**Acceptance Scenarios**:

1. **Given** de uren-tab is geopend en het "Totale omzet"-kaartje toont de totale omzet over alle opdrachtgevers, **When** de gebruiker selecteert in de Historie-sectie een specifieke opdrachtgever uit de dropdown, **Then** toont het "Totale omzet"-kaartje binnen 1 seconde uitsluitend de omzet (week en maand) voor die opdrachtgever.
2. **Given** een opdrachtgever is geselecteerd in de Historie en het omzetkaartje toont diens omzet, **When** de gebruiker voegt een nieuwe urenregel toe voor die opdrachtgever, **Then** werkt het omzetkaartje direct bij met de nieuwe omzet (mutatie-invalidatie blijft werken onder de gefilterde weergave).
3. **Given** een opdrachtgever is geselecteerd in de Historie, **When** de gebruiker bewerkt of verwijdert een urenregel van die opdrachtgever, **Then** werkt het omzetkaartje direct bij met de bijgewerkte omzet voor die opdrachtgever.

---

### User Story 2 - Terug naar "Alle opdrachtgevers" herstelt totale omzet (Priority: P2)

Wanneer ik in de Historie de filter terugzet naar "Alle opdrachtgevers", wil ik dat het "Totale omzet"-kaartje weer de totale omzet over alle opdrachtgevers toont — het oorspronkelijke, ongefilterde gedrag. Zo kan ik vrijelijk heen en weer schakelen tussen een specifieke opdrachtgever en het totale overzicht.

**Why this priority**: Maakt de filter heen-en-weer bruikbaar. Belangrijk, maar pas waardevol nadat de basis-koppeling (P1) werkt.

**Independent Test**: Selecteer een opdrachtgever, controleer dat het kaartje filtert. Zet de dropdown terug op "Alle opdrachtgevers" en controleer dat het kaartje weer de som over alle opdrachtgevers toont.

**Acceptance Scenarios**:

1. **Given** een specifieke opdrachtgever is geselecteerd en het omzetkaartje toont diens omzet, **When** de gebruiker zet de Historie-dropdown terug op "Alle opdrachtgevers", **Then** toont het "Totale omzet"-kaartje binnen 1 seconde de totale omzet over alle opdrachtgevers (week en maand).
2. **Given** de dropdown staat op "Alle opdrachtgevers", **When** de gebruiker herlaadt de uren-tab, **Then** staat het omzetkaartje op de totale omzet over alle opdrachtgevers (standaard-stand).

---

### User Story 3 - Kaartje-label maakt de actieve filter zichtbaar (Priority: P3)

Zodat ik niet twijfel welke opdrachtgever achter de getoonde omzetcijfers staat, past het label van het "Totale omzet"-kaartje zich aan wanneer er gefilterd is. Bij een geselecteerde opdrachtgever toont het kaartje de naam van die opdrachtgever (bijv. "Omzet Acme B.V."), en bij "Alle opdrachtgevers" staat er weer "Totale omzet".

**Why this priority**: Voorkomt verwarring over wélke cijfers worden getoond. Logisch vervolg op P1 en P2, maar niet strikt noodzakelijk voor de basisflow.

**Independent Test**: Selecteer een opdrachtgever en controleer dat het kaartje-label de naam van die opdrachtgever toont. Zet terug op "Alle opdrachtgevers" en controleer dat het label weer "Totale omzet" is.

**Acceptance Scenarios**:

1. **Given** een specifieke opdrachtgever is geselecteerd in de Historie, **When** de gebruiker bekijkt het omzetkaartje, **Then** toont het kaartje als titel de naam van de geselecteerde opdrachtgever in plaats van "Totale omzet".
2. **Given** de dropdown staat op "Alle opdrachtgevers", **When** de gebruiker bekijkt het omzetkaartje, **Then** toont het kaartje als titel "Totale omzet".

---

### Edge Cases

- Wat als de geselecteerde opdrachtgever geen urenregels heeft in de huidige week of maand? Het omzetkaartje toont €0,00 voor week en maand, en geen lege of gebroken weergave.
- Wat als een opdrachtgever lopende/onvolledige urenregels heeft (zonder eindtijd, hours = 0)? Deze regels tellen niet mee in de gefilterde omzet, conform de bestaande logica in `getRevenueStats`.
- Wat gebeurt er met de privacy-toggle? De privacy-toggle blijft onafhankelijk werken: ook bij gefilterde omzet worden de bedragen verborgen respectievelijk getoond volgens de privacy-stand.
- Wat als de gebruiker de uren-tab verlaat en later terugkeert? De opdrachtgever-filter wordt niet gepersisteerd — bij terugkeer staat de dropdown op "Alle opdrachtgevers" en toont het kaartje de totale omzet (sessie-scoped gedrag).
- Wat met de per-client voortgangskaartjes in het dashboard? Die blijven ongewijzigd tonen voor alle opdrachtgevers — alleen het "Totale omzet"-kaartje meefiltert.
- Wat als de opdrachtgever wordt gearchiveerd na selectie? De filter behoudt de geselecteerde opdrachtgever totdat de gebruiker expliciet terugkeert naar "Alle opdrachtgevers"; gearchiveerde opdrachtgever blijft in de dropdown zichtbaar zolang de urenregels bestaan.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Het systeem MOET de geselecteerde opdrachtgever uit de Historie-sectie beschikbaar maken aan het "Totale omzet"-kaartje in het dashboard, via gedeelde state die beide secties kunnen lezen en schrijven.
- **FR-002**: Wanneer een specifieke opdrachtgever is geselecteerd MOET het "Totale omzet"-kaartje uitsluitend de omzet (week en maand) tonen voor urenregels van die opdrachtgever.
- **FR-003**: Wanneer "Alle opdrachtgevers" is geselecteerd MOET het "Totale omzet"-kaartje de totale omzet over alle opdrachtgevers tonen (bestaand, ongefilterd gedrag).
- **FR-004**: Het systeem MOET de omzet voor de geselecteerde opdrachtgever berekenen op dezelfde manier als de huidige totale omzet (uren × uurtarief per regel), met dezelfde uitsluiting van regels met hours <= 0.
- **FR-005**: Een wissel van de geselecteerde opdrachtgever MOET binnen 1 seconde zichtbaar zijn in het "Totale omzet"-kaartje, zonder dat de hele uren-tab herladen hoeft te worden.
- **FR-006**: Mutaties op urenregels (toevoegen, bewerken, verwijderen) MOETEN het gefilterde "Totale omzet"-kaartje direct bijwerken, conform de bestaande invalidatie-logica.
- **FR-007**: Het systeem MOET het label van het "Totale omzet"-kaartje aanpassen naar de naam van de geselecteerde opdrachtgever wanneer een specifieke opdrachtgever actief is, en "Totale omzet" tonen bij "Alle opdrachtgevers".
- **FR-008**: De opdrachtgever-filter MAG niet gepersisteerd worden tussen sessies — bij herladen of heropenen van de uren-tab staat de filter op "Alle opdrachtgevers".
- **FR-009**: De per-client voortgangskaartjes in het dashboard MOGEN NIET meefilteren met de geselecteerde opdrachtgever — zij blijven alle opdrachtgevers tonen.
- **FR-010**: De privacy-toggle MOET onafhankelijk van de opdrachtgever-filter blijven werken: bij actieve privacy-stand worden ook de gefilterde omzetcijfers verborgen.
- **FR-011**: De opdrachtgever-filter MAG geen invloed hebben op andere tabbladen dan de uren-tab.

### Key Entities *(include if feature involves data)*

- **Geselecteerde opdrachtgever (filter-state)**: Een in-memory, sessie-scoped waarde die aangeeft welke opdrachtgever in de Historie-sectie is geselecteerd. Waarde is een opdrachtgever-id (uuid) of "Alle opdrachtgevers". Geldt uitsluitend binnen de uren-tab en wordt niet gepersisteerd.
- **Urenregel (kk_hour_entries)**: Bestaande entiteit. De kolom `client_id` wordt gebruikt om de gefilterde omzetberekening uit te voeren (`hours * hourly_rate` per regel, exclusief regels met `hours <= 0`). Geen schemawijziging nodig.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% van de zichtbare omzetcijfers in het "Totale omzet"-kaartje correspondeert met de geselecteerde opdrachtgever wanneer een specifieke opdrachtgever is geselecteerd in de Historie.
- **SC-002**: Een wissel van de geselecteerde opdrachtgever is binnen 1 seconde zichtbaar in het "Totale omzet"-kaartje.
- **SC-003**: Bij "Alle opdrachtgevers" toont het kaartje exact dezelfde totale omzet als vóór deze feature (geen regressie in cijfers of formattering).
- **SC-004**: Het kaartje-label toont in 100% van de gevallen de naam van de geselecteerde opdrachtgever indien gefilterd, en "Totale omzet" indien niet gefilterd.
- **SC-005**: De per-client voortgangskaartjes in het dashboard tonen in 100% van de gevallen alle opdrachtgevers, ongeacht de geselecteerde filter.
- **SC-006**: Na herladen van de uren-tab staat de filter in 100% van de gevallen op "Alle opdrachtgevers" (niet-persistente, sessie-scoped werking).

## Assumptions

- De gedeelde state wordt in-memory bijgehouden (Zustand store of React context) en niet gepersisteerd naar browser-opslag, in tegenstelling tot de privacy-toggle.
- De filter geldt alleen binnen de uren-tab; andere tabbladen blijven ongemoeid.
- De per-client voortgangskaartjes in het dashboard vallen buiten scope en blijven alle opdrachtgevers tonen.
- Bestaande urenregels en opdrachtgevers worden niet gemigreerd of gewijzigd — de feature is puur een weergave-filter op het omzetkaartje.
- De gefilterde omzetberekening gebruikt dezelfde logica als de huidige `getRevenueStats` (uren × uurtarief per regel, uitsluitend regels met `hours > 0`), met een aanvullende filter op `client_id`.
- De opdrachtgevernaam voor het kaartje-label wordt uit de reeds geladen client-lijst gehaald; geen extra query nodig.