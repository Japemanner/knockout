# Implementation Plan: Kortere laadtijd van pagina's

**Branch**: `029-page-load-performance` | **Date**: 2026-11-06 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/029-page-load-performance/spec.md` + de vaststelling in [research.md](./research.md) welke vermoedens in deze Next.js-codebase daadwerkelijk gelden.

## Summary

De app is geen Vite-SPA maar een Next.js 15 App Router-applicatie. Route-chunking, een eenmalige profielfetch en een gedeelde Supabase-browserclient bestaan dus al in een andere vorm dan de opdracht veronderstelt. De meetbare winst zit in vier lagen:

1. **Navigatie**: de Next.js-clientroutercache staat in Next.js 15 standaard op 0 seconden, waardoor elke paginawissel een nieuwe RSC-payload en nieuwe databasequeries veroorzaakt. `staleTimes.dynamic = 30` lost dit op. Dynamische routes zonder `loading.tsx` worden bovendien niet geprefetcht; die laadgrenzen worden toegevoegd.
2. **Code vooraf**: de Supabase-browserclient (chunk `5402`, 179,6 kB raw) wordt via de shell op elke dashboardroute geladen, terwijl de shell hem alleen bij uitloggen nodig heeft; alleen de auth-flows, `/content` en `/uren` gebruiken hem daadwerkelijk. De client wordt lazy geladen in het uitlogpad. Zware dialogs op `/content` en `/uren` worden alleen lazy geladen als de build een meetbare winst laat zien.
3. **Data**: lijstqueries halen alleen nog de kolommen op die de lijst toont; `/db` haalt de tabellijst tijdens de serverrender op in plaats van in een `useEffect`-serveractie na hydratie; React Query krijgt een expliciet 30-secondenbeleid zonder focus-refetch.
4. **Database**: 90 RLS-policies (waarvan de adviseur er 70 meldt) evalueren `auth.uid()`/`get_user_org_id()` per rij en 20 foreign keys missen een index. Eén idempotente migratie vervangt de expressies één-op-één en voegt de indexen toe.

Er komen geen nieuwe npm-dependencies, geen nieuwe schermen, geen nieuwe teksten en geen wijziging in rechten of analytics. De bestaande laadweergaven blijven zichtbaar.

## Technical Context

**Language/Version**: TypeScript 5.6 (strict, `noUncheckedIndexedAccess`) + React 18.3.1 + Next.js 15.5.19 (App Router)

**Primary Dependencies**: `@tanstack/react-query` 5.62, `@supabase/supabase-js` 2.110.2, `@supabase/ssr` 0.5, Tailwind CSS 3.4, shadcn/ui, `lucide-react` — **geen nieuwe packages**

**Storage**: Supabase PostgreSQL, project `ythjnatklbnjtvvgpwlr` (regio `eu-north-1`). 26 bestaande `kk_*`-tabellen met RLS. Geen nieuwe tabellen of kolommen; één migratie voor policy-expressies en foreign-key-indexen.

**Testing**: Playwright 1.61 (`tests/e2e`, login-gated skips), `npx tsc --noEmit`, `npx eslint src/ --max-warnings 0`, `npm run build`, Supabase MCP performance-adviseur, bestaande F-01-controle.

**Target Platform**: Web op Netlify via `@netlify/plugin-nextjs`; mobiel vanaf 375 px en desktop.

**Project Type**: Next.js App Router webapplicatie met server components, client components, server actions en TanStack Query.

**Performance Goals**:
- Koude start op `/`: profiel precies één keer; geen tweede profiel- of platformrolquery; paginachunk start parallel met sessie en profiel.
- Paginawissel binnen 30 seconden: nul nieuwe datarequests voor ongewijzigde data.
- Na een mutatie: nieuwe stand binnen 1 seconde zichtbaar op de betrokken pagina's.
- First Load JS van routes zonder browser-Supabase daalt meetbaar (richtwaarde 30 kB gzip); geen route wordt zwaarder; gedeelde basis (103 kB) groeit niet.
- `auth_rls_initplan`: 70 → 0; `unindexed_foreign_keys` in `public`: 20 → 0.
- Tweede bezoek: ongewijzigde statische bestanden komen uit de browsercache.

**Constraints**:
- Geen nieuwe npm-dependencies; `package.json` en `package-lock.json` blijven ongewijzigd.
- Geen wijziging in UI-tekst, schermindeling, rechten, datacontracten of analytics.
- RLS blijft semantisch identiek; geen policy verwijderen of samenvoegen.
- Geen service worker toevoegen of verwijderen; geen PostHog toevoegen of verwijderen.
- Geen server-side rendering introduceren of verwijderen; de bestaande RSC-aanpak blijft.
- TypeScript strict; geen nieuwe `any` zonder geannoteerde uitzondering.
- Bestaande laadweergaven (`Skeleton`, `Spinner`) blijven de enige laad-UI.

**Scale/Scope**: huidige dataset is klein (ca. 140 kaarten, 200 urenregels, 10 contentposts). De database- en kolomoptimalisaties zijn gericht op groei naar duizenden rijen en tientallen gebruikers per organisatie. Geen nieuwe routes of schermen.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

De constitutie in `.specify/memory/constitution.md` is nog een ongevulde template. Conform de werkwijze van 022–028 gelden de non-negotiable regels uit `AGENTS.md` als gates.

| Gate | Status | Note |
|------|--------|------|
| RLS op elke tabel | PASS | Geen nieuwe tabel. Alle 26 bestaande `kk_*`-tabellen houden RLS; alleen de policy-expressie wordt efficiënter. |
| Geen secrets in clientcode | PASS | Geen nieuwe env-waarden; de bestaande anon key blijft de enige clientwaarde. |
| Edge Functions voor privileged ops | N/A | Geen nieuwe privileged operatie. |
| PKCE auth flow | PASS | Auth-configuratie blijft ongewijzigd. |
| Netlify SPA-redirects | N/A | Geen routingwijziging. |
| Storage bucket policies | N/A | Geen Storage in deze feature. |
| TypeScript strict mode | PASS | Nieuwe code volledig getypeerd; bestaande geannoteerde `UntypedClient`-patronen blijven. |
| Eén Supabase-client per omgeving | PASS | De bestaande browserclient blijft singleton; alleen de import wordt lazy. |
| Regressietest-regel AGENTS.md | PASS | Nieuwe performance-/cache-regressietests plus de volledige bestaande suite. |
| Geen nieuwe dependencies | PASS | Alleen bestaande Next.js-, React- en React Query-API's. |

**Resultaat**: geen constitution-violations. Geen complexity tracking nodig.

## Project Structure

### Documentation (this feature)

```text
specs/029-page-load-performance/
├── plan.md                  # Dit bestand
├── spec.md                  # Feature-specificatie
├── research.md              # Phase 0 — welke vermoedens gelden, met bewijs
├── data-model.md            # Phase 1 — cache-, policy- en indexmodel; geen nieuwe entiteiten
├── contracts/
│   ├── performance-acceptance.md
│   ├── cache-and-invalidation.md
│   └── rls-policy-invariants.md
├── quickstart.md            # Phase 1 — meten en verifiëren
├── checklists/
│   └── requirements.md      # Tijdens /speckit.specify aangemaakt
└── tasks.md                 # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
next.config.ts                                   # TE WIJZIGEN — staleTimes.dynamic = 30
netlify.toml                                     # TE WIJZIGEN — edge-redirect / → /boards

src/
├── app/
│   └── (dashboard)/
│       ├── content/loading.tsx                  # NIEUW — bestaande Skeleton-stijl
│       ├── uren/loading.tsx                     # NIEUW — bestaande Skeleton-stijl
│       ├── team/loading.tsx                     # NIEUW — bestaande Skeleton-stijl
│       ├── theme-demo/loading.tsx               # NIEUW — bestaande Skeleton-stijl
│       ├── boards/page.tsx                      # TE WIJZIGEN — expliciete kolommen
│       ├── crud/page.tsx                        # TE WIJZIGEN — expliciete kolommen
│       ├── crud/[crudId]/page.tsx               # TE WIJZIGEN — expliciete kolommen
│       └── db/page.tsx                          # TE WIJZIGEN — server-side tabellijst
├── components/
│   ├── layout/AppShell.tsx                      # TE WIJZIGEN — Supabase-client lazy in signOut
│   ├── content/ContentView.tsx                  # EVENTUEEL — dynamic dialogs na meting
│   ├── hours/HoursView.tsx                      # EVENTUEEL — dynamic dialogs na meting
│   └── db-explorer/LocalTableList.tsx           # TE WIJZIGEN — props i.p.v. useEffect-fetch
├── lib/
│   ├── content/queries.ts                       # TE WIJZIGEN — expliciete kolommen
│   └── hours/queries.ts                         # TE WIJZIGEN — expliciete kolommen
├── components/providers.tsx                     # TE WIJZIGEN — refetchOnWindowFocus: false
├── hooks/
│   ├── useContent.ts                            # TE WIJZIGEN — staleTime ≥ 30 s
│   ├── useHours.ts                              # TE WIJZIGEN — revenue 15 → 30 s
│   ├── useDbExplorer.ts                         # TE WIJZIGEN — records 15 → 30 s
│   └── useTimeTracking.ts                       # TE WIJZIGEN — actieve timer staleTime 30 s, interval 15 s
└── ...

supabase/
└── migrations/
    └── 026_performance_rls.sql                  # NIEUW — policy-wrappers + FK-indexen

tests/
└── e2e/
    └── performance.spec.ts                      # NIEUW — login-gated cache-/profieltests
```

**Structure Decision**: bestaande Next.js App Router-structuur blijft ongewijzigd. Geen nieuwe mappen buiten de bestaande `app/(dashboard)`, `components`, `hooks`, `lib`, `supabase/migrations` en `tests/e2e`.

## Implementation Approach

De volgorde is bewust van laag risico naar hoger risico. Elke workstream is afzonderlijk meetbaar en terugdraaibaar.

### W1 — Navigatie en laadgrenzen

**Bestanden**: `next.config.ts`, vier nieuwe `loading.tsx`-bestanden.

**Werk**:
- `experimental.staleTimes.dynamic = 30` (seconden). `static` blijft de Next.js-default.
- Voeg in `netlify.toml` een edge-redirect toe van `/` naar `/boards` (status 302, `force = true`), vóór de overige regels. De bestaande `src/app/page.tsx` blijft als fallback voor lokaal ontwikkelen. Dit voorkomt een extra functie-invocatie en middleware-run op een koude start op `/`.
- `loading.tsx` toevoegen voor `/content`, `/uren`, `/team` en `/theme-demo`, met dezelfde `Skeleton`-opbouw als de bestaande laadgrenzen.
- Controleren dat `/crud`, `/db` en `/settings` via hun bestaande segmentbrede `loading.tsx` alle children afdekken.
- Controleren dat de 30-secondenroutercache na uitloggen geen dashboardpagina uit de cache toont; zo nodig de uitlogstroom naar een harde navigatie (`window.location.assign('/login')`) laten gaan, zodat de clientcache volledig verdwijnt.

**Effect**: paginawissels binnen 30 seconden hergebruiken de RSC-payload; dynamische routes worden geprefetcht en tonen direct de bestaande laadweergave. Dit dekt FR-002, FR-003, FR-004, FR-012 en SC-002/SC-003/SC-009.

### W2 — Shell en routechunks

**Bestanden**: `src/components/layout/AppShell.tsx`; eventueel `ContentView.tsx` en `HoursView.tsx`.

**Werk**:
- Vervang de statische `createClient`-import in `AppShell` door `const { createClient } = await import('@/lib/supabase/client')` binnen `handleSignOut`.
- Meet daarna de build. Alleen als `/uren` of `/content` nog steeds onevenredig groot is, worden de dialogs met `next/dynamic` gesplitst. Geen algemene dynamisering.
- Behoud exact dezelfde UI, laadstaten en foutafhandeling.

**Effect**: de Supabase-browserclient verdwijnt uit de eerste load van routes die hem niet gebruiken; de zwaarste routes worden niet zwaarder. Dit dekt FR-002, FR-011 en SC-006/SC-008.

### W3 — Lijstqueries en kolommen

**Bestanden**: `boards/page.tsx`, `crud/page.tsx`, `crud/[crudId]/page.tsx`, `src/lib/content/queries.ts`, `src/lib/hours/queries.ts`.

**Werk**:
- Bordenlijst: `id, name, is_inbox, position`.
- CRUD-lijst: `id, name, table_name, interaction_type, category_id`.
- CRUD-detail: expliciete lijst inclusief de configuratievelden die de detailpagina nodig heeft.
- Contentposts: actieve kolommen zonder de vijf legacy-kolommen; `body` blijft omdat de editor die direct nodig heeft.
- Urenregels: zonder `amount_due`; `description` blijft.
- Kaarten, de geneste bordquery en de kleine contentpillars-query blijven hun kolommen houden: de UI gebruikt daar vrijwel alle velden.

**Effect**: minder bytes en minder jsonb-/tekstparseerwerk per lijstrequest, zonder detailgedrag te veranderen. Dit dekt FR-005 en SC-006.

### W4 — `/db` server-side

**Bestanden**: `src/app/(dashboard)/db/page.tsx`, `src/components/db-explorer/LocalTableList.tsx`.

**Werk**:
- Maak `DatabasePage` async en haal de tabellijst tijdens de RSC-render op.
- Geef `tables` en `error` als props aan `LocalTableList`; verwijder de `useEffect`-fetch en de clientactie-import.
- Behoud dezelfde laad-, fout- en lege weergave. De serveractie `getLocalTableList` blijft bestaan voor ander gebruik.

**Effect**: één Netlify-invocatie en één waterfal minder op `/db`. Dit dekt FR-006 en SC-002.

### W5 — React Query-beleid

**Bestanden**: `src/components/providers.tsx`, `useContent.ts`, `useHours.ts`, `useDbExplorer.ts`, `useTimeTracking.ts`.

**Werk**:
- Globaal `refetchOnWindowFocus: false`.
- Lijst-/leesqueries minimaal 30 seconden `staleTime`.
- `useActiveTimeEntry`: `staleTime: 30_000`, `refetchInterval: 15_000` blijft.
- `useHours` revenue: 15 → 30 seconden.
- `useDbExplorer` records: 15 → 30 seconden.
- Mutaties behouden hun bestaande invalidatie; geen nieuwe invalidatiestrategie.

**Effect**: geen focus-refetch en geen refetch bij paginawissel binnen 30 seconden; de actieve tijdklok blijft live. Dit dekt FR-003, FR-004 en SC-003.

### W6 — RLS en foreign-key-indexen

**Bestand**: `supabase/migrations/026_performance_rls.sql`.

**Werk**:
- Laat `get_user_org_id()` **ongewijzigd**: de technische route van stap 9 verbiedt functiewijzigingen. De functie blijft `STABLE SECURITY DEFINER`; alleen de aanroep in de policy wordt `(select get_user_org_id())`.
- Voor elke policy die `auth.uid()` of `get_user_org_id()` gebruikt: dezelfde expressie met `(select ...)`. Geen policy verwijderen, samenvoegen of van rol laten veranderen.
- `CREATE INDEX IF NOT EXISTS` voor de 20 gemelde foreign keys.
- Migratie idempotent maken en via de Supabase MCP toepassen op `ythjnatklbnjtvvgpwlr`.
- Na toepassing de performance-adviseur opnieuw opvragen.

**Effect**: `auth_rls_initplan` 70 → 0 en `unindexed_foreign_keys` 20 → 0, met identieke rechten. Dit dekt FR-007, FR-008, FR-009 en SC-004/SC-005.

### W7 — Verificatie en regressietests

**Bestanden**: `tests/e2e/performance.spec.ts`, `FEATURES.md`, `FITNESS.md` (na implementatie).

**Werk**:
- Nieuwe Playwright-test (login-gated, bestaande skip-guard) die:
  - bij een koude load van `/boards` het aantal requests naar `kk_profiles` telt en op precies één controleert;
  - binnen 30 seconden `/boards → /crud → /boards` navigeert en controleert dat de bordenrequest niet opnieuw wordt gedaan;
  - een wijziging uitvoert en controleert dat de nieuwe stand direct zichtbaar is.
- Bestaande suite volledig draaien.
- Buildgrootte vergelijken met de baseline in research.md.
- Supabase performance-adviseur opnieuw draaien.
- Handmatige mobiele meting met netwerkthrottling voor de koude start op `/`.
- Controleren dat er geen service worker registratie is en geen PostHog-/analytics-request bij het opstarten.
- `FEATURES.md` en `FITNESS.md` bijwerken volgens de bestaande agent-workflow.

**Effect**: de acceptatie is aantoonbaar en future regressions worden gevangen. Dit dekt SC-001 t/m SC-010.

## Post-Design Constitution Re-check

| Gate | Status | Note |
|------|--------|------|
| RLS op elke tabel | PASS | Migratie wijzigt alleen de policy-expressie; geen tabel zonder RLS. |
| Geen secrets in clientcode | PASS | Geen nieuwe secrets; lazy import gebruikt dezelfde publieke client. |
| Edge Functions | N/A | Geen nieuwe privileged operatie. |
| PKCE | PASS | Ongewijzigd. |
| Netlify | PASS | Alleen een edge-redirect `/` → `/boards`; bestemming, auth en overige routes blijven gelijk. |
| Storage | N/A | Geen Storage. |
| TypeScript strict | PASS | Alle wijzigingen zijn getypeerd; geen nieuwe `any`. |
| Eén Supabase-client | PASS | De singleton in `src/lib/supabase/client.ts` blijft de enige browserclient. |
| Regressietests | PASS | Nieuwe performance-/cachetests plus de volledige suite. |
| Geen nieuwe dependencies | PASS | `package.json` blijft ongewijzigd. |

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

Geen violations. Geen complexity tracking nodig.

## Rollout en terugdraaien

1. **Meten**: baseline vastleggen (build, adviseur, suite). Dit is al gedaan in research.md.
2. **W1 + W5**: navigatie en React Query. Laag risico, direct meetbaar. Terugdraaien = config en `staleTime` terugzetten.
3. **W2**: shell lazy load. Terugdraaien = statische import herstellen.
4. **W3 + W4**: kolommen en `/db`. Terugdraaien = `select('*')`/oude clientfetch herstellen.
5. **W6**: database-migratie. Terugdraaien = een compensatiemigratie met de oude policy-expressies en `DROP INDEX` voor de nieuwe indexen.
6. **W7**: volledige verificatie en documentatie.

## Risks & Mitigations

| Risico | Kans | Impact | Mitigatie |
|--------|------|--------|-----------|
| `staleTimes` toont na een mutatie te lang oude data | Laag | Hoog | Elke mutatie revalideert of invalideert; expliciete E2E-test na wijziging. |
| De routercache toont na uitloggen nog een dashboardpagina | Laag | Hoog | Na uitloggen de clientcache hard legen (volledige navigatie naar `/login`); expliciete back-button-test. |
| RLS-expressie wijzigt per ongeluk rechten | Laag | Hoog | Één-op-één vervanging, geen policyverwijdering; adviseur + F-01 + volledige suite. |
| Lazy Supabase-import breekt uitloggen | Laag | Middel | Dynamische import in dezelfde handler; handmatige uitlogtest en bestaande auth-tests. |
| Nieuwe `loading.tsx` beïnvloedt layout | Laag | Laag | Alleen bestaande `Skeleton`-opbouw; visuele controle op 375 px. |
| Netlify-edge-redirect botst met de Next-plugin | Laag | Middel | Controleer op een preview deploy; val terug op een `next.config.ts`-redirect. `src/app/page.tsx` blijft als fallback. |
| Indexen vertragen schrijfacties | Laag | Laag | Kleine tabellen; meting en bestaande suite. |
| `/db`-refactor breekt foutstaat | Laag | Middel | Zelfde presentational component en fouttekst; handmatige controle zonder sessie en met sessie. |
| Playwright-tests zijn login-gated en skippen | Middel | Middel | Nieuwe tests volgen de bestaande skip-guard; daarnaast handmatige meting en build/adviseur-checks. |

## Done When

> Deze lijst is de oorspronkelijke plan-scope. De technische route van 2026-11-06 heeft alleen de aangevinkte onderdelen uitgevoerd; de overige punten vallen buiten die route en zijn niet als N/A gemarkeerd in `tasks.md`.

- [x] `staleTimes.dynamic = 30` actief (Next.js build meldt de `staleTimes`-experimentoptie).
- [ ] `/` gaat via de Netlify-edge-redirect naar `/boards`, zonder extra server-side redirect-invocatie.
- [x] Vier ontbrekende laadgrenzen toegevoegd met bestaande skeletons.
- [ ] Supabase-browserclient niet meer in de eerste load van routes die hem niet gebruiken.
- [ ] Lijstqueries selecteren alleen benodigde kolommen.
- [ ] `/db` haalt de tabellijst tijdens de serverrender op.
- [ ] React Query heeft 30-secondenbeleid zonder focus-refetch; actieve timer blijft live.
- [x] Migratie `026_performance_rls.sql` toegepast; adviseur 0 initplan en 0 unindexed FK in `public`.
- [x] Bestaande Playwright-suite groen (146 passed / 84 skipped / 0 failed).
- [x] `npm run build`, `npx tsc --noEmit` en `npx eslint src/ --max-warnings 0` groen.
- [x] `package.json` en `package-lock.json` ongewijzigd.
- [x] `scripts/rls-verify.mjs` is toegevoegd en groen; daarnaast zijn de performance-adviseur, F-01 en Playwright groen.
- [x] Geen service worker registratie en geen PostHog-/analytics-code toegevoegd of verwijderd; navigaties worden niet onderschept.
- [ ] `FEATURES.md` en `FITNESS.md` bijgewerkt.
