# Tooling — Knowledge

## Feiten en patronen

- ESLint draait via flat-config `eslint.config.mjs` (FlatCompat + `next/core-web-vitals` + `next/typescript`). `next lint` is deprecated in Next.js 16 — niet meer gebruiken; de pre-commit hook draait `npx eslint src/ --max-warnings 0` en blokkeert echt sinds 2026-10-07.
- Bewust ongebruikte parameters (noop-implementaties, destructuring-rests, lege event-handlers, contract-params) krijgen een `_`-prefix; de config heeft `argsIgnorePattern: '^_'` + `varsIgnorePattern: '^_'`. Voorbeeld: `client.ts` NoopWebSocket, `filterRows(_columns)`.
- Scoped rule-exceptions krijgen een Nederlandse motivatiecomment direct boven de `eslint-disable-next-line` (patroon: avatar.tsx `no-img-element` — externe avatar-URL's, geen next/image domain-config per provider).
- F-08 (fitness-check) scant op unjustified `any` — de enige toegestane vormen zijn `_`-geprefixte of voorzien van suppressiecomment.
- Dode props/interfaces direct verwijderen inclusief caller-updates (CreateCrudButton.overviews, CreateBoardDialog.allBoards, CreateBoardButton.boards) — Next.js server actions blijven anders onnodig bereikbaar.

## Hypotheses

- Geen — alle bevindingen zijn direct bevestigd via lint/tsc/suite-runs.