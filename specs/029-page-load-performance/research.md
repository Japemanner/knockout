# Research: Kortere laadtijd van pagina's

**Feature**: 029-page-load-performance | **Date**: 2026-11-06 | **Spec**: [spec.md](./spec.md)

Dit document stelt vast welke vermoedelijke oorzaken uit de opdracht in deze repository daadwerkelijk gelden. De opdracht beschrijft een Vite/React-SPA; de repository bevat in werkelijkheid een **Next.js 15.5.19 App Router**-applicatie. Een aantal vermoedens is daardoor niet van toepassing. Dat is hieronder per vermoeden onderbouwd met bestanden, buildoutput en live database-adviezen. De functionele bedoeling blijft leidend: minder code vooraf, minder opeenvolgende verzoeken en geen onnodig herladen.

## Nulmeting

Deze sectie is de inventarisatie uit stap 0 van de technische route (2026-11-06). De route is geschreven voor een Vite-SPA; deze repository is een Next.js App Router-app. Alle afwijkingen en niet-van-toepassing-verklaringen staan hieronder, zodat de latere stappen niet blind worden uitgevoerd.

### 0a — Bestanden, service worker en hosting

| Pad uit de opdracht | Aanwezig? | Vaststelling |
|---------------------|-----------|--------------|
| `AGENTS.md` | Ja | Gelezen. Bevat de projectregels; geen Vite-specifieke inhoud. |
| `.specify/memory/constitution.md` | Ja | Gelezen. Is nog de ongevulde template; `AGENTS.md` fungeert als constitution. |
| `package.json` | Ja | Gelezen. Next.js 15.5.19, React 18.3.1, geen Vite, geen PostHog, geen PWA-plugin. |
| `vite.config.ts` | **Nee** | Bestaat niet; er is geen Vite-configuratie. |
| `index.html` | **Nee** | Bestaat niet; de HTML-shell is `src/app/layout.tsx`. |
| `src/main.tsx` | **Nee** | Bestaat niet; Next.js heeft geen eigen client-entry. |
| `src/App.tsx` | **Nee** | Bestaat niet; routing is file-based in `src/app/**/page.tsx`. |
| `src/store/authStore.ts` | Ja | Gelezen. Bevat alleen `userId`, `profile`, `isLoading`, `isAuthenticated` en setters; geen `fetchProfile`. |
| `src/hooks/useAuth.ts` | **Nee** | Bestaat niet. |
| `src/hooks/queries.ts` | **Nee** | Bestaat niet; query's staan in `src/lib/content/queries.ts`, `src/lib/hours/queries.ts` en `src/hooks/use*.ts`. |
| `src/lib/supabase.ts` | **Nee** | Bestaat niet; de client staat in `src/lib/supabase/client.ts` (browser) en `src/lib/supabase/server.ts` (server). |
| `src/lib/posthog.tsx` | **Nee** | Bestaat niet; PostHog is geen dependency en wordt nergens geïnitialiseerd. |
| `src/components/layout/AppShell.tsx` | Ja | Gelezen. Importeert de Supabase-browserclient statisch; gebruikt hem alleen bij uitloggen. |
| Service worker | **Nee** | Geen `sw.js`, `service-worker.js`, `navigator.serviceWorker` of `pushManager` in `src/` of `public/`. `public/` bevat alleen vier iconen. |
| `vercel.json` | **Nee** | Bestaat niet. |
| `netlify.toml` | Ja | Gelezen. Buildt en publiceert `.next` via `@netlify/plugin-nextjs`. |
| `public/_headers` | **Nee** | Bestaat niet. |

**Zware bibliotheken op elke route** (inventarisatie, niets verplaatst):

- `src/components/layout/AppShell.tsx` importeert `@/lib/supabase/client`. Dat trekt chunk `5402` (179,6 kB raw / **49,9 kB gzip**) naar de gedeelde dashboardlayout, terwijl de shell hem alleen bij uitloggen gebruikt.
- `lucide-react` wordt in `AppShell` en losse componenten gebruikt; `experimental.optimizePackageImports` in `next.config.ts` tree-shaket dit al.
- `react-markdown` + `remark-gfm` (chunk `83.9`, 142 kB raw / **42,6 kB gzip**) worden alleen via `next/dynamic` in `KanbanBoard` geladen, niet op elke route.
- `@dnd-kit/*` zit alleen in de kanbanroute; `date-fns` alleen in `/uren` (chunk `9841`, **9,9 kB gzip**).
- Geen pdf-, docx- of grafiekbibliotheek in de globale entry.

### 0b — Build en gzip-groottes

`npm run build` (Next.js 15.5.19) is groen. Routetabel (First Load JS is de gzip-maat die Next.js rapporteert):

| Route | Size | First Load JS |
|-------|------|---------------|
| `/` | 156 B | 103 kB |
| `/_not-found` | 998 B | 104 kB |
| `/auth/callback` | 156 B | 103 kB |
| `/boards` | 4,13 kB | 117 kB |
| `/boards/[boardId]` | 7,75 kB | 138 kB |
| `/command-center` | 5,84 kB | 141 kB |
| `/content` | 11,5 kB | 200 kB |
| `/crud` | 6,88 kB | 120 kB |
| `/crud/[crudId]` | 3,07 kB | 147 kB |
| `/db` | 1,66 kB | 104 kB |
| `/db/[tableName]` | 841 B | 145 kB |
| `/forgot-password` | 2,75 kB | 180 kB |
| `/login` | 2,70 kB | 180 kB |
| `/reset-password` | 2,92 kB | 177 kB |
| `/settings` | 3,56 kB | 116 kB |
| `/settings/db` | 3,97 kB | 117 kB |
| `/settings/db/[connectionId]` | 1,52 kB | 107 kB |
| `/settings/db/[connectionId]/[tableName]` | 740 B | 145 kB |
| `/starred` | 165 B | 106 kB |
| `/team` | 156 B | 103 kB |
| `/theme-demo` | 2,19 kB | 114 kB |
| `/uren` | 22,4 kB | 211 kB |
| Gedeelde basis | — | **103 kB** |

Grootste chunks met gzip (gemeten met `GZipStream` over de bestanden in `.next/static/chunks`):

| Chunk | Raw | Gzip |
|-------|-----|------|
| `4bd1b696-f785427dddbba9fb.js` | 169,0 kB | 53,1 kB |
| `5402-401168146e916479.js` (Supabase-browserclient) | 179,6 kB | 49,9 kB |
| `1255-5c680abb9db89955.js` | 169,3 kB | 45,3 kB |
| `framework-f31701c9d93f12a4.js` | 136,6 kB | 43,9 kB |
| `83.9b0c36668366aa2a.js` (react-markdown, lazy) | 142,0 kB | 42,6 kB |
| `polyfills-42372ed130431b0a.js` | 110,0 kB | 38,5 kB |
| `main-76266646195d9450.js` | 117,5 kB | 33,7 kB |
| `1890-80e8e09ebc2cf39a.js` | 43,7 kB | 14,4 kB |
| `44530001-82096455ede4fd1e.js` | 61,5 kB | 13,1 kB |
| `app/(dashboard)/uren/page-6504b810975a8357.js` | 47,8 kB | 12,0 kB |
| `app/(dashboard)/content/page-eaa25af5e126b013.js` | 42,3 kB | 11,3 kB |
| `9841-4c550d8808149b12.js` (date-fns, /uren) | 33,8 kB | 9,9 kB |
| `7361-1c182c332180b03c.js` | 28,9 kB | 8,9 kB |
| `app/(dashboard)/boards/[boardId]/page-c8e1ad0b6efa050f.js` | 23,5 kB | 7,6 kB |
| `app/(dashboard)/crud/page-0811b62b5eb67497.js` | 23,4 kB | 6,7 kB |
| `4909-a6ccb82e391d8f86.js` | 19,7 kB | 6,6 kB |
| `6701-a6d0437d5667bd87.js` | 20,1 kB | 6,5 kB |
| `app/(dashboard)/command-center/page-1a3c97d38dad3baf.js` | 17,2 kB | 5,7 kB |
| `4101-c7fa6182a374471c.js` | 16,9 kB | 5,5 kB |
| `app/(dashboard)/layout-f4b7f71979c1e2be.js` | 14,3 kB | 5,3 kB |

Elke route heeft een eigen `page-*.js` in `.next/app-build-manifest.json`. Next.js splitst dus al per route; er is geen Vite-`index.html` met één ingang.

### 0c — Verzoeken bij een koude start op `/` (ingelogde adviseur)

De daadwerkelijke volgorde in deze Next.js-app:

1. **Navigatie `/`** — browser → Netlify/Next.
2. **Middleware** — `src/middleware.ts` → `src/lib/supabase/middleware.ts` → `supabase.auth.getClaims()`. Wacht op de JWT-verificatie. Bij een koude serverless instance kan dit één JWKS-fetch naar Supabase Auth doen; daarna is de JWKS 10 minuten per instance gecacht. Zonder user → redirect `/login`.
3. **Redirect `/` → `/boards`** — `src/app/page.tsx` doet een server-side `redirect('/boards')`. Dit is een tweede navigatie en een tweede middleware-run.
4. **Middleware `/boards`** — opnieuw `getClaims()`; met user wordt `x-user-id` op de requestheaders gezet.
5. **Dashboardlayout** — `src/app/(dashboard)/layout.tsx`: `getUserId()` leest de header (geen netwerk), `createClient()` leest de cookies, `getProfile()` doet één query op `kk_profiles` (`full_name, role, avatar_url`). `getProfile()` is met React `cache` omhuld.
6. **Pagina `/boards`** — `src/app/(dashboard)/boards/page.tsx`: `getUserId()` (header), `createClient()` (cookies), query op `kk_boards` (`select('*')`, gefilterd op `user_id`).
7. **Hydratie** — `src/components/providers.tsx` maakt de `QueryClient`; `AuthInitializer` zet `userId` en `profile` in de Zustand-store. `AppShell` rendert de navigatie. Er is geen client-side profielrequest.
8. **Geen `fetchProfile`, geen `getSession`, geen `onAuthStateChange`** — de browserclient wordt pas aangemaakt als `AppShell` hem nodig heeft (nu: alleen bij uitloggen).

**Wacht-relaties**:

- Stap 2 wacht op de JWT/JWKS-verificatie.
- Stap 5 wacht op de middleware-header en de cookies.
- Stap 6 wacht op dezelfde header/cookies, niet op de profielquery in code.
- De route-render wacht op de layout; of de paginaquery exact parallel aan de profielquery loopt, is in deze inventarisatie niet met een netwerkmeting vastgesteld. De profielquery is een PK-lookup en is geen dominante factor.
- De chunk van `/boards` wordt als script in de HTML/RSC-payload meegestuurd en start tijdens de eerste respons, niet na het profiel.

**Kan `fetchProfile` twee keer lopen?** In deze codebase niet: `fetchProfile` bestaat niet. Als de Vite-variant zowel `getSession()` als `onAuthStateChange` gebruikte, zou dat kunnen: `INITIAL_SESSION` wordt direct na constructie en het laden van de initiële sessie afgevuurd (zie 0e), dus een listener plus een expliciete `getSession()` kan twee profielaanroepen opleveren. Die situatie is hier afwezig.

### 0d — Supabase-inventarisatie

- **Project**: `ythjnatklbnjtvvgpwlr` (de database uit `.env.local`). Regio: **`eu-north-1`** (Stockholm, EU). De opdracht zegt te stoppen buiten de EU; dat is niet nodig.
- **Performance-adviseur** (`get_advisors` type `performance`):

| Lint | Aantal | Tabellen/kolommen |
|------|--------|-------------------|
| `auth_rls_initplan` | **70** | 26 `kk_*`-tabellen; 90 policies bevatten een ongewrapte auth-/org-functie |
| `unindexed_foreign_keys` | **20** | `kk_ai_assistants(created_by, organization_id)`, `kk_assistant_knowledge_bases(knowledge_base_id)`, `kk_content_posts(pillar_id)`, `kk_conversations(assistant_id, user_id)`, `kk_crud_overviews(category_id, connection_id)`, `kk_flow_configs(organization_id)`, `kk_hour_entries(client_id)`, `kk_invitations(invited_by, organization_id)`, `kk_knowledge_base_documents(created_by, knowledge_base_id)`, `kk_knowledge_bases(created_by, organization_id)`, `kk_knowledge_items(created_by, knowledge_base_id)`, `kk_messages(conversation_id)`, `kk_profiles(organization_id)` |
| `unused_index` | 6 | `kk_crud_overviews`, `kk_content_posts`, `kk_cards`, `kk_rss_feeds`, `kk_focus_notes`, `kk_hour_entries` |
| `no_primary_key` | 1 | `public.prive_aandelen` (buiten deze feature) |

- **Policies**: de volledige uitvoer van `SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check FROM pg_policies WHERE schemaname IN ('public','storage') ORDER BY 1,2,3` staat in [policies-before.txt](./policies-before.txt). Het zijn **101** policies: 90 in `public` met een auth-/org-functie, 11 zonder (o.a. `Playbooks` en `eekhoorn_fotos`) en 0 in `storage` die herschreven moeten worden.
- **Rij-aantallen** (`pg_class.reltuples`): hoogste tabel is `foto_exif` met **470** rijen; `kk_hour_entries` 200, `kk_cards` 138, `kk_content_posts` 10. Geen enkele tabel zit boven 500.000 rijen, dus een gewone `CREATE INDEX` is veilig. Tabellen met `reltuples = -1` zijn nog niet geanalyseerd; dat is geen beletsel.

### 0e — Context7 en versiebronnen

| Vraag | Uitkomst | Toepassing |
|-------|----------|------------|
| Vervangt Vite `%VITE_...%` in `index.html`? | Ja. De Vite-documentatie bevestigt `%CONST_NAME%`-vervanging in HTML; onbekende variabelen blijven staan. | **Niet van toepassing**: Vite staat niet in `package.json` en er is geen `index.html`. |
| Wanneer vuurt `onAuthStateChange` `INITIAL_SESSION`? | In `@supabase/auth-js` **2.110.2** (de geïnstalleerde versie) vuurt `INITIAL_SESSION` direct nadat de client is geconstrueerd en de initiële sessie uit storage is geladen. De callback wacht op `initializePromise`. | **Niet van toepassing**: de app gebruikt `onAuthStateChange` nergens. Als hij later wordt toegevoegd, kan een combinatie met `getSession()` een dubbele profielfetch geven. |
| Is de `posthog-js`-versie dynamisch te importeren zonder init-opties te wijzigen? | PostHog ondersteunt dynamische imports; de init-opties blijven dan gelijk. | **Niet van toepassing**: `posthog-js` staat niet in `package.json` en er is geen `src/lib/posthog.tsx`. |

### 0f — Niet-van-toepassing-verklaringen per stap

| Stap | Status | Reden |
|------|--------|-------|
| 1 — Code-splitting per route via `src/App.tsx` | **N/A (Vite-variant); Next.js-equivalent uitgevoerd** | `src/App.tsx` bestaat niet. Next.js splitst al per route; elke route heeft een eigen `page-*.js`. Na apart akkoord is het Next.js-equivalent uitgevoerd: `staleTimes.dynamic = 30`, vier ontbrekende laadgrenzen en een harde navigatie bij uitloggen. Zie 0j. |
| 2 — `fetchProfile` dedupliceren en `is_platform_admin` parallel | **N/A** | `fetchProfile`, `useAuth.ts` en `is_platform_admin` bestaan niet. Het profiel wordt server-side één keer per request opgehaald. |
| 3 — `src/hooks/queries.ts` kolommen/filters | **N/A** | `src/hooks/queries.ts` bestaat niet. De werkelijke querybestanden staan in 0a; een herschrijving daarvan zou buiten de toegestane bestanden vallen. |
| 4 — React Query-standaarden | **Deels N/A** | De `QueryClient` staat in `src/components/providers.tsx` en heeft al `staleTime: 60_000` (≥ 30 s). De genoemde flows (`queries.ts`, `rag-chat`, `document-webhook`, `analysis-run-submit`, `platform-admin`, `team-admin`) bestaan niet. Bestaande mutaties in `src/hooks/*` invalideren hun keys al. Geen wijziging nodig. |
| 5 — PostHog later laden | **N/A** | Geen `posthog-js`, geen `src/lib/posthog.tsx`, geen import elders. |
| 6 — Service worker | **N/A** | Geen service worker en geen registratie. |
| 7 — `index.html` preconnect/fonts | **N/A** | Geen `index.html`; Next.js beheert de HTML-shell. |
| 8 — Cachingheaders | **Deels van toepassing** | `netlify.toml` bestaat. De Vite-assetmap `/assets/(.*)` bestaat niet; de Next.js-assets staan onder `/_next/static/*`. Daar wordt dezelfde `Cache-Control` op toegepast. |
| 9 — RLS en indexen | **Van toepassing** | 90 policies en 20 indexen. Migratie en rollback zijn geschreven; nog niet toegepast. |
| 10 — Playwright-tests | **Gedeeltelijk geblokkeerd** | De tests uit de opdracht mikken op `/rest/v1/profiles` en op client-side lijstquery's. In deze app haalt de server `kk_profiles` op; dat is niet in het browser-netwerkpaneel te tellen. Zonder `staleTimes` (stap 1) zal een paginawissel-test bovendien terecht een nieuwe RSC-request zien. Zie de blokkades onderaan. |
| 11 — `quickstart.md` | **Van toepassing** | Releasevolgorde, nameting en rollback zijn bijgewerkt. |

### 0g — Uitgevoerde controles (2026-11-06)

| Commando | Uitkomst |
|----------|----------|
| `npx tsc --noEmit` | Groen; geen output. |
| `npx eslint src/ --max-warnings 0` | Groen; geen output. |
| `npm run build` | Groen; routetabel en chunkgroottes identiek aan 0b (gedeelde basis 103 kB; `/content` 200 kB; `/uren` 211 kB). |
| `npx playwright test --reporter=line` | **146 passed, 84 skipped, 0 failed** (43,8 s). |
| `node scripts/rls-verify.mjs` | **PASS**: 101 policies; 0 raw `auth.uid()`; 0 raw `get_user_org_id()`; boards 7/7, cards 142/142, hours 207/207, posts 9/9, profiles 1/1; 0 foreign boards. |
| `netlify.toml`-header | Toegevoegd voor `/_next/static/*`; geen invloed op de build. |
| Migratie | Geschreven, **niet toegepast**; wacht op bevestiging. |

### 0h — Blokkades en open punten

1. **`scripts/rls-verify.mjs` was niet aanwezig en is inmiddels toegevoegd.** Het script simuleert de `authenticated`-rol met een echte JWT-claim, vergelijkt de RLS-zichtbare aantallen met de verwachte aantallen en controleert dat geen policy nog een ongewrapte identiteitsfunctie bevat. Het is groen.
2. **De migratie is nog niet toegepast.** Dat mag pas na expliciete bevestiging in de chat. Daarna moeten `get_advisors`, `policies-after.txt` en de RLS-verificatie opnieuw worden uitgevoerd.
3. **De test-specificatie is deels niet uitvoerbaar** in deze SSR-architectuur: `kk_profiles` wordt server-side gelezen en is niet als `/rest/v1/profiles`-request in de browser zichtbaar. Een test op de RSC-navigatie is wel mogelijk, maar pas zinvol als de routercache-aanpassing (stap 1) is toegepast; die stap is hier N/A.
4. **De Vite-aannames** uit de opdracht (één bundel, `index.html`, `src/App.tsx`, `posthog.tsx`, service worker) gelden niet. De stappen zijn daarom volgens de opdracht overgeslagen en hier gedocumenteerd.

### 0i — Na de migratie (2026-11-06)

De migratie is na expliciete bevestiging toegepast via de Supabase MCP (`apply_migration`, naam `026_performance_rls`).

| Controle | Uitkomst |
|----------|----------|
| `auth_rls_initplan` | **0** (was 70) |
| `unindexed_foreign_keys` | **0** (was 20) |
| Policies in `public` + `storage` | **101** vóór en na; 0 ontbrekend, 0 toegevoegd |
| Policy-metadata (permissive, roles, cmd) | **0** wijzigingen |
| Policy-expressies | **0** semantische wijzigingen na normalisatie van de `(select ...)`-wrapper |
| Nieuwe indexen | 20 aangemaakt; de adviseur meldt ze nu als `unused_index` omdat ze nog niet zijn gebruikt |
| Overige performance-meldingen | `no_primary_key` 1 (`prive_aandelen`, pre-existing), `unused_index` 26 (inclusief de 20 nieuwe indexen) |
| Security-meldingen | Ongewijzigd; geen nieuwe melding door de migratie |
| Playwright na de migratie | **146 passed, 84 skipped, 0 failed** (41,6 s) |
| `node scripts/rls-verify.mjs` | **PASS**: 101 policies, 0 raw auth-functies, RLS-counts kloppen, 0 foreign boards |

De volledige policy-uitvoer na de migratie staat in [policies-after.txt](./policies-after.txt). De vergelijking is gedaan door `policies-before.txt` en `policies-after.txt` op sleutel (`schema.tabel.policy`) te matchen en de `(select ...)`-wrapper weg te normaliseren; alle expressies bleken daarna identiek.

### 0j — Next.js-routercache en laadgrenzen (na akkoord)

Na expliciet akkoord is het Next.js-equivalent van de paginawissel-optimalisatie uitgevoerd. Dit valt buiten de letterlijke Vite-bestandslijst, maar dekt dezelfde acceptatie.

| Wijziging | Bestand | Effect |
|-----------|---------|--------|
| `experimental.staleTimes.dynamic = 30` | `next.config.ts` | Een paginawissel binnen 30 seconden hergebruikt de RSC-payload; geen nieuwe databasequeries. |
| `loading.tsx` voor `/content`, `/uren`, `/team`, `/theme-demo` | `src/app/(dashboard)/*/loading.tsx` | Dynamische routes worden geprefetcht en tonen direct de bestaande `Skeleton`-weergave. |
| Uitloggen via volledige navigatie | `src/components/layout/AppShell.tsx` | De clientroutercache wordt geleegd, zodat de back-knop na uitloggen geen dashboardpagina uit de cache toont. |

Verificatie na de wijziging:

- `npm run build`: groen; Next.js meldt de `staleTimes`-experimentoptie. De routetabel en First Load JS zijn ongewijzigd (gedeelde basis 103 kB; `/content` 200 kB; `/uren` 211 kB).
- `npx tsc --noEmit`: groen.
- `npx eslint src/ --max-warnings 0`: groen.
- `npx playwright test`: **146 passed, 85 skipped, 0 failed**. De nieuwe login-gated test `tests/e2e/performance.spec.ts` controleert dat een tweede bezoek aan `/crud` binnen 30 seconden geen nieuwe `/crud`-request oplevert; zonder login skipt hij volgens de bestaande guard.
- `node scripts/rls-verify.mjs`: **PASS**.
- De data kan bij een andere tab/gebruiker tot 30 seconden oud zijn; eigen wijzigingen worden direct geïnvalideerd via `revalidatePath` of React Query. Dit is de bewuste acceptatie.

## 1. Onderzoeksmethode

- Productiebuild uitgevoerd met `npm run build` (Next.js 15.5.19). De routetabel en chunkgroottes hieronder komen uit die build.
- Route-/chunkindeling gecontroleerd in `.next/app-build-manifest.json` en `.next/static/chunks`.
- Supabase performance-adviseur opgevraagd via de Supabase MCP voor het project dat de app daadwerkelijk gebruikt: `ythjnatklbnjtvvgpwlr` (host uit `.env.local`). Het project `ddfjigrjwlfpaljhhogv` ("Darwin") is niet de database van deze app en bevat geen `kk_*`-tabellen.
- Database-objecten gecontroleerd met `information_schema` en `pg_policy` via de Supabase MCP.
- Gezocht naar de genoemde artifacten (`scripts/rls-verify.mjs`, service worker, PostHog-SDK, `is_platform_admin`, `platform-admin`) in de hele repository.

## 2. Vermoeden voor vermoeden

| # | Vermoeden uit de opdracht | Vaststelling | Bewijs |
|---|---------------------------|--------------|--------|
| 1 | Verzoeken lopen na elkaar: sessie → profiel (`fetchProfile`) → platformrol → paginaqueries; `fetchProfile` mogelijk twee keer | **Gedeeltelijk onjuist / niet aanwezig** | Er is geen `fetchProfile`. De sessie komt uit de middleware-header `x-user-id`; het profiel wordt één keer in de dashboardlayout opgehaald via `getProfile` met React `cache`. Er is geen `is_platform_admin`-query of platformrol. |
| 2 | Alle pagina's zitten in één JavaScript-bundel die volledig wordt geparseerd | **Onjuist** | Next.js splitst per route. Build: gedeelde basis 103 kB; `/boards` 117 kB, `/crud` 120 kB, `/command-center` 141 kB, `/content` 200 kB, `/uren` 211 kB. Elke route heeft een eigen `page-*.js` in het buildmanifest. |
| 3 | PostHog laadt direct bij het opstarten | **Onjuist** | `package.json` bevat geen PostHog-pakket. De enige treffer is de externe link `https://eu.posthog.com/` in `AppShell.tsx`. |
| 4 | Lijstqueries halen alle kolommen op, ook grote tekstvelden | **Gedeeltelijk juist** | 9 `select('*')`-plekken. Vooral `kk_content_posts` (body tot 3.000 tekens), `kk_crud_overviews` (jsonb `column_filters`, `hidden_columns`, `column_order`) en `kk_boards` zijn te trimmen. Kaarten en urenregels hebben de meeste kolommen echt nodig. |
| 5 | React Query haalt opnieuw op bij paginawissel en bij tabfocus | **Gedeeltelijk juist** | De globale `staleTime` is al 60 seconden. De echte paginawissel-refetch komt van de Next.js-clientroutercache: in Next.js 15 staat `staleTimes.dynamic` standaard op 0. `refetchOnWindowFocus` staat standaard aan; enkele hooks hebben 10–15 seconden `staleTime`. |
| 6 | RLS-policies evalueren `auth.uid()` en `get_user_org_id()` per rij | **Juist** | Performance-adviseur: **70** `auth_rls_initplan`-meldingen in `public`. Alle policies gebruiken `auth.uid()` of `get_user_org_id()` zonder `(select ...)`. |
| 7 | De service worker onderschept elke navigatie | **Onjuist** | Geen `sw.js`, geen `navigator.serviceWorker`, geen pushregistratie. `public/` bevat alleen iconen. |
| 8 | `scripts/rls-verify.mjs` en alle Playwright-tests blijven groen | **Script was afwezig, inmiddels toegevoegd** | Het script is nieuw en groen; de Playwright-suite (22 spec-bestanden) is groen. |
| 9 | Instellingen gaan via de Edge Function `platform-admin` | **Onjuist** | In de repository staat geen Edge Function. Op het Supabase-project staan alleen `get-latest-weekdoel` en `table-crud`. |

Daarnaast zijn er drie oorzaken die niet in de opdracht staan maar wel meetbaar bijdragen:

| # | Extra oorzaak | Vaststelling | Bewijs |
|---|---------------|--------------|--------|
| A | Dynamische routes zonder `loading.tsx` worden niet geprefetcht en tonen geen laadgrens | **Juist** | `content`, `uren`, `team` en `theme-demo` missen een `loading.tsx`. Next.js prefetcht een dynamische route niet zonder laadgrens. |
| B | De browser-Supabase-client zit in de gedeelde dashboardlayout | **Juist** | Chunk `5402` (179,6 kB raw) bevat `createBrowserClient` en wordt op vrijwel elke dashboardroute geladen, terwijl alleen inloggen en uitloggen hem direct nodig hebben. |
| C | `/db` doet na hydratie nog een serveractie voor de tabellijst | **Juist** | `LocalTableList` is een clientcomponent met `useEffect(() => getLocalTableList(), [])`; `/db/[tableName]` haalt meta en records al parallel server-side op. |
| D | Een koude start op `/` kost een extra navigatie | **Juist** | `src/app/page.tsx` doet een server-side `redirect('/boards')`; de browser volgt met een tweede request en een tweede middleware-run. |

## 3. Details per oorzaak

### 3.1 Sessie, profiel en platformrol

- `src/middleware.ts` laat `updateSession()` de gebruiker uit de Supabase-cookies halen en zet `x-user-id` op de requestheaders.
- `src/lib/supabase/middleware.ts` gebruikt `supabase.auth.getClaims()`. Dit verifieert het JWT lokaal met de JWKS (10 minuten gecacht per instance). Op een koude serverless instance kan één JWKS-fetch nodig zijn; dat is één verzoek, geen keten per pagina.
- `src/app/(dashboard)/layout.tsx` leest `getUserId()` (geen netwerk) en roept `getProfile()` één keer aan.
- `src/lib/supabase/profile.ts` gebruikt React `cache`, selecteert alleen `full_name, role, avatar_url` en dedupliceert een tweede aanroep binnen hetzelfde request. `CommandCenterPage` roept `getProfile()` ook aan, maar krijgt dezelfde gecachte waarde.
- `src/components/auth/AuthInitializer.tsx` schrijft alleen `userId` en `profile` in de Zustand-store. Er is geen client-side profielverzoek en dus geen dubbele fetch.
- Er bestaat geen `is_platform_admin`-kolom, -functie of -query in de repository of in het betreffende Supabase-project.

**Conclusie**: de beschreven keten en dubbele fetch bestaan niet. De enige echte sequentiële kosten zijn middleware → RSC-render → profiel/pagequeries. Het profiel en de paginadata zijn onafhankelijke queries; de scriptdownload van de pagina-chunk start al tijdens de HTML-respons. Of de RSC-paginaquery exact parallel aan de profielquery loopt, wordt in de implementatie in het netwerkpaneel gemeten. De profielquery is een PK-lookup van enkele tientallen bytes en is geen dominante factor. Een aparte platformrol-query is niet aanwezig en hoeft dus ook niet parallel te worden gemaakt. Een Suspense-herstructurering die de shell zonder profiel toont, zou de navigatie later laten verschijnen en is een UI-wijziging; die valt buiten scope.

### 3.2 Bundel en route-chunks

Buildoutput (First Load JS, Next.js-rapportage):

```text
gedeelde basis                 103 kB
/boards                        117 kB
/crud                          120 kB
/settings                      116 kB
/command-center                141 kB
/boards/[boardId]              138 kB
/crud/[crudId]                 147 kB
/content                       200 kB
/uren                          211 kB
/login                         180 kB
middleware                      89 kB
```

De routes zijn dus al gesplitst. De grootste gemene deler is chunk `5402` (179,6 kB raw) met de Supabase-browserclient. Die wordt via `AppShell.tsx` op elke dashboardroute geladen, ook op routes die nooit rechtstreeks vanuit de browser bij Supabase lezen. `react-markdown` (chunk `83.9`, 142 kB raw) wordt al lazy geladen via `next/dynamic` in `KanbanBoard` en zit niet in de eerste load van andere routes.

**Conclusie**: "één bundel" is onjuist. De winst zit in het verplaatsen van de Supabase-browserclient naar het uitlogpad en, waar meetbaar, het lazy laden van zware dialogs op `/content` en `/uren`.

### 3.3 PostHog

- Geen `posthog-js` of vergelijkbare dependency.
- Geen initialisatie, geen provider, geen capture-calls.
- De string "PostHog" staat alleen als label van een externe link in `AppShell.tsx`.

**Conclusie**: niet van toepassing. Er verandert niets aan analytics.

### 3.4 Lijstqueries en kolommen

`select('*')` komt voor in:

- `src/app/(dashboard)/boards/page.tsx` — 7 kolommen, waarvan de kaart alleen `id`, `name`, `is_inbox` gebruikt.
- `src/app/(dashboard)/crud/page.tsx` — inclusief `hidden_columns`, `column_order` en `column_filters` (jsonb), terwijl de kaart alleen `id`, `name`, `table_name`, `interaction_type` en `category_id` gebruikt.
- `src/app/(dashboard)/crud/[crudId]/page.tsx` — detailpagina heeft de configuratievelden wel nodig.
- `src/lib/content/queries.ts` — `kk_content_posts` inclusief `body` (max. 3.000 tekens) en vijf legacy-kolommen; `kk_content_pillars` is klein.
- `src/lib/hours/queries.ts` — `kk_hour_entries` inclusief `amount_due` (nergens gebruikt) en `description` (wel gebruikt).
- `src/app/(dashboard)/boards/[boardId]/page.tsx` — geneste kaarten; `description` wordt door de kaart/detailmodal gebruikt.
- Drie schrijf-acties (`content.ts`, `time-tracking.ts`, `crud/[crudId]`) gebruiken `select('*')` als returnwaarde; dat is geen lijstquery.

**Conclusie**: alleen de lijstqueries van borden, CRUD-overzichten en contentposts zijn veilig te trimmen zonder detailgedrag te veranderen. Bij kaarten en urenregels levert trimmen nauwelijks iets op omdat de UI de meeste kolommen echt toont. De tabellen `kk_conversations`, `kk_messages` en `kk_knowledge_base_documents` worden in de huidige app niet door een lijstscherm bevraagd; zij profiteren wel van de RLS- en indexfixes, zodat een toekomstig gespreks-/documentscherm niet met dezelfde trage policies start.

### 3.5 React Query en paginawissels

- `src/components/providers.tsx`: `staleTime: 60_000`, `gcTime: 5 * 60_000`. `refetchOnWindowFocus` is niet gezet en staat daardoor op `true`.
- Per hook: `useContent` 30 s, `useHours` 30 s (revenue 15 s), `usePriorities` 60 s, `useDbExplorer` 15 s (meta 60 s), `useTimeTracking` actief 10 s met `refetchInterval: 15_000`.
- De Next.js-clientroutercache is de bron van de paginawissel-refetch: in Next.js 15 is `experimental.staleTimes.dynamic` standaard `0`. Elke `<Link>`-navigatie naar een dynamische route vraagt dan een nieuwe RSC-payload en dus nieuwe databasequeries.
- Next.js prefetcht een dynamische route niet automatisch zonder `loading.js`-grens. `content`, `uren`, `team` en `theme-demo` hebben die grens niet.

**Conclusie**: React Query doet niet bij elke wissel opnieuw werk zolang de data vers is; de routercache doet dat wel. De oplossing is `staleTimes.dynamic = 30` plus laadgrenzen, niet een grotere `staleTime` alleen. `refetchOnWindowFocus` uitzetten en de 10/15-seconden hooks naar 30 seconden brengen maakt de acceptatie "minder dan 30 seconden niet opnieuw" waar. De actieve tijdklok blijft zijn 15-secondenpoll houden.

### 3.6 RLS en indexen

Performance-adviseur op `ythjnatklbnjtvvgpwlr` (schema `public`):

- **70** `auth_rls_initplan`-meldingen. Voorbeelden: `kk_boards` ("Users can view own boards"), `kk_cards`, `kk_content_posts`, `kk_hour_entries`, `kk_profiles`, `kk_invitations`, `kk_messages`, `kk_conversations`.
- In totaal bevatten alle **90** policies over de 26 `kk_*`-tabellen een ongewrapte `auth.uid()` of `get_user_org_id()` (gecontroleerd via `pg_policy`). De adviseur meldt er 70; de migratie pakt alle 90 aan zodat de uitkomst gegarandeerd nul is en geen enkele policy achterblijft.
- **20** `unindexed_foreign_keys`-meldingen: onder andere `kk_ai_assistants(created_by, organization_id)`, `kk_conversations(assistant_id, user_id)`, `kk_crud_overviews(category_id, connection_id)`, `kk_hour_entries(client_id)`, `kk_invitations(invited_by, organization_id)`, `kk_knowledge_base_documents(created_by, knowledge_base_id)`, `kk_knowledge_bases(created_by, organization_id)`, `kk_knowledge_items(created_by, knowledge_base_id)`, `kk_messages(conversation_id)`, `kk_profiles(organization_id)`, `kk_content_posts(pillar_id)`, `kk_flow_configs(organization_id)`, `kk_assistant_knowledge_bases(knowledge_base_id)`.
- `get_user_org_id()` is `STABLE SECURITY DEFINER` en doet intern `WHERE id = auth.uid()`.

**Conclusie**: dit vermoeden klopt volledig. De inhoud van de policies blijft gelijk; alleen de evaluatie wordt een initplan. De functie-body wordt ook aangepast zodat de identiteit daar één keer per aanroep wordt bepaald. Voor elke ontbrekende foreign key komt een idempotente index.

### 3.7 Service worker en push

- `public/` bevat `favicon.png`, `favicon-16x16.png`, `favicon-32x32.png`, `apple-touch-icon.png`.
- Geen `sw.js`, geen `service-worker.js`, geen `navigator.serviceWorker.register`, geen `pushManager`, geen `Notification`-gebruik.
- `package.json` bevat geen push- of PWA-pakket.

**Conclusie**: er valt geen navigatie-interceptie te verwijderen. De eis blijft als invariant: bij een toekomstige service worker mag `/` niet via `fetch` worden onderschept. Er is geen pushfunctionaliteit om te regressietesten.

### 3.8 Overige artifacten

- `dist/` bevat een oude Vite-build (`AssistantsPage`, `DashboardPage`, `index-*.js`). `netlify.toml` bouwt en publiceert echter `.next` met `@netlify/plugin-nextjs`. De Vite-output is een restant en niet de gedeployde app.
- `scripts/rls-verify.mjs` is inmiddels toegevoegd. Het verifieert de RLS via de Management API met een echte `authenticated`-claim en is groen. De F-01-controle in `scripts/fitness-check.sh` verwijst daarnaast nog naar de Supabase MCP.
- Er is geen `platform-admin`-Edge Function; de app gebruikt `src/actions/*` en `src/lib/supabase/*` voor alle serverlogica.

## 4. Beslissingen

### D1 — Clientroutercache 30 seconden

**Decision**: `experimental.staleTimes.dynamic = 30` in `next.config.ts`.

**Rationale**: dit is precies de acceptatie "gegevens die minder dan 30 seconden oud zijn, worden bij een paginawissel niet opnieuw opgehaald". Next.js 15 heeft dit standaard op 0 gezet; de documentatie bevestigt dat de clientroutercache hiermee pagina-segmenten hergebruikt. Mutaties die `revalidatePath` aanroepen maken de cache direct ongeldig; React Query-mutaties invalidaten hun eigen keys.

**Alternatives considered**:
- Alle paginadata naar client-side React Query verplaatsen: grote herstructurering, meer clientcode en een extra request na hydratie. Afgewezen.
- `staleTime` verhogen zonder routercache: lost de RSC-refetch niet op. Afgewezen.
- `router.refresh()` na elke navigatie: doet het tegenovergestelde. Afgewezen.

### D2 — Laadgrenzen toevoegen waar ze ontbreken

**Decision**: voeg `loading.tsx` toe voor `/content`, `/uren`, `/team` en `/theme-demo`, in de bestaande skeletonstijl. `/crud`, `/db` en `/settings` hebben al een segmentbrede laadgrens; hun children erven die.

**Rationale**: Next.js prefetcht dynamische routes alleen met een laadgrens. De gebruiker ziet dan direct de bestaande laadweergave terwijl de chunk en data laden. Geen nieuwe visuele taal: dezelfde `Skeleton`-component.

**Alternatives considered**:
- Een globale spinner in de root: verbergt de shell en wijkt af van de bestaande per-pagina skeletons. Afgewezen.
- Geen laadgrens: dan blijft de navigatie wachten op de RSC-payload. Afgewezen.

### D3 — Supabase-browserclient lazy laden in de shell

**Decision**: vervang de statische import van `createClient` in `AppShell.tsx` door een dynamische import binnen `handleSignOut`.

**Rationale**: de shell heeft de client alleen nodig bij uitloggen. De chunk `5402` (179,6 kB raw) verdwijnt daardoor uit de eerste load van routes die geen browser-Supabase gebruiken: borden, CRUD, command center, instellingen, starred, database, team en theme-demo. `/content` en `/uren` houden de client, omdat hun React Query-reads hem nodig hebben. Inloggen houdt hem ook.

**Alternatives considered**:
- De client volledig uit de shell halen en via een aparte provider laden: meer code en een extra grens. Afgewezen.
- De client in elke pagina apart importeren: verspreidt de afhankelijkheid en verhoogt de kans op een tweede instantie. Afgewezen.

### D4 — Zware dialogs pas laden bij openen

**Decision**: gebruik `next/dynamic` voor de dialogs op `/uren` en `/content` alleen als de build aantoont dat dit de routechunk meetbaar verkleint. Behoud de bestaande UI en laadstaten.

**Rationale**: dit is dezelfde techniek die `KanbanBoard` al gebruikt voor `CardDetailModal`. Het is een gerichte maatregel, geen algemene herschrijving.

**Alternatives considered**:
- Alle componenten dynamisch maken: te veel grenzen en een slechtere eerste interactie. Afgewezen.
- Niets doen: de routechunks van `/uren` (211 kB) en `/content` (200 kB) blijven de zwaarste. Daarom ten minste meten.

### D5 — Alleen nodige kolommen in lijstqueries

**Decision**: expliciete kolomlijsten voor:
- `boards/page.tsx`: `id, name, is_inbox, position`.
- `crud/page.tsx`: `id, name, table_name, interaction_type, category_id`.
- `crud/[crudId]/page.tsx`: expliciete lijst in plaats van `*`, inclusief de configuratievelden die de detailpagina nodig heeft.
- `content/queries.ts` posts: actieve kolommen, zonder de vijf legacy-kolommen.
- `hours/queries.ts` entries: zonder `amount_due`.
Kaarten, de geneste bordquery en de kleine contentpillars-query blijven hun kolommen houden, omdat de kaartweergave, de detailmodal en de soorten-dialog ze nodig hebben.

**Rationale**: de lijst toont minder dan de tabel bevat. Dit verkleint de payload en houdt de query bij groei voorspelbaar. Geen detailgedrag verandert.

**Alternatives considered**:
- `select('*')` laten staan: eenvoudig, maar bij groei onnodige bytes en jsonb-parseerwerk. Afgewezen.
- Voor de contentlijst een aparte detailquery toevoegen: dat verplaatst het probleem naar de klik en verandert de editorflow. Voorlopig niet nodig; de contentlijst houdt `body` omdat de editor die direct nodig heeft.

### D6 — `/db` server-side laten renderen

**Decision**: maak `DatabasePage` een async servercomponent die de tabellijst direct ophaalt en geef die als props aan een presentational `LocalTableList`. Dezelfde fout- en laadtoestand blijft zichtbaar.

**Rationale**: nu volgt na de eerste HTML een extra serveractie-round-trip. Server-side ophalen gebeurt tijdens de RSC-render en is één request minder. `/db/[tableName]` doet dit al met een parallelle batch.

**Alternatives considered**:
- De clientactie laten staan: een extra Netlify-invocatie en een waterfal die vooral op mobiel voelbaar is. Afgewezen.
- `getLocalTableList` als gewone library-functie verplaatsen: kan, maar is een grotere refactor dan nodig; de serveractie mag direct vanuit een servercomponent worden aangeroepen.

### D7 — React Query-gedrag aanscherpen

**Decision**:
- `refetchOnWindowFocus: false` als globale default.
- Alle lijst-/leesqueries krijgen minimaal 30 seconden `staleTime`.
- `useActiveTimeEntry` houdt `refetchInterval: 15_000`, maar krijgt `staleTime: 30_000`; de interval pollt while mounted, de staleness-regel voorkomt een extra refetch bij paginawissel.
- `useDbExplorer` records en `useHours` revenue gaan van 15 naar 30 seconden.
- Mutaties blijven hun bestaande invalidatie houden; er komt geen nieuwe invalidatiestrategie.

**Rationale**: dit maakt de acceptatie meetbaar waar zonder de bestaande datalaag te vervangen. De actieve tijdklok blijft live door de interval, niet door de staleness.

**Alternatives considered**:
- `refetchOnWindowFocus` laten staan: onnodige verzoeken bij tabwissel. Afgewezen.
- `staleTime: Infinity`: dan zou een wijziging in een andere sessie nooit zichtbaar worden. Afgewezen.

### D8 — RLS-policies herschrijven met `(select ...)`

**Decision**: één migratie (`026_performance_rls.sql`) die:
- `get_user_org_id()` vervangt door een versie met `(select auth.uid())` in de body;
- elke policy die `auth.uid()` of `get_user_org_id()` gebruikt vervangt door dezelfde expressie met `(select auth.uid())` respectievelijk `(select get_user_org_id())`;
- geen policies verwijdert, samenvoegt of van rol verandert.

**Rationale**: dit is exact de door Supabase aanbevolen oplossing voor `auth_rls_initplan`. De logische expressie blijft identiek; alleen de evaluatie wordt per statement gecachet. De migratie is idempotent (`DROP POLICY IF EXISTS` + `CREATE POLICY`, of `ALTER POLICY`).

**Alternatives considered**:
- Policies samenvoegen om `multiple_permissive_policies` op te lossen: groter risico op gedragsverandering en niet nodig voor de acceptatie. Afgewezen.
- `auth.uid()` vervangen door een custom claim: vereist auth-wijzigingen en is buiten scope. Afgewezen.
- Alleen de functie-body aanpassen: laat de 70 policywaarschuwingen staan. Afgewezen.

### D9 — Indexen voor alle foreign keys

**Decision**: één idempotente migratie met `CREATE INDEX IF NOT EXISTS` voor de 20 gemelde foreign keys.

**Rationale**: de adviseur meldt ze allemaal; de acceptatie vraagt nul meldingen in `public`. Indexen zijn additief en veranderen geen data of rechten. Ze kosten schrijfruimte, maar de tabellen zijn klein en de winst bij groei is groter.

**Alternatives considered**:
- Alleen de drukst gebruikte keys indexeren: dan blijft de adviseur meldingen geven. Afgewezen.
- Indexen weglaten omdat de dataset klein is: de acceptatie en de groeidoelstelling vragen erom. Afgewezen.

### D10 — Netlify-redirect voor `/`

**Decision**: voeg in `netlify.toml` een edge-redirect toe van `/` naar `/boards` (status 302, `force = true`). De bestaande `src/app/page.tsx` blijft als fallback voor lokaal ontwikkelen.

**Rationale**: de huidige server-side redirect kost op een koude start een volledige extra functie-invocatie en middleware-run. Een redirect op CDN-niveau doet hetzelfde voor de gebruiker zonder de eerste invocatie. De bestemming en de auth-controle op `/boards` blijven gelijk.

**Alternatives considered**:
- De server-side redirect laten staan: eenvoudig, maar precies op het genoemd scenario een extra hop. Afgewezen.
- `/` de bordenpagina laten renderen: doorbreekt de URL-/navigatiestructuur en de actieve nav-highlight. Afgewezen.
- Een `redirects()`-regel in `next.config.ts`: kan alsnog in de functie worden uitgevoerd en levert daardoor minder winst. Afgewezen.

### D11 — Geen wijzigingen aan PostHog, service worker of platformrol

**Decision**: geen code toevoegen voor deze onderdelen.

**Rationale**: ze bestaan niet in deze codebase. Het toevoegen van een service worker of platformrol zou nieuwe functionaliteit zijn en is expliciet buiten scope. De invarianten worden in de contracten vastgelegd zodat een toekomstige toevoeging ze niet breekt.

## 5. Baseline en doelen

| Meting | Baseline (2026-11-06) | Doel |
|--------|-----------------------|------|
| Gedeelde First Load JS | 103 kB | niet hoger |
| `/content` First Load JS | 200 kB | lager of gelijk |
| `/uren` First Load JS | 211 kB | lager of gelijk |
| Routes zonder browser-Supabase (o.a. `/boards`, `/crud`, `/settings`, `/db`, `/starred`) | 103–141 kB | meetbaar lager; richtwaarde 30 kB gzip |
| `auth_rls_initplan` in `public` | 70 | 0 |
| `unindexed_foreign_keys` in `public` | 20 | 0 |
| Profielquery bij koude start `/` | 1 (al juist) | 1 |
| Datarequest bij paginawissel < 30 s | 1 (RSC) | 0 |
| Playwright-suite | groen | groen |
| Nieuwe npm-dependencies | 0 | 0 |

## 6. Risico's en mitigaties

| Risico | Mitigatie |
|--------|-----------|
| `staleTimes` toont na een mutatie te lang oude data | Elke mutatie roept `revalidatePath` aan of invalideert de React Query-key; de acceptatietest dekt dit per flow. |
| RLS-herschrijving verandert per ongeluk rechten | Policy-expressies worden één-op-één vervangen; geen policy wordt verwijderd of samengevoegd. Daarna performance-adviseur + F-01 + volledige Playwright-suite. |
| Lazy laden van de Supabase-client breekt uitloggen | Uitloggen is de enige consumer in de shell; de dynamische import wordt in dezelfde handler afgewacht en de store/redirect blijven gelijk. |
| `loading.tsx` verandert de schermindeling | Alleen bestaande `Skeleton`-varianten; geen nieuwe teksten of animaties. |
| Een index vertraagt schrijfacties | Indexen zijn klein en de tabellen zijn klein; meting via de performance-adviseur en de bestaande suite. |
| `/db`-refactor breekt de foutstaat | Dezelfde fouttekst en dezelfde presentational component; alleen de databron verhuist van `useEffect` naar props. |

## 7. Bewust niet gedaan

- Geen service worker toegevoegd of verwijderd (bestaat niet).
- Geen PostHog-code toegevoegd of verwijderd (bestaat niet).
- Geen platformrol verzonnen (bestaat niet).
- Geen Edge Function `platform-admin` aangemaakt (bestaat niet).
- `scripts/rls-verify.mjs` is toegevoegd (geen nieuwe dependency) en verifieert de RLS via de Management API; de Supabase MCP en de bestaande suite blijven daarnaast leidend.
- Geen server-side rendering geïntroduceerd of verwijderd; de bestaande RSC-aanpak blijft.
- Geen nieuwe npm-dependencies.
