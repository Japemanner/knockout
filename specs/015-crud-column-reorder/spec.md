# Feature Specification: CRUD Kolom Volgorde Aanpasbaar

**Feature Branch**: `015-crud-column-reorder`

**Created**: 2026-08-29

**Status**: Draft

**Input**: User description: "Maak bij bij de crud overzichten het mogelijk om de volgorde van de kolommen aan te passen"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Kolomvolgorde aanpassen via drag-and-drop (Priority: P1)

Een gebruiker die een CRUD-overzicht bekijkt (de tabelweergave van een specifieke tabel binnen een CRUD-overzicht) wil de volgorde van de kolommen kunnen aanpassen door kolomkoppen te verslepen (drag-and-drop). Wanneer de gebruiker een kolomkop pakt en naar een andere positie slep, verschuiven de kolommen direct en wordt de nieuwe volgorde opgeslagen zodat deze bij volgend bezoek behouden blijft. De volgorde is per CRUD-overzicht per gebruiker opgeslagen, zodat verschillende gebruikers hun eigen voorkeur kunnen hebben.

**Why this priority**: Dit is de kernfunctionaliteit — zonder drag-and-drop kunnen gebruikers de kolomvolgorde niet visueel aanpassen. Dit is wat de gebruiker vraagt.

**Independent Test**: Kan getest worden door een kolomkop te verslepen naar een andere positie en te verifiëren dat de kolom verplaatst is én dat na herladen van de pagina de nieuwe volgorde behouden blijft.

**Acceptance Scenarios**:

1. **Given** de gebruiker bekijkt een CRUD-tabelweergave, **When** de gebruiker een kolomkop pakt en naar een andere positie sleept, **Then** verschuift de kolom direct naar de nieuwe positie en de tabelinhoud past zich aan
2. **Given** de gebruiker heeft een kolom verplaatst, **When** de gebruiker de pagina herlaadt, **Then** is de nieuwe kolomvolgorde behouden
3. **Given** de gebruiker heeft een kolomvolgorde aangepast in CRUD-overzicht A, **When** de gebruiker een ander CRUD-overzicht B opent, **Then** heeft overzicht B zijn eigen (onafhankelijke) kolomvolgorde
4. **Given** twee verschillende gebruikers werken in hetzelfde CRUD-overzicht, **When** gebruiker 1 de kolomvolgorde aanpast, **Then** is de volgorde van gebruiker 2 ongewijzigd (per-gebruiker opslag)

---

### User Story 2 - Kolomvolgorde resetten naar standaard (Priority: P2)

Een gebruiker die de kolomvolgorde heeft aangepast wil kunnen terugkeren naar de oorspronkelijke standaardvolgorde (zoals afgeleid uit de database-tabelstructuur) via een "Reset volgorde" actie in het bestaande kolom-instellingenmenu.

**Why this priority**: Belangrijk voor usability — gebruikers maken fouten of willen experimenteren, en moeten altijd kunnen terugkeren naar een bekende uitgangspositie. Niet kritiek voor MVP maar essentieel voor volwassen UX.

**Independent Test**: Kan getest worden door de kolomvolgorde aan te passen, vervolgens "Reset volgorde" te kiezen en te verifiëren dat de oorspronkelijke volgorde is hersteld.

**Acceptance Scenarios**:

1. **Given** de gebruiker heeft de kolomvolgorde aangepast, **When** de gebruiker "Reset volgorde" kiest in het kolom-instellingenmenu, **Then** keert de tabel terug naar de oorspronkelijke standaardvolgorde
2. **Given** de gebruiker heeft "Reset volgorde" gekozen, **When** de gebruiker de pagina herlaadt, **Then** is de standaardvolgorde nog steeds actief (de opgeslagen voorkeur is gewist)

---

### Edge Cases

- Wat gebeurt er als een kolom wordt verborgen via het kolom-instellingenmenu en vervolgens de volgorde wordt aangepast? De verborgen kolom behoudt zijn positie in de opgeslagen volgorde maar is niet zichtbaar; bij zichtbaar worden verschijnt hij op de opgeslagen positie.
- Wat als een tabel zeer veel kolommen heeft (>20)? Drag-and-drop moet soepel blijven werken met horizontaal scrollen; de sleepactie moet rekening houden met automatisch meescrollen wanneer de muis de rand van het zichtbare gebied nadert.
- Wat als de database-tabelstructuur verandert (kolom toegevoegd/verwijderd) nadat de gebruiker een volgorde heeft opgeslagen? Nieuwe kolommen verschijnen aan het einde van de opgeslagen volgorde; verwijderde kolommen worden uit de opgeslagen volgorde gefilterd.
- Wat gebeurt er tijdens het slepen als de gebruiker de muis buiten het kolomkopgebied loslaat? De kolom keert terug naar de oorspronkelijke positie (geen halve actie).
- Wat als de gebruiker probeert een kolom voorbij de eerste of laatste zichtbare kolom te slepen? De kolom wordt netjes aan het begin of einde geplaatst.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Het systeem MOET gebruikers in staat stellen de volgorde van zichtbare kolommen in een CRUD-tabelweergave aan te passen door een kolomkop te verslepen (drag-and-drop) naar een andere positie
- **FR-002**: Het systeem MOET de aangepaste kolomvolgorde direct visueel toepassen zodra de gebruiker een kolom loslaat op een nieuwe positie
- **FR-003**: Het systeem MOET de aangepaste kolomvolgorde per CRUD-overzicht per gebruiker opslaan, zodat elke gebruiker een eigen voorkeur heeft per overzicht
- **FR-004**: Het systeem MOET de opgeslagen kolomvolgorde toepassen wanneer de gebruiker het CRUD-overzicht opent (persistentie over sessies)
- **FR-005**: Het systeem MOET een "Reset volgorde" actie bieden in het bestaande kolom-instellingenmenu die de kolomvolgorde terugzet naar de standaardvolgorde afgeleid uit de database-tabelstructuur
- **FR-006**: Het systeem MOET een visuele aanwijzing tonen dat kolomkoppen versleept kunnen worden (bijv. cursor: grab/grabbing of een sleep-handle icoon) zodat de gebruiker ontdekt dat deze functionaliteit bestaat
- **FR-007**: Het systeem MOET nieuwe kolommen (die na een eerdere volgorde-bewaring aan de database-tabel zijn toegevoegd) aan het einde van de opgeslagen volgorde plaatsen
- **FR-008**: Het systeem MOET verwijderde kolommen (die niet meer in de database-tabel voorkomen) uit de opgeslagen volgorde filteren zonder de overige volgorde te verstoren
- **FR-009**: Het systeem MOET tijdens het slepen automatisch horizontaal meescrollen wanneer de kolomkop de rand van het zichtbare tabelgebied nadert, zodat langere tabellen bereikbaar blijven
- **FR-010**: Het systeem MOET de kolomvolgorde onafhankelijk houden van de zichtbaarheid-instelling van kolommen (verbergen/toonen verandert de volgordepositie niet)
- **FR-011**: Het systeem MOET drag-and-drop uitschakelen op kolommen die niet verplaatsbaar horen te zijn (zoals eventuele actie-kolommen met bewerk/verwijder-knoppen vast rechts), tenzij expliciet anders gespecificeerd

### Key Entities

- **CRUDOverview**: Bestaande entiteit — de container voor één CRUD-overzicht met eigenschappen zoals id, project, tabel, naam.
- **UserColumnPreference** (nieuw): Per gebruiker per CRUD-overzicht opgeslagen voorkeur met betrekking tot kolomvolgorde. Kenmerken: gebruiker-id, CRUD-overzicht-id, kolomvolgorde (een geordende lijst van kolomidentificaties). Eén record per gebruiker per CRUD-overzicht.
- **TableColumn**: Bestaande entiteit gebruikt voor tabel-introspectie — eigenschappen: name, data_type, etc. De standaardvolgorde wordt afgeleid uit de natuurlijke volgorde van deze kolommen.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Gebruikers kunnen een kolom verplaatsen in één vloeiende sleepbeweging (minder dan 2 seconden van oppakken tot loslaten)
- **SC-002**: 100% van de gebruikers ziet de aangepaste kolomvolgorde behouden bij volgend bezoek aan hetzelfde CRUD-overzicht
- **SC-003**: Gebruikers kunnen de standaardvolgorde herstellen in maximaal 2 klikken (menu openen, "Reset volgorde" kiezen)
- **SC-004**: Twee verschillende gebruikers kunnen onafhankelijk van elkaar hun eigen kolomvolgorde instellen in hetzelfde CRUD-overzicht zonder elkaar te beïnvloeden
- **SC-005**: De tabelweergave blijft soepel (geen merkbare vertraging) tijdens het slepen van kolommen in tabellen tot 20 kolommen
- **SC-006**: Nieuwe kolommen die na een eerdere aanpassing aan de database-tabel worden toegevoegd verschijnen altijd aan het einde zonder de bestaande volgorde te verstoren

## Assumptions

- Het kolom-instellingenmenu (waarin kolommen zichtbaar/verborgen kunnen worden) bestaat reeds in de huidige CRUD-interface en wordt uitgebreid met de "Reset volgorde" actie
- De standaardkolomvolgorde wordt afgeleid uit de natuurlijke volgorde van kolommen zoals geretourneerd door de bestaande tabel-introspectie-functionaliteit
- De kolomvolgorde-voorkeur wordt per gebruiker per CRUD-overzicht opgeslagen in een nieuwe tabel in de eigen Supabase-database (met RLS ingeschakeld zodat gebruikers alleen hun eigen voorkeuren kunnen lezen/schrijven)
- Drag-and-drop werkt met aanwijzer-apparaat (muis/trackpad); touch-ondersteuning op mobiel is uit scope voor deze iteratie
- Actie-kolommen (bewerk/verwijder-knoppen) vast rechts in de tabel zijn niet verplaatsbaar
- Eén kolomvolgorde-voorkeur geldt voor de hele CRUD-overzicht, niet per individueel tabel binnen het overzicht (indien een overzicht meerdere tabellen bevat)
- Bij het allereerste bezoek (geen opgeslagen voorkeur) geldt de standaardvolgorde uit de database-tabelstructuur