# Feature Specification: Extern Exact Link

**Feature Branch**: `020-extern-exact-link`

**Created**: 2026-09-23

**Status**: Draft

**Input**: User description: "voeg onder de header extern de link: https://portaal.hrsg.nl/ toe. met als label Exact"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Exact link zichtbaar onder Extern-header in de sidebar (Priority: P1)

De gebruiker opent de applicatie en ziet in de navigatie-sidebar onder de header "Extern" een nieuw item met het label "Exact". Wanneer de gebruiker hierop klikt, opent de externe portal https://portaal.hrsg.nl/ in een nieuw browsertabblad. De link gedraagt zich identiek aan de bestaande externe links (Amfico, Darwin, Grafana, etc.): zelfde styling, zelfde extern-link-icoon en opening in een nieuw tabblad.

**Why this priority**: Dit is de kern van het verzoek — de link moet zichtbaar en klikbaar zijn onder de Extern-header. Alleen hiermee is de feature al volledig bruikbaar.

**Independent Test**: Log in, bekijk de sidebar, controleer dat onder "Extern" het label "Exact" staat en klik erop: de URL https://portaal.hrsg.nl/ opent in een nieuw tabblad.

**Acceptance Scenarios**:

1. **Given** een ingelogde gebruiker met de sidebar open, **When** de gebruiker naar de sectie "Extern" kijkt, **Then** is daar een item met label "Exact" zichtbaar.
2. **Given** het item "Exact" is zichtbaar in de sidebar, **When** de gebruiker erop klikt, **Then** opent https://portaal.hrsg.nl/ in een nieuw browsertabblad en blijft de applicatie zelf open in het huidige tabblad.
3. **Given** het item "Exact" in de sidebar, **When** de gebruiker het label en de styling vergelijkt met de overige externe links, **Then** is de presentatie consistent (zelfde lettergrootte, hover-gedrag en extern-link-indicator).

---

### Edge Cases

- Wat gebeurt er als de externe portal onbereikbaar is? De applicatie zelf moet hierdoor niet breken; het nieuwe tabblad toont dan de browser-foutmelding (verwachting: geen app-impact).
- De link is een hard-coded statische link, net als de overige externe links; er is geen beheerscherm nodig om de URL te wijzigen.
- De externe links (inclusief "Exact") zijn alleen zichtbaar voor gebruikers die de sidebar zien; er is geen aparte admin-restrictie nodig, conform de bestaande externe links.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: De navigatie-sidebar MUST een item met label "Exact" tonen onder de header "Extern".
- **FR-002**: Het item MUST verwijzen naar de URL https://portaal.hrsg.nl/.
- **FR-003**: Het item MUST de URL openen in een nieuw browsertabblad bij klikken, conform het gedrag van de bestaande externe links.
- **FR-004**: Het item MUST visueel consistent zijn met de bestaande externe links (zelfde styling en extern-link-indicator).
- **FR-005**: De link MUST voor alle gebruikers zichtbaar zijn die de sidebar zien (geen extra restrictie, conform bestaande externe links).

### Key Entities

- **Extern link-item**: Een statisch navigatie-item bestaande uit een label ("Exact"), een doel-URL (https://portaal.hrsg.nl/) en een icoon; onderdeel van de bestaande externe-links-lijst in de sidebar.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% van de gebruikers met toegang tot de sidebar ziet het item "Exact" onder de header "Extern".
- **SC-002**: Klikken op "Exact" opent https://portaal.hrsg.nl/ in een nieuw tabblad bij 100% van de klikken.
- **SC-003**: De presentatie van het item is niet te onderscheiden van de overige externe links (label + indicator, geen afwijkende stijl).

## Assumptions

- De externe portal https://portaal.hrsg.nl/ is de juiste bestemming en blijft geldig; er is geen koppeling of authenticatie-integratie nodig — alleen een directe link.
- De link wordt hard-coded toegevoegd aan de bestaande externe-links-lijst, net als de andere externe links; geen database- of configuratie-uitbreiding.
- Het label is exact "Exact" (zoals gevraagd), zonder extra toevoegingen zoals "Portal" of "HRSG".
- Het gedrag (nieuw tabblad, hover-stijl, extern-icoon) volgt automatisch het patroon van de bestaande externe links.
- Iconen-keuze: er wordt een passend, beschikbaar icoon geselecteerd binnen de bestaande iconenset; dit is een implementatie-detail dat de scope niet beïnvloedt.