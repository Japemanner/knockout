# Tasks: Extern Exact Link

**Input**: Design documents from `/specs/020-extern-exact-link/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: Playwright E2E-test is opgenomen (AGENTS.md vereist minimaal Ã©Ã©n test per feature).

**Organization**: Taken gegroepeerd per user story. De feature heeft Ã©Ã©n user story (US1) â€” de volledige MVP bestaat uit Phase 1 t/m Phase 3.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Parallel uitvoerbaar (andere bestanden, geen dependencies)
- **[Story]**: US1 â€” Exact link zichtbaar en klikbaar onder Extern-header
- Exacte bestandspaden in elke beschrijving

## Path Conventions

- Single project: `src/`, `tests/` op repository-root

---

## Phase 1: Setup

**Purpose**: Bestaande context verifiÃ«ren â€” geen nieuwe infrastructuur nodig (statische link-features vereisen geen setup-taken).

- [X] T001 Verifieer dat `src/components/layout/AppShell.tsx` de `externalLinks`-array (lijn 47-60) en het render-mechanisme (lijn 116-133) bevat zoals beschreven in plan.md

---

## Phase 2: Foundational

**Purpose**: Geen blocking prerequisites â€” US1 kan direct na Setup starten. Deze fase is bewust leeg: er zijn geen modellen, services of infrastructuur nodig voor een statisch lijst-item.

**Checkpoint**: Foundation is de bestaande AppShell-component â€” geen werk nodig.

---

## Phase 3: User Story 1 - Exact link onder Extern-header (Priority: P1) ðŸŽ¯ MVP

**Goal**: Het item "Exact" (URL `https://portaal.hrsg.nl/`) verschijnt onder de header "Extern" in de sidebar en opent in een nieuw tabblad bij klikken, visueel consistent met de bestaande externe links.

**Independent Test**: Log in, controleer dat onder "Extern" het label "Exact" staat met calculator-icoon en extern-link-indicator, en klik erop: `https://portaal.hrsg.nl/` opent in een nieuw tabblad.

### Implementation for User Story 1

- [X] T002 [US1] Voeg `Calculator` toe aan de bestaande `lucide-react`-import (lijn 12-35) in `src/components/layout/AppShell.tsx`
- [X] T003 [US1] Voeg item `{ href: 'https://portaal.hrsg.nl/', label: 'Exact', icon: Calculator }` toe aan het einde van de `externalLinks`-array in `src/components/layout/AppShell.tsx` (na MS Clarity, lijn 47-60)
- [X] T004 [US1] Verifieer in de browser (desktop Ã©n mobiele drawer): label "Exact" zichtbaar onder "Extern", calculator-icoon, hover-styling en extern-link-icoon consistent met bestaande items; klik opent `https://portaal.hrsg.nl/` in nieuw tabblad

### Tests for User Story 1

- [X] T005 [P] [US1] Schrijf Playwright E2E-test `tests/e2e/extern-exact-link.spec.ts`: verifieer zichtbaarheid van label "Exact" in de Extern-sectie, href `https://portaal.hrsg.nl/`, `target="_blank"`; volg het bestaande skip-als-niet-ingelogd patroon
- [X] T006 [US1] Draai de volledige E2E-regressiesuite en verifieer dat alle bestaande tests groen blijven (of geskipt zonder sessie)

**Checkpoint**: User Story 1 volledig functioneel â€” feature is compleet.

---

## Phase 4: Polish & Cross-Cutting Concerns

**Purpose**: Kwaliteitspoorten conform AGENTS.md.

- [X] T007 Draai `tsc --noEmit` en verifieer dat TypeScript zonder errors compileert
- [X] T008 Draai `npx eslint src/ --max-warnings 0` en verifieer nul warnings
- [X] T009 Werk FEATURES.md bij met de nieuwe feature (@feature-tracker patroon)
- [X] T010 Run quickstart.md validatie (`specs/020-extern-exact-link/quickstart.md`)
- [X] T011 Commit met conventional message (`feat(ui): Exact-link toegevoegd onder Extern in sidebar`)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Geen dependencies â€” direct starten
- **Foundational (Phase 2)**: Leeg â€” geen blocking prerequisites
- **User Story 1 (Phase 3)**: T002 â†’ T003 â†’ T004 (sequentieel, zelfde bestand); T005 parallel mogelijk na T003; T006 na T005
- **Polish (Phase 4)**: Afhankelijk van Phase 3 voltooiing

### Within Each User Story

- Import vÃ³Ã³r array-item (T002 â†’ T003) â€” TypeScript compileert niet met ongebruikt/niet-geÃ¯mporteerd icoon
- Browser-verificatie (T004) pas na codewijzigingen
- E2E-test (T005) kan parallel geschreven worden zodra T003 klaar is
- Regressiesuite (T006) pas na T005

### Parallel Opportunities

- T005 (E2E-test schrijven) is parallel uitvoerbaar met T004 (browser-verificatie) â€” verschillende activiteiten
- T007 en T008 (tsc + eslint) zijn parallel uitvoerbaar â€” onafhankelijke checks

---

## Parallel Example: User Story 1

```bash
# Na T003, parallel:
Task: "Browser-verificatie van Exact-link in src/components/layout/AppShell.tsx"
Task: "Schrijf E2E-test in tests/e2e/extern-exact-link.spec.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (verificatie)
2. Complete Phase 3: T002 â†’ T003 â†’ T004 â†’ T005 â†’ T006
3. Complete Phase 4: T007 â†’ T008 â†’ T009 â†’ T010 â†’ T011
4. **STOP en VALIDATE**: quickstart.md draait groen, regressiesuite groen

De volledige feature is de MVP â€” er is geen incrementele delivery nodig over meerdere stories.

---

## Notes

- EÃ©n user story; alle taken betreffen `src/components/layout/AppShell.tsx` en `tests/e2e/extern-exact-link.spec.ts`
- Geen database-, auth- of storage-wijzigingen â€” constitution-gates zijn N/A of PASS (zie plan.md)
- Pre-commit hook (tsc, fitness-check, gitleaks, eslint) draait automatisch bij T011
- Commit pas bij T011 â€” alle eerdere taken blijven ongecommit tot de volledige feature + tests groen zijn