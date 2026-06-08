# Feature Specification: Supabase Eigen Database CRUD

**Feature Branch**: `003-supabase-own-db-crud`

**Created**: 2026-06-08

**Status**: Draft

**Input**: User description: "Ik heb diverse databases in Supabase. Ik wil hier via de applicatie CRUD op uit kunnen voeren."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Eigen database direct beschikbaar (Priority: P1)

Als admin wil ik de tabellen van mijn eigen Supabase-project direct kunnen bekijken en bewerken, zonder handmatig een connectie toe te hoeven voegen. Wanneer ik op "Database" klik in de navigatie, zie ik automatisch alle tabellen uit de Supabase-database waar de applicatie al mee verbonden is.

**Why this priority**: Dit is de kernbehoefte — de eigen database is de belangrijkste en meest gebruikte database. Zonder dit is de feature waardeloos.

**Independent Test**: Open de database explorer via het nav-item, zie alle tabellen uit het eigen Supabase-project verschijnen zonder enige configuratie.

**Acceptance Scenarios**:

1. **Given** ik ben ingelogd als admin, **When** ik klik op "Database" in de navigatie, **Then** zie ik een lijst van alle tabellen in het eigen Supabase-project, automatisch geladen zonder handmatige setup
2. **Given** ik bekijk de tabelijst, **When** ik klik op een tabel, **Then** zie ik alle records in die tabel met paginering en kan ik records aanmaken, bewerken en verwijderen

---

### User Story 2 - CRUD op tabelrecords (Priority: P2)

Als admin wil ik op elke tabel in mijn eigen database full CRUD kunnen uitvoeren: records aanmaken, bekijken, bewerken en verwijderen. Formuliervelden moeten automatisch matchen met het kolomtype (tekst, getal, datum, boolean, foreign key dropdown).

**Why this priority**: Zonder CRUD-functionaliteit is de tabelbrowser alleen een lees-weergave. CRUD is essentieel voor databasebeheer.

**Independent Test**: Open een tabel, maak een nieuw record aan, bewerk het, en verwijder het. Alle drie operaties moeten werken.

**Acceptance Scenarios**:

1. **Given** ik bekijk een tabel, **When** ik klik op "Nieuw record", **Then** verschijnt een formulier met de juiste veldtypes per kolom en kan ik een record aanmaken
2. **Given** ik bekijk een tabel met records, **When** ik klik op bewerken bij een record, **Then** verschijnt hetzelfde formulier pre-filled met de huidige waarden en kan ik wijzigingen opslaan
3. **Given** ik bekijk een tabel met records, **When** ik klik op verwijderen bij een record, **Then** krijg ik een bevestigingsdialoog en wordt het record verwijderd na bevestiging

---

### User Story 3 - Externe databases blijven bereikbaar (Priority: P3)

Als admin wil ik naast mijn eigen database ook externe PostgreSQL-databases kunnen toevoegen en bekijken, via dezelfde interface. De bestaande functionaliteit voor externe connecties blijft beschikbaar binnen dezelfde database explorer.

**Why this priority**: Dit is een bestaande feature die bereikbaarder wordt. Niet kritiek voor MVP maar wel het behouden van bestaande waarde.

**Independent Test**: Voeg een externe database toe, bekijk de tabellen, voer CRUD uit. De externe database verschijnt naast de eigen database in dezelfde interface.

**Acceptance Scenarios**:

1. **Given** ik ben op de database explorer pagina, **When** ik klik op "Externe database toevoegen", **Then** kan ik een naam en connectiestring opgeven en wordt de verbinding opgeslagen en versleuteld
2. **Given** ik heb een externe database toegevoegd, **When** ik klik erop, **Then** zie ik alle tabellen en kan ik CRUD uitvoeren net als bij de eigen database

---

### Edge Cases

- Wat gebeurt er als de eigen Supabase-database onbereikbaar is? De interface moet een duidelijke foutmelding tonen met een "opnieuw proberen" knop.
- Wat gebeurt er bij tabellen zonder primary key? Bewerken en verwijderen zijn dan niet mogelijk — de interface moet dit duidelijk aangeven.
- Wat gebeurt er bij tabellen met composite primary keys? De interface moet deze herkennen en correct verwerken.
- Wat gebeurt er bij kolommen met JSON/JSONB types? De interface moet een geschikte tekst-editor tonen met validatie.
- Wat gebeurt er bij zeer brede tabellen (veel kolommen)? De interface moet horizontaal scrollen of kolommen kunnen inklappen.
- Wat gebeurt er als een niet-admin probeert de database explorer te openen? Toegang wordt geweigerd.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: De applicatie MOET de eigen Supabase-database automatisch detecteren en beschikbaar maken als ingebouwde databaseconnectie, zonder dat de gebruiker handmatig een connectie hoeft toe te voegen
- **FR-002**: De applicatie MOET een eigen navigatie-item "Database" tonen waarmee de admin direct naar de database explorer navigeert
- **FR-003**: De database explorer MOET alle tabellen in de geselecteerde database tonen inclusief kolominformatie (naam, type, nullable, primary key, foreign keys)
- **FR-004**: De applicatie MOET full CRUD (create, read, update, delete) ondersteunen op elke tabel in de geselecteerde database
- **FR-005**: De applicatie MOET formuliervelden automatisch genereren op basis van het kolomtype: tekstvelden voor teksttypes, getalvelden voor numerieke types, datumkiezers voor datumtypes, toggles voor booleans, en dropdowns voor foreign keys
- **FR-006**: De applicatie MOET foreign key relaties herkennen en een dropdown tonen met waarden uit de gerefernceerde tabel
- **FR-007**: De applicatie MOET records met paginering tonen (max 25 records per pagina)
- **FR-008**: De applicatie MOET connectiestrings van externe databases versleuteld opslaan
- **FR-009**: De database explorer MOET alleen toegankelijk zijn voor gebruikers met de admin-rol
- **FR-010**: De applicatie MOET een verwijderbevestiging tonen voordat een record definitief wordt verwijderd
- **FR-011**: De applicatie MOET duidelijk aangeven wanneer een tabel niet bewerkbaar/verwijderbaar is vanwege ontbrekende primary key
- **FR-012**: De applicatie MOET foutmeldingen tonen met een retry-optie wanneer een database onbereikbaar is

### Key Entities

- **DatabaseConnection**: Een databaseconnectie — ofwel de ingebouwde eigen Supabase-connectie, of een handmatig toegevoegde externe connectie. Attributen: naam, type (eigen/extern), verbindingsgegevens (versleuteld voor extern)
- **TableInfo**: Een tabel in een database. Attributen: naam, schema, kolommen, foreign keys
- **ColumnInfo**: Een kolom in een tabel. Attributen: naam, datatype, nullable, primary key, default waarde, max lengte
- **ForeignKeyInfo**: Een foreign key relatie. Attributen: kolomnaam, gerefernceerde tabel, gerefernceerde kolom

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Een admin kan binnen 10 seconden na inloggen de eigen database bereiken via het navigatiemenu
- **SC-002**: Alle tabellen in de eigen database zijn zichtbaar binnen 3 seconden na het openen van de database explorer
- **SC-003**: Een admin kan een nieuw record aanmaken in minder dan 30 seconden (veld invullen + opslaan)
- **SC-004**: Formuliervelden matchen voor 100% met het verwichte inputtype op basis van het kolomtype
- **SC-005**: Externe databases die al geconfigureerd waren blijven werkend na de wijziging

## Assumptions

- Alleen admins hebben toegang tot de database explorer; dit is consistent met de huidige instellingenpagina
- De eigen Supabase-database is altijd bereikbaar vanuit de server-side omgeving (dezelfde omgeving waar de applicatie draait)
- De directe databaseverbinding van het eigen Supabase-project is beschikbaar als omgevingsvariabele op de server
- Externe databaseconnecties gebruiken de bestaande encryptie-infrastructuur en verbindingspool
- De bestaande CRUD-componenten (DynamicTable, DynamicForm, FormFieldMapper) worden hergebruikt voor de eigen database
- Tabellen in systeemschema's (pg_catalog, information_schema) worden uitgesloten van de weergave
- Compositie primary keys worden ondersteund (bestaande beperking wordt meegenomen in de implementatie)