# Feature Specification: Dark Mode Dropdown Text Leesbaarheid

**Feature Branch**: `017-fix-dark-dropdown-text`

**Created**: 2026-09-22

**Status**: Draft

**Input**: User description: "Wanneer ik in dark view in de app ben wordt de text in de drop dows ook wit. Hierdoor kan ik ze niet meer lezen. Hou de text in de dropdown menu's zwart in dark view"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Leesbare dropdown-opties in dark mode (Priority: P1)

Als gebruiker die de app in dark mode gebruikt, wil ik dat de tekst in alle dropdown-menu's (de uitklaplijst met opties) zwart blijft op een lichte achtergrond, zodat ik de opties kan lezen zonder mijn thema te hoeven wisselen.

**Why this priority**: Zonder leesbare dropdowns is het onmogelijk om formulieren correct in te vullen (uren, clients, filters, thema-wissel). Dit blokkeert het kerngebruik van de app in dark mode.

**Independent Test**: Open de app in dark mode, klik op een willekeurige dropdown (bijv. thema-selector of uren-formulier), en verifieer dat alle opties in de uitklaplijst leesbaar zijn (donkere tekst op lichte achtergrond).

**Acceptance Scenarios**:

1. **Given** de app staat in dark mode, **When** de gebruiker een dropdown opent in het uren-invoerformulier, **Then** zijn alle opties in de uitklaplijst leesbaar met donkere tekst op een lichte achtergrond
2. **Given** de app staat in dark mode, **When** de gebruiker de thema-selector dropdown opent op de settings-pagina, **Then** zijn de thema-opties leesbaar (donkere tekst op lichte achtergrond)
3. **Given** de app staat in light mode, **When** de gebruiker een willekeurige dropdown opent, **Then** ziet alles er ongewijzigd uit (donkere tekst op lichte achtergrond — geen regressie)
4. **Given** de app staat in dark mode, **When** de gebruiker een geselecteerde waarde in een gesloten dropdown bekijkt, **Then** is de geselecteerde waarde zichtbaar in de themakleur van dark mode (witte/lichte tekst op donkere achtergrond van het invoerveld)

---

### Edge Cases

- Wat gebeurt er bij het hoveren over een optie in de uitklaplijst in dark mode? De hover-state moet ook leesbaar blijven (geen witte tekst op witte/highlight achtergrond).
- Wat gebeurt er als de browser de `color-scheme` of OS-thema-forcering toepast? De styling moet robuust genoeg zijn dat opties altijd leesbaar zijn, ongeacht browser-defaults.
- Lange optielijsten met scrollbar: de scrollbar en de onderste opties moeten ook leesbaar blijven.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Het systeem MOET de tekst van alle opties in uitgeklapte dropdown-menu's donker (zwart/near-black) houden, ongeacht het actieve thema (light of dark).
- **FR-002**: Het systeem MOET de achtergrond van uitgeklapte dropdown-menu's licht houden, ongeacht het actieve thema, zodat donkere tekst leesbaar blijft.
- **FR-003**: Het systeem MAG de styling van het gesloten dropdown-invoerveld NIET wijzigen — dit moet het actieve thema volgen (donkere achtergrond + lichte tekst in dark mode).
- **FR-004**: Het systeem MOET de leesbaarheid van dropdown-opties waarborgen in alle schermen waar dropdowns voorkomen, inclusief uren-invoer, uren-geschiedenis filters, client-beheer, db-explorer field mapping en thema-selectie.
- **FR-005**: Het systeem MOET de hover- en focus-state van opties in de uitklaplijst leesbaar houden in beide thema's.

### Key Entities *(include if feature involves data)*

- **Dropdown / Select-component**: De herbruikbare UI-component (`Select`) die een native `<select>` element rendert met `<option>` kinderen. De component wordt op meerdere plekken in de app hergebruikt.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% van de dropdown-opties in de app is leesbaar (donkere tekst op lichte achtergrond) wanneer de uitklaplijst open is, in zowel light als dark mode.
- **SC-002**: Geen regressie in light mode — alle dropdowns behouden hun huidige uiterlijk en leesbaarheid.
- **SC-003**: Geen enkel rapport van onleesbare dropdown-opties na de fix, verifieerbaar via visuele inspectie op alle schermen met dropdowns (minimaal 5 locaties: uren-formulier, uren-geschiedenis, client-beheer, db-explorer, thema-selector).
- **SC-004**: De fix is beperkt tot de dropdown-uitklaplijst en heeft geen visuele bijwerkingen op omliggende formulierelementen of de paginalay-out.

## Assumptions

- De gebruiker bedoelt de native HTML `<select>` dropdown-component die in de app via de herbruikbare `Select`-component wordt gebruikt (geen custom pop-over dropdowns).
- De gewenste oplossing is dat de uitklaplijst altijd een lichte achtergrond met donkere tekst toont (ongeacht thema), terwijl het gesloten invoerveld wel het thema volgt. Dit is de meest voorkomende en robuuste oplossing voor native select-elementen.
- De fix geldt voor alle schermen waar de `Select`-component wordt gebruikt; er zijn geen schermen die een afwijkende dropdown-styling nodig hebben.
- De app ondersteunt light en dark mode via een thema-systeem (Tailwind dark mode / CSS variabelen).