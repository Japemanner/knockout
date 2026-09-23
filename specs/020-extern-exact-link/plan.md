# Implementation Plan: Extern Exact Link

**Branch**: `020-extern-exact-link` | **Date**: 2026-09-23 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/020-extern-exact-link/spec.md`

## Summary

De sidebar in `AppShell.tsx` bevat een hard-coded lijst `externalLinks` onder de header "Extern" (Amfico, Darwin, Grafana, Honeycomb, Mailerlite, LangSmith, Mail, Metabase, N8N, PostHog, Supabase, MS Clarity). De feature voegt daar één nieuw item aan toe: label "Exact" met URL `https://portaal.hrsg.nl/`. Het bestaande map-mechanisme rendert elk item automatisch als externe link (nieuw tabblad, `rel="noopener noreferrer"`, extern-link-icoon) — er is dus alleen een regel in de lijst nodig plus een passend icoon uit de reeds geïmporteerde `lucide-react` set.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode) + React 18 + Next.js 14 (App Router)

**Primary Dependencies**: Next.js 14, React 18, Tailwind CSS v3, lucide-react (iconen, reeds aanwezig)

**Storage**: N/A — statische frontend-wijziging, geen database of storage

**Testing**: Playwright E2E (`tests/e2e/`). Kleine UI-wijziging; een E2E-test verifieert zichtbaarheid en href.

**Target Platform**: Web (Netlify), moderne browsers

**Project Type**: Web application (Next.js App Router)

**Performance Goals**: N/A — één extra statisch lijst-item, geen runtime-impact

**Constraints**: Geen nieuwe dependencies; icoon moet uit de bestaande `lucide-react` import komen. Geen `any` (strict mode).

**Scale/Scope**: 1 regel toevoegen aan `externalLinks`-array + 1 icoon-import in `AppShell.tsx`. Zeer klein.

## Constitution Check

| Gate | Status | Note |
|------|--------|------|
| RLS on every table | N/A | Geen database-wijziging |
| No secrets in client code | PASS | Publieke URL, geen secret |
| Edge Functions for privileged ops | N/A | Statische link, geen backend-logic |
| PKCE auth flow | N/A | Geen auth-wijziging |
| Netlify SPA redirects | N/A | Geen routing-wijziging |
| Storage bucket policies | N/A | Geen storage |
| TypeScript strict mode | PASS | Getypeerd lijst-item conform bestaand patroon |

Geen constitution violations. Geen complexity tracking nodig.

## Project Structure

### Documentation (this feature)

```text
specs/020-extern-exact-link/
├── plan.md              # Dit bestand
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── checklists/
│   └── requirements.md  # Tijdens /speckit.specify aangemaakt
└── tasks.md             # Phase 2 output (/speckit.tasks — niet door /speckit.plan)
```

### Source Code (repository root)

```text
src/
└── components/
    └── layout/
        └── AppShell.tsx   # WIJZIGING — externalLinks-array (lijn 47-60) + icoon-import (lijn 12-35)

tests/
└── e2e/
    └── extern-exact-link.spec.ts   # NIEUW — Playwright E2E
```

**Structure Decision**: Single-project layout (bestaand). De feature raakt precies één bestand in de bestaande component-structuur; er is geen keuzevrijheid in structuur. E2E-test volgt het bestaande patroon in `tests/e2e/`.

## Implementation Phases

### Phase 1 — Icoon-import (`AppShell.tsx` lijn 12-35)

Voeg een passend icoon toe aan de bestaande `lucide-react` import. "Exact" is een boekhoud-/accountingplatform → `Calculator` is het meest voor de hand liggende bestaande lucide-icoon (financieel/administratief). Geen ander icoon in de import-lijst is momenteel in gebruik voor dit domein.

```tsx
// toevoegen aan bestaande import uit 'lucide-react'
Calculator
```

**Beslissing**: `Calculator` — semantisch passend voor Exact (boekhoudsoftware), direct beschikbaar in lucide-react, geen extra dependency. Alternatieven afgewezen: `FileText`/`Receipt` (te generiek), `Landmark` (bank-associatie, niet boekhouding).

### Phase 2 — Lijst-item toevoegen (`AppShell.tsx` lijn 47-60)

Voeg één regel toe aan de `externalLinks`-array:

```tsx
const externalLinks = [
  { href: 'https://mijn.amfico.nl/', label: 'Amfico', icon: Shield },
  // ... bestaande items ...
  { href: 'https://clarity.microsoft.com', label: 'MS Clarity', icon: Eye },
  { href: 'https://portaal.hrsg.nl/', label: 'Exact', icon: Calculator },
]
```

Positie: na "MS Clarity" (append aan bestaande lijst). Het map-mechanisme (lijn 121-133) rendert het item automatisch: `target="_blank"`, `rel="noopener noreferrer"`, hover-styling en extern-link-icoon — geen verdere codewijziging nodig.

### Phase 3 — E2E test (`tests/e2e/extern-exact-link.spec.ts`)

Playwright-test die:
1. Inlogt (of skip-patroon hanteert indien geen sessie)
2. De sidebar "Extern"-sectie lokaliseert
3. Verifieert dat het label "Exact" zichtbaar is
4. Verifieert dat de bijbehorende link `https://portaal.hrsg.nl/` als href heeft, `target="_blank"` en in de "Extern"-sectie onder de interne navigatie staat

De test volgt het bestaande skip-als-niet-ingelogd patroon uit andere E2E-tests.

## Risk Analysis

| Risk | Impact | Mitigatie |
|------|--------|-----------|
| Verkeerde URL (bijv. met of zonder trailing slash) | Laag — spec noemt expliciet `https://portaal.hrsg.nl/` | Exact overnemen uit spec |
| Icoon-conflict: icoon al in gebruik voor ander item | Zeer laag — `Calculator` komt niet voor in de huidige import-lijst | Visuele check na implementatie |
| Externe portal onbereikbaar | Geen app-impact — link opent in nieuw tabblad, app blijft functioneren | Geen mitigatie nodig (edge case in spec gedekt) |

## Out of Scope

- Configuratie-/beheerscherm voor externe links (links blijven hard-coded, conform bestaand patroon)
- Authenticatie-integratie met de Exact-portal
- Sortering of groepering van de externe links