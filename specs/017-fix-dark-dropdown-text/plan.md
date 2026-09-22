# Implementation Plan: Dark Mode Dropdown Text Leesbaarheid

**Branch**: `017-fix-dark-dropdown-text` | **Date**: 2026-09-22 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/017-fix-dark-dropdown-text/spec.md`

## Summary

In dark mode worden native `<option>` elementen in de herbruikbare `Select`-component onleesbaar: de tekst erft de lichte `--foreground` kleur (wit/near-white) uit de `.dark` theme variabelen, terwijl de browser de uitklaplijst-achtergrond rendert op basis van `color-scheme` en OS-thema. Dit levert witte tekst op een niet-matchende achtergrond op.

Oplossing: forceer in de `Select`-component expliciet donkere tekst en een lichte achtergrond op `<option>` elementen via CSS, onafhankelijk van het actieve thema. Het gesloten `<select>` invoerveld behoudt de thema-styling (donkere bg + lichte tekst in dark mode). De fix is geconcentreerd in `src/components/ui/select.tsx` (component-level styling) en/of `src/app/theme.css` (globale opt-styling), met een lichte `background-color` en donkere `color` op `option` elementen.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode) + React 18 + Next.js 14 (App Router)

**Primary Dependencies**: Next.js 14, React 18, Tailwind CSS v3, shadcn/ui patterns, `cn()` utility uit `@/lib/utils`

**Storage**: N/A — puur UI/CSS wijziging, geen database-impact

**Testing**: Playwright (e2e — `tests/e2e/`). Visuele verificatie in dark en light mode op minimaal 5 dropdown-locaties.

**Target Platform**: Web (Netlify deployment), moderne browsers (Chrome/Edge/Firefox/Safari). Native `<select>` rendering verschilt per browser/OS — de fix moet robuust zijn cross-browser.

**Project Type**: Web applicatie (Next.js App Router, client components)

**Performance Goals**: N/A — statische CSS-regels, geen runtime impact

**Constraints**: TypeScript strict mode. Geen nieuwe dependencies. De fix mag geen invloed hebben op light mode. Het gesloten select-veld moet het thema blijven volgen. RLS niet van toepassing (geen DB).

**Scale/Scope**: 1 component (`src/components/ui/select.tsx`) en/of 1 CSS-bestand (`src/app/theme.css`). Klein.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

De constitution (`.specify/memory/constitution.md`) is een lege template — geen principes of gates gedefinieerd. Geen schendingen mogelijk. Gate: PASS.

## Project Structure

### Documentation (this feature)

```text
specs/017-fix-dark-dropdown-text/
├── plan.md              # Dit bestand
├── research.md          # Phase 0 output
├── data-model.md        # N/A (geen data) — niet aanmaken
├── quickstart.md        # Phase 1 output
├── checklists/
│   └── requirements.md  # Tijdens /speckit.specify aangemaakt
└── tasks.md             # Phase 2 output (/speckit.tasks — niet door /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── components/
│   └── ui/
│       └── select.tsx           # WIJZIGING — option styling toevoegen
├── app/
│   ├── globals.css              # bestaand — geen wijziging
│   └── theme.css                # mogelijke aanvullende WIJZIGING — globale option fallback
└── lib/
    └── utils.ts                 # bestaand — geen wijziging (cn() helper)
```

**Structure Decision**: Single-project (Next.js App Router). De wijziging is geïsoleerd in de herbruikbare `Select`-component (`src/components/ui/select.tsx`) die op alle 5+ locaties wordt gebruikt. Een aanvullende globale regel in `theme.css` kan als fallback dienen voor eventuele native `<select>` elementen buiten de `Select`-component. Dit past bij de bestaande architectuur: thema-CSS in `src/app/`, herbruikbare UI in `src/components/ui/`.

## Complexity Tracking

Geen constitution-violaties om te rechtvaardigen. Tabel leeg.