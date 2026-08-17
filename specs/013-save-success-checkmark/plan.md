# Implementation Plan: Save Success Checkmark

**Branch**: `013-save-success-checkmark` | **Date**: 2026-08-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/013-save-success-checkmark/spec.md`

## Summary

Na een succesvolle opslag in de kaartdetail-dialoog (`CardDetailModal`) moet de knop "Opslaan" direct worden vervangen door een groen vinkje op dezelfde positie. Zodra de gebruiker daarna opnieuw een veld wijzigt, verandert het vinkje terug naar de knop "Opslaan". Na een korte, vaste periode zonder verdere wijzigingen herstelt de knop vanzelf. Bij een mislukte opslag blijft de knop "Opslaan" zichtbaar en krijgt de gebruiker een foutmelding.

De wijziging is geconcentreerd in `src/components/kanban/CardDetailModal.tsx`: één extra stuk lokale UI-state (`isSaved`), een check-icon uit `lucide-react` (`Check`), een korte `setTimeout`-timer die het vinkje weer terugzet naar de knop, en een override in elke `onChange`-handler die `isSaved` direct reset naar `false`.

Er is geen database-schema-, server-action- of RLS-wijziging nodig. De feature is volledig UI-only en raakt geen persistente data.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode) + React 18 + Next.js 14 (App Router)

**Primary Dependencies**: Next.js 14, React 18, Tailwind CSS v3, shadcn/ui (`@/components/ui/button`, `@/components/ui/dialog`), `lucide-react` (`Check` icoon — al in de dependency-tree via `lucide-react`).

**Storage**: Supabase PostgreSQL (via bestaande `updateCard` server action in `src/actions/cards.ts`). Geen schema-wijziging. De feature voegt alleen een tijdelijke client-side UI-state toe; er wordt niets extra's opgeslagen.

**Testing**: Playwright (e2e — `tests/e2e/`). Geen unit-test framework aanwezig in `package.json`. De logica is klein genoeg om via een e2e-test te dekken die de kaartdetail-dialoog opent, een veld wijzigt, opslaat, en het groene vinkje vervolgens in de DOM aantreft.

**Target Platform**: Web (Netlify deployment), moderne browsers (Chrome/Edge/Firefox/Safari).

**Project Type**: Web applicatie (Next.js App Router, client components voor interactieve UI).

**Performance Goals**: Geen specifieke performance-doelen — state-wijziging is <1ms, render is een enkele knop-swap.

**Constraints**: TypeScript strict mode (geen `any` zonder `@ts-expect-error`). Geen nieuwe dependencies — `lucide-react` is al aanwezig. shadcn/ui `Button` component hergebruiken voor de knop-state; het groene vinkje is een inline `<span>` met het `Check` icoon en een groene Tailwind-klasse (`text-green-600` of `text-emerald-600`, donkere modus: `dark:text-green-500`). RLS op elke Supabase-tabel is onveranderd (feature raakt alleen UI).

**Scale/Scope**: 1 component wijziging (`CardDetailModal.tsx`), geen nieuwe bestanden, optioneel 1 Playwright e2e-test. Klein.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

De constitution (`.specify/memory/constitution.md`) is een lege template — geen principes of gates gedefinieerd. Geen schendingen mogelijk. Gate: PASS (geen principes om te evalueren).

## Project Structure

### Documentation (this feature)

```text
specs/013-save-success-checkmark/
├── plan.md              # Dit bestand
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── card-save-feedback.md  # Phase 1 output
├── checklists/
│   └── requirements.md  # Tijdens /speckit.specify aangemaakt
└── tasks.md             # Phase 2 output (/speckit.tasks — niet door /speckit.plan)
```

### Source Code (repository root)

```text
src/
└── components/
    └── kanban/
        └── CardDetailModal.tsx   # WIJZIGING — voeg isSaved-state + Check-icon swap toe
```

**Structure Decision**: Single-project (Next.js App Router). De wijziging is volledig geïsoleerd in de bestaande `CardDetailModal`-component. Geen nieuwe mappen of modules nodig. Dit past bij de bestaande architectuur: alle kanban-UI-componenten leven in `src/components/kanban/`.

## Complexity Tracking

Geen constitution-violaties om te rechtvaardigen. Tabel leeg.