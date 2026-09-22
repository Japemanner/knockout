# Feature Specification: CRUD Kolomvolgorde Doorgetrokken naar Record-Formulier

**Feature Branch**: `019-crud-column-order-new-record`

**Created**: 2026-09-22

**Status**: Draft

**Input**: User description: "Wanneer ik onder het tabblad CRUD de volgorde van de kolommen aanpas wil ik dat deze volgorde ook wordt aangepast wanneer ik een nieuwe record aanmaak"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Nieuw record-formulier volgt aangepaste kolomvolgorde (Priority: P1)

Een gebruiker die in een CRUD-overzicht de kolomvolgorde heeft aangepast (bijv. "Klant" vooraan geplaatst) wil dat het formulier voor het aanmaken van een nieuw record dezelfde volgorde gebruikt. Wanneer de gebruiker op "+ Record" klikt, verschijnen de invulvelden in exact dezelfde volgorde als de kolommen in de tabelweergave — niet in de database-volgorde. Dit voorkomt verwarring: wat visueel vooraan staat, is ook het eerste veld dat de gebruiker invult.

**Why this priority**: Dit is de kern van de vraag — de gebruiker past de volgorde aan met de expliciete verwachting dat die volgorde overal doorleept, inclusief het aanmaakformulier. Zonder dit is de opgeslagen voorkeur maar half waar.

**Independent Test**: Kan getest worden door een kolom naar de eerste positie te slepen, het tabeloverzicht te bekijken, op "+ Record" te klikken en te verifiëren dat het bijbehorende veld ook als eerste in het formulier verschijnt.

**Acceptance Scenarios**:

1. **Given** de gebruiker heeft in een CRUD-overzicht de kolomvolgorde aangepast en opgeslagen, **When** de gebruiker op "+ Record" klikt, **Then** verschijnen de formuliervelden in dezelfde volgorde als de kolommen in de tabelweergave
2. **Given** de gebruiker heeft kolom "Klant" als eerste kolom geplaatst in de tabelweergave, **When** de gebruiker een nieuw record aanmaakt, **Then** is "Klant" het eerste invulveld in het formulier
3. **Given** de gebruiker heeft nog geen kolomvolgorde opgeslagen (standaardvolgorde actief), **When** de gebruiker een nieuw record aanmaakt, **Then** volgt het formulier de standaard database-volgorde (bestaand gedrag ongewijzigd)
4. **Given** de gebruiker heeft een kolom verborgen via het kolom-instellingenmenu, **When** de gebruiker een nieuw record aanmaakt, **Then** is het verborgen veld niet zichtbaar in het formulier (bestaand gedrag ongewijzigd)

---

### User Story 2 - Bewerkformulier volgt dezelfde aangepaste volgorde (Priority: P2)

Een gebruiker die de kolomvolgorde heeft aangepast wil dat ook het formulier voor het bewerken van een bestaand record dezelfde volgorde gebruikt. Het aanmaak- en bewerkformulier zijn in de huidige applicatie hetzelfde formulier; consistentie tussen beide voorkomt dat gebruikers twee verschillende veldvolgordes moeten onthouden binnen één overzicht.

**Why this priority**: Niet expliciet gevraagd, maar het bewerkformulier deelt hetzelfde formulier-component als het aanmaakformulier — dezelfde oplossing dekt beide flows. Inconsistentie tussen aanmaken en bewerken zou willekeurig en verwarrend zijn.

**Independent Test**: Kan getest worden door de kolomvolgorde aan te passen, een bestaand record te openen via het potlood-icoon en te verifiëren dat de velden in de aangepaste volgorde verschijnen.

**Acceptance Scenarios**:

1. **Given** de gebruiker heeft de kolomvolgorde aangepast, **When** de gebruiker een bestaand record opent voor bewerking, **Then** verschijnen de velden in dezelfde aangepaste volgorde als in het aanmaakformulier en de tabelweergave

---

### User Story 3 - Volgorde blijft robuust bij kolom-wijzigingen (Priority: P3)

Een gebruiker wil dat het formulier netjes omgaat met kolommen die niet (meer) in de opgeslagen volgorde voorkomen: nieuwe database-kolommen verschijnen aan het einde van het formulier, en kolommen die niet meer bestaan verdwijnen uit het formulier — zonder de overige volgorde te verstoren.

**Why this priority**: Randgeval, maar hetzelfde robuustheidsgedrag is al afgesproken voor de tabelweergave (specificatie 015) en moet consistent doorwerken in het formulier.

**Independent Test**: Kan getest worden door een kolom toe te voegen aan de onderliggende tabel terwijl een opgeslagen volgorde bestaat, en te verifiëren dat het nieuwe veld achteraan in het formulier verschijnt.

**Acceptance Scenarios**:

1. **Given** de gebruiker heeft een kolomvolgorde opgeslagen en er is daarna een nieuwe kolom aan de tabel toegevoegd, **When** de gebruiker een nieuw record aanmaakt, **Then** verschijnt het nieuwe veld aan het einde van het formulier
2. **Given** de gebruiker heeft een kolomvolgorde opgeslagen waarin een inmiddels verwijderde kolom voorkomt, **When** de gebruiker een nieuw record aanmaakt, **Then** is er geen leeg of fout veld zichtbaar en blijft de rest van de volgorde intact

---

### Edge Cases

- Wat gebeurt er als de gebruiker de kolomvolgorde aanpast terwijl het aanmaakformulier geopend is? Het formulier gebruikt de volgorde zoals die gold bij het openen; de nieuwe volgorde geldt bij de eerstvolgende keer dat het formulier wordt geopend.
- Wat als de gebruiker "Reset volgorde" heeft gekozen? Het formulier volgt weer de standaard database-volgorde.
- Wat met kolommen die verborgen zijn? Deze blijven uitgesloten van het formulier (bestaand gedrag); verbergen verandert de volgordepositie van overige velden niet.
- Wat met de primaire-sleutelkolom? Het formulier blijft hetzelfde veldenaanbod tonen als voorheen; alleen de volgorde van velden verandert.
- Wat als de opgeslagen volgorde slechts een subset van de kolommen bevat? Ontbrekende kolommen worden in hun standaardvolgorde aan het einde toegevoegd.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Het systeem MOET bij het aanmaken van een nieuw record in een CRUD-overzicht de formuliervelden weergeven in de door de gebruiker opgeslagen kolomvolgorde voor dat overzicht (dezelfde volgorde als de tabelweergave)
- **FR-002**: Het systeem MOET bij het bewerken van een bestaand record dezelfde opgeslagen kolomvolgorde toepassen op de formuliervelden
- **FR-003**: Het systeem MOET kolommen die niet in de opgeslagen volgorde voorkomen (bijv. nieuw toegevoegde database-kolommen) aan het einde van het formulier plaatsen, in standaardvolgorde onderling
- **FR-004**: Het systeem MOET kolommen die niet meer in de tabel bestaan overslaan bij het opbouwen van het formulier, zonder de volgorde van overige velden te verstoren
- **FR-005**: Het systeem MOET bestaand gedrag ongemoeid laten: veldselectie (welke velden getoond worden, inclusief uitsluiting van verborgen kolommen), validatie, standaardwaarden en verplichte-velden-logica veranderen niet
- **FR-006**: Het systeem MOET, wanneer geen kolomvolgorde is opgeslagen (of na "Reset volgorde"), het formulier in de standaard database-volgorde weergeven
- **FR-007**: Het systeem MOET de volgorde-wijziging automatisch toepassen zonder dat de gebruiker extra acties hoeft uit te voeren (geen aparte instelling of vinkje)

### Key Entities

- **CrudOverview** (bestaand): Het CRUD-overzicht met per gebruiker opgeslagen voorkeuren, waaronder `column_order` (de geordende lijst van kolomnamen) en `hidden_columns`. Geen nieuwe entiteit nodig — deze specificatie hergebruikt de bestaande kolomvolgorde-voorkeur.
- **ColumnInfo** (bestaand): Database-introspectie van een tabelkolom (naam, datatype, nullable, primaire sleutel, etc.). De veldvolgorde in het formulier wordt afgeleid door deze kolommen te sorteren volgens de opgeslagen `column_order`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In 100% van de gevallen waarin een kolomvolgorde is opgeslagen, toont het aanmaakformulier de velden in exact dezelfde volgorde als de tabelweergave (verifieerbaar per kolompositie)
- **SC-002**: In 100% van de gevallen toont het bewerkformulier dezelfde veldvolgorde als het aanmaakformulier voor hetzelfde overzicht
- **SC-003**: Nieuwe kolommen die na opslag van een volgorde aan de tabel worden toegevoegd, verschijnen zonder gebruikersactie aan het einde van het formulier
- **SC-004**: Gebruikers ervaren nul extra handelingen: de volgorde geldt automatisch na het aanpassen van de kolomvolgorde, zonder herladen of instelling
- **SC-005**: De veldvolgorde blijft correct over sessies heen: na opnieuw inloggen en heropenen van het overzicht toont het formulier nog steeds de opgeslagen volgorde

## Assumptions

- De per-gebruiker per-overzicht opgeslagen kolomvolgorde (uit specificatie 015) is de bron van waarheid; er komt geen aparte formulier-volgorde
- Het aanmaak- en bewerkformulier delen één formulier-component; de oplossing dekt daarom automatisch beide flows, ook al vroeg de gebruiker specifiek naar aanmaken
- Bestaand gedrag rond veldselectie (verborgen kolommen uitgesloten, niet-bewerkbare velden zoals gegenereerde kolommen buiten beschouwing gelaten zoals nu) blijft ongewijzigd — alleen de volgorde verandert
- "Reset volgorde" (bestaande functionaliteit) zet ook de formulier-volgorde terug naar de standaard database-volgorde
- Een kolomvolgorde die tijdens het openstaan van het formulier wordt gewijzigd, geldt pas bij de volgende keer dat het formulier wordt geopend
- Touch/apparaten vallen buiten scope; dit betreft de bestaande webinterface