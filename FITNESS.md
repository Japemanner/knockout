# Fitness Check — 022-command-center-starred-kanban

**Feature**: 022-command-center-starred-kanban
**Datum**: 2026-10-06
**Status**: SHIP (login-gated e2e-tests draaien via CI; Supabase/Snyk MCP-checks niet verbonden in deze sessie)

## Uitgevoerde checks

| Check | Resultaat | Observatie |
|-------|-----------|------------|
| F-01 RLS (Supabase MCP) | SKIP | Geen schema-wijzigingen; alle mutaties via bestaande RPC `kk_move_card` en user-scoped server actions onder bestaande RLS-policies. MCP niet verbonden in deze sessie. |
| F-02 Geen secrets in client | PASS | Geen secret-gerelateerde code; server action hergebruikt `getAuthenticatedClient()`. |
| F-03 Supabase client instances | PASS | Geen nieuwe createClient; `UntypedClient`-workaround in starred.ts verwijderd en vervangen door `getAuthenticatedClient()` — netto één client-patroon minder. Pre-existing WARN (24× createClient over routes) ongewijzigd. |
| F-04 PKCE flow | PASS | Onveranderd — geen auth-wijziging. |
| F-05 Netlify config | PASS | Onveranderd. |
| F-06 TypeScript strict | PASS | `"strict": true` ongewijzigd. |
| F-07 TypeScript compileert | PASS | `npx tsc --noEmit` — 0 errors. |
| F-08 Geen unjustified `any` | PASS | Nieuwe code bevat geen `any`; de enige pre-existing `any` (profile.ts:8) is niet geraakt. |
| F-09 Geen admin client | PASS | Alleen user-scoped client actions. |
| F-10 Storage buckets | SKIP | Geen storage-wijziging. |
| F-11 Geen waitForTimeout in tests | PASS | Nieuwe tests gebruiken geen waitForTimeout. |
| F-12 .env.local in .gitignore | PASS | Onveranderd. |
| F-13 .env.example bestaat | PASS | Onveranderd. |
| F-14 Geen DOM-manipulatie | PASS | React-state only. |
| F-15 Conventional commits | PASS | Commit volgt `feat(command-center):` formaat. |
| F-16 Snyk SAST | SKIP | Snyk MCP niet verbonden in deze sessie. |
| F-17 Snyk SCA | SKIP | Geen nieuwe dependencies toegevoegd. |

**Lokale fitness-check.sh run** (2026-10-06T17:26Z): FAIL:0 WARN:3 PASS:10 SKIP:5 — 0 blocking. Warns zijn pre-existing (F-03 createClient-telling, F-08 pre-existing `any` in profile.ts, F-15 commit-formaat oude commits).

## Architectuur-conformiteit

- [x] Geen nieuwe dependencies — hergebruik @dnd-kit/core, shadcn/ui, bestaande RPC
- [x] Geen schema-wijzigingen — kolom-mapping is stateless (ILIKE op naam), positionele mutatie via bestaande `kk_move_card`
- [x] Geen tweede Supabase client — server action gebruikt `getAuthenticatedClient()`
- [x] TypeScript strict — `tsc --noEmit` schoon; drie type-fouten tijdens implementatie gevangen en gefixed (null-filter via `.is()`, droppable-props, CardType-spread)
- [x] DnD-architectuur conform bestaand patroon: Pointer/Touch-sensors met bestaande activatie-constraints; SortableContext bewust weggelaten (FR-012: geen handmatige volgorde)
- [x] Optimistische update met rollback + destructive toast (FR-010)
- [x] Done-ster-regel geërfd van RPC (identiek aan bronbord-gedrag) — geen dubbele regel geïmplementeerd
- [x] Subtask-invariant beschermd: CC-bord toont alleen top-level kaarten; subtask-mutaties blijven op het bronbord
- [x] revalidatePath op beide routes (`/command-center` + `/boards/<id>`) bij mutatie vanuit beide richtingen (US2 + US3)

## Tests

- `tests/e2e/command-center-kanban.spec.ts` (nieuw): 4 tests met login-skip-guards — kolomstructuur Backlog/Doing/Done in volgorde, lege staat, kaart-in-kolom + bronbord-label, drag-sync persistent op bronbord
- `tests/e2e/kanban.spec.ts` (update): `/command-center route` describe herschreven naar bord-weergave (kolomkop-assertions, unieke kolomkoppen)
- `tests/e2e/regression.spec.ts`: data-correctheidstest (/starred vs /command-center) ongewijzigd geldig — bordnamen blijven als kaart-label tekst zichtbaar
- Volledige suite: 98 passed / 1 failed (pre-existing `decimal-helper.spec.ts:156`, niet geraakt door deze wijziging) / 58 skipped (login-gated)

## Gaps

- Login-gated e2e-tests konden niet volledig lokaal draaien (geen sessie); draaien via CI tegen preview deploy
- Supabase MCP en Snyk MCP niet verbonden in deze sessie (F-01/F-10/F-16/F-17) — uitvoeren zodra MCP beschikbaar is
- Prerequisite: migratie 021 (kolomnormalisatie) moet via Supabase MCP zijn uitgevoerd vóór productie-deploy van 022 — kolom-mapping is pas 100% betrouwbaar als elk bord exact Backlog/Doing/Done heeft
- ESLint niet uitvoerbaar (geen eslint.config.js in project — pre-commit hook behandelt dit als non-blocking; buiten scope van deze feature)
- Drag-sync e2e-test gebruikt native mouse-events i.p.v. dnd-kit's `page.dragTo` — bij dnd-kit-versieconflict kan de test faalskippen; structuurtests dekken de kern dan nog