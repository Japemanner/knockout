# Fitness Check — 019-crud-column-order-new-record

**Feature**: 019-crud-column-order-new-record
**Datum**: 2026-09-22
**Status**: SHIP

## Uitgevoerde checks

| Check | Resultaat | Observatie |
|-------|-----------|------------|
| F-01 RLS (Supabase MCP) | SKIP | Geen DB-wijziging — feature leest alleen bestaande `kk_crud_overviews.column_order`. |
| F-02 Geen secrets in client | PASS | Geen wijziging in auth/secret-gerelateerde code. |
| F-03 Supabase client instances | PASS | Geen nieuwe createClient — één-regel UI-wijziging. |
| F-04 PKCE flow | PASS | Onveranderd — geen auth-wijziging. |
| F-05 Netlify config | PASS | Onveranderd. |
| F-06 TypeScript strict | PASS | `"strict": true` in tsconfig.json. |
| F-07 TypeScript compileert | PASS | `npx tsc --noEmit` — 0 errors (vóór en ná de wijziging geverifieerd). |
| F-08 Geen unjustified `any` | PASS | Geen `any` toegevoegd; wijziging is één prop-swap. |
| F-09 Geen admin client | PASS | Onveranderd. |
| F-10 Storage buckets | SKIP | Geen storage-wijziging. |
| F-11 Geen waitForTimeout in tests | PASS | Nieuwe test gebruikt geen waitForTimeout. |
| F-12 .env.local in .gitignore | PASS | Onveranderd. |
| F-13 .env.example bestaat | PASS | Onveranderd. |
| F-14 Geen DOM-manipulatie | PASS | Geen directe DOM-manipulatie. |
| F-15 Conventional commits | PASS | Commit volgt `feat(crud):` formaat. |
| F-16 Snyk SAST | SKIP | Snyk MCP niet verbonden in deze sessie. |
| F-17 Snyk SCA | SKIP | Snyk MCP niet verbonden in deze sessie. |

**Lokale fitness-check.sh run** (2026-09-22T08:51Z): FAIL:0 WARN:3 PASS:10 SKIP:5 — 0 blocking. Warns zijn pre-existing (F-03 createClient-telling, F-08 pre-existing `any` in AuthInitializer.tsx, F-15 commit-formaat oude commits).

## Architectuur-conformiteit

- [x] Geen nieuwe dependencies — hergebruik van bestaande `applyColumnOrder`-helper
- [x] Geen DB-schema wijziging — leest bestaande per-gebruiker `column_order`
- [x] Geen nieuwe Supabase client instance
- [x] TypeScript strict mode — `tsc --noEmit` schoon
- [x] Eén bron van waarheid voor volgorde — sortering gebeurt één keer (memoized `orderedColumns`), tabel én formulier delen dezelfde array
- [x] Geen interface-wijziging aan `DynamicForm` — impliciete contract (array-volgorde = veldvolgorde) benut
- [x] Veldselectie ongewijzigd — PK/identity/generated/hidden-filter is order-preserving, zelfde veldset

## Tests

- `tests/e2e/crud-column-reorder.spec.ts` (bestaand, sorteerlogica): 17/17 PASS — gegarandeerd doorlopend naar formulier
- `tests/e2e/crud-form-order.spec.ts` (nieuw): 3 tests met login-skip-guards; draait volledig in CI waar env + sessie beschikbaar zijn
- Pre-existing failure: `decimal-helper.spec.ts` "wijst enkele punt of komma af" (feature 008-gerelateerd, niet geraakt door deze wijziging)

## Gaps

- UI-e2e-tests konden niet volledig lokaal draaien (geen `.env.local` in deze workspace — dev-server vereist Supabase-credentials); draait via CI tegen preview deploy
- ESLint niet uitvoerbaar (geen eslint.config.js in project — pre-commit hook behandelt dit als non-blocking; geen config toegevoegd buiten scope)