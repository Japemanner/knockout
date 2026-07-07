# Feature Specification: CRUD Decimale Input met Punt en Komma

**Feature Branch**: `008-crud-decimal-dot-input`

**Created**: 2026-07-06

**Status**: Draft

**Input**: User description: "in de crud opzet kan ik alleen een , gebruiken. Pas het aan zodat ik ook een . kan gebruiken om decimalen te defineren"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Decimale waarde invoeren met punt (Priority: P1)

Als gebruiker wil ik in een CRUD-formulierveld van een decimaal type (numeric, decimal, real, double precision) een waarde met een punt als decimaal scheidingsteken kunnen invoeren (bijv. `1.5`), zodat deze correct wordt opgeslagen in de database — ongeacht de taalinstelling van mijn browser.

**Why this priority**: Dit is het kernprobleem dat de gebruiker rapporteerde. In een Nederlandse browser accepteert het huidige invoerveld alleen een komma, waardoor punt-invoer faalt of `NaN` oplevert. Dit blokkeert correct datamanagement.

**Independent Test**: Open een CRUD-formulier met een numeric/decimal-kolom, voer `1.5` in, sla op, en verifieer dat de database `1.5` bevat (niet `NaN`, niet leeg, niet afgekapt).

**Acceptance Scenarios**:

1. **Given** een CRUD-formulier met een numeric/decimal-kolom, **When** de gebruiker `1.5` invoert en opslaat, **Then** wordt de waarde `1.5` correct opgeslagen in de database
2. **Given** een CRUD-formulier met een real/double precision-kolom, **When** de gebruiker `0.75` invoert en opslaat, **Then** wordt de waarde `0.75` correct opgeslagen
3. **Given** een CRUD-formulier met een numeric-kolom, **When** de gebruiker `100.00` invoert en opslaat, **Then** wordt de waarde `100.00` correct opgeslagen zonder afronding of truncatie

---

### User Story 2 - Decimale waarde invoeren met komma (Priority: P1)

Als gebruiker wil ik in hetzelfde decimale veld ook een komma kunnen gebruiken (`1,5`), zodat ik niet hoef te denken aan welke toets ik gebruik — beide werken.

**Why this priority**: Backward-compatibiliteit met de huidige werkwijze. Gebruikers die gewend zijn een komma te typen mogen niet breken. Dit voorkomt regressie in bestaand gebruik.

**Independent Test**: Open hetzelfde CRUD-formulier, voer `1,5` in, sla op, en verifieer dat de database `1.5` bevat (komma genormaliseerd naar punt).

**Acceptance Scenarios**:

1. **Given** een CRUD-formulier met een numeric/decimal-kolom, **When** de gebruiker `1,5` invoert en opslaat, **Then** wordt de waarde intern genormaliseerd naar `1.5` en correct opgeslagen
2. **Given** een CRUD-formulier met een real/double precision-kolom, **When** de gebruiker `0,75` invoert en opslaat, **Then** wordt de waarde genormaliseerd naar `0.75` en correct opgeslagen

---

### User Story 3 - Weergave volgt database-waarde in punt-notatie (Priority: P2)

Als gebruiker wil ik bij het heropenen van een record de opgeslagen decimale waarde zien in punt-notatie (`1.5`), als een directe weergave van de database-inhoud — zonder locale-conversie naar een komma. De view is een spiegel van de database.

**Why this priority**: Houdt de UI voorspelbaar en consistent met de opgeslagen data. Voorkomt verwarring ("staat er 1.5 of 1,5 in de database?"). Minder complexiteit, geen locale-afhankelijke weergavelogica.

**Independent Test**: Sla een record op met `1,5`, heropen hetzelfde record in het edit-formulier, en verifieer dat het veld `1.5` toont (punt, niet komma).

**Acceptance Scenarios**:

1. **Given** een record met opgeslagen waarde `1.5` in een numeric-kolom, **When** de gebruiker het record opent in het edit-formulier, **Then** toont het invoerveld `1.5` (punt-notatie)
2. **Given** een record met opgeslagen waarde `0.75`, **When** de gebruiker het record opent, **Then** toont het veld `0.75` — geen `0,75`, geen valuta-opmaak

---

### User Story 4 - Integer-velden blijven strikt integer (Priority: P2)

Als gebruiker wil ik dat invoervelden van integer-typen (integer, smallint, bigint) geen decimale scheidingstekens accepteren — een punt of komma in een integer-veld wordt afgewezen, omdat de database-kolom geen decimalen ondersteunt.

**Why this priority**: Voorkomt ongeldige invoer bij integer-kolommen. Huidig gedrag behouden — integer-kolommen mogen geen `1.5` of `1,5` opslaan.

**Independent Test**: Open een CRUD-formulier met een integer-kolom, probeer `1.5` in te voeren, en verifieer dat opslaan wordt geblokkeerd met een duidelijke melding.

**Acceptance Scenarios**:

1. **Given** een CRUD-formulier met een integer-kolom, **When** de gebruiker `1.5` invoert en probeert op te slaan, **Then** wordt opslaan geblokkeerd en krijgt de gebruiker een duidelijke foutmelding
2. **Given** een CRUD-formulier met een smallint-kolom, **When** de gebruiker `1,5` invoert, **Then** wordt opslaan geblokkeerd met dezelfde soort melding
3. **Given** een CRUD-formulier met een bigint-kolom, **When** de gebruiker `42` invoert, **Then** wordt de waarde correct opgeslagen als integer

---

### User Story 5 - Ongeldige invoer wordt helder afgewezen (Priority: P3)

Als gebruiker wil ik een duidelijke foutmelding zien wanneer ik ongeldige invoer typ in een numeriek veld — zoals meerdere scheidingstekens (`1..5`, `1,,5`), letters (`1abc`), of een lege decimale waarde (`1.`).

**Why this priority**: Voorkomt `NaN`-waarden in de database en geeft de gebruiker direct feedback in plaats van een mislukte opslag achteraf. Minder frustratie, betere datakwaliteit.

**Independent Test**: Voer `1..5` in een numeric veld in, probeer op te slaan, en verifieer dat een duidelijke foutmelding verschijnt en de database niet wordt beschreven.

**Acceptance Scenarios**:

1. **Given** een numeric/decimal-veld, **When** de gebruiker `1..5` invoert en opslaat, **Then** verschijnt een foutmelding ("Ongeldige decimale waarde") en wordt niets opgeslagen
2. **Given** een numeric/decimal-veld, **When** de gebruiker `1,,5` invoert, **Then** verschijnt dezelfde soort foutmelding en wordt niets opgeslagen
3. **Given** een numeric/decimal-veld, **When** de gebruiker `1abc` invoert, **Then** verschijnt een foutmelding en wordt niets opgeslagen
4. **Given** een numeric/decimal-veld, **When** de gebruiker het veld leeg laat (indien de kolom nullable is), **Then** wordt `NULL` opgeslagen zonder foutmelding

---

### Edge Cases

- Wat gebeurt er als de gebruiker een waarde plakt uit het klembord met gemengde tekens (`1,5.00`)? Het systeem moet dit afwijzen — slechts één decimaal scheidingsteken toegestaan.
- Wat gebeurt er bij zeer grote decimalen (bijv. `999999999999.999999`)? De waarde moet behouden blijven zonder afronding, tenzij de database-kolom een beperkte precision heeft (in dat geval bepaalt PostgreSQL de afronding, niet de UI).
- Wat gebeurt er bij een negatieve decimale waarde (`-1,5` of `-1.5`)? Beide moeten correct worden geaccepteerd en genormaliseerd naar `-1.5`.
- Wat gebeurt er bij een waarde die begint met een nul (`0,5` of `0.5`)? Beide moeten correct worden geaccepteerd en genormaliseerd naar `0.5`.
- Wat gebeurt er bij een duizendtals-scheidingsteken (`1.234,56`)? Dit moet worden afgewezen — het systeem ondersteunt geen duizendtals-notatie, alleen decimale scheiding.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST decimale invoer met een punt (`.`) accepteren in CRUD-formuliervelden voor de types numeric, decimal, real, double precision, float4, float8
- **FR-002**: System MUST decimale invoer met een komma (`,`) accepteren in dezelfde decimale velden en deze intern normaliseren naar punt-notatie vóór opslag
- **FR-003**: System MUST bij opslag naar de database altijd punt-notatie gebruiken, zodat PostgreSQL `numeric`/`decimal` de waarde correct interpreteert (geen `NaN`, geen afwijzing door Supabase)
- **FR-004**: System MUST bij weergave van een bestaande record-waarde in een decimaal veld altijd de database-waarde tonen in punt-notatie — geen locale-conversie, geen komma-weergave
- **FR-005**: System MUST integer-typen (integer, int, int4, smallint, int2, bigint, int8) strikt valideren — invoer met `.` of `,` wordt afgewezen met een duidelijke foutmelding
- **FR-006**: System MUST invoer met meer dan één decimaal scheidingsteken (bijv. `1..5`, `1,,5`, `1,5.0`) afwijzen met een foutmelding
- **FR-007**: System MUST niet-numerieke tekens (letters, symbolen behalve één `.` of `,` en een optionele leidende `-`) afwijzen met een foutmelding
- **FR-008**: System MUST lege invoer in een nullable decimaal veld accepteren en opslaan als `NULL`
- **FR-009**: System MUST negatieve decimale waarden (`-1.5`, `-1,5`) correct accepteren en normaliseren naar `-1.5`
- **FR-010**: System MUST voorkomen dat `NaN`-waarden naar de database worden gestuurd — als invoer niet parseerbaar is, wordt de opslag geblokkeerd
- **FR-011**: System MUST duizendtals-scheidingstekens (bijv. `1.234,56` of `1,234.56`) afwijzen — alleen enkele decimale notatie wordt ondersteund

### Key Entities *(include if feature involves data)*

- **CRUD-formulierveld (decimaal type)**: Een invoerveld in een CRUD-formulier gebonden aan een database-kolom van type numeric, decimal, real, double precision, float4 of float8. Accepteert invoer met `.` of `,`, normaliseert naar `.` bij opslag, toont `.`-notatie bij weergave.
- **CRUD-formulierveld (integer type)**: Een invoerveld gebonden aan een kolom van type integer, smallint of bigint. Accepteert alleen gehele getallen (optioneel met leidende `-`); punten en komma's worden afgewezen.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% van decimale invoer met een punt (`.`) wordt correct opgeslagen in de database als geldige `numeric`/`decimal` waarde (geen `NaN`, geen afwijzing door Supabase)
- **SC-002**: 100% van decimale invoer met een komma (`,`) wordt correct opgeslagen na normalisatie naar punt-notatie
- **SC-003**: 0% `NaN`-waarden in numerieke CRUD-velden na invoer — alle ongeldige invoer wordt vóór opslag onderschept
- **SC-004**: 100% van integer-velden wijst invoer met een decimaal scheidingsteken (`.` of `,`) af met een foutmelding
- **SC-005**: 100% van heropende records toont de database-waarde in punt-notatie in het decimale invoerveld (geen komma-weergave, geen locale-conversie)
- **SC-006**: Gebruiker kan een decimale waarde invoeren, opslaan, en heropenen in één vloeiende actie zonder foutmeldingen — ongeacht of `.` of `,` werd gebruikt

## Assumptions

- De oorzaak van het huidige probleem is dat een Nederlandse browser bij `<input type="number">` een komma als enige decimaal scheidingsteken accepteert, terwijl `Number("1,5")` in JavaScript `NaN` oplevert — waardoor de huidige implementatie punt-invoer breekt in een NL-locale.
- De CRUD-formulieren gebruiken een gemeenschappelijke veld-mapper voor alle numerieke velden, zodat één aanpassing alle decimale velden in alle CRUD-overviews dekt.
- De database (Supabase/PostgreSQL) slaat decimalen op in punt-notatie; er is geen conversie nodig bij de database-kant.
- Bestaande opgeslagen decimale waarden in Supabase zijn al in punt-notatie en hoeven niet te worden gemigreerd.
- De weergave in de tabel-overzichten (DataTable buiten het edit-formulier) valt buiten scope — die toont al de ruwe database-waarde en heeft geen invoer-logica.
- Valuta-opmaak (bijv. `€1.234,56`) valt buiten scope — dit is puur technische decimale invoer, geen presentatie-laag.
- Een locale-toggle of NL/EN-weergaveswitch valt buiten scope — de view is een directe spiegel van de database.