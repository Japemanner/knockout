# Fitness Check — 021-standardize-board-columns

**Feature**: 021-standardize-board-columns
**Datum**: 2026-10-06
**Status**: SHIP (met één openstaand vervolg: migratie uitvoeren via Supabase MCP)

## Uitgevoerde checks

| Check | Resultaat | Observatie |
|-------|-----------|------------|
| F-01 RLS (Supabase MCP) | SKIP | Migratie normaliseert data binnen bestaande tabellen; RLS-policies op `kk_columns`/`kk_cards` ongewijzigd (002). MCP niet verbonden in deze sessie — na MCP-uitvoering verifiëren: RLS enabled + elk bord exact 3 kolommen. |
| F-02 Geen secrets in client | PASS | Geen secret-gerelateerde code gewijzigd; migratie bevat geen credentials. |
| F-03 Supabase client instances | PASS | Geen nieuwe createClient — client-side/UX-wijzigingen + verwijderingen. |
| F-04 PKCE flow | PASS | Onveranderd — geen auth-wijziging. |
| F-05 Netlify config | PASS | Onveranderd. |
| F-06 TypeScript strict | PASS | `"strict": true` in tsconfig.json. |
| F-07 TypeScript compileert | PASS | `npx tsc --noEmit` — 0 errors (eerst een JSX-fout in KanbanBoard gevangen en gefixed). |
| F-08 Geen unjustified `any` | PASS | Geen `any` toegevoegd; verwijderde bestanden halen potentiele sources weg. Pre-existing warn in AuthInitializer.tsx onveranderd. |
| F-09 Geen admin client | PASS | Onveranderd. |
| F-10 Storage buckets | SKIP | Geen storage-wijziging; MCP niet verbonden — geen buckets geraakt. |
| F-11 Geen waitForTimeout in tests | PASS | Nieuwe test gebruikt geen waitForTimeout (alleen waitForLoadState/waitForURL). |
| F-12 .env.local in .gitignore | PASS | Onveranderd. |
| F-13 .env.example bestaat | PASS | Onveranderd. |
| F-14 Geen DOM-manipulatie | PASS | Geen directe DOM-manipulatie. |
| F-15 Conventional commits | PASS | Commit volgt `feat(kanban):` formaat. Pre-existing warn over oude commits onveranderd. |
| F-16 Snyk SAST | SKIP | Snyk MCP niet verbonden in deze sessie. |
| F-17 Snyk SCA | SKIP | Snyk MCP niet verbonden in deze sessie; geen nieuwe dependencies toegevoegd. |

**Lokale fitness-check.sh run** (2026-10-06T15:03Z): FAIL:0 WARN:3 PASS:10 SKIP:5 — 0 blocking. Warns zijn pre-existing (F-03 createClient-telling over meerdere Next.js-routes, F-08 pre-existing `any` in AuthInitializer.tsx, F-15 commit-formaat oude commits).

## Architectuur-conformiteit

- [x] Geen nieuwe dependencies — hergebruik bestaande kanban-stack en migratiepatroon
- [x] DB-wijziging uitsluitend als migration-bestand in `supabase/migrations/` (bestaand patroon, zie 016/018/019) — uitvoering deels aan Supabase MCP
- [x] Geen nieuwe Supabase client instance
- [x] TypeScript strict mode — `tsc --noEmit` schoon
- [x] Dode code verwijderd i.p.v. laten staan (columns.ts-actions waren ongebruikt; AddColumnForm was enige createColumn-consumer)
- [x] Consistente done-herkenning: frontend `trim().toLowerCase()` sluit aan bij bestaande `ILIKE 'done'` in RPC's (009_performance.sql)
- [x] Migratie is atomair (één DO-blok) en idempotent — herhaalde uitvoering verandert genormaliseerde borden niet
- [x] Kaart-behoud gegarandeerd: alle UPDATEs vóór DELETEs binnen hetzelfde transactie-blok
- [x] Vaste structuur afgedwongen op applicatieniveau (geen CRUD-pad rest), geen DB-trigger (overengineering afgewezen)

## Tests

- `tests/e2e/board-standard-columns.spec.ts` (nieuw): 4 tests met login-skip-guards — nieuw bord = exact Backlog/Doing/Done (data-correctheid), geen kolom-toevoegen, Done ingeklapt→uitklapbaar→reset na herladen, kaartteller zichtbaar
- `tests/e2e/regression.spec.ts` (update): kolomvolgorde-test nu Backlog/Doing/Done + exact-3 assert; verouderde "kolom aanmaken"-test verwijderd (functionaliteit bewust weg)
- `tests/e2e/kanban.spec.ts` (update): comment bijgewerkt
- Volledige suite: 98 passed / 1 failed (pre-existing `decimal-helper.spec.ts:156`, feature-008-gerelateerd, niet geraakt door deze wijziging — geverifieerd door stash-run zonder deze feature-code) / 54 skipped (login-gated)

## Gaps

- **Migratie nog niet uitgevoerd**: `supabase/migrations/021_standardize_board_columns.sql` moet via Supabase MCP op productie worden toegepast, gevolgd door verificatie (elk bord exact 3 kolommen; RLS nog enabled op kk_columns/kk_cards). Bestaande borden tonen pas de vaste structuur na deze stap.
- Supabase MCP en Snyk MCP niet verbonden in deze sessie (F-01/F-10/F-16/F-17) — uitvoeren zodra MCP beschikbaar is
- UI-e2e-tests konden niet volledig lokaal draaien (login-gated); draait via CI tegen preview deploy
- ESLint niet uitvoerbaar (geen eslint.config.js in project — pre-commit hook behandelt dit als non-blocking; geen config toegevoegd, buiten scope)