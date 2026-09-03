# Feature Specification: CRUD Datum-Standaardwaarden

**Feature Branch**: `014-crud-date-defaults`

**Created**: 2026-08-29

**Status**: Draft

**Input**: User description: "When inserting a new record under the CRUD, always set the default value for a date format to the current date or time if applicable"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Nieuw record met datumvelden krijgt automatisch huidige datum (Priority: P1)

Als admin maak ik een nieuw record aan in een willekeurige tabel via de CRUD-interface. Wanneer het formulier een datumveld bevat (type `date`, `timestamp`, of `datetime`), wordt dat veld automatisch gevuld met de huidige datum of tijd. Ik hoef de datum niet handmatig in te vullen, maar kan de waarde wel aanpassen voordat ik opsla.

**Why this priority**: Dit is de kernbehoefte — elke insert met een datumveld moet direct bruikbaar zijn zonder handmatig de datum te hoeven opzoeken of typen. Het vermindert invoerfouten en versnelt het aanmaken van records.

**Independent Test**: Open een tabel met minstens één datumkolom, klik op "Nieuw record", en verifieer dat het datumveld al gevuld is met de huidige datum/tijd voordat het record wordt opgeslagen.

**Acceptance Scenarios**:

1. **Given** ik open een tabel met een `date`-kolom, **When** ik klik op "Nieuw record", **Then** is het datumveld automatisch gevuld met de datum van vandaag
2. **Given** ik open een tabel met een `timestamp`- of `datetime`-kolom, **When** ik klik op "Nieuw record", **Then** is het veld automatisch gevuld met de huidige datum én tijd
3. **Given** het datumveld is automatisch gevuld, **When** ik pas de waarde handmatig aan, **Then** wordt mijn gekozen waarde behouden en opgeslagen in plaats van de standaardwaarde

---

### User Story 2 - Velden met database-default blijven ongewijzigd (Priority: P2)

Als admin maak ik een nieuw record aan. Wanneer een datumveld in de database al een expliciete standaardwaarde heeft (bijvoorbeeld `DEFAULT now()` of `DEFAULT CURRENT_DATE`), respecteert het formulier die database-default. Het formulier vult het veld alleen automatisch in wanneer er géén database-default is gedefinieerd, zodat ik geen conflicten veroorzaak met de database-instellingen.

**Why this priority**: Voorkomt verwarring wanneer de database al een standaardwaarde toekent. Dubbele logica leidt tot onvoorspelbaar gedrag; de database-default moet leidend zijn wanneer deze bestaat.

**Independent Test**: Open een tabel met een datumkolom die een `DEFAULT now()` heeft in het database-schema. Maak een nieuw record aan en verifieer dat het veld leeg blijft of de database-default toont, niet de client-gecomputeerde datum.

**Acceptance Scenarios**:

1. **Given** een datumkolom heeft een expliciete `DEFAULT` in het database-schema, **When** ik open het "Nieuw record"-formulier, **Then** wordt het veld niet client-side gevuld met de huidige datum (de database-default is leidend)
2. **Given** een datumkolom heeft géén `DEFAULT` in het schema, **When** ik open het "Nieuw record"-formulier, **Then** wordt het veld client-side gevuld met de huidige datum/tijd

---

### User Story 3 - Bewerken van bestaand record laat oorspronkelijke datum staan (Priority: P3)

Als admin bewerk ik een bestaand record. De automatische standaardwaarde-vulling geldt alleen bij het aanmaken van nieuwe records, niet bij het bewerken. Bestaande datumwaarden blijven staan zoals ze in het record staan opgeslagen.

**Why this priority**: Voorkomt dat bestaande datums per ongeluk worden overschreven met de huidige datum tijdens een bewerkingssessie.

**Independent Test**: Open een bestaand record met een datumveld, verifieer dat de datum de opgeslagen waarde toont en niet de huidige datum.

**Acceptance Scenarios**:

1. **Given** ik bewerk een bestaand record met een datumveld, **When** het bewerkformulier opent, **Then** toont het datumveld de oorspronkelijk opgeslagen waarde, niet de huidige datum
2. **Given** ik bewerk een record en wijzig niks in het datumveld, **When** ik sla op, **Then** blijft de oorspronkelijke datum behouden

---

### Edge Cases

- Wat gebeurt er wanneer een datumveld `nullable` is en de gebruiker de automatisch gevulde waarde wist? Het veld moet leeg kunnen blijven en als `NULL` worden opgeslagen.
- Hoe wordt omgegaan met datumvelden in een andere tijdzone dan de browser van de gebruiker? De huidige datum/tijd moet worden uitgedrukt in de tijdzone die de applicatie als standaard hanteert.
- Wat als een tabel meerdere datumvelden heeft (bijvoorbeeld `created_at` én `start_date`)? Elk datumveld zonder database-default wordt onafhankelijk gevuld met de huidige datum/tijd.
- Hoe wordt omgegaan met `time`-velden (zonder datum)? Deze worden gevuld met de huidige tijd.
- Wat als de browser-tijd onbetrouwbaar is (verkeerde systeemklok)? De applicatie mag de datum server-side laten bevestigen bij opslaan.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Het systeem MOET bij het openen van een "Nieuw record"-formulier elk veld van type `date` automatisch vullen met de huidige datum, tenzij de kolom een expliciete database-standaardwaarde heeft.
- **FR-002**: Het systeem MOET bij het openen van een "Nieuw record"-formulier elk veld van type `timestamp` of `datetime` automatisch vullen met de huidige datum én tijd, tenzij de kolom een expliciete database-standaardwaarde heeft.
- **FR-003**: Het systeem MOET bij het openen van een "Nieuw record"-formulier elk veld van type `time` automatisch vullen met de huidige tijd, tenzij de kolom een expliciete database-standaardwaarde heeft.
- **FR-004**: Het systeem MOET de automatisch gevulde waarde kunnen worden overschreven door de gebruiker voordat het record wordt opgeslagen.
- **FR-005**: Het systeem MAG géén automatische vulling toepassen bij het bewerken van een bestaand record; bestaande waarden blijven ongewijzigd.
- **FR-006**: Het systeem MOET de database-schema-definitie van de kolom raadplegen om te bepalen of een expliciete `DEFAULT`-waarde bestaat; alleen bij afwezigheid hiervan wordt client-side vulling toegepast.
- **FR-007**: Het systeem MOET de automatisch gevulde waarde kunnen worden gewist door de gebruiker, zodat een `nullable` datumveld als `NULL` kan worden opgeslagen.
- **FR-008**: Het systeem MOET de huidige datum/tijd weergeven in de tijdzone die de applicatie als standaard hanteert, ongeacht de tijdzone van de browser.

### Key Entities *(include if feature involves data)*

- **CRUD-formulier**: Het formulier dat wordt gebruikt om nieuwe records aan te maken of bestaande records te bewerken. Bevat velden die overeenkomen met de kolommen van de geselecteerde tabel.
- **Tabel-schema**: De structuurdefinitie van een database-tabel, inclusief kolomtypes en eventuele database-standaardwaarden. Bepaalt of client-side vulling mag worden toegepast.
- **Datumveld**: Een formulierveld van type `date`, `time`, `timestamp`, of `datetime`. Kandidaat voor automatische vulling bij nieuwe records.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Bij het aanmaken van een nieuw record in een tabel met een datumveld is dat veld in 100% van de gevallen automatisch ingevuld met de huidige datum/tijd (indien geen database-default).
- **SC-002**: Gebruikers hoeven bij nieuw-record-aanmaak nul extra handelingen te verrichten om een geldige datum in te vullen — de invoertijd per record neemt af met de tijd die handmatige datumselectie kost.
- **SC-003**: In 0% van de bewerkingssessies van bestaande records wordt een opgeslagen datumwaarde ongewenst overschreven met de huidige datum.
- **SC-004**: 100% van de datumvelden met een expliciete database-standaardwaarde wordt niet client-side gevuld, zodat de database-default leidend blijft.
- **SC-005**: Gebruikers kunnen in 100% van de `nullable` datumvelden de automatisch gevulde waarde wissen en het record met `NULL` opslaan.

## Assumptions

- De CRUD-interface kent al de mogelijkheid om nieuwe records aan te maken met formuliervelden per kolomtype (bestaande feature uit spec 003).
- Het systeem heeft toegang tot het database-schema inclusief kolomtypes en default-definities (via Supabase introspectie of de gegenereerde `database.types.ts`).
- De applicatie hanteert één standaardtijdzone voor datum/tijd-weergave; de gebruiker kan hier geen afwijkende tijdzone per veld instellen.
- Deze functionaliteit geldt alleen voor tabellen die via de eigen CRUD-interface worden aangesproken (Supabase eigen database en aangesloten externe PostgreSQL-databases).
- Datumvelden met een `DEFAULT` in het schema worden beschouwd als "beheerd door de database" en client-side vulling wordt overgeslagen; de gebruiker kan het veld wel handmatig invullen.
- De huidige datum/tijd wordt bepaald op het moment dat het "Nieuw record"-formulier wordt geopend, niet op het moment van opslaan.