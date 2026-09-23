# Research: Extern Exact Link

**Feature**: 020-extern-exact-link | **Date**: 2026-09-23

## Vraagpunten uit Technical Context

Geen NEEDS CLARIFICATION-markers in het plan — de feature is één statisch lijst-item. Onderstaande onderzoekspunten zijn tijdens plan-fase direct uit de codebase beantwoord.

## Onderzoek

### 1. Waar worden externe links gedefinieerd en gerenderd?

**Decision**: Wijziging in `src/components/layout/AppShell.tsx`.

**Rationale**: De `externalLinks`-array (lijn 47-60) bevat alle bestaande externe links als `{ href, label, icon }`-objecten. Het render-mechanisme (lijn 116-133) loopt over de array en rendert elk item als `<a target="_blank" rel="noopener noreferrer">` met extern-link-icoon onder de header "Extern". Eén nieuw item toevoegen volstaat volledig; er is geen nieuwe component of abstractie nodig.

**Alternatives considered**:
- Links uit database/configuratie laden — afgewezen: bestaand patroon is hard-coded, spec zegt expliciet "hard-coded toegevoegd, net als de andere externe links".
- Nieuwe aparte component voor externe links — afgewezen: overengineering voor één regel; bestaand map-patroon dekt alles.

### 2. Icoon-keuze voor "Exact"

**Decision**: `Calculator` uit lucide-react.

**Rationale**: Exact is boekhoud-/accountingsoftware; het rekenmachine-icoon is de meest directe semantische associatie binnen de beschikbare lucide-react set. Alle andere externe links hebben een eigen uniek icoon (Shield, Bot, LineChart, Hexagon, Send, GitBranch, Mail, BarChart3, Workflow, TrendingUp, Database, Eye) — `Calculator` is nog niet in gebruik in de import-lijst van AppShell.tsx.

**Alternatives considered**:
- `Receipt` — factuur-associatie, maar minder herkenbaar dan calculator voor boekhoudplatform
- `FileSpreadsheet` — spreadsheet-associatie, te generiek
- `Briefcase` — zakelijk generiek, geen boekhoudkoppeling

### 3. Zichtbaarheid: alle gebruikers of admin-only?

**Decision**: Alle gebruikers met sidebar-toegang, geen admin-restrictie.

**Rationale**: De externe links worden momenteel zonder filter gerenderd (alleen interne `navItems` hebben `adminOnly`-filtering). De spec bevestigt dit: "geen aparte admin-restrictie nodig, conform de bestaande externe links". Het bestaande gedrag wijzigen zou scope-creep zijn.

### 4. Renderen in mobiele sidebar

**Decision**: Automatisch gedekt — de mobiele drawer hergebruikt `sidebarContent` (zelfde JSX), dus het nieuwe item verschijnt in zowel desktop- als mobiele weergave zonder extra werk.

**Rationale**: AppShell.tsx gebruikt één `sidebarContent`-variabele voor beide layouts (aside lijn 169-171 en mobiele drawer lijn 160-167). Eén wijziging dekt beide weergaven.

## Conclusie

Alle onderzoeksvragen zijn beantwoord. De implementatie is precies: 1 icoon-import + 1 array-item + 1 E2E-test.