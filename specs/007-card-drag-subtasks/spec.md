# Feature Specification: Card Drag & Subtasks

**Feature Branch**: `007-card-drag-subtasks`

**Created**: 2026-06-12

**Status**: Draft

**Input**: User description: "ik wil dat ik de kaartjes van bord naar bord kan slepen door deze vast te pakken. Ook wil ik ze onder elkaar kunnen slepen zodat een taak subtaken kan krijgen"

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Kaart naar ander bord slepen (Priority: P1)

Een gebruiker pakt een kaart vast en sleept deze. Bovenaan het scherm verschijnt een horizontale rij met alle beschikbare borden als drop targets. De gebruiker laat de kaart los op het gewenste bord. De kaart wordt verplaatst naar de eerste kolom van dat bord.

**Why this priority**: Cross-board verplaatsen is de meest gevraagde functionaliteit en bouwt voort op bestaande `moveCardToBoard()` server action. Het is een standalone feature die direct waarde levert.

**Independent Test**: Open twee borden, sleep een kaart van bord A naar bord B via de bord-rij bovenaan. De kaart verschijnt in de eerste kolom van bord B en verdwijnt uit bord A.

**Acceptance Scenarios**:

1. **Given** een kaart in kolom "To Do" van bord "Project A", **When** de gebruiker de kaart vastpakt en sleept, **Then** verschijnt bovenaan een rij met alle borden (behalve het huidige) als drop targets
2. **Given** de bord-rij is zichtbaar tijdens drag, **When** de gebruiker de kaart loslaat op bord "Project B", **Then** wordt de kaart verplaatst naar de eerste kolom van "Project B" en verdwijnt uit "Project A"
3. **Given** de gebruiker sleept een kaart maar laat los buiten de bord-rij, **When** de drop target is niet een ander bord, **Then** blijft de kaart op het huidige bord (standaard gedrag)
4. **Given** er is maar één bord in de workspace, **When** de gebruiker een kaart sleept, **Then** verschijnt de bord-rij niet (geen andere borden beschikbaar)

---

### User Story 2 — Subtaak maken via slepen (Priority: P2)

Een gebruiker sleept een kaart en laat deze los **op** een andere kaart (niet erboven of eronder). De gesleepte kaart wordt een subtaak van de target kaart. Subtaken worden ingesprongen weergegeven onder de parent card. Een parent card toont een expand/collapse toggle en een teller van het aantal subtaken. Een subtaak kan weer losgesleept worden naar een kolom om weer top-level te worden.

**Why this priority**: Subtaken zijn een natuurlijke uitbreiding op cross-board drag. Vereist database-migratie (`parent_id` kolom) en nieuwe UI-componenten. Bouwt voort op P1 maar is complexer.

**Independent Test**: Maak twee kaarten in dezelfde kolom. Sleep kaart B en laat los **op** kaart A. Kaart B verschijnt ingesprongen onder kaart A. Kaart A toont "1 subtaak" met een collapse toggle.

**Acceptance Scenarios**:

1. **Given** twee kaarten in kolom "To Do", **When** de gebruiker kaart B sleept en loslaat **op** kaart A (niet erboven/eronder), **Then** wordt kaart B een subtaak van kaart A en verschijnt ingesprongen onder kaart A
2. **Given** kaart A heeft subtaken, **When** de gebruiker op de collapse toggle klikt, **Then** worden de subtaken verborgen en toont de toggle een expand-icoon
3. **Given** kaart A heeft verborgen subtaken, **When** de gebruiker op de expand toggle klikt, **Then** worden de subtaken weer zichtbaar
4. **Given** kaart B is een subtaak van kaart A, **When** de gebruiker kaart B naar een kolom sleept, **Then** wordt kaart B weer een top-level kaart in die kolom
5. **Given** kaart A heeft subtaken, **When** kaart A naar een ander bord wordt gesleept, **Then** verhuizen de subtaken mee naar het nieuwe bord
6. **Given** een kaart is een subtaak, **When** de gebruiker deze kaart opent in de detail modal, **Then** is zichtbaar welke kaart de parent is (met link naar parent)
7. **Given** een kaart heeft subtaken, **When** de gebruiker de kaart archiveert, **Then** worden de subtaken ook gearchiveerd

---

### Edge Cases

- Wat gebeurt er als een kaart met subtaken naar een ander bord wordt gesleept? → Subtaken verhuizen mee
- Wat gebeurt er als een subtaak naar een ander bord wordt gesleept? → Wordt top-level kaart op het doelbord
- Wat gebeurt er als een parent card wordt verwijderd? → Subtaken worden top-level kaarten in dezelfde kolom
- Wat gebeurt er als je een kaart op zichzelf probeert te slepen? → Geen actie (genegeerd)
- Wat gebeurt er als je een parent card onder zijn eigen subtaak probeert te slepen? → Genegeerd (cyclische referentie voorkomen)
- Wat gebeurt er bij snel slepen (meerdere kaarten tegelijk)? → Eén kaart per keer; multi-select drag is out of scope voor v1

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Tijdens het slepen van een kaart MOET een horizontale rij met alle andere borden verschijnen bovenaan het scherm als drop targets
- **FR-002**: De bord-rij MOET het huidige bord uitsluiten (een kaart naar zichzelf slepen is zinloos)
- **FR-003**: Bij loslaten op een bord in de rij MOET de kaart verplaatst worden naar de eerste kolom van dat bord
- **FR-004**: De bord-rij MOET verdwijnen zodra de drag-actie eindigt (drop of cancel)
- **FR-005**: Wanneer er slechts één bord bestaat MOET de bord-rij niet verschijnen
- **FR-006**: Een kaart MOET een subtaak kunnen worden door deze los te laten **op** een andere kaart (niet erboven of eronder)
- **FR-007**: Subtaken MOETEN ingesprongen worden weergegeven onder de parent card
- **FR-008**: Een parent card MOET een expand/collapse toggle hebben om subtaken te tonen/verbergen
- **FR-009**: Een parent card MOET het aantal subtaken tonen (bijv. "3 subtaken")
- **FR-010**: Een subtaak MOET losgesleept kunnen worden naar een kolom om weer een top-level kaart te worden
- **FR-011**: Bij het verplaatsen van een parent card naar een ander bord MOETEN alle subtaken mee verhuizen
- **FR-012**: Bij het verwijderen van een parent card MOETEN subtaken top-level kaarten worden in dezelfde kolom
- **FR-013**: Het systeem MOET cyclische referenties voorkomen (een kaart kan geen subtaak van zichzelf of eigen subtaken worden)
- **FR-014**: De subtaak-hiërarchie is beperkt tot één niveau (subtaken kunnen zelf geen subtaken hebben)
- **FR-015**: In de card detail modal MOET zichtbaar zijn of een kaart een parent heeft, met navigatie naar de parent
- **FR-016**: In de card detail modal MOETEN subtaken van een kaart getoond worden

### Key Entities *(include if feature involves data)*

- **Card**: Bestaande entiteit, uitgebreid met `parent_id` (nullable, self-referencing). Een card met `parent_id = null` is een top-level kaart. Een card met een `parent_id` is een subtaak.
- **Board**: Bestaande entiteit, geen wijzigingen. Borden verschijnen als drop targets in de bord-rij tijdens drag.
- **Column**: Bestaande entiteit, geen wijzigingen. De eerste kolom (laagste `position`) van een bord is de default drop target voor cross-board moves.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Een kaart naar een ander bord slepen duurt maximaal 3 seconden van vastpakken tot visuele bevestiging op het doelbord
- **SC-002**: De bord-rij verschijnt binnen 200ms na start van een drag-actie
- **SC-003**: 100% van cross-board drags resulteert in correcte plaatsing (geen verdwenen of gedupliceerde kaarten)
- **SC-004**: Een subtaak-relatie is binnen 1 drag-actie gemaakt (geen extra dialogen of bevestigingen nodig)
- **SC-005**: Parent cards met 20+ subtaken renderen zonder merkbare vertraging bij expand/collapse
- **SC-006**: Gebruikers kunnen in de detail modal binnen 2 klikken navigeren van subtaak naar parent

## Assumptions

- De bestaande `moveCardToBoard()` server action in `src/actions/cards.ts` wordt hergebruikt voor cross-board drag
- De bestaande @dnd-kit/core en @dnd-kit/sortable libraries worden gebruikt (geen nieuwe drag-library)
- De bord-rij toont borden gesorteerd op `position` (zelfde volgorde als op de boards overview pagina)
- "Loslaten op een kaart" wordt gedetecteerd via @dnd-kit's `closestCenter` collision detection in combinatie met een aparte droppable zone per kaart
- Subtaken erven de `column_id` van hun parent (blijven in dezelfde kolom)
- De database migratie (`parent_id` kolom) wordt uitgevoerd via Supabase MCP
- Multi-select drag (meerdere kaarten tegelijk slepen) is out of scope voor v1
- Drag-and-drop op touch devices werkt via de bestaande TouchSensor configuratie
