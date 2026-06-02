# Feature Specification: Multi-Kanban Workspace met Postgres CRUD

**Feature Branch**: `001-multi-kanban-workspace`

**Created**: 2026-06-02

**Status**: Draft

**Input**: User description: "Persoonlijke Workspace – Multi-Kanban met Postgres CRUD"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Authenticatie & Beschermde Toegang (Priority: P1)

Een freelance IT-ondernemer opent de workspace en moet zich eerst authenticeren voordat hij toegang krijgt tot zijn borden, taken en externe data. Zonder login is alleen de login-pagina zichtbaar; alle andere routes sturen een niet-ingelogde gebruiker terug naar login. De gebruiker kan inloggen met e-mailadres en wachtwoord, of via een magic link die naar zijn inbox wordt gestuurd.

**Why this priority**: Zonder authenticatie is er geen onderscheid tussen gebruikers, geen beveiliging van persoonlijke data, en is de hele applicatie onbruikbaar. Dit is de poort tot alles.

**Independent Test**: Kan volledig getest worden door een gebruiker aan te maken, in te loggen, en te verifiëren dat onbeschermde routes doorverwijzen naar login.

**Acceptance Scenarios**:

1. **Given** een niet-ingelogde gebruiker bezoekt `/`, **When** de pagina laadt, **Then** wordt hij doorgestuurd naar `/login`.
2. **Given** een gebruiker op `/login` vult geldige e-mail + wachtwoord in, **When** hij verzendt het formulier, **Then** wordt hij doorgestuurd naar het bordenoverzicht en is zijn sessie actief.
3. **Given** een gebruiker op `/login` kiest voor magic link, **When** hij zijn e-mail invult en verzendt, **Then** ontvangt hij een e-mail met een link die hem na klikken inlogt.
4. **Given** een ingelogde gebruiker klikt op "Uitloggen", **When** de uitlog-actie voltooit, **Then** wordt hij teruggestuurd naar `/login` en zijn beschermde routes niet meer toegankelijk.
5. **Given** een gebruiker met verlopen sessie bezoekt een beschermde pagina, **When** de pagina laadt, **Then** wordt hij doorgestuurd naar `/login`.

---

### User Story 2 - Multi-Kanban Bordenbeheer (Priority: P1)

De gebruiker landt na login op een bordenoverzicht. Hier ziet hij al zijn bestaande borden (bijv. "Klantprojecten", "Blog-ideeën", "Persoonlijke taken") en kan hij nieuwe borden aanmaken. Elk bord krijgt een naam. Bij een nieuw bord worden automatisch vier standaardkolommen aangemaakt: Backlog, Doing, Review, Done. De gebruiker kan later kolommen hernoemen, toevoegen of verwijderen per bord.

**Why this priority**: Het bordenoverzicht is de startpagina en de Kanban-borden zijn de kern van de workspace. Zonder borden valt de kernfunctionaliteit weg.

**Independent Test**: Na login kan een gebruiker borden aanmaken, bekijken, en per bord kolommen configureren. Geen drag-and-drop of kaarten nodig voor deze test.

**Acceptance Scenarios**:

1. **Given** een ingelogde gebruiker, **When** hij de startpagina bezoekt, **Then** ziet hij een overzicht van al zijn borden en een "Nieuw bord"-knop.
2. **Given** de gebruiker maakt een nieuw bord aan met naam "Blog-ideeën", **When** hij bevestigt, **Then** verschijnt het bord in het overzicht met vier standaardkolommen.
3. **Given** een bestaand bord, **When** de gebruiker de kolom "Backlog" hernoemt naar "Inbox", **Then** toont het bord de nieuwe naam en blijven bestaande kaarten in die kolom intact.
4. **Given** een bord met meer dan 3 kolommen, **When** de gebruiker een kolom verwijdert, **Then** worden alle kaarten in die kolom naar de eerstvolgende kolom verplaatst (of de gebruiker krijgt een waarschuwing als de kolom kaarten bevat).
5. **Given** de gebruiker verwijdert een volledig bord, **When** hij bevestigt de actie, **Then** verdwijnen het bord, al zijn kolommen en al zijn kaarten permanent.

---

### User Story 3 - Kanban Kaarten & Drag-and-Drop (Priority: P1)

Binnen een bord ziet de gebruiker kaarten onder hun respectievelijke kolommen. Hij kan nieuwe kaarten aanmaken (alleen een titel is verplicht), kaarten slepen tussen kolommen (bijv. van Doing naar Review) en — via een bordwisselaar tijdens het slepen — kaarten verplaatsen naar andere borden. De volgorde van kaarten binnen een kolom blijft behouden en is aanpasbaar via slepen.

**Why this priority**: Drag-and-drop en kaartbeheer zijn de essentie van een Kanban-tool. Zonder dit is het een statische lijst zonder interactie.

**Independent Test**: Maak kaarten aan op een bord, sleep ze tussen kolommen, verifieer dat de volgorde en kolom correct worden opgeslagen na page refresh.

**Acceptance Scenarios**:

1. **Given** een bord met kolommen, **When** de gebruiker een kaart "Schrijf blogpost over AI-tools" aanmaakt in Backlog, **Then** verschijnt de kaart direct onderaan de Backlog-kolom.
2. **Given** een kaart in Backlog, **When** de gebruiker sleept deze naar Doing, **Then** blijft de kaart in Doing staan na loslaten en is de positie opgeslagen (blijft behouden na refresh).
3. **Given** een kaart in kolom Doing van bord A, **When** de gebruiker sleept deze naar een dropdown/bordwisselaar en kiest bord B, **Then** verschijnt de kaart in de eerste kolom van bord B.
4. **Given** de gebruiker herordent kaarten binnen één kolom door te slepen, **When** hij sleept kaart X tussen kaart A en B, **Then** blijft die volgorde behouden na refresh.
5. **Given** de gebruiker tikt de sneltoets `N`, **When** hij in een bord-view is, **Then** opent direct het "nieuwe kaart"-formulier in de huidige kolom.

---

### User Story 4 - Sterretje-mechanisme & Focus View (Priority: P2)

Elke kaart heeft een ster-icoon. Een klik op de ster markeert de kaart als "gesterd". Op de pagina `/starred` ziet de gebruiker álle gesterde kaarten uit álle borden, gegroepeerd per bord. Dit fungeert als een dagelijkse focus-lijst: "waar moet ik vandaag aan werken?". Vanuit deze view kan de gebruiker doorklikken naar de kaart op het originele bord. De ster kan ook vanuit de `/starred` view uitgezet worden.

**Why this priority**: Dit is de brug tussen "alles verspreid over borden" en "wat is nú belangrijk". Zonder sterretjes is er geen centrale prioritering. Dit kan onafhankelijk van externe DB-koppeling getest en gebruikt worden.

**Independent Test**: Ster kaarten aan op verschillende borden, bezoek `/starred`, verifieer groepering per bord en klik-navigatie naar origineel bord.

**Acceptance Scenarios**:

1. **Given** een kaart zonder ster, **When** de gebruiker klikt op de ster, **Then** is de ster visueel geactiveerd en verschijnt de kaart op `/starred`.
2. **Given** een gesterde kaart, **When** de gebruiker klikt nogmaals op de ster, **Then** is de ster uitgezet en verdwijnt de kaart van `/starred`.
3. **Given** de gebruiker bezoekt `/starred`, **When** de pagina laadt, **Then** ziet hij gesterde kaarten gegroepeerd onder hun bordnaam (bijv. "Klantprojecten" → kaart A, B; "Blog-ideeën" → kaart C).
4. **Given** de gebruiker ziet kaart X op `/starred`, **When** hij klikt op de kaart of de bordnaam-link, **Then** navigeert hij naar het originele bord met kaart X in focus.
5. **Given** de gebruiker zet op `/starred` de ster van kaart X uit, **When** de pagina vervolgt, **Then** verdwijnt kaart X uit de lijst zonder dat de rest van de pagina herlaadt.

---

### User Story 5 - Kaartdetail & Snelle Toegang (Priority: P2)

Standaard toont elke kaart alleen zijn titel — compact en scanbaar. Wanneer de gebruiker op een kaart klikt, opent een modal of zijbalk met daarin: de titel (bewerkbaar), een omschrijving in markdown-formaat, een URL-veld, en acties zoals ster-toggle, archiveren en verwijderen. Kaarten met een ingevulde omschrijving of URL tonen een visuele indicator (bijv. paperclip-icoon) op de kaart in het bordoverzicht.

**Why this priority**: Detailweergave maakt kaarten bruikbaar voor meer dan alleen titels. De visuele indicator voorkomt dat gebruikers vergeten dat er extra context bestaat bij een kaart. Kan onafhankelijk van sterretjes en externe DB getest worden.

**Independent Test**: Maak een kaart met alleen titel, voeg omschrijving + URL toe via klik, verifieer dat paperclip-icoon verschijnt en detail-modal de data toont.

**Acceptance Scenarios**:

1. **Given** een kaart met alleen een titel in een kolom, **When** de gebruiker bekijkt het bord, **Then** ziet hij alleen de titel en géén visuele indicator.
2. **Given** een kaart met ingevulde omschrijving en/of URL, **When** de gebruiker bekijkt het bord, **Then** toont de kaart een paperclip-icoon (of equivalent) naast de titel.
3. **Given** de gebruiker klikt op een kaart, **When** de modal opent, **Then** ziet hij titelveld, markdown-omschrijving (gerenderd), URL-veld, ster-toggle, archiveer-knop en verwijder-knop.
4. **Given** de gebruiker bewerkt de omschrijving in de modal met markdown-opmaak, **When** hij opslaat, **Then** wordt de markdown gerenderd weergegeven en is de wijziging persistent.
5. **Given** de gebruiker archiveert een kaart, **When** hij bevestigt, **Then** verdwijnt de kaart uit het actieve bord maar is hij terug te vinden via een archief-filter.

---

### User Story 6 - Externe Postgres-koppeling & Dynamische CRUD-Formulieren (Priority: P2)

De gebruiker wil data uit externe PostgreSQL-databases kunnen bekijken en bewerken vanuit dezelfde workspace. In de instellingen kan hij meerdere database-connecties toevoegen (naam + connection string). De connection strings worden versleuteld opgeslagen. Per connectie ontdekt het systeem automatisch alle tabellen en hun kolommen. Voor elke tabel wordt een dynamisch formulier gegenereerd op basis van kolomtypes — tekst, getallen, datums, booleans, dropdowns voor foreign keys — inclusief validatie (verplichte velden). De gebruiker kan records bekijken (paginated), aanmaken, bewerken en verwijderen.

**Why this priority**: Dit onderscheidt de workspace van een standaard Kanban-tool — het integreert externe databronnen direct in de workflow. Maar het is afhankelijk van de basisinfrastructuur (auth, instellingenpagina). Kan onafhankelijk getest worden met een test-database.

**Independent Test**: Voeg een test-Postgres-connectie toe, verifieer dat tabellen zichtbaar worden, open een tabel, maak een record aan via het gegenereerde formulier, verifieer dat het record in de database verschijnt.

**Acceptance Scenarios**:

1. **Given** de gebruiker opent instellingen → "Database Connections", **When** hij voegt een connectie toe met naam "Test DB" en een geldige connection string, **Then** verschijnt de connectie in de lijst en is de connection string niet leesbaar in de UI.
2. **Given** een opgeslagen connectie, **When** de gebruiker opent deze, **Then** ziet hij een lijst van alle tabellen in die database met hun kolom-aantallen.
3. **Given** een tabel "contacts" met kolommen: `name (text, NOT NULL)`, `email (varchar)`, `age (int)`, `created_at (timestamp)`, **When** de gebruiker opent het formulier, **Then** ziet hij een textveld voor name (required), textveld voor email, number-veld voor age, datepicker voor created_at.
4. **Given** twee tabellen "orders" en "customers", waarbij orders een foreign key `customer_id` heeft naar customers, **When** de gebruiker een nieuw order-record aanmaakt, **Then** toont het formulier een dropdown met bestaande customer-records voor het `customer_id`-veld.
5. **Given** de gebruiker bekijkt de tabel "contacts" met 500+ records, **When** hij scrolt of navigeert, **Then** worden records gepagineerd weergegeven (bijv. 25 per pagina).
6. **Given** de gebruiker wil een record verwijderen, **When** hij klikt op "Delete" en bevestigt, **Then** wordt het record uit de externe database verwijderd en verdwijnt uit de weergave.

---

### User Story 7 - Time Tracking per Kaart (Priority: P3)

Op elke kaart zit een start/stop timer. De gebruiker start de timer wanneer hij aan een taak begint en stopt hem wanneer hij klaar is of pauzeert. Alle gelogde tijdsessies (starttijd, eindtijd, duur) worden onder de kaart getoond, met een totaaltijd. Optioneel kan de gebruiker in settings een uurtarief instellen om direct de totaalkosten per kaart te zien.

**Why this priority**: Waardevol voor facturatie en zelfinzicht, maar de kern-Kanban-functionaliteit en externe DB-integratie gaan voor. Kan volledig onafhankelijk getest worden.

**Independent Test**: Open een kaart, start de timer, wacht enkele seconden, stop de timer, verifieer dat de sessie met duur wordt gelogd en opgeteld bij het totaal.

**Acceptance Scenarios**:

1. **Given** een kaart zonder time logs, **When** de gebruiker opent de kaartdetail-view, **Then** ziet hij "Totaal: 0u 0m" en een "Start"-knop.
2. **Given** de timer loopt op kaart X, **When** de timer al 5 minuten actief is, **Then** toont de UI een live-updatende teller (bijv. "00:05:12").
3. **Given** de gebruiker stopt de timer op kaart X, **When** de stop-actie voltooit, **Then** wordt een nieuwe tijdsessie met start- en eindtijd opgeslagen en het totaal bijgewerkt.
4. **Given** de gebruiker heeft een uurtarief ingesteld in settings, **When** hij bekijkt het totaal van kaart X (1.5 uur), **Then** ziet hij naast de duur ook het berekende bedrag (bijv. "1u 30m — €135,00").
5. **Given** de timer loopt op kaart X en de gebruiker herlaadt de pagina, **When** de pagina herlaadt, **Then** blijft de timer doorlopen of wordt de toestand hersteld.

---

### User Story 8 - Quick Capture (Priority: P3)

Met een globale sneltoets (`Ctrl+Shift+N` of via een knop in de navigatie) opent een minimalistisch invoerveld. De gebruiker tikt een titel in, drukt Enter, en de kaart wordt direct aangemaakt op een vooraf ingesteld "Inbox"-bord — of, als hij in een specifiek bord werkt, in de eerste kolom van dat bord. De popup sluit automatisch, zodat de gebruiker direct door kan werken.

**Why this priority**: Vermindert frictie bij idee-vastlegging, maar is een "nice to have" bovenop de kern-Kanban. Kan volledig onafhankelijk getest worden.

**Independent Test**: Open de quick-capture popup via sneltoets, typ een titel, druk Enter, verifieer dat de kaart verschijnt op het ingestelde bord.

**Acceptance Scenarios**:

1. **Given** de gebruiker drukt `Ctrl+Shift+N`, **When** hij op een willekeurige pagina is, **Then** opent een minimale popup met een tekstveld en placeholder "Wat wil je vastleggen?".
2. **Given** de quick-capture popup is open, **When** de gebruiker tikt een titel en drukt Enter, **Then** wordt een kaart aangemaakt op het "Inbox"-bord (of huidig bord als hij al in een bord-view is) en de popup sluit.
3. **Given** de quick-capture popup is open, **When** de gebruiker drukt Escape of klikt buiten de popup, **Then** sluit de popup zonder een kaart aan te maken.

---

### User Story 9 - Focus-modus (Priority: P3)

De pagina `/focus` biedt een afleidingsvrij dashboard: gesterde items met deadlines, kaarten die vandaag voltooid moeten worden, en een vrij tekstblok voor "Wat ga je vandaag doen?". Geen zijbalk, geen navigatie-elementen — alleen de essentie voor de werkdag.

**Why this priority**: Verhoogt dagelijkse productiviteit maar is volledig optioneel. Alle data komt uit bestaande features (sterretjes, kaarten met data). Kan onafhankelijk getest worden.

**Independent Test**: Bezoek `/focus` met gesterde kaarten van verschillende borden, verifieer dat alleen gesterde items met deadlines worden getoond, en dat het dagplanningsblok tekst accepteert.

**Acceptance Scenarios**:

1. **Given** de gebruiker bezoekt `/focus`, **When** de pagina laadt, **Then** ziet hij een schone, afleidingsvrije pagina met drie secties: "Vandaag gefocust" (gesterde items), "Deadlines vandaag" (kaarten met deadline vandaag), "Wat ga je doen?" (vrij tekstblok).
2. **Given** de gebruiker tikt tekst in het "Wat ga je doen?"-blok, **When** hij de pagina verlaat en terugkeert, **Then** is zijn tekst behouden.
3. **Given** er zijn geen gesterde items en geen kaarten met deadline vandaag, **When** de gebruiker opent `/focus`, **Then** ziet hij lege secties met een geruststellende boodschap (bijv. "Je hebt geen prioriteiten ingesteld. Ster een kaart om 'm hier te zien.").

---

### User Story 10 - RSS-feed Widget (Priority: P4)

In de zijbalk van de workspace kan de gebruiker RSS/Atom-feed-URL's toevoegen. De widget toont de recentste items per feed. Een feed-item kan met één klik als kaart naar een vooraf ingesteld "Inspiratie"-bord gekopieerd worden, zodat de gebruiker interessante artikelen kan opslaan en later verwerken zonder contextwisseling.

**Why this priority**: Leuke toevoeging voor een blogger, maar het minst essentieel voor de kern-workspace. Kan volledig onafhankelijk getest worden.

**Independent Test**: Voeg een RSS-feed toe, verifieer dat items worden getoond, klik "Naar bord" op een item, verifieer dat een kaart verschijnt op het ingestelde bord.

**Acceptance Scenarios**:

1. **Given** de gebruiker is in een bord-view, **When** hij kijkt naar de zijbalk, **Then** ziet hij een RSS-widget met een "+"-knop om feeds toe te voegen.
2. **Given** de gebruiker voegt een RSS-feed URL toe, **When** het systeem de feed ophaalt, **Then** verschijnen de 10 meest recente items met titel, bron en publicatiedatum.
3. **Given** een RSS-item "AI verandert freelancen: 5 trends", **When** de gebruiker klikt op "Naar bord", **Then** wordt een kaart met die titel en de artikel-URL aangemaakt op het "Inspiratie"-bord.
4. **Given** de feed-server is offline, **When** de widget probeert te laden, **Then** toont het een foutmelding maar blijft de rest van de UI functioneel.

---

### Edge Cases

- Wat gebeurt er als een externe Postgres-connection string ongeldig is? → De gebruiker krijgt een duidelijke foutmelding bij het testen/gebruiken van de connectie, niet bij het opslaan (validatie uitgesteld).
- Wat gebeurt er als een externe database een tabel heeft met 100+ kolommen? → Het gegenereerde formulier toont alleen de eerste N kolommen met een "meer tonen"-optie; de tabel is scrollable.
- Wat gebeurt er als een externe database-tabel een JSONB- of array-kolom heeft? → Deze worden getoond als JSON-tekstveld (read/edit als platte tekst), niet als geneste formulieren.
- Wat gebeurt er bij een race condition: twee browser-tabs openen hetzelfde bord en slepen kaarten tegelijk? → Laatste schrijf-actie wint; er is geen real-time conflict detectie in de MVP.
- Wat gebeurt er als de timer loopt op kaart X en de gebruiker start een timer op kaart Y? → Timer X wordt automatisch gestopt (er kan er maar één tegelijk lopen) met een notificatie.
- Wat gebeurt er als een kaart gearchiveerd is maar nog een ster heeft? → Gearchiveerde kaarten verschijnen niet op `/starred`.
- Wat gebeurt er bij magic-link login en de gebruiker opent de link op een ander apparaat? → De sessie wordt gestart op het apparaat dat de link opent; het oorspronkelijke apparaat blijft op de login-pagina.
- Wat gebeurt er als de RSS-feed XML malformed is? → De feed wordt overgeslagen met een waarschuwing in de widget.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Systeem MOET gebruikers authenticeren via e-mail/wachtwoord en magic link.
- **FR-002**: Systeem MOET alle routes behalve `/login` en `/auth/callback` beschermen tegen niet-ingelogde toegang.
- **FR-003**: Systeem MOET elke gebruiker toestaan meerdere Kanban-borden aan te maken en te verwijderen.
- **FR-004**: Systeem MOET elk bord voorzien van configureerbare kolommen (minimaal naam wijzigen, toevoegen, verwijderen).
- **FR-005**: Systeem MOET kaarten ondersteunen met minimaal: titel, omschrijving (markdown), URL-veld.
- **FR-006**: Systeem MOET drag-and-drop van kaarten tussen kolommen binnen hetzelfde bord ondersteunen.
- **FR-007**: Systeem MOET drag-and-drop van kaarten tussen verschillende borden ondersteunen.
- **FR-008**: Systeem MOET de volgorde van kaarten binnen een kolom behouden via drag-and-drop herordening.
- **FR-009**: Systeem MOET een ster-markering per kaart ondersteunen met een geaggregeerde weergave op `/starred`, gegroepeerd per bord.
- **FR-010**: Systeem MOET een visuele indicator tonen op kaarten die een omschrijving of URL bevatten.
- **FR-011**: Systeem MOET kaartarchivering ondersteunen, waarbij gearchiveerde kaarten niet in actieve weergaven verschijnen.
- **FR-012**: Systeem MOET externe PostgreSQL-database-connecties kunnen opslaan met versleutelde connection strings.
- **FR-013**: Systeem MOET automatisch tabellen en kolommen uit externe databases kunnen ontdekken via metadata-introspectie.
- **FR-014**: Systeem MOET dynamische formulieren genereren op basis van kolomtypes, met correcte validatie (required, datatype, foreign key constraints).
- **FR-015**: Systeem MOET volledige CRUD-operaties op externe database-tabellen ondersteunen (aanmaken, lezen, bewerken, verwijderen van records).
- **FR-016**: Systeem MOET time tracking per kaart ondersteunen met start/stop timer en logging van tijdsessies met duur.
- **FR-017**: Systeem MOET een quick-capture functionaliteit bieden via globale sneltoets die direct kaarten aanmaakt op een ingesteld bord.
- **FR-018**: Systeem MOET een focus-modus (`/focus`) bieden met gesterde items, kaarten met vandaag-deadline, en een vrij tekstblok voor dagplanning.
- **FR-019**: Systeem MOET RSS/Atom-feed-URL's kunnen toevoegen en recente items tonen met één-klik conversie naar Kanban-kaart.
- **FR-020**: Systeem MOET alle mutaties optimistisch bijwerken in de UI (ster, drag-and-drop, kaarttitel) en terugrollen bij serverfout.
- **FR-021**: Systeem MOET toetsenbordnavigatie ondersteunen: J/K voor kaartnavigatie, S voor ster, N voor nieuwe kaart, `/` voor zoeken.
- **FR-022**: Systeem MOET mobile-responsive zijn met bruikbare touch-interacties voor alle kernfuncties.
- **FR-023**: Systeem MOET exclusief single-user zijn per dataset (eigen borden, eigen externe connecties), maar datamodel MOET `user_id` bevatten voor toekomstige multi-user uitbreiding.

### Key Entities

- **User**: De eigenaar van borden, kaarten, instellingen en externe connecties. Voor nu single-user, met `user_id` op alle entiteiten voor toekomstig multi-tenant gebruik.
- **Board**: Een Kanban-bord met een naam, behoort tot één gebruiker. Bevat meerdere kolommen en (indirect) kaarten.
- **Column**: Een status-kolom binnen een bord (bijv. "Backlog", "Doing"), met een naam, volgorde-index, en een verzameling kaarten.
- **Card**: Een losse taak/kaart met titel, omschrijving (markdown), URL, ster-status, archief-status, positie binnen een kolom. Bevat optioneel time tracking sessies.
- **TimeSession**: Een gelogde tijdsessie op een kaart, met starttijd, eindtijd en berekende duur.
- **DBConnection**: Een versleuteld opgeslagen externe PostgreSQL-connectie, met naam, connection string, en metadata zoals toegevoegd-datum.
- **RSSFeed**: Een opgeslagen RSS/Atom-feed URL met naam, toegevoegd door de gebruiker.
- **FocusNote**: Het vrije-tekst "Wat ga je vandaag doen?"-blok, één per gebruiker per dag.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Een nieuwe gebruiker kan in minder dan 2 minuten zijn eerste bord aanmaken, een kaart toevoegen, en deze naar een andere kolom slepen.
- **SC-002**: Drag-and-drop van een kaart voelt instant aan (visuele feedback binnen 100ms, server-persistentie binnen 1 seconde).
- **SC-003**: Een gesterde kaart verschijnt binnen 1 seconde op de `/starred` pagina na het aanklikken van de ster.
- **SC-004**: Een kaart met een ingevulde omschrijving toont direct een visuele indicator zonder dat de gebruiker hoeft te refreshen.
- **SC-005**: Een externe Postgres-connectie kan worden toegevoegd en de eerste tabel-records zijn zichtbaar binnen 10 seconden na connectie-activatie.
- **SC-006**: Het dynamische formulier voor een tabel met 10+ kolommen genereert correcte veldtypes en validatie zonder handmatige configuratie.
- **SC-007**: De applicatie blijft functioneel op een mobiel scherm (320px breed) — alle kernfuncties zijn bedienbaar via touch.
- **SC-008**: 100% van de toetsenbord-sneltoetsen (J/K, S, N, /) functioneren zonder muisinteractie in een bord-view.
- **SC-009**: Geen externe connection string of service-role key is ooit zichtbaar in de browser developer tools of netwerk-responses.
- **SC-010**: Een pagerefresh herstelt exact dezelfde bord-staat (kaartposities, kolommen, ster-statussen) zonder dataverlies.

## Assumptions

- Er is een bestaande Supabase-project en -instantie beschikbaar voor auth en app-data.
- De gebruiker heeft toegang tot minimaal één externe PostgreSQL-database voor het testen van de CRUD-functionaliteit.
- De gebruiker werkt primair op desktop/laptop; mobile is ondersteund maar geen primaire use case voor drag-and-drop.
- De workspace is single-user voor de MVP; multi-user functionaliteit (zoals bord-delen) is out of scope.
- Magic link e-mails worden verzonden via Supabase's ingebouwde e-mailprovider; geen externe e-mailservice nodig.
- RSS-feeds worden server-side opgehaald en gecached om CORS- en rate-limiting issues te voorkomen.
- Tijdzones worden behandeld als UTC voor time tracking; lokale tijdconversie gebeurt in de browser.
- Externe database-queries hebben een timeout van 10 seconden om de applicatie responsief te houden.
- Externe databases zijn PostgreSQL; andere database-types vallen buiten de scope van de MVP.
- Het encryptiemechanisme voor connection strings gebruikt AES-GCM met een door de gebruiker te configureren encryptiesleutel.
