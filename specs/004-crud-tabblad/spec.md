# Feature Specification: CRUD Tabblad

**Feature Branch**: `004-crud-tabblad`

**Created**: 2026-06-08

**Status**: Draft

**Input**: User description: "Maak een Tabblad CRUD aan. deze moet functioneel hetzelfde werken als het tablad Borden. Hier kan ik CRUD overzichten maken op basis van mijn Supabase projecten. Rechts boven in kan ik een nieuwe CRUD maken en wanneer ik hier op klik kan ik een naam instellen en een supabase project eraankoppelen"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - CRUD overzicht aanmaken en bekijken (Priority: P1)

Als gebruiker wil ik via een nieuw "CRUD" tabblad in de navigatie een overzicht zien van al mijn CRUD overzichten, en via een knop rechtsboven een nieuw CRUD overzicht kunnen aanmaken met een naam en een gekoppeld Supabase-project. Dit werkt functioneel hetzelfde als het Borden-tabblad: ik zie een grid van kaarten en kan klikken op een kaart om de detailweergave te openen.

**Why this priority**: Dit is de kernfunctionaliteit — zonder de mogelijkheid om CRUD overzichten aan te maken en te bekijken, heeft de feature geen waarde.

**Independent Test**: Open het CRUD tabblad, maak een nieuw CRUD overzicht aan met een naam en project, zie het verschijnen in het grid, klik erop en zie de detailweergave.

**Acceptance Scenarios**:

1. **Given** ik ben ingelogd, **When** ik klik op "CRUD" in de navigatie, **Then** zie ik een pagina met een grid van al mijn CRUD overzichten (of een leegstaat-bericht als er nog geen zijn)
2. **Given** ik ben op de CRUD-pagina, **When** ik klik op "Nieuwe CRUD" rechtsboven, **Then** verschijnt een dialoog waarin ik een naam kan invoeren en een Supabase-project kan selecteren
3. **Given** ik heb het dialoog geopend, **When** ik vul een naam in, selecteer een project, en klik op "Aanmaken", **Then** wordt het CRUD overzicht aangemaakt en verschijnt het als kaart in het grid
4. **Given** ik heb CRUD overzichten, **When** ik klik op een CRUD kaart, **Then** navigeer ik naar de detailpagina waar ik de databasetabellen van het gekoppelde project zie

---

### User Story 2 - CRUD overzicht naam wijzigen en verwijderen (Priority: P2)

Als gebruiker wil ik de naam van een CRUD overzicht kunnen wijzigen en een CRUD overzicht kunnen verwijderen, net zoals ik dat bij borden kan doen.

**Why this priority**: Dit is essentiële beheerfunctionaliteit. Zonder dit raken CRUD overzichten onbeheersbaar.

**Independent Test**: Wijzig de naam van een CRUD overzicht via de kaart en verwijder een CRUD overzicht. Beide operaties moeten werken.

**Acceptance Scenarios**:

1. **Given** ik zie een CRUD overzicht in het grid, **When** ik klik op bewerk/hernoem, **Then** kan ik de naam wijzigen en wordt de wijziging opgeslagen
2. **Given** ik zie een CRUD overzicht in het grid, **When** ik klik op verwijder en bevestig dit, **Then** wordt het CRUD overzicht permanent verwijderd uit het grid

---

### User Story 3 - CRUD overzicht koppelt aan eigen of extern project (Priority: P3)

Als gebruiker wil ik bij het aanmaken van een CRUD overzicht kunnen kiezen tussen het eigen Supabase-project (dat altijd beschikbaar is) of een externe databaseconnectie die ik eerder heb toegevoegd. De detailpagina gebruikt automatisch de juiste verbinding.

**Why this priority**: Dit onderscheidt CRUD overzichten van een simpele bookmark. De keuze tussen eigen en extern project maakt het feature flexibel zonder het MVP-complex te maken.

**Independent Test**: Maak twee CRUD overzichten aan: één met het eigen project en één met een externe connectie. Open beide en verifieer dat de juiste tabellen verschijnen.

**Acceptance Scenarios**:

1. **Given** ik maak een nieuw CRUD overzicht aan, **When** ik het projectveld open, **Then** zie ik "Eigen project" als eerste optie plus alle externe databaseconnecties die ik eerder heb aangemaakt
2. **Given** ik open een CRUD overzicht gekoppeld aan het eigen project, **Then** zie ik de tabellen van mijn eigen Supabase-database met full CRUD-functionaliteit
3. **Given** ik open een CRUD overzicht gekoppeld aan een externe connectie, **Then** zie ik de tabellen van die externe database met dezelfde CRUD-functionaliteit

---

### Edge Cases

- Wat gebeurt er als een externe databaseconnectie is verwijderd maar een CRUD overzicht ernaar verwijst? De interface moet dit aangeven als "Connectie niet beschikbaar" met een optie om een andere connectie te kiezen of het overzicht te verwijderen.
- Wat gebeurt er als een gebruiker geen externe connecties heeft? De projectkeuze toont dan alleen "Eigen project".
- Wat gebeurt er als een database onbereikbaar is bij het openen van een CRUD overzicht? Een duidelijke foutmelding met retry-optie moet worden getoond.
- Wat gebeurt er bij tabellen zonder primary key? Bewerken en verwijderen zijn niet mogelijk — de interface moet dit duidelijk aangeven (bestaande behavior uit het DB-explorer component).
- Kan een gebruiker meerdere CRUD overzichten aanmaken voor hetzelfde project? Ja, elk met een eigen naam en positie.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: De applicatie MOET een navigatie-item "CRUD" tonen in de sidebar, zichtbaar voor alle gebruikers
- **FR-002**: De CRUD-pagina MOET een grid tonen van CRUD overzichten die eigendom zijn van de ingelogde gebruiker, gesorteerd op positie
- **FR-003**: De CRUD-pagina MOET een knop "Nieuwe CRUD" rechtsboven tonen waarmee een dialoog wordt geopend
- **FR-004**: De dialoog MOET een naamveld en een project-selectie bevatten ("Eigen project" + externe connecties uit kk_db_connections)
- **FR-005**: De applicatie MOET CRUD overzichten opslaan in de database met: id, user_id, name, connection_id (nullable), position, created_at, updated_at
- **FR-006**: Wanneer connection_id null is, MOET het CRUD overzicht verwijzen naar het eigen Supabase-project van de applicatie
- **FR-007**: Wanneer connection_id een waarde heeft, MOET het CRUD overzicht verwijzen naar de externe databaseconnectie
- **FR-008**: De applicatie MOET een detailpagina tonen per CRUD overzicht met de tabellen van het gekoppelde project
- **FR-009**: De detailpagina MOET de bestaande LocalDynamicTable (eigen project) of DynamicTable (extern project) componenten hergebruiken voor CRUD-functionaliteit
- **FR-010**: De gebruiker MOET de naam van een CRUD overzicht kunnen wijzigen
- **FR-011**: De gebruiker MOET een CRUD overzicht kunnen verwijderen met een bevestigingsdialoog
- **FR-012**: De CRUD-pagina MOET een leegstaat-bericht tonen als de gebruiker nog geen CRUD overzichten heeft
- **FR-013**: RLS MOET zorgen dat elke gebruiker alleen zijn eigen CRUD overzichten kan zien en beheren
- **FR-014**: Als een gekoppelde externe connectie niet meer bestaat, MOET de interface dit duidelijk aangeven

### Key Entities

- **CRUDOverview**: Een benoemde CRUD-weergave die aan een databaseproject is gekoppeld. Attributen: naam, positie, gekoppeld project (eigen of extern), eigenaar
- **DatabaseConnection**: Bestaande entiteit uit kk_db_connections. Wordt gerefereerd door CRUD overzichten voor externe databases

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Een gebruiker kan binnen 15 seconden na inloggen een nieuw CRUD overzicht aanmaken via het CRUD tabblad
- **SC-002**: Alle CRUD overzichten van de gebruiker zijn zichtbaar binnen 3 seconden na het openen van de CRUD-pagina
- **SC-003**: Een CRUD overzicht detailpagina toont de tabellen van het gekoppelde project binnen 5 seconden
- **SC-004**: Het aanmaken, hernoemen en verwijderen van CRUD overzichten werkt foutloos voor alle gebruikers
- **SC-005**: De detailpagina hergebruikt bestaande CRUD-componenten zonder duplicatie van functionaliteit

## Assumptions

- Alle gebruikers krijgen toegang tot het CRUD tabblad (niet alleen admins)
- De keuze "Eigen project" is altijd beschikbaar en verwijst naar de Supabase-database waar de applicatie op draait
- Externe connecties zijn beperkt tot de connecties die de gebruiker zelf heeft aangemaakt in kk_db_connections
- De bestaande DB-explorer componenten (LocalDynamicTable, DynamicTable, LocalTableList, TableList) worden hergebruikt in de detailweergave
- De huidige "Database" navigatie-item blijft apart bestaan voor admins; het nieuwe CRUD tabblad is een aanvulling
- Tabellen in systeemschema's worden uitgesloten van de weergave (bestaande behavior)
- RLS op kk_crud_overviews beperkt toegang tot de eigenaar (user_id = auth.uid())