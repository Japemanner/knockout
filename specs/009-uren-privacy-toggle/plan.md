# Implementation Plan: Uren-tab privacy-toggle voor eurobedragen

**Branch**: `011-uren-privacy-toggle` | **Date**: 2026-07-28 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/009-uren-privacy-toggle/spec.md`

## Summary

De uren-tab krijgt een privacy-toggle waarmee de gebruiker met één klik alle euro-bedragen (omzetkaart, dagtotalen, uurtarieven en regeltotalen) verbergt. In plaats van elk bedrag toont het systeem een €-symbool met diagonale streep erdoor. De voorkeur wordt per browser bewaard (Zustand + `persist` middleware, conform bestaand `themeStore`-patroon). Een gedeelde `<EuroSymbol>`-helper centraliseert de weergave: bij "aan" toont hij het doorgestreepte €-teken, bij "uit" het originele bedrag. De toggle zelf wordt een herbruikbare knop in de `HoursView`-header, naast "Beheer opdrachtgevers".

## Technical Context

**Language/Version**: TypeScript 5.x (strict), React 18

**Primary Dependencies**: Next.js App Router, Zustand (`persist` middleware), TanStack Query, Tailwind CSS, lucide-react icons, shadcn/ui componenten (Button, Switch, Dialog, Card)

**Storage**: Browser `localStorage` voor privacy-voorkeur (via Zustand persist — geen Supabase-wijziging). Supabase blijft ongewijzigd; de feature is volledig client-side presentatielaag.

**Testing**: Playwright (E2E) via Playwright MCP; bestaand patroon met `if (page.url().includes('/login'))` skip-guard.

**Target Platform**: Web (Netlify), moderne Chromium/Firefox/Safari

**Project Type**: Web app (Next.js App Router, client components voor uren-tab)

**Performance Goals**: Toggle-wissel zichtbaar binnen 1 seconde (SC-002). React-herrendering van uren-componenten is lokaal en cheap — geen netwerkronde.

**Constraints**: Geen server-side wijzigingen. Geen nieuwe Supabase-tabellen of RLS. Toggle geldt alleen voor de uren-tab (FR-008).

**Scale/Scope**: 1 nieuwe store, 1 nieuwe helper-component, 1 nieuwe toggle-knop, 4 bestaande componenten aangepast (HoursView, HoursDashboard, HoursHistory, ClientManageDialog).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Geen `.specify/constitution.md` aanwezig — gate valt weg. Project-AGENTS.md is leidend:

- **RLS on every table** — N.v.t.: geen Supabase-wijzigingen. PASS.
- **No secrets in client code** — N.v.t.: geen secrets. PASS.
- **Edge Functions for privileged operations** — N.v.t.: volledig client-side. PASS.
- **PKCE auth flow** — Onaangetast. PASS.
- **Netlify redirects for SPA** — Onaangetast. PASS.
- **Storage bucket policies** — N.v.t. PASS.
- **TypeScript strict mode** — Alle nieuwe code strict-compatibel, geen `any`. PASS.
- **Geen nieuwe dependencies** — Zustand en persist al aanwezig (zie `themeStore.ts`). PASS.

## Project Structure

### Documentation (this feature)

```text
specs/009-uren-privacy-toggle/
├── spec.md              # Specificatie (/speckit.specify)
├── plan.md              # Dit bestand (/speckit.plan)
├── checklists/
│   └── requirements.md  # Quality checklist
└── tasks.md             # (later, via /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── store/
│   └── privacyStore.ts          # NIEUW — Zustand store met persist (hideAmounts: boolean)
├── components/
│   └── hours/
│       ├── PrivacyToggle.tsx    # NIEUW — toggle-knop voor in HoursView-header
│       ├── EuroSymbol.tsx       # NIEUW — helper: toont € bedrag of doorgestreept €
│       ├── HoursView.tsx        # AANGEPAST — toggle in header, store-provider
│       ├── HoursDashboard.tsx   # AANGEPAST — RevenueCard gebruikt EuroSymbol
│       ├── HoursHistory.tsx     # AANGEPAST — dagtotalen + regeltotalen via EuroSymbol
│       └── ClientManageDialog.tsx # AANGEPAST — uurtarief-weergave via EuroSymbol
└── (rest ongewijzigd)

tests/
└── e2e/
    └── uren-privacy-toggle.spec.ts  # NIEUW — Playwright regressietest
```

**Structure Decision**: Single-project (Next.js App Router). Nieuwe bestanden volgen bestaande mappenstructuur: store in `src/store/`, componenten in `src/components/hours/`. Geen nieuwe mappen of packages.

## Implementation Phases

### Phase 0 — Research (voltooid in deze sessie)

- Alle uren-componenten gelezen en euro-bedragen geïnventariseerd:
  1. `HoursDashboard.tsx:74,78` — `formatEuro(revenue.week)` en `formatEuro(revenue.month)` in RevenueCard
  2. `HoursHistory.tsx:316` — dagtotalen `€ {group.entries.reduce(...).toFixed(2).replace('.', ',')}`
  3. `HoursHistory.tsx:421,423` — per-entry `€ {entry.hourly_rate.toFixed(2)}` en `€ {(entry.hours * Number(entry.hourly_rate)).toFixed(2)}`
  4. `ClientManageDialog.tsx:325` — `€ {Number(client.hourly_rate).toFixed(2).replace('.', ',')} / uur`
- Bestaand patroon gevonden: `themeStore.ts` gebruikt Zustand + `persist` met `localStorage` — exact het patroon voor de nieuwe `privacyStore.ts`.
- `Switch`-component bestaat al in `src/components/ui/switch.tsx` — kan hergebruikt worden, maar voor een "knop in de header" past een `Button`-variant met icon beter bij FR-001.
- `cn`-helper in `src/lib/utils.ts` voor class-merge.
- `useHours.ts` gebruikt TanStack Query; geen wijziging nodig — privacy is presentatie, geen data.

### Phase 1 — Design

#### 1a. privacyStore.ts (Zustand + persist)

```typescript
interface PrivacyStore {
  hideAmounts: boolean
  toggle: () => void
  setHideAmounts: (v: boolean) => void
}
```
- `persist` met key `privacy-store`, `localStorage` storage — conform `themeStore.ts`.
- Default: `false` (bedragen zichtbaar).
- `toggle()` wisselt `hideAmounts`.

#### 1b. EuroSymbol.tsx (helper-component)

Props: `value: number | null | undefined` + optionele `className`.
- Leest `hideAmounts` uit `usePrivacyStore`.
- Als `hideAmounts === true` of `value` is leeg/0 → toont doorgestreept €-teken (alleen als er daadwerkelijk een financieel bedrag is — FR-009: bij tarief 0/leeg géén streep tonen).
- Anders → toont het bedrag in bestaande formattering (`€ {value.toFixed(2).replace('.', ',')}`).
- Visueel: een `<span>` met `€` en een diagonale streep. De streep kan met CSS (`line-through` op een €-glyph) of een SVG-icoon. Voor de "schuine streep door het euro-teken" is een kleine inline SVG het meest betrouwbaar cross-browser; anders `text-decoration: line-through` op een span met alleen `€`.

#### 1c. PrivacyToggle.tsx (knop in header)

- Leest `hideAmounts` en `toggle` uit de store.
- `Button variant="outline" size="sm"` met een icoon (lucide `EyeOff` bij aan, `Eye` bij uit) en label "Privacy" of "€ verbergen".
- Visueel onderscheid aan/uit (FR-004): bij "aan" `variant="default"` of actieve kleur; bij "uit" `variant="outline"`.

#### 1d. HoursView.tsx aanpassing

- Importeer `PrivacyToggle` en plaats hem in de header-flex naast "Beheer opdrachtgevers" (FR-001).

#### 1e. HoursDashboard.tsx aanpassing

- `RevenueCard` vervangt `formatEuro(revenue.week)` / `formatEuro(revenue.month)` door `<EuroSymbol value={revenue.week} />` en `<EuroSymbol value={revenue.month} />`.
- `formatEuro`-helper blijft voor niet-privacy-gebruik of wordt vervangen door EuroSymbol intern.

#### 1f. HoursHistory.tsx aanpassing

- Dagtotalen: vervang `<> · € {group.entries.reduce(...).toFixed(2).replace('.', ',')}</>` door een `<EuroSymbol>` met de berekende waarde (alleen getoond als `group.entries.some((e) => Number(e.hourly_rate) > 0)` — blijft als wrapper-voorwaarde).
- Per-entry: vervang `€ {entry.hourly_rate.toFixed(2)}` / `€ {(entry.hours * Number(entry.hourly_rate)).toFixed(2)}` door `<EuroSymbol value={...} />` (alleen als `Number(entry.hourly_rate) > 0`).

#### 1g. ClientManageDialog.tsx aanpassing

- Regel 325: `€ {Number(client.hourly_rate).toFixed(2).replace('.', ',')} / uur` → `<EuroSymbol value={Number(client.hourly_rate)} /> / uur`.
- Invoervelden voor uurtarief (regels 222, 281) blijven functioneel — alleen weergave van de opgeslagen waarde verbergt. Input zelf niet aanpassen (FR-009 / edge case "invoer blijft mogelijk").

### Phase 2 — Tasks (later via `/speckit.tasks`)

Gedetailleerde taak-uitbraak met estimate en volgorde wordt in `tasks.md` gezet. Hier de globale volgorde:

1. `privacyStore.ts` aanmaken (+ type-check)
2. `EuroSymbol.tsx` aanmaken (+ type-check)
3. `PrivacyToggle.tsx` aanmaken (+ type-check)
4. `HoursView.tsx` header uitbreiden met toggle
5. `HoursDashboard.tsx` RevenueCard via EuroSymbol
6. `HoursHistory.tsx` dagtotalen + regeltotalen via EuroSymbol
7. `ClientManageDialog.tsx` uurtarief-weergave via EuroSymbol
8. Playwright regressietest schrijven en draaien
9. `tsc --noEmit` + `eslint` + `fitness-check.sh` groen
10. Conventional commit `feat(uren): privacy-toggle voor eurobedragen`

## Complexity Tracking

> Geen constitution violations — tabel niet van toepassing.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| —          | —          | —                                    |