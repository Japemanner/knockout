# Research: Dark Mode Dropdown Text Leesbaarheid

**Branch**: `017-fix-dark-dropdown-text` | **Date**: 2026-09-22

## Problem Analysis

### Root Cause

De `Select`-component in `src/components/ui/select.tsx` rendert een native `<select>` met `<option>` kinderen. De styling op het `<select>` element gebruikt `bg-transparent` en `text-sm` met `border-input` — de tekstkleur komt van de parent via Tailwind `text-foreground` (door `body { @apply text-foreground }` in `globals.css`).

In dark mode (`.dark` class op `<html>`):
- `--foreground` = `0 0% 98%` (bijna wit)
- `--background` = `240 10% 3.9%` (donker)

De `<select>` zelf heeft `bg-transparent`, dus erft de donkere achtergrond. De geselecteerde waarde wordt wit op donker — correct.

**Echter**: `<option>` elementen worden door de browser native gerenderd in een uitklaplijst die de browser zelf stylen. Het `<option>` element erft wél de CSS `color` (wit in dark mode), maar de browser gebruikt voor de uitklaplijst-achtergrond vaak de OS-native kleur of `color-scheme`. Dit levert witte tekst op een lichte (of anders-donkere) achtergrond op — onleesbaar.

### Betrokken componenten

De `Select`-component (`src/components/ui/select.tsx`) wordt hergebruikt op:
1. `src/components/theme/ThemeToggleSelect.tsx` — thema-selector (settings, theme-demo)
2. `src/components/hours/HoursEntryForm.tsx` — uren-invoer (client, activiteit, etc.)
3. `src/components/hours/HoursHistory.tsx` — uren-geschiedenis filters
4. `src/components/hours/CurrentSection.tsx` — huidige uren-weergave
5. `src/components/hours/ClientManageDialog.tsx` — client-beheer
6. `src/components/db-explorer/FormFieldMapper.tsx` — DB-explorer field mapping

### CSS Context

- `src/app/globals.css`: definieert `:root` (light) en `.dark` (dark) CSS variabelen. `body` krijgt `text-foreground` en `bg-background`.
- `src/app/theme.css`: stelt `color-scheme: dark/light` op `:root` via `@media (prefers-color-scheme)`. Dit beïnvloedt hoe de browser native controls rendert.
- `src/components/theme/ThemeProvider.tsx`: toggelt `.dark` class op `<html>` gebaseerd op `useThemeStore` (light/dark/system).

### Waargenomen gedrag

In dark mode:
- `<select>` gesloten: donkere achtergrond (`bg-transparent` → body `bg-background` = donker), witte tekst (`text-foreground` = wit) — correct en leesbaar.
- `<select>` open: `<option>` erft witte tekst, browser rendert uitklaplijst met native/OS-achtergrond — onleesbaar.

## Solution Options

### Option A: Inline styling op `<option>` in de component

Voeg expliciete `style` of Tailwind classes toe aan `<option>` elementen in `select.tsx`:
```tsx
<option
  key={opt.value}
  value={opt.value}
  className="bg-white text-black"
>
```

**Pros**: Component-level, geen globale CSS-bijwerkingen, overal toegepast waar `Select` wordt gebruikt.
**Cons**: `className` op `<option>` heeft beperkte browser-ondersteuning voor styling. Inline `style` is betrouwbaarder.

### Option B: Globale CSS-regel in `theme.css` of `globals.css`

```css
.dark option {
  background-color: white;
  color: black;
}
```

**Pros**: Vangt alle `<select>` elementen, ook eventuele native selects buiten de `Select`-component.
**Cons**: Globale regel, minder expliciet per component.

### Option C: Hybride — component + globale fallback

Component-level `style` op `<option>` in `select.tsx` + globale regel in `theme.css` als vangnet voor native selects buiten de component.

**Aanbeveling**: Option A (component-level) als primaire oplossing, omdat alle dropdowns via de `Select`-component gaan. Option B als aanvullende fallback alleen als er native selects buiten de component blijken te zijn.

## Browser Compatibility Notes

- Chrome/Edge: `<option>` styling wordt gedeeltelijk ondersteund. `color` en `background-color` werken.
- Firefox: volledige ondersteuning voor `color`/`background-color` op `<option>`.
- Safari: beperkte ondersteuning — `color` op `<option>` werkt, maar de uitklaplijst kan deels OS-native blijven. Echter, het instellen van `color-scheme` of expliciete kleuren helpt.
- De robuustste aanpak is inline `style` met `color` en `background-color` op `<option>` — dit heeft de breedste ondersteuning.

## Decision

**Option A**: Component-level inline styling op `<option>` in `src/components/ui/select.tsx`. Forceer `color: black` en `background-color: white` op elk `<option>` element. Het `<select>` element zelf behoudt `bg-transparent` + thema-tekstkleur voor het gesloten veld.

Deze aanpak is:
- Minimaal in scope (1 bestand)
- Robuust cross-browser (inline style > className voor `<option>`)
- Vangt alle 6+ gebruiklocaties via de herbruikbare component
- Geen regressie in light mode (witte bg + zwarte tekst = zelfde als light mode default)