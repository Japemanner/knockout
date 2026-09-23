# Quickstart: Extern Exact Link

**Feature**: 020-extern-exact-link | **Date**: 2026-09-23

## Verificatie van de feature

1. Start de dev-server (`npm run dev`)
2. Log in met een bestaand account
3. Controleer in de sidebar (desktop én mobiel) onder de header **"Extern"**:
   - Er staat een item met label **"Exact"**
   - Het heeft een calculator-icoon
   - Rechts staat het externe-link-icoon (pijl), net als bij de andere externe links
4. Klik op **"Exact"**
   - Er opent een nieuw browsertabblad
   - De URL is `https://portaal.hrsg.nl/`
   - De applicatie zelf blijft open in het oorspronkelijke tabblad

## Wat is er gewijzigd

- `src/components/layout/AppShell.tsx` — icoon-import (`Calculator`) + één item in de `externalLinks`-array

## Wat is er NIET gewijzigd

- Geen database-migraties, geen RLS-policies, geen Edge Functions
- Geen andere externe links of navigatie-items
- Geen styling — het item erft automatisch de bestaand render-logica

## Sanity checks na implementatie

- `tsc --noEmit` — compileert zonder errors
- `npx eslint src/ --max-warnings 0` — geen lint-warnings
- E2E-test `extern-exact-link.spec.ts` — groen (of geskipt bij geen sessie)