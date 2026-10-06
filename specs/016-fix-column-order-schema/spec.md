# Feature Specification: Fix CRUD Kolom Verplaatsen Schema Error

**Feature Branch**: `016-fix-column-order-schema`

**Created**: 2026-09-22

**Status**: Draft

**Input**: User description: "Wanneer ik een kolom in de crud verplaats krijg ik deze error: Could not find the 'column_order' column of 'kk_crud_overviews' in the schema cache"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Kolom verplaatsen werkt zonder foutmelding (Priority: P1)

Een gebruiker die een CRUD-overzicht bekijkt wil een kolomkop verslepen om de kolomvolgorde aan te passen. Wanneer de gebruiker een kolom loslaat op een nieuwe positie, wordt de nieuwe volgorde opgeslagen en verschuift de kolom direct — zonder dat er een foutmelding "Could not find the 'column_order' column" verschijnt. De kolomvolgorde wordt correct bewaard en is bij volgend bezoek nog steeds actief.

**Why this priority**: Dit is de kernbug — zonder deze fix is de in feature 015 gebouwde kolom-verplaats-functionaliteit volledig onbruikbaar en krijgt elke gebruiker die een kolom probeert te verplaatsen een foutmelding.

**Independent Test**: Kan getest worden door een kolomkop te verslepen naar een andere positie en te verifiëren dat (a) geen foutmelding verschijnt, (b) de kolom visueel verplaatst, en (c) na herladen van de pagina de nieuwe volgorde behouden blijft.

**Acceptance Scenarios**:

1. **Given** de gebruiker bekijkt een CRUD-tabelweergave, **When** de gebruiker een kolomkop pakt en naar een andere positie sleept, **Then** verschuift de kolom direct naar de nieuwe positie ZONDER dat er een foutmelding "Could not find the 'column_order' column" verschijnt
2. **Given** de gebruiker heeft een kolom verplaatst, **When** de gebruiker de pagina herlaadt, **Then** is de nieuwe kolomvolgorde behouden (de wijziging is daadwerkelijk opgeslagen)
3. **Given** de gebruiker opent een CRUD-overzicht voor het eerst (geen opgeslagen volgorde), **When** de gebruiker de pagina bekijkt, **Then** verschijnt de standaard kolomvolgorde zonder foutmelding
4. **Given** de gebruiker kiest "Reset volgorde" in het kolom-instellingenmenu, **When** de reset wordt uitgevoerd, **Then** keert de tabel terug naar de standaardvolgorde ZONDER foutmelding

---

### Edge Cases

- Wat gebeurt er met bestaande CRUD-overviews die zijn aangemaakt vóór de fix? Deze hebben geen `column_order` waarde in de database; na de fix krijgen ze de default `'{}'` en verschijnen in natuurlijke volgorde — geen migratie van bestaande data nodig.
- Wat als de databaseverbinding tijdens het opslaan van de nieuwe volgorde wegvalt? De foutmelding moet gebruikersvriendelijk worden getoond (bestaande gedrag in `updateCrudOverview`), niet als een onbegrijpelijke schema-cache error.
- Wat als de PostgREST schema cache nog niet is ververst na het aanmaken van de kolom? De schema cache wordt automatisch ververst na een ALTER TABLE; indien nodig kan een expliciete `NOTIFY pgrst, 'reload schema'` worden uitgevoerd.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Het systeem MOET de `column_order` kolom op de `kk_crud_overviews` tabel in de live Supabase database aanwezig hebben, zodat de applicatie kolomvolgorde kan opslaan en uitlezen
- **FR-002**: Het systeem MOET de PostgREST schema cache ververst hebben nadat de kolom is toegevoegd, zodat API-aanroeken die `column_order` selecten of updaten niet falen met een "schema cache" fout
- **FR-003**: Het systeem MOET bestaande CRUD-overviews na de fix correct tonen in de natuurlijke (standaard) kolomvolgorde, aangezien hun `column_order` default leeg is
- **FR-004**: Het systeem MOET de bestaande drag-and-drop kolom-verplaats-functionaliteit (feature 015) volledig laten werken: verslepen, opslaan, herladen, en resetten — alle zonder foutmeldingen
- **FR-005**: Het systeem MOET de RLS-policies op `kk_crud_overviews` ongewijzigd laten — de nieuwe kolom erft de bestaande per-gebruiker policies (geen nieuwe policies nodig)

### Key Entities

- **CRUDOverview**: Bestaande entiteit in de `kk_crud_overviews` tabel. De `column_order` kolom (type `TEXT[]`, default `'{}'`) hoort deel uit te maken van het schema maar ontbreekt in de live database. Andere eigenschappen: id, user_id, name, connection_id, table_name, interaction_type, hidden_columns, position, created_at, updated_at.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% van de pogingen om een kolom te verplaatsen in een CRUD-overzicht voltooit zonder de foutmelding "Could not find the 'column_order' column of 'kk_crud_overviews' in the schema cache"
- **SC-002**: 100% van de opgeslagen kolomvolgordes is behouden bij volgend bezoek aan hetzelfde CRUD-overzicht (wijziging is daadwerkelijk persistent in de database)
- **SC-003**: De "Reset volgorde" actie werkt foutloos en keert terug naar de natuurlijke kolomvolgorde
- **SC-004**: Bestaande CRUD-overviews (aangemaakt vóór de fix) blijven correct functioneren zonder dat hun data handmatig hoeft te worden gemigreerd

## Assumptions

- De migratie `015_crud_overviews_column_order.sql` bestaat in de repository (`supabase/migrations/`) maar is niet uitgevoerd op de live Supabase database — dit is de directe oorzaak van de foutmelding
- De applicatiecode (TypeScript types, server actions, UI-componenten) is correct geïmplementeerd in feature 015 en vereist geen wijziging — alleen de database-schema wijkt af
- De Supabase database is bereikbaar via de Supabase MCP voor het uitvoeren van de migratie
- De PostgREST schema cache wordt automatisch ververst na een `ALTER TABLE`; indien dit niet onmiddellijk gebeurt, kan een expliciete reload-notify worden uitgevoerd
- RLS op `kk_crud_overviews` is al correct geconfigureerd (migratie 003) en hoeft niet te worden gewijzigd
- De fix is achterwaarts compatibel: bestaande CRUD-overviews zonder `column_order` waarde krijgen automatisch de default `'{}'` en werken direct