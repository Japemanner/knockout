# Tasks: Kortere laadtijd van pagina's

**Feature**: 029-page-load-performance | **Date**: 2026-11-06 | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

Deze takenlijst volgt de technische route uit de opdracht, stap 0 t/m 11. Stappen die bij de inventarisatie niet van toepassing bleken, zijn als zodanig gemarkeerd; de onderbouwing staat in [research.md](./research.md) §Nulmeting. De volgorde is bindend.

## Step 0 — Inventarisatie (vóór code)

- [x] **T000** Lees `AGENTS.md`, `.specify/memory/constitution.md`, `package.json`, `src/store/authStore.ts`, `src/components/layout/AppShell.tsx` en de bestaande Supabase-clients; leg vast welke opgegeven paden ontbreken (`vite.config.ts`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/hooks/useAuth.ts`, `src/hooks/queries.ts`, `src/lib/supabase.ts`, `src/lib/posthog.tsx`).
- [x] **T001** Zoek het service-workerbestand en de registratie in `src/` en `public/`; vaststelling: geen service worker, geen registratie. Zoek `vercel.json`, `netlify.toml` en `public/_headers`; alleen `netlify.toml` bestaat.
- [x] **T002** Draai `npm run build` en leg de routetabel en gzip-chunktabel vast in `research.md` §Nulmeting 0b.
- [x] **T003** Beschrijf de koude-startverzoeken op `/` in volgorde, met bestand en wachrelatie; beantwoord de dubbele-`fetchProfile`-vraag in `research.md` §Nulmeting 0c.
- [x] **T004** Supabase MCP: controleer de regio (`eu-north-1`, EU) en stop niet.
- [x] **T005** Supabase MCP: `get_advisors` type `performance`; leg alle meldingen vast (70 initplan, 20 unindexed FK, 6 unused index, 1 no primary key).
- [x] **T006** Supabase MCP: schrijf de volledige `pg_policies`-uitvoer voor `public` en `storage` naar `specs/029-page-load-performance/policies-before.txt` (101 policies).
- [x] **T007** Supabase MCP: controleer `pg_class.reltuples`; hoogste tabel 470 rijen, geen tabel > 500.000.
- [x] **T008** Context7/versiebronnen: leg vast dat Vite `%VITE_...%` vervangt (maar Vite ontbreekt), wanneer `INITIAL_SESSION` vuurt in auth-js 2.110.2, en dat posthog-js dynamisch te importeren is (maar posthog-js ontbreekt). Zie `research.md` §Nulmeting 0e.
- [x] **T009** Leg per stap 1–11 de N/A- of toepassingsstatus vast in `research.md` §Nulmeting 0f en de blokkades in 0h.

## Step 1 — Code-splitting per route (`src/App.tsx`)

- [x] **T100** **N/A** — `src/App.tsx` bestaat niet; Next.js splitst al per route en elke route heeft een eigen `page-*.js`. De zware-bibliothekeninventarisatie is uitgevoerd (AppShell → Supabase-browserclient, 49,9 kB gzip; react-markdown lazy; date-fns alleen `/uren`). Niets verplaatst. Zie `research.md` §Nulmeting 0a/0f.
- [x] **T101** **Next.js-equivalent na apart akkoord** — voeg `experimental.staleTimes.dynamic = 30` toe in `next.config.ts`, voeg `loading.tsx` toe voor `/content`, `/uren`, `/team` en `/theme-demo`, en vervang de uitlog-navigatie door `window.location.assign('/login')` zodat de clientroutercache wordt geleegd. Voeg `tests/e2e/performance.spec.ts` toe voor de paginawissel binnen 30 seconden. Build, tsc, eslint, Playwright en RLS-verificatie zijn groen. Zie `research.md` §Nulmeting 0j.

## Step 2 — Opstarten zonder waterval (`authStore.ts`, `useAuth.ts`)

- [x] **T200** **N/A** — `fetchProfile`, `src/hooks/useAuth.ts` en `is_platform_admin` bestaan niet. Het profiel wordt server-side één keer per request opgehaald via `getProfile()` met React `cache`. Geen codewijziging. Zie `research.md` §Nulmeting 0c/0f.

## Step 3 — Kolommen en filters in lijstqueries (`src/hooks/queries.ts`)

- [x] **T300** **N/A** — `src/hooks/queries.ts` bestaat niet. De werkelijke querybestanden zijn `src/lib/content/queries.ts`, `src/lib/hours/queries.ts` en de `use*.ts`-hooks; die vallen buiten de toegestane bestanden van deze route. Inventarisatie van `select('*')` staat in `research.md` §3.4. Geen codewijziging.

## Step 4 — React Query-standaarden

- [x] **T400** Controleer de `QueryClient` in `src/components/providers.tsx`: `staleTime` staat al op `60_000` (≥ 30 s), dus niet verlagen/verhogen. `gcTime` 5 minuten blijft.
- [x] **T401** Controleer de mutaties in `src/hooks/useContent.ts`, `useHours.ts`, `usePriorities.ts`, `useTimeTracking.ts` en `useDbExplorer.ts`: elke mutatie invalideert de betrokken keys. De genoemde flows (`rag-chat`, `document-webhook`, `analysis-run-submit`, `platform-admin`, `team-admin`) bestaan niet. Geen ontbrekende invalidatie gevonden; geen wijziging.

## Step 5 — PostHog later laden (`src/lib/posthog.tsx`)

- [x] **T500** **N/A** — `src/lib/posthog.tsx` bestaat niet; `posthog-js` staat niet in `package.json`; nergens anders wordt PostHog geïmporteerd. De enige treffer is de externe link in `AppShell`. Geen wijziging.

## Step 6 — Service worker

- [x] **T600** **N/A** — Geen service worker, geen registratie, geen fetch-handler. Niets te verwijderen of te verplaatsen; push is niet geïmplementeerd. Zie `research.md` §Nulmeting 0a.

## Step 7 — `index.html`

- [x] **T700** **N/A** — Geen `index.html`; de HTML-shell is `src/app/layout.tsx`. Geen Vite-`%VITE_...%`-vervanging en geen Google Fonts-`@import` in de shell. Geen wijziging.

## Step 8 — Cachingheaders

- [x] **T800** Voeg in `netlify.toml` een `Cache-Control: public, max-age=31536000, immutable`-header toe voor `/_next/static/*` (de werkelijke Next.js-assetmap; `/assets/(.*)` bestaat hier niet). `index.html`/de HTML-shell krijgt geen lange cache. Behoud de bestaande build- en pluginconfiguratie.

## Step 9 — Migratie: RLS en indexen

- [x] **T900** Herschrijf alle 90 policies uit `policies-before.txt` met een ongewrapte `auth.uid()`, `auth.jwt()`, `auth.role()`, `get_user_org_id()`, `is_org_admin()` of `is_platform_admin()`. Alleen deze functies zonder argumenten; `storage.foldername(name)` en andere functies met argumenten blijven ongemoeid.
- [x] **T901** Behoud per policy naam, tabel, permissive, roles en cmd; alleen `USING`/`WITH CHECK` krijgen de `(select ...)`-wrapper. Geen policy verwijderd of samengevoegd.
- [x] **T902** Voeg de 20 ontbrekende foreign-key-indexen toe met de namen `<tabel>_<kolom>_idx`. Geen andere indexen.
- [x] **T903** Schrijf `supabase/migrations/026_performance_rls.sql` (90 policy-rewrites + 20 indexen).
- [x] **T904** Schrijf `specs/029-page-load-performance/rollback.sql` die de 90 policies exact herstelt en de 20 nieuwe indexen verwijdert. Niet uitgevoerd.
- [x] **T905** Bevestiging ontvangen in de chat.
- [x] **T906** Pas de migratie toe via de Supabase MCP (`apply_migration`, naam `026_performance_rls`).
- [x] **T907** Na toepassing: `get_advisors` type `performance` opnieuw; `auth_rls_initplan` = 0 en `unindexed_foreign_keys` = 0. `policies-after.txt` opgeslagen (101 policies).
- [x] **T908** Vergelijk `policies-before.txt` en `policies-after.txt`: 0 ontbrekend, 0 toegevoegd, 0 metadatawijzigingen, 0 semantische expressiewijzigingen.
- [x] **T909** Voeg `scripts/rls-verify.mjs` toe en draai het na de migratie. Uitkomst: PASS — 101 policies, 0 raw auth-functies, boards 7/7, cards 142/142, hours 207/207, posts 9/9, profiles 1/1, 0 foreign boards.

## Step 10 — Tests (Playwright)

- [x] **T1000** **Geblokkeerd/N/A voor de letterlijke opdracht** — de tests mikken op `/rest/v1/profiles` en op client-side lijstquery's. In deze app leest de server `kk_profiles`; dat is niet in het browser-netwerkpaneel te tellen. Zonder de routercache-aanpassing (stap 1, N/A) zal een paginawissel-test terecht een nieuwe RSC-request zien. Geen test toegevoegd die de acceptatie niet echt dekt.
- [ ] **T1001** Na een keuze over de testaanpak: voeg een login-gated test toe voor de koude start en de paginawissel, of vervang de meting door een server-side logcheck.
- [x] **T1002** Bestaande Playwright-suite na de migratie gedraaid: 146 passed, 84 skipped, 0 failed. `node scripts/rls-verify.mjs` is groen.

## Step 11 — `quickstart.md`

- [x] **T1100** Werk `quickstart.md` bij met (1) releasevolgorde: migratie eerst, daarna frontend; (2) nameting: `get_advisors` performance + de handmatige iPhone-meting; (3) terugdraaien: frontend via de vorige deploy, database via `rollback.sql`.

## Definition of done voor deze uitvoering

- [x] `npx tsc --noEmit` groen.
- [x] `npx eslint src/ --max-warnings 0` groen.
- [x] `npm run build` groen; chunktabel vóór/na vastgelegd.
- [x] `staleTimes.dynamic = 30`, vier laadgrenzen en de harde uitlog-navigatie toegepast (T101).
- [x] Playwright-suite groen: 146 passed, 85 skipped, 0 failed. De nieuwe paginawissel-test is login-gated en skipt zonder sessie.
- [x] `node scripts/rls-verify.mjs` groen.
- [x] Migratie toegepast via de Supabase MCP; adviseur 0 initplan en 0 unindexed FK.
