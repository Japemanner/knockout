# Contract: Performance-acceptatie

**Feature**: 029-page-load-performance | **Date**: 2026-11-06

Dit contract koppelt elke acceptatie uit [spec.md](../spec.md) aan een meetbare controle. Een implementatie is pas klaar als alle regels hieronder aantoonbaar groen zijn.

## 1. Koude start op `/`

| Regel | Meting | Pass |
|-------|--------|------|
| P-01 | Aantal requests naar `kk_profiles` tijdens een koude load van `/` (network of Supabase-log) | Exact 1 |
| P-02 | Aantal profielrequests na hydratie (geen tweede fetch) | 0 |
| P-03 | Starttijd van de chunk van de doelpagina t.o.v. sessie/profiel in het networkpanel | Parallel; geen `sessie → profiel → chunk`-keten |
| P-04 | Aantal requests naar een platformrol | 0 (bestaat niet) |
| P-05 | Aantal requests naar PostHog bij opstart | 0 (SDK bestaat niet) |
| P-06 | Route van `/` naar `/boards` | Edge-redirect (302); geen server-side redirect uit de functie |

**Controle**: Chrome DevTools → Network, "Disable cache", mobiele throttling (Slow 4G). Filter op `kk_profiles` en `_next/static`. Herhaal met een lege browsercache.

## 2. Paginawissels en actualiteit

| Regel | Meting | Pass |
|-------|--------|------|
| P-10 | `/boards → /crud → /boards` binnen 30 s; aantal nieuwe bordenrequests | 0 |
| P-11 | Tab weg en terug binnen 30 s; aantal nieuwe requests voor dezelfde query | 0 |
| P-12 | Record toevoegen/wijzigen/verwijderen; tijd tot nieuwe stand zichtbaar | ≤ 1 s, zonder handmatige refresh |
| P-13 | `refetchOnWindowFocus` in de QueryClient-default | `false` |
| P-14 | `staleTime` van alle lijst-/leesqueries | ≥ 30.000 ms |
| P-15 | `refetchInterval` van de actieve tijdklok | 15.000 ms, ongewijzigd |
| P-16 | Na uitloggen en de browser-back induwen | Geen dashboarddata uit de clientcache zichtbaar; gebruiker eindigt op `/login` |

**Controle**: Playwright-test `tests/e2e/performance.spec.ts` met login-skip-guard; daarnaast handmatig in de browser.

## 3. Code en chunks

| Regel | Meting | Pass |
|-------|--------|------|
| P-20 | Gedeelde First Load JS na build | ≤ 103 kB (baseline) |
| P-21 | First Load JS van `/boards`, `/crud`, `/settings`, `/command-center`, `/starred`, `/db` | Meetbaar lager dan baseline; richtwaarde 30 kB gzip |
| P-22 | First Load JS van `/content` en `/uren` | Niet hoger dan baseline (200/211 kB) |
| P-23 | Elke route behalve `/login` heeft een eigen `page-*.js` | Ja |
| P-24 | `loading.tsx` aanwezig voor `/content`, `/uren`, `/team`, `/theme-demo` | Ja, met bestaande `Skeleton` |
| P-25 | Ongewijzigde statische bestanden bij tweede bezoek | Uit cache (`200 from disk/memory cache` of `304`) |

**Controle**: `npm run build`; vergelijk de routetabel met de baseline in [research.md](../research.md). Controleer in `.next/app-build-manifest.json` dat elke route een eigen page-chunk heeft.

## 4. Dataqueries

| Regel | Meting | Pass |
|-------|--------|------|
| P-30 | `select('*')` in lijstqueries van borden, CRUD en contentposts | Vervangen door expliciete kolommen |
| P-31 | `/db` doet na de eerste HTML nog een serveractie voor de tabellijst | Nee |
| P-32 | Lijstquery van CRUD-overzichten bevat `hidden_columns`, `column_order`, `column_filters` | Nee |
| P-33 | Contentposts-query bevat de vijf legacy-kolommen | Nee |
| P-34 | Urenquery bevat `amount_due` | Nee |

**Controle**: code-review op de genoemde bestanden + Netwerk-paneel; geen extra request na de eerste render op `/db`.

## 5. Database

| Regel | Meting | Pass |
|-------|--------|------|
| P-40 | `auth_rls_initplan` in `public` | 0 |
| P-41 | `unindexed_foreign_keys` in `public` | 0 |
| P-42 | RLS-semantiek | Identiek; zie [rls-policy-invariants.md](./rls-policy-invariants.md) |
| P-43 | Migratie idempotent | Ja; tweemaal toepassen geeft geen fout |

**Controle**: Supabase MCP `get_advisors` type `performance` op project `ythjnatklbnjtvvgpwlr`, vóór en na de migratie.

## 6. Niet-functionele invarianten

| Regel | Pass |
|-------|------|
| P-50 | Geen wijziging in UI-tekst, schermindeling of rechten |
| P-51 | Geen nieuwe npm-dependencies; `package.json` en `package-lock.json` ongewijzigd |
| P-52 | Geen service worker toegevoegd of verwijderd |
| P-53 | Geen PostHog- of andere analytics-code toegevoegd of verwijderd |
| P-54 | TypeScript strict compileert; geen nieuwe `any` zonder geannoteerde uitzondering |
| P-55 | `npx eslint src/ --max-warnings 0` groen |
| P-56 | Volledige Playwright-suite groen (login-gated skips toegestaan) |

## 7. Bewijsvoering

Bij de oplevering horen:

1. De buildtabel vóór en na.
2. De advisor-uitvoer vóór en na (aantallen en namen).
3. De Playwright-run (passed/failed/skipped).
4. Een korte handmatige meting van de koude start op `/` (mobiel, Slow 4G).
5. Een diff waaruit blijkt dat `package.json` en `package-lock.json` niet zijn gewijzigd.
