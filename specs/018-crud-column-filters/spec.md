# Feature Specification: CRUD Kolom Filters Stateful

**Feature Branch**: `018-crud-column-filters`

**Created**: 2026-09-22

**Status**: Draft

**Input**: User description: "Ik wil dat kollommen in het CRUd tabblad filterbaar zijn en dat deze filters statefull zijn"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Kolom filteren in een CRUD-tabelweergave (Priority: P1)

Als gebruiker wil ik in een CRUD-tabelweergave per kolom een filter kunnen instellen, zodat ik alleen de rijen zie die aan mijn criteria voldoen. Wanneer ik op een kolomkop klik (of een filter-icoon in de kolomkop activeer), krijg ik een filterbesturing waarmee ik een waarde of voorwaarde kan invoeren. De tabel toont direct alleen de rijen die matchen. Meerdere kolomfilters combineren zich met een EN-voorwaarde.

**Why this priority**: Dit is de kernfunctionaliteit — zonder per-kolom filtering heeft de gebruiker geen mogelijkheid om grote datasets te verkleinen tot de relevante rijen. Dit is wat de gebruiker vraagt.

**Independent Test**: Open een CRUD-overzicht met een tabel die meerdere rijen bevat, activeer een filter op een kolom, verifieer dat alleen matchende rijen zichtbaar zijn, en verwijder het filter om alle rijen terug te zien.

**Acceptance Scenarios**:

1. **Given** de gebruiker bekijkt een CRUD-tabelweergave met meerdere rijen, **When** de gebruiker een filter activeert op een tekstkolom en een zoekterm invoert, **Then** toont de tabel direct alleen rijen waarvan die kolom de zoekterm bevat (case-insensitive)
2. **Given** de gebruiker heeft een filter actief op kolom A, **When** de gebruiker ook een filter instelt op kolom B, **Then** toont de tabel alleen rijen die aan beide filters voldoen (EN-voorwaarde)
3. **Given** de gebruiker heeft een of meer filters actief, **When** de gebruiker een filter wist, **Then** past de tabelweergave zich direct aan en worden rijen die aan het overgebleven filter voldoen weer zichtbaar
4. **Given** de gebruiker heeft filters ingesteld, **When** de gebruiker alle filters in één actie wist (bijv. "Wis alle filters"-knop), **Then** toont de tabel direct alle rijen weer

---

### User Story 2 - Filters blijven behouden tussen sessies (Priority: P2)

Als gebruiker wil ik dat de filters die ik instel op een CRUD-overzicht bewaard blijven, zodat ik bij mijn volgende bezoek aan hetzelfde overzicht niet opnieuw alle filters hoeft in te voeren. De filtertoestand wordt per gebruiker per CRUD-overzicht opgeslagen, net zoals de kolomvolgorde-voorkeur (spec 015). Verschillende gebruikers hebben hun eigen filtertoestand voor hetzelfde overzicht.

**Why this priority**: Statefuliteit is expliciet gevraagd ("deze filters statefull zijn") en onderscheidt dit feature van een vergankelijke zoekbalk. Zonder persistentie vervalt de helft van de gebruikersvraag.

**Independent Test**: Stel een filter in op een CRUD-overzicht, herlaad de pagina, en verifieer dat het filter nog steeds actief is. Open een ander CRUD-overzicht en verifieer dat daar geen filter actief is (per-overzicht opslag).

**Acceptance Scenarios**:

1. **Given** de gebruiker heeft een filter ingesteld op een CRUD-overzicht, **When** de gebruiker de pagina herlaadt of het overzicht verlaat en later terugkeert, **Then** is het filter nog steeds actief en toont de tabel dezelfde gefilterde rijen
2. **Given** de gebruiker heeft filters actief in CRUD-overzicht A, **When** de gebruiker CRUD-overzicht B opent, **Then** heeft overzicht B zijn eigen (onafhankelijke) filtertoestand die niet beïnvloed is door overzicht A
3. **Given** twee gebruikers werken in hetzelfde CRUD-overzicht, **When** gebruiker 1 een filter instelt, **Then** is de filtertoestand van gebruiker 2 ongewijzigd (per-gebruiker opslag)
4. **Given** de gebruiker heeft filters actief en wist deze, **When** de gebruiker het overzicht verlaat en terugkeert, **Then** zijn geen filters meer actief (gewiste filters blijven gewist)

---

### User Story 3 - Filterbesturing per kolomtype (Priority: P3)

Als gebruiker wil ik dat de filterbesturing zich aanpast aan het type kolom: tekstkolommen krijgen een tekstzoekveld (bevat/startswith/endswith/exact), getalkolommen krijgen een vergelijkingsfilter (groter dan, kleiner dan, gelijk aan, tussen), datumkolommen krijgen een datum- of bereikfilter, en booleaankolommen krijgen een ja/nee keuze. Dit maakt filtering intuïtief ongeacht het datatype.

**Why this priority**: Verbetert de bruikbaarheid aanzienlijk, maar de kernfunctie (filteren + stateful) werkt ook met een universeel tekstfilter. Per-type besturing is een verfijning die in een latere iteratie kan worden toegevoegd als de scope te groot wordt.

**Independent Test**: Open een CRUD-overzicht met kolommen van verschillende typen (tekst, getal, datum, boolean), activeer filters op elk type, en verifieer dat de besturing en het filtergedrag overeenkomen met het kolomtype.

**Acceptance Scenarios**:

1. **Given** de gebruiker activeert een filter op een tekstkolom, **When** de gebruiker een zoekterm invoert, **Then** krijgt hij minimaal een "bevat"-filter en worden rijen getoond waarvan de kolomwaarde de zoekterm bevat (case-insensitive)
2. **Given** de gebruiker activeert een filter op een getalkolom, **When** de gebruiker een vergelijkingsoperator en waarde kiest, **Then** worden rijen getoond die aan de vergelijking voldoen
3. **Given** de gebruiker activeert een filter op een datumkolom, **When** de gebruiker een datum of datumbereik kiest, **Then** worden rijen getoond die binnen dat bereik vallen
4. **Given** de gebruiker activeert een filter op een booleaankolom, **When** de gebruiker ja of nee kiest, **Then** worden rijen getoond die overeenkomen met die keuze

---

### Edge Cases

- Wat gebeurt er als een filter wordt ingesteld op een kolom die daarna verborgen wordt via het kolom-instellingenmenu? Het filter blijft actief (en beïnvloedt de zichtbare rijen) maar de filterbesturing is niet zichtbaar; er moet een indicatie zijn dat er actieve filters zijn op verborgen kolommen.
- Wat gebeurt er als de database-tabelstructuur verandert (kolom verwijderd) nadat een gebruiker een filter op die kolom had opgeslagen? Het filter op de verwijderde kolom wordt genegeerd/verwijderd zonder de overige filters te verstoren.
- Wat als filtering resulteert in nul rijen? De tabel toont een leegstaat-bericht dat aangeeft dat geen rijen aan de filters voldoen, met een snelle actie om filters te wissen.
- Wat gebeurt er bij zeer grote tabellen (>10.000 rijen)? Filtering moet zonder merkbare vertraging werken; indien filtering client-side plaatsvindt is de verantwoordelijkheid op de implementatie om dit performant te houden, indien server-side moet de query de filters meenemen.
- Wat als een gebruiker dezelfde kolom op meerdere voorwaarden wil filteren (OF-voorwaarde binnen één kolom)? Buiten scope voor v1 — één voorwaarde per kolom, EN tussen kolommen.
- Werkt filtering op de actie-kolom (bewerk/verwijder-knoppen)? Nee, actie-kolommen zijn niet filterbaar.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Het systeem MOET per kolom in een CRUD-tabelweergave een filterbesturing bieden waarmee de gebruiker rijen kan beperken op basis van de waarden in die kolom
- **FR-002**: Het systeem MOET meerdere actieve kolomfilters combineren met een EN-voorwaarde (een rij moet aan alle filters voldoen om zichtbaar te zijn)
- **FR-003**: Het systeem MOET de tabel direct herfilteren zodra de gebruiker een filter wijzigt, toevoegt of wist
- **FR-004**: Het systeem MOET per kolom minimaal één filtermodus ondersteunen die past bij het kolomtype: tekst (bevat, case-insensitive), getal (vergelijking), datum (bereik of enkel), boolean (ja/nee)
- **FR-005**: Het systeem MOET de actieve filtertoestand per gebruiker per CRUD-overzicht opslaan, onafhankelijk van andere gebruikers en andere overzichten
- **FR-006**: Het systeem MOET de opgeslagen filtertoestand toepassen wanneer de gebruiker het CRUD-overzicht opent (persistentie over sessies)
- **FR-007**: Het systeem MOET een actie bieden om alle actieve filters in één keer te wissen ("Wis alle filters")
- **FR-008**: Het systeem MOET een per-kolom actie bieden om het filter op die enkele kolom te wissen
- **FR-009**: Het systeem MOET de filtertoestand bewaren in dezelfde of een vergelijkbare per-gebruiker-voorkeur-structuur als de kolomvolgorde-voorkeur (spec 015), met RLS ingeschakeld
- **FR-010**: Het systeem MOET een zichtbare indicatie tonen dat een kolom een actief filter heeft (bijv. icoon of markering op de kolomkop)
- **FR-011**: Het systeem MOET een leegstaat-bericht tonen wanneer filtering resulteert in nul zichtbare rijen, met een snelle actie om filters te wissen
- **FR-012**: Het systeem MOET filters op kolommen die niet meer in de database-tabel voorkomen (verwijderde kolommen) automatisch negeren en verwijderen uit de opgeslagen filtertoestand
- **FR-013**: Het systeem MOET actieve filters op verborgen kolommen blijven toepassen (de filter beïnvloedt zichtbare rijen) en een indicatie tonen dat er actieve filters op verborgen kolommen zijn
- **FR-014**: Het systeem MOET de actie-kolom (bewerk/verwijder-knoppen) uitsluiten van filtering
- **FR-015**: Het systeem MOET filtering binnen 1 seconde toepassen op tabellen tot 1.000 rijen zonder merkbare vertraging voor de gebruiker

### Key Entities

- **CRUDOverview**: Bestaande entiteit — de container voor één CRUD-overzicht met eigenschappen zoals id, project, tabel, naam.
- **UserFilterPreference** (nieuw): Per gebruiker per CRUD-overzicht opgeslagen filtertoestand. Kenmerken: gebruiker-id, CRUD-overzicht-id, actieve filters (een lijst van kolomidentificaties met bijbehorende filtervoorwaarden). Eén record per gebruiker per CRUD-overzicht. Gerelateerd aan UserColumnPreference (spec 015) — kan in dezelfde voorkeursentiteit worden ondergebracht of als aparte entiteit naast de kolomvolgorde-voorkeur.
- **TableColumn**: Bestaande entiteit gebruikt voor tabel-introspectie — bepaalt het filtertype per kolom op basis van het data_type.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Gebruikers kunnen binnen 3 seconden na het openen van een CRUD-overzicht een filter instellen op een kolom en het gefilterde resultaat zien
- **SC-002**: 100% van de gebruikers ziet de actieve filters behouden bij volgend bezoek aan hetzelfde CRUD-overzicht
- **SC-003**: Gebruikers kunnen alle actieve filters in maximaal 2 klikken wissen (menu openen, "Wis alle filters" kiezen)
- **SC-004**: Twee verschillende gebruikers kunnen onafhankelijk van elkaar hun eigen filtertoestand instellen in hetzelfde CRUD-overzicht zonder elkaar te beïnvloeden
- **SC-005**: Filtering op een tabel met 1.000 rijen past zich binnen 1 seconde aan zonder merkbare vertraging
- **SC-006**: Wanneer filtering nul rijen oplevert, toont het systeem binnen 1 seconde een leegstaat-bericht met wis-actie
- **SC-007**: Gebruikers herkennen direct welke kolommen een actief filter hebben (binnen 2 seconden bij het overzicht van de tabel)

## Assumptions

- Het filter-icoon of de filterbesturing wordt geïntegreerd in of vlak bij de bestaande kolomkoppen, passend bij de huidige CRUD-interface-stijl
- De filtertoestand wordt per gebruiker per CRUD-overzicht opgeslagen in de eigen Supabase-database, met RLS ingeschakeld zodat gebruikers alleen hun eigen filtervoorkeuren kunnen lezen/schrijven — vergelijkbaar met de kolomvolgorde-voorkeur uit spec 015
- Eén filtertoestand geldt voor de hele CRUD-overzicht, niet per individueel tabel binnen het overzicht (indien een overzicht meerdere tabellen bevat) — [NEEDS CLARIFICATION: geldt het filter per CRUD-overzicht of per tabel binnen het overzicht?]
- Bij het allereerste bezoek (geen opgeslagen filtertoestand) zijn geen filters actief
- Filtering vindt plaats op de momenteel geladen dataset; indien de tabel gepagineerd is, wordt filtering toegepast binnen de geladen pagina's tenzij de implementatie server-side filtering kiest
- OF-voorwaarden binnen één kolom (meerdere voorwaarden op dezelfde kolom) zijn buiten scope voor v1
- De actie-kolom met bewerk/verwijder-knoppen is niet filterbaar
- Bestaande kolom-instellingen (zichtbaarheid, volgorde) blijven onafhankelijk van filters werken