# Feature Specification: CRUD-categorieën en Supabase-sync

**Feature Branch**: `025-crud-categorie-sync`

**Created**: 2026-10-29

**Status**: Draft

**Input**: User description: "Aanpassen dat ik onder de categorie kan maken deze categorieën moeten namaken zijn moeten horizontaal dan verschillende borden oren en moet ik qua namen kunnen aanpassen. Ook wil ik een knop hebben dat ik dan kan synchroniseren met SupaBase zodat ik nieuwe kolom of types ook ophaal. Daar hoef ik niet telkens een heel crud te verwijderen en dan dit toe te voegen."

## Clarifications

### Session 2026-10-29

- Categorieën gelden op het **CRUD-tabblad**: de CRUD overzichten zijn de "borden" die onder de categorietabs worden gegroepeerd. Het Borden-tabblad (kanban) valt buiten deze feature; categorieën daar kunnen als vervolgfeature worden toegevoegd.
- De sync-knop komt **per CRUD overzicht** op de detailpagina. Een globale knop om alles tegelijk te synchroniseren is niet nodig.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Categorieën aanmaken en horizontaal tonen (Priority: P1)

Als gebruiker wil ik op het CRUD-tabblad categorieën kunnen aanmaken waaronder ik mijn CRUD overzichten (de "borden" van het tabblad) groepeer. De categorieën staan als tabs in één horizontale rij bovenaan de pagina, met als eerste tab "Alle". Klik ik op een categorietab, dan zie ik in het grid uitsluitend de overzichten van die categorie. Met "Nieuwe CRUD" maak ik een nieuw overzicht aan, waarbij de geselecteerde categorie vooraf is ingevuld.

**Why this priority**: Categorieën zijn de kern van het verzoek: zonder aanmaak en horizontale weergave van categorieën levert de feature geen waarde op. Alle andere onderdelen bouwen hierop voort.

**Independent Test**: Kan volledig getest worden door twee categorieën aan te maken, binnen een categorie een nieuw CRUD overzicht aan te maken en te controleren dat (a) de tabs naast elkaar in één horizontale rij staan en (b) elk tabblad alleen zijn eigen overzichten toont.

**Acceptance Scenarios**:

1. **Given** ik ben op het CRUD-tabblad, **When** ik een nieuwe categorie aanmaak met de naam "Klanten", **Then** verschijnt "Klanten" als tab in de horizontale rij, naast de tab "Alle"
2. **Given** twee of meer categorieën, **When** ik de pagina bekijk, **Then** staan alle categorietabs naast elkaar in één horizontale rij; passen ze niet op het scherm, dan is de rij horizontaal scrollbaar (nooit verticaal gestapeld)
3. **Given** ik heb de tab "Klanten" geselecteerd, **When** ik op "Nieuwe CRUD" klik, **Then** is de categorie "Klanten" in het aanmaakdialoog vooraf ingevuld en kan ik die aanpassen of leeg laten
4. **Given** ik heb een overzicht aangemaakt binnen de categorie "Klanten", **When** ik op de tab "Klanten" klik, **Then** toont het grid uitsluitend de overzichten van die categorie
5. **Given** ik klik op de tab "Alle", **Then** toont het grid al mijn overzichten, ongeacht categorie (het bestaande gedrag blijft behouden)

---

### User Story 2 - Categorieën hernoemen en beheren (Priority: P2)

Als gebruiker wil ik de naam van een categorie kunnen wijzigen, een bestaand overzicht kunnen verplaatsen naar een andere categorie (of los kunnen maken van een categorie) en een categorie kunnen verwijderen. Verwijderen mag nooit mijn overzichten meenemen.

**Why this priority**: Hernoemen is expliciet gevraagd en beheer maakt categorieën op de lange termijn levensvatbaar, maar de feature levert zonder dit onderdeel al waarde: aanmaken en indelen werken al volledig.

**Independent Test**: Kan volledig getest worden door een categorie te hernoemen en te controleren dat de nieuwe naam direct in de tab staat en na herladen behouden blijft, daarna een overzicht naar een andere categorie te verplaatsen en ten slotte een categorie te verwijderen en te controleren dat de overzichten blijven bestaan onder "Alle".

**Acceptance Scenarios**:

1. **Given** de categorie "Klanten", **When** ik de naam wijzig in "Relaties", **Then** toont de tab direct "Relaties" en blijft de nieuwe naam behouden na herladen
2. **Given** een overzicht in de categorie "Klanten", **When** ik het via het menu van de kaart verplaats naar "Relaties", **Then** verdwijnt het uit het grid van "Klanten" en verschijnt het in het grid van "Relaties"
3. **Given** een lege categorienaam, **When** ik probeer op te slaan, **Then** weigert de applicatie dit met een duidelijke melding
4. **Given** de categorie "Relaties" bevat twee overzichten, **When** ik de categorie verwijder en dit bevestig, **Then** verdwijnt de tab en blijven beide overzichten bestaan, nu ongecategoriseerd zichtbaar onder "Alle"

---

### User Story 3 - Supabase-sync: nieuwe kolommen en types ophalen (Priority: P1)

Als gebruiker wil ik op de detailpagina van een CRUD overzicht een knop "Synchroniseren met Supabase" hebben. Daarmee haal ik de actuele tabelstructuur op: nieuwe kolommen verschijnen in het overzicht, verwijderde kolommen verdwijnen en gewijzigde kolomtypes worden overgenomen. Mijn instellingen — naam, verborgen kolommen, kolomvolgorde en filters — blijven staan. Ik hoef het overzicht dus nooit meer te verwijderen en opnieuw aan te maken als mijn database is gewijzigd.

**Why this priority**: Dit lost een terugkerende pijn op: elke schemawijziging kost nu een volledig verwijderen en opnieuw aanmaken van het overzicht, met verlies van alle instellingen. Met de sync-knop is dat één klik. De sync-knop is onafhankelijk van de categorieën te bouwen en te testen.

**Independent Test**: Kan volledig onafhankelijk van de categorieën getest worden: voeg in de database een kolom toe aan de tabel van een bestaand overzicht, klik op "Synchroniseren met Supabase" en controleer dat de kolom verschijnt; verwijder daarna een kolom en controleer dat die verdwijnt zonder dat verborgen kolommen, volgorde of filters verloren gaan.

**Acceptance Scenarios**:

1. **Given** een bestaand CRUD overzicht met verborgen kolommen, een ingestelde kolomvolgorde en actieve filters, **When** in de database een nieuwe kolom is toegevoegd aan de gekoppelde tabel en ik op "Synchroniseren met Supabase" klik, **Then** verschijnt de nieuwe kolom direct in het overzicht (niet standaard verborgen) en zijn alle bestaande instellingen ongewijzigd
2. **Given** in de database is het type van een kolom gewijzigd (bijv. van tekst naar getal), **When** ik synchroniseer, **Then** behandelt het overzicht de kolom voortaan volgens het nieuwe type, in weergave, invoer en filteren
3. **Given** in de database is een kolom verwijderd, **When** ik synchroniseer, **Then** verdwijnt de kolom uit het overzicht en worden verwijzingen ernaar (verborgen kolommen, volgorde, filters) automatisch opgeruimd zonder foutmelding
4. **Given** de gekoppelde tabel is onbereikbaar of verwijderd, **When** ik synchroniseer, **Then** krijg ik een duidelijke foutmelding en blijven het overzicht en al zijn instellingen ongewijzigd behouden
5. **Given** een synchronisatie is geslaagd, **Then** zie ik een korte bevestiging dat de structuur is bijgewerkt

---

### Edge Cases

- Een categorie zonder overzichten toont in het grid een leegstaat-bericht met een uitnodiging om een overzicht aan te maken.
- Overzichten zonder categorie blijven altijd zichtbaar onder de tab "Alle"; de introductie van categorieën verliest geen bestaand overzicht.
- Twee categorieën met dezelfde naam zijn toegestaan (geen uniekheidscontrole, conform naamgeving bij borden en overzichten); beide tabs blijven gewoon bruikbaar.
- Bij veel categorieën blijft de tabrij één horizontale rij die scrollbaar is; nooit een verticale stapeling.
- Een kolom waarvan de naam in de database is gewijzigd (verwijderd en opnieuw aangemaakt) geldt bij synchronisatie als één verwijderde kolom plus één nieuwe kolom: de nieuwe kolom is zichtbaar, oude instellingen voor de kolomnaam worden niet automatisch hersteld.
- De gekoppelde tabel is hernoemd of verwijderd: synchroniseren geeft een duidelijke foutmelding; het overzicht en zijn instellingen blijven bestaan zodat de koppeling later hersteld kan worden.
- Synchroniseren terwijl er niets in de structuur is gewijzigd: geslaagd met bevestiging, zonder wijzigingen (geen foutmelding).
- Gelijktijdig open in twee tabs: de laatste schrijfactie wint, conform de bestaande applicatieconventie; geen real-time conflictdetectie.

## Requirements *(mandatory)*

### Functional Requirements

*Categorieën*

- **FR-001**: Het CRUD-tabblad MOET categorieën ondersteunen: benoemde groepen, eigendom van de ingelogde gebruiker, met een naam (verplicht) en een vaste volgorde (aanmaakvolgorde).
- **FR-002**: De CRUD-pagina MOET een knop tonen waarmee de gebruiker een nieuwe categorie met een naam kan aanmaken; een lege naam MOET geweigerd worden.
- **FR-003**: De categorieën MOETEN als tabs in één horizontale rij boven het grid getoond worden, voorafgegaan door een tab "Alle"; bij ruimtegebrek MOET de rij horizontaal te scrollen zijn (nooit verticaal gestapeld).
- **FR-004**: De tab "Alle" MOET alle overzichten van de gebruiker tonen; een categorietab MOET uitsluitend de overzichten van die categorie tonen.
- **FR-005**: Bij het aanmaken van een nieuw CRUD overzicht MOET de gebruiker optioneel een categorie kunnen kiezen; is er een categorie geselecteerd, dan is die vooraf ingevuld; zonder keuze is het overzicht ongecategoriseerd.
- **FR-006**: De gebruiker MOET de naam van een categorie kunnen wijzigen; de nieuwe naam is direct zichtbaar in de tab en blijft behouden.
- **FR-007**: De gebruiker MOET een bestaand CRUD overzicht naar een andere categorie kunnen verplaatsen en MOET het van een categorie kunnen losmaken.
- **FR-008**: De gebruiker MOET een categorie kunnen verwijderen na bevestiging in een in-app dialoog; de overzichten in de categorie MOETEN daarbij blijven bestaan en ongecategoriseerd worden.
- **FR-009**: Categorieën MOETEN per gebruiker opgeslagen en afgeschermd zijn: een gebruiker ziet en beheert uitsluitend zijn eigen categorieën.

*Supabase-sync*

- **FR-010**: De detailpagina van een CRUD overzicht MOET een knop "Synchroniseren met Supabase" tonen.
- **FR-011**: Een klik op de sync-knop MOET de actuele structuur van de gekoppelde tabel ophalen en het overzicht daarmee bijwerken: nieuwe kolommen verschijnen, verwijderde kolommen verdwijnen en gewijzigde kolomtypes worden overgenomen.
- **FR-012**: Nieuwe kolommen MOETEN na synchronisatie direct zichtbaar zijn (niet standaard verborgen); verbergen kan daarna via de bestaande kolominstellingen.
- **FR-013**: Synchroniseren MOET alle instellingen van het overzicht behouden (naam, verborgen kolommen, kolomvolgorde, filters) voor zover die betrekking hebben op kolommen die nog bestaan; verwijzingen naar niet-bestaande kolommen MOETEN automatisch worden opgeruimd.
- **FR-014**: Synchroniseren MAG NOOIT het overzicht, de instellingen of de data wissen; bij mislukking (onbereikbare of verwijderde tabel) MOET een duidelijke foutmelding volgen en MOET alles ongewijzigd blijven.
- **FR-015**: Een geslaagde synchronisatie MOET een korte bevestiging tonen.

### Key Entities

- **CRUD-categorie**: Benoemde groep van CRUD overzichten op het CRUD-tabblad. Attributen: naam (verplicht), positie (aanmaakvolgorde), eigenaar. Bevat nul of meer CRUD overzichten.
- **CRUD overzicht** (bestaand, wordt uitgebreid): krijgt een optionele verwijzing naar precies één categorie. Zonder categorie is het overzicht zichtbaar onder "Alle".
- **Tabelstructuur**: De actuele kolommen, kolomtypes en relaties van de gekoppelde tabel zoals die op dat moment in de database staan — de bron die de sync-knop ophaalt en toont.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Ik kan een nieuwe categorie aanmaken en er binnen 30 seconden een nieuw CRUD overzicht onder plaatsen, zonder de pagina te herladen.
- **SC-002**: Na een schemawijziging in de database (nieuwe kolom of gewijzigd kolomtype) is die wijziging in mijn bestaande overzicht zichtbaar na precies één klik op de sync-knop — het overzicht nul keer verwijderen en opnieuw aanmaken.
- **SC-003**: Synchroniseren behoudt 100% van de instellingen die betrekking hebben op kolommen die nog bestaan (naam, verborgen kolommen, kolomvolgorde en filters).
- **SC-004**: Alle categorie-tabs staan altijd in één horizontale rij, ongeacht het aantal categorieën (bij ruimtegebrek horizontaal scrollbaar, nooit verticaal gestapeld).
- **SC-005**: Het hernoemen van een categorie is binnen 10 seconden voltooid en de nieuwe naam blijft behouden na herladen van de pagina.

## Assumptions

- "Categorieën" en "borden" in de opdracht slaan op het CRUD-tabblad: de CRUD overzichten fungeren daar als "borden" (het tabblad werkt functioneel als het Borden-tabblad). Categorieën op andere tabbladen (zoals Borden zelf) vallen buiten deze feature en kunnen als vervolg worden toegevoegd.
- Een CRUD overzicht hoort hooguit bij één categorie; een overzicht in meerdere categorieën tegelijk is niet nodig.
- Bestaande overzichten zonder categorie blijven zichtbaar onder "Alle"; niets verdwijnt door de introductie van categorieën.
- Categorieën krijgen geen handmatige volgorde in deze versie: de volgorde is de aanmaakvolgorde. Herordenen van tabs (bijv. slepen) kan later als vervolgfeature.
- Het verwijderen van een categorie verwijdert nooit de overzichten eronder (veilige standaard): ze worden ongecategoriseerd en blijven zichtbaar onder "Alle".
- Dubbele categorienamen zijn toegestaan, conform de bestaande naamgeving bij borden en overzichten.
- De sync-knop staat op de detailpagina en werkt per overzicht; een globale knop om alles tegelijk te synchroniseren valt buiten scope, evenals automatisch synchroniseren (op interval of bij het openen van de pagina).
- De sync-knop is bedoeld voor schemawijzigingen (nieuwe of verwijderde kolommen, gewijzigde kolomtypes) van reeds gekoppelde tabellen; nieuw aangemaakte tabellen zijn al direct kiesbaar bij het aanmaken van een nieuw overzicht (bestaand gedrag) en vallen niet onder de sync-knop.
- Bevestigingen en foutmeldingen zijn in-app dialogen en meldingen; de applicatie gebruikt geen browserdialogen (bestaand patroon).
- Externe databaseverbindingen zijn niet meer ondersteund in het CRUD-tabblad (bestaand beleid); de sync-knop geldt voor het eigen Supabase-project.
- Toegangsbeveiliging beperkt categorieën en overzichten tot de ingelogde eigenaar, conform de bestaande tabellen.
- Buiten scope: categorieën op andere tabbladen, handmatig herordenen van tabs, automatisch synchroniseren, het interactietype "Formulier", en synchroniseren buiten het CRUD-tabblad.