# Quickstart: Dark Mode Dropdown Text Leesbaarheid

**Branch**: `017-fix-dark-dropdown-text` | **Date**: 2026-09-22

## Wat er verandert

Eén component wordt aangepast: `src/components/ui/select.tsx`. Op elk `<option>` element wordt expliciet een donkere tekstkleur en lichte achtergrond geforceerd, zodat de uitklaplijst altijd leesbaar is — ongeacht het actieve thema.

## Implementatie

### Bestand: `src/components/ui/select.tsx`

Huidige `<option>` rendering (lijn 22-24):
```tsx
{options.map((opt) => (
  <option key={opt.value} value={opt.value}>{opt.label}</option>
))}
```

Aangepast:
```tsx
{options.map((opt) => (
  <option
    key={opt.value}
    value={opt.value}
    style={{ color: 'black', backgroundColor: 'white' }}
  >
    {opt.label}
  </option>
))}
```

De placeholder-`<option>` (lijn 21) krijgt dezelfde styling:
```tsx
{placeholder && (
  <option value="" disabled style={{ color: '#6b7280', backgroundColor: 'white' }}>
    {placeholder}
  </option>
)}
```

Het `<select>` element zelf behoudt `bg-transparent` en de thema-tekstkleur — het gesloten veld blijft het thema volgen.

## Verificatie

1. Zet de app in dark mode (settings → donker, of OS dark mode + thema "system")
2. Open een dropdown op:
   - Settings-pagina (thema-selector)
   - uren-invoerformulier (client/activiteit dropdowns)
   - uren-geschiedenis (filters)
   - client-beheer dialog
   - db-explorer field mapping
3. Controleer: alle opties in de uitklaplijst zijn leesbaar (zwarte tekst op witte achtergrond)
4. Schakel naar light mode en controleer: geen visuele verandering (zelfde zwart-op-wit)
5. Controleer het gesloten select-veld: in dark mode nog steeds witte tekst op donkere achtergrond

## Playwright test

Na implementatie: schrijf een e2e-test die in dark mode een dropdown opent en verifieert dat opties leesbaar zijn (computed style check of screenshot-vergelijking).