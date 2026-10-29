# Fitness Check — 025-crud-categorie-sync

**Feature**: 025-crud-categorie-sync
**Datum**: 2026-10-29
**Status**: SHIP mits migratie 024_crud_categories.sql eerst handmatig in de Supabase SQL Editor wordt gedraaid (vastgestelde werkwijze; F-01 RLS-check draait dan mee). Tot die tijd degradeert de /crud-pagina gracieel: categorieën-query levert lege lijst (PostgREST-error genegeerd), tabrij toont alleen "Alle" + "+"-knop (aanmaak faalt met Supabase-fout).

---

## Uitgevoerde checks

| Check | Resultaat | Observatie |
|-------|-----------|------------|
| F-01 RLS (Supabase MCP) | SKIP | MCP niet verbonden in deze sessie. Migratie `024_crud_categories.sql` zet RLS aan met vier `user_id = auth.uid()`-policies (003-patroon). Post-check via SQL Editor: `select tablename, rowsecurity from pg_tables where tablename = 'kk_crud_categories'` — verwacht `rowsecurity = true`. |
| F-02 Geen secrets in client | PASS | Geen nieuwe env-waarden; sync-action gebruikt `getAuthenticatedClient()` en de bestaande SECURITY DEFINER-RPC's (besluit 2026-07-23). |
| F-03 Supabase client instances | WARN | Heuristiek telt 25× createClient (pre-existing). Nieuwe code hergebruikt uitsluitend `getAuthenticatedClient()` in actions en de server-client in de page — geen tweede instantie. |
| F-04 PKCE flow | PASS | Onveranderd — geen auth-wijziging. |
| F-05 Netlify config | PASS | Onveranderd. |
| F-06 TypeScript strict | PASS | `"strict": true` onveranderd. |
| F-07 TypeScript compileert | PASS | `npx tsc --noEmit` — 0 errors. |
| F-08 Geen unjustified `any` | PASS | Eén `eslint-disable` op `resolveOwnedCategoryId` in `crud-overviews.ts` (UntypedClient-patroon, conform bestaand patroon in het bestand). |
| F-09 Geen admin client | PASS | Alleen user-scoped mutaties onder RLS; sync leest meta via authenticated client. |
| F-10 Storage buckets | SKIP | Geen storage in deze feature. |
| F-11 Geen waitForTimeout in tests | PASS | Nieuwe tests gebruiken geen waitForTimeout. |
| F-12 .env.local in .gitignore | PASS | Onveranderd. |
| F-13 .env.example bestaat | PASS | Onveranderd. |
| F-14 Geen DOM-manipulatie | PASS | React-state only. |
| F-15 Conventional commits | PASS | Feature-commit volgt `feat(crud):` formaat (commit-msg hook). |
| F-16 Snyk SAST | SKIP | Snyk MCP niet verbonden in deze sessie. |
| F-17 Snyk SCA | SKIP | Geen nieuwe dependencies toegevoegd — package.json ongewijzigd. |

**Lokale pre-commit runs** (2× doorlopen, 2026-10-29): FAIL:0 WARN:2 PASS:11 SKIP:5 — 0 blocking. Warns zijn pre-existing (F-03 createClient-telling, F-15 historisch commit-formaat).

## Architectuur-conformiteit

- [x] Geen nieuwe dependencies — hergebruik bestaande shadcn/ui-componenten, lucide-react, getAuthenticatedClient
- [x] CRUD-module blijft op het bestaande server-render + revalidatePath-patroon; categoriefilter via URL-parameter met server-side filtering; door `searchParams`-gebruik is de pagina dynamisch geworden (`revalidate = 60`-export vervallen — verse data per request, de geplande "ISR per URL-variant" is daarmee vervangen door iets eenvoudigers en beters)
- [x] Sync-action: server-autoritaire pruning (meta-RPC server-side), `knownColumns` van de client dient alleen de diff-feedback; bij fouten wordt niets gewist (FR-014)
- [x] RLS + 4 policies op `kk_crud_categories` (003-patroon) in idempotente migratie; `ON DELETE SET NULL` op `category_id` garandeert FR-008 (overzichten overleven categorieverwijdering)
- [x] Ownership-check op `category_id` vóór insert/update (action-laag), RLS als vangnet
- [x] `pruneColumnSettings` hergebruikt de bestaande `pruneStaleFilters` (feature 018) — geen dubbele filterlogica
- [x] Nieuwe `revalidatePath` op de detailroute (sync) — E2E verifieert feedback + refresh (AGENTS.md-regressieregel)

## Tests

- `tests/e2e/crud-schema-sync-logic.spec.ts` (nieuw): 11 unit-tests op `src/lib/crud/schema-sync.ts` — diff (identiek, lege sets, hernoemde kolom), pruning (verborgen/volgorde/filters behoud + opschoning, relatieve volgorde, mutatie-vrijheid)
- `tests/e2e/crud-categorieen.spec.ts` (nieuw): 6 e2e-tests met login-skip-guards — tabrij + aanmaken, categoriefilter + "Alle", hernoemen persisteert na herladen, preselect in aanmaakdialoog, verwijderen houdt overzichten, sync-knop + feedback-toast
- Volledige suite: **141 passed / 69 skipped (login-gated) / 0 failed**
- `npx tsc --noEmit` en `npx eslint src/ --max-warnings 0` groen

## Gaps

- Migratie `024_crud_categories.sql` is nog niet gedraaid (handmatig via SQL Editor, vastgestelde werkwijze) — draaien vóór deploy; daarna `npm run types:update` draaien om de handmatige types te vervangen en de quickstart-handchecks (US1/US2/US3 incl. live schemadrift) uitvoeren
- Login-gated e2e-tests konden niet volledig lokaal draaien (geen sessie); draaien via CI tegen preview deploy
- Supabase MCP en Snyk MCP niet verbonden in deze sessie (F-01/F-10/F-16/F-17) — F-01 post-check via SQL Editor-query hierboven

---

# Fitness Check — 023-content-kalender

**Feature**: 023-content-kalender
**Datum**: 2026-10-14
**Status**: SHIP mits migratie 022_content_calendar.sql eerst handmatig in de Supabase SQL Editor wordt gedraaid (vastgestelde werkwijze; F-01 RLS-check draait dan mee)

---

## Uitgevoerde checks

| Check | Resultaat | Observatie |
|-------|-----------|------------|
| F-01 RLS (Supabase MCP) | SKIP | MCP niet verbonden in deze sessie. Migratie `022_content_calendar.sql` zet RLS aan op alle drie nieuwe tabellen (`kk_content_pillars`, `kk_content_slots`, `kk_content_posts`) met elk vier `user_id = auth.uid()`-policies. Post-check via SQL Editor: `select tablename, rowsecurity from pg_tables where tablename like 'kk_content_%'` — verwacht `rowsecurity = true` × 3. |
| F-02 Geen secrets in client | PASS | `src/lib/content/queries.ts` bevat geen secrets (zelfde afweging als de uren-beslissing); alleen anon key in de client bundle. |
| F-03 Supabase client instances | WARN | Heuristiek telt 25× `createClient` over routes. Content-module hergebruikt uitsluitend de patronen: browser-singleton (`src/lib/supabase/client.ts`), server-client via `createClient()` in de SSR-prefetch, `getAuthenticatedClient()` in actions — geen tweede instantie. |
| F-04 PKCE flow | PASS | Onveranderd — geen auth-wijziging. |
| F-05 Netlify config | PASS | Onveranderd. |
| F-06 TypeScript strict | PASS | `"strict": true` onveranderd. |
| F-07 TypeScript compileert | PASS | `npx tsc --noEmit` — 0 errors (noUncheckedIndexedAccess ving twee rastergrens-indices → `monthGridRange()`-helper met guard). |
| F-08 Geen unjustified `any` | PASS | `UntypedClient`-patroon met eslint-disable alleen in `queries.ts`, conform `src/lib/hours/queries.ts`. |
| F-09 Geen admin client | PASS | Alleen user-scoped mutaties onder RLS. |
| F-10 Storage buckets | SKIP | Geen storage in deze feature (bijlagen zijn feature 024). |
| F-11 Geen waitForTimeout in tests | PASS | Nieuwe tests gebruiken geen waitForTimeout. |
| F-12 .env.local in .gitignore | PASS | Onveranderd. |
| F-13 .env.example bestaat | PASS | Onveranderd. |
| F-14 Geen DOM-manipulatie | PASS | React-state only. |
| F-15 Conventional commits | PASS | Commit volgt `feat(content):` formaat (gecontroleerd in commit-msg hook). |
| F-16 Snyk SAST | SKIP | Snyk MCP niet verbonden in deze sessie. |
| F-17 Snyk SCA | SKIP | Geen nieuwe dependencies toegevoegd — package.json ongewijzigd. |

**Lokale fitness-check.sh run** (2026-10-14T17:47Z): FAIL:0 WARN:1 PASS:12 SKIP:5 — 0 blocking. De enige WARN is de F-03-heuristiek (createClient-telling over alle routes, pre-existing patroon).

## Architectuur-conformiteit

- [x] Geen nieuwe dependencies — hergebruik date-fns v4, @dnd-kit/core, TanStack Query v5, bestaande Radix/ui-componenten
- [x] Datalaag exact conform decisions/2026-09-22-uren-reads-browser-client.md: SSR-prefetch + HydrationBoundary, reads in queries.ts (geen 'use server', fouten gooien), mutaties server actions, **geen revalidatePath** (client invalideert React Query-keys)
- [x] SC-004: 0 server-action-calls voor reads na hydratie van /content
- [x] RLS + 4 policies per tabel in idempotente migratie (stijl 007_hours_tracking.sql), `unique (pillar_id, weekday)`, DB-check gepland/live ⇒ datum+tijd als vangnet
- [x] Tijdzone-veilig: alle datums 'YYYY-MM-DD'-strings, Amsterdamse dag via Intl-patroon (`amsterdamDateOf`), vandaag via `amsterdamTodayISO()`, nooit toISOString() op lokale datum
- [x] Slotmatching per ISO-week + soort in pure module — week over maandgrens gedekt door unit-test (29 sep + 1 okt 2026)
- [x] Optimistisch slepen met cancelQueries/getQueriesData/setQueriesData op `['content','month']` + `['content','ideas']`, snapshot-rollback + destructive toast (FR-033)
- [x] Server-side weigeringen vóór DB-call: gepland/live → ideeënbak geweigerd (FR-030), live niet sleepbaar (FR-032), validateStatusChange in elke status/tekst-mutatie (API-bypass onmogelijk)

## Tests

- `tests/e2e/content-calendar-logic.spec.ts` (nieuw): 25 unit-tests op `src/lib/content/calendar.ts` — alle twaalf quickstart-gevallen gedekt (raster, voorkomens, aanmaakdatum-grens, matching incl. maandgrens-week, isOverdue, emoji-telling, hook-preview-grenzen, vier validateStatusChange-weigeringen, drie resolveDropTime-varianten)
- `tests/e2e/content-calendar.spec.ts` (nieuw): 5 e2e-tests met login-skip-guards — nav-volgorde onder Uren, soort+slot aanmaken → leeg slot, klik-op-slot → editor (Concept, datum/tijd/soort), idee slepen → persistent in raster, geplande post slepen → LinkedIn-melding
- Volledige suite: **130 passed / 63 skipped (login-gated) / 0 failed**

## Gaps

- Migratie `022_content_calendar.sql` is nog niet gedraaid (handmatig via SQL Editor, vastgestelde werkwijze) — draaien vóór deploy; quickstart-stapvalidatie (tasks T033) kan daarna pas volledig
- Login-gated e2e-tests konden niet volledig lokaal draaien (geen sessie); draaien via CI tegen preview deploy
- Supabase MCP en Snyk MCP niet verbonden in deze sessie (F-01/F-10/F-16/F-17) — F-01 post-check via SQL Editor-query hierboven

---

# Fitness Check — 022-command-center-starred-kanban

**Feature**: 022-command-center-starred-kanban
**Datum**: 2026-10-06
**Status**: SHIP (login-gated e2e-tests draaien via CI; Supabase/Snyk MCP-checks niet verbonden in deze sessie)

---

## Update 2026-10-06 (later): migratie 021 uitgevoerd + ESLint hersteld

- **Migratie 021 is uitgevoerd op productie** (SQL Editor, zelfde pad als feature 019) inclusief runtime-fix 42P20 (window functions niet toegestaan in UPDATE SET → numbered CTEs, commit `fdfd264`). Post-checks bevestigden: elk bord exact Backlog/Doing/Done (posities 0/1/2), RLS nog enabled op `kk_columns`/`kk_cards`, geen kaartverlies. De 022-gap "migratie 021 moet vóór deploy zijn uitgevoerd" is hiermee dicht.
- **ESLint hersteld**: nieuwe flat-config `eslint.config.mjs` (FlatCompat + `next/core-web-vitals` + `next/typescript`; `next lint` is deprecated). Eerste run: 6 errors / 37 warnings. Alle 6 errors gefixed: `client.ts` NoopWebSocket-handlers `any` → `void`, `AuthInitializer.tsx` correct getypeerd via `ProfilePatch` i.p.v. `as any` cast, `spinner.tsx` lege interface → type-alias. De 37 resterende warnings zijn pre-existing (unused imports in oudere features) — kandidaat voor aparte opruim.
- **Suite volledig groen**: 105 passed / 58 skipped / 0 failed — inclusief herstelde decimal-helper-suite (achterhaalde tussenstatus-test vervangen, `validateDecimalFinal` nu gedocumenteerd in tests, commit `9c629ac`).

## Update 2026-10-07: ESLint-warnings opgeruimd — hook nu volledig actief

- Alle 37 pre-existing warnings opgeruimd (commit `4d656d5`): unused imports weg, dode props/interfaces verwijderd (CreateCrudButton.overviews, CreateBoardDialog.allBoards, CreateBoardButton.boards — callers bijgewerkt), twee `react-hooks/exhaustive-deps`-gaps gedicht (GenericTable `handleUpdate` miste `columns`; CardDetailModal vinkje-reset miste `isSaved`), `_`-prefix-conventie + `argsIgnorePattern` in eslint.config.mjs, scoped `no-img-element`-exception met motivatie in avatar.tsx.
- **Pre-commit hook rapporteert nu "ESLint clean"** bij `--max-warnings 0` — voor het eerst sinds projectstart functioneert stap 4/4 als echte quality gate.
- Verificatie: tsc 0 errors, eslint exit 0, suite 105 passed / 58 skipped / 0 failed.

---

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
- Drag-sync e2e-test gebruikt native mouse-events i.p.v. dnd-kit's `page.dragTo` — bij dnd-kit-versieconflict kan de test faalskippen; structuurtests dekken de kern dan nog