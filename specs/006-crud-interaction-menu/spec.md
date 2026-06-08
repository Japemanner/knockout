# Feature Specification: CRUD Interaction Menu

**Feature Branch**: `006-crud-interaction-menu`

**Created**: 2026-06-08

**Status**: Draft

**Input**: User description: "Voeg aan het menu dat naar voren komt wanneer ik op + nieuwe CRUD klik een knop toe. Wanneer ik op deze knop klik is er een dropdown lijst waaruit de tabel kan kiezen die ik ga bewerken. Voeg nog een knop met 'Interactie' toe. Dan komt er een dropdown menu te voorschijn met de volgende opties: CRUD, Formulier (wordt later gebouwd)"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Tabel selecteren bij aanmaken CRUD-overzicht (Priority: P1)

Een gebruiker klikt op "+ Nieuwe CRUD" en ziet het aanmaakdialoog. Na het kiezen van een Supabase-project verschijnt automatisch een dropdown met alle tabellen uit dat project. De gebruiker selecteert een tabel, de naam vult zich automatisch in (bijv. "Klanten CRUD") en is aanpasbaar. Na het aanmaken komt de gebruiker direct op de CRUD-view van die specifieke tabel terecht, in plaats van het overzicht van alle tabellen.

**Why this priority**: Dit is de kernfunctionaliteit - zonder tabelselectie moet de gebruiker na het aanmaken nog handmatig navigeren naar de juiste tabel. Dit bespaart een stap en vermindert verwarring.

**Independent Test**: Kan getest worden door een CRUD-overzicht aan te maken met een specifieke tabel en te verifiëren dat je direct op de tabel-URL landt.

**Acceptance Scenarios**:

1. **Given** de gebruiker opent het "Nieuwe CRUD overzicht" dialoog, **When** de gebruiker een Supabase-project kiest, **Then** verschijnt een dropdown met alle beschikbare tabellen uit dat project
2. **Given** de gebruiker heeft een tabel geselecteerd, **When** de naam automatisch is ingevuld, **Then** kan de gebruiker de naam aanpassen
3. **Given** de gebruiker heeft project en tabel geselecteerd, **When** de gebruiker klikt op "Aanmaken", **Then** wordt het CRUD-overzicht aangemaakt en navigeert de gebruiker direct naar de tabel-CRUD-view
4. **Given** de gebruiker heeft een project gekozen zonder tabellen, **When** de tabel-dropdown laadt, **Then** toont de dropdown een "Geen tabellen gevonden" indicatie
5. **Given** de gebruiker wisselt van Supabase-project, **When** een ander project wordt geselecteerd, **Then** wordt de eerder geselecteerde tabel gereset en verschijnt de nieuwe tabel-lijst

---

### User Story 2 - Interactietype kiezen (CRUD vs Formulier) (Priority: P2)

In het aanmaakdialoog ziet de gebruiker een "Interactie" selector met twee opties: "CRUD" en "Formulier". De CRUD-optie is standaard geselecteerd en geeft de bestaande CRUD-interface. De optie "Formulier" is visueel aanwezig maar uitgeschakeld met een tooltip "Binnenkort beschikbaar". De gebruiker kan alleen CRUD selecteren en een CRUD-overzicht aanmaken.

**Why this priority**: Belangrijk voor de UX-visie en toekomstige uitbreidbaarheid, maar functioneel levert CRUD-keuze geen nieuw gedrag op (het is reeds het standaardgedrag). Formulier is een placeholder voor een toekomstige feature.

**Independent Test**: Kan getest worden door het dialoog te openen en te verifiëren dat de interactie-selector verschijnt met CRUD actief en Formulier uitgeschakeld.

**Acceptance Scenarios**:

1. **Given** de gebruiker opent het aanmaakdialoog, **When** het dialoog verschijnt, **Then** is de interactie-selector zichtbaar met "CRUD" als standaardoptie
2. **Given** de gebruiker ziet de interactie-selector, **When** de gebruiker de optie "Formulier" probeert te selecteren, **Then** is de optie uitgeschakeld en toont een tooltip "Binnenkort beschikbaar"
3. **Given** de gebruiker heeft "CRUD" geselecteerd, **When** de gebruiker maakt het overzicht aan, **Then** wordt een CRUD-interface aangemaakt (huidig gedrag)

---

### Edge Cases

- Wat gebeurt er als het ophalen van tabellen faalt? Er moet een foutmelding worden getoond met een optie om opnieuw te proberen.
- Wat als de gebruiker van project wisselt nadat een tabel is geselecteerd? De tabel-selectie moet worden gereset omdat de tabellen van het nieuwe project anders zijn.
- Wat als tabelnamen erg lang zijn (>30 tekens)? De dropdown moet truncatie toepassen met ellipsis.
- Wat als er veel tabellen zijn (>50)? De dropdown moet zoek-functionaliteit bieden om snel een tabel te vinden.
- Wat als de gebruiker een tabel kiest maar geen naam invult? De naam wordt automatisch ingevuld op basis van de tabel, dus dit scenario is gedekt.
- Wat als de verbinding met de externe database wegvalt tijdens het laden van tabellen? Er moet een foutmelding worden getoond.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Het systeem MOET een tabel-selectie dropdown tonen in het aanmaakdialoog nadat de gebruiker een Supabase-project heeft gekozen
- **FR-002**: Het systeem MOET de tabel-lijst dynamisch ophalen op basis van de geselecteerde Supabase-verbinding (eigen project of externe connectie)
- **FR-003**: Het systeem MOET de naam van het overzicht automatisch invullen op basis van de geselecteerde tabel (bijv. "[Tabelnaam] CRUD") met behoud van bewerkbaarheid door de gebruiker
- **FR-004**: Het systeem MOET na het aanmaken direct navigeren naar de tabel-specifieke CRUD-view in plaats van het tabel-overzicht
- **FR-005**: Het systeem MOET een "Interactie" selector tonen met de opties "CRUD" en "Formulier"
- **FR-006**: De "CRUD" optie MOET standaard geselecteerd zijn in de interactie-selector
- **FR-007**: De "Formulier" optie MOET uitgeschakeld (disabled) zijn met een tooltip "Binnenkort beschikbaar"
- **FR-008**: Het systeem MOET de tabel-selectie resetten wanneer de gebruiker een ander Supabase-project kiest
- **FR-009**: Het systeem MOET een foutmelding tonen als het ophalen van tabellen faalt, met een optie om opnieuw te proberen
- **FR-010**: Het systeem MOET een laad-indicator tonen tijdens het ophalen van tabellen
- **FR-011**: Het systeem MOET zoek-functionaliteit bieden in de tabel-dropdown wanneer er meer dan 10 tabellen zijn
- **FR-012**: Het systeem MOET het geselecteerde interactietype opslaan in het CRUD-overzicht (interaction_type veld)

### Key Entities

- **CRUDOverview**: Bestaande entiteit - wordt uitgebreid met optioneel veld `table_name` (de geselecteerde tabelnaam) en `interaction_type` (waarde: "crud" of "formulier")
- **TableInfo**: Bestaande entiteit gebruikt voor tabel-introspectie - eigenschappen: name, schema, columns
- **Connection**: Bestaande entiteit voor externe databaseverbindingen - eigenschappen: id, name

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Gebruikers kunnen een specifieke tabel selecteren in maximaal 3 klikken na het openen van het dialoog (project kiezen, tabel kiezen, aanmaken)
- **SC-002**: De tabel-lijst laadt binnen 2 seconden na het kiezen van een project
- **SC-003**: 100% van de gebruikers die een CRUD-overzicht aanmaken met een geselecteerde tabel landt direct op de tabel-CRUD-view
- **SC-004**: De "Formulier" optie is zichtbaar maar kan niet geselecteerd worden - geen gebruiker kan per ongeluk een formulier proberen aanmaken
- **SC-005**: De automatisch gegenereerde naam is altijd bewerkbaar en wordt overschreven als de gebruiker zelf een naam typt

## Assumptions

- De tabel-lijst wordt opgehaald via bestaande introspectie-functionalheid (`getLocalTableList` voor eigen project, `getTableList` voor externe verbindingen)
- De `kk_crud_overviews` tabel krijgt een optioneel `table_name` veld (nullable string) om de geselecteerde tabel op te slaan
- De `kk_crud_overviews` tabel krijgt een `interaction_type` veld met mogelijke waarden "crud" en "formulier", default "crud"
- De routering naar een specifieke tabel binnen een CRUD-overzicht gebruikt de bestaande URL-structuren: `/db/[tableName]` voor lokaal of `/settings/db/[connectionId]/[tableName]` voor extern
- Tabellen met meer dan 10 entries krijgen een zoek/filter-functionaliteit in de dropdown
- De "Formulier" feature wordt in een toekomstige iteratie gebouwd en heeft geen functionele invloed op de huidige CRUD-workflow
- De naam-auto-vulling gebruikt het formaat "[Tabelnaam] CRUD" (bijv. "kk_klanten CRUD")