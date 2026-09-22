## Decision: Registratie definitief uitschakelen (defense in depth)

## Context
Productie (https://knockout-jape.netlify.app) draait op Supabase-project `ythjnatklbnjtvvgpwlr`. Op 2026-09-22 stond de Auth-instelling `disable_signup` op `false`: iedereen met de publieke anon key kon zich direct via de API registreren, ook zonder UI. Daarnaast maakte `signInWithOtp` (magic link in `LoginForm.tsx`) standaard nieuwe accounts aan voor onbekende adressen. De app hoort single-user te zijn (alleen de eigenaar), dus elk registratiepad moet dicht: signUp, magic link, invites en admin.createUser.

## Alternatives considered
1. **Alleen `disable_signup=true` in Auth-instelling** — Blokkeert signUp en OTP-signup, maar laat admin.createUser, invites en "Add user" in het dashboard gewoon toe. Ook afhankelijk van één dashboard-toggle die per ongeluk terug kan worden gezet. Niet voldoende.
2. **Alleen DB-trigger op `auth.users`** — Blokkeert alles, inclusief wachtwoord-reset? Nee, reset werkt via UPDATE, dus dat gaat. Maar zonder `disable_signup` zou de Auth-server nog wel signup-requests verwerken (reputatie/limieten) en geeft de UI onduidelijke errors. Bovendien zou `drop trigger` (voor tijdelijk herstel) alles openzetten. Niet voldoende.
3. **Beide: Auth-instelling + DB-trigger backstop + `shouldCreateUser: false` in de UI** ✨ gekozen. Defense in depth: de Auth-instelling is de primaire poort, de trigger vangt alle overige paden (dashboard "Add user", admin API, invites), en de UI lekt via de neutrale melding niet welke adressen bestaan.

## Reasoning
- `disable_signup=true` (Auth-instelling, geverifieerd via `GET /auth/v1/settings` op 2026-09-22) blokkeert signUp en magic-link-signup op server-niveau.
- De DB-trigger `kk_block_new_signups` op `auth.users` (BEFORE INSERT) weigert álle nieuwe rijen — ook via admin.createUser, invites en het Supabase-dashboard. Bestaande accounts hebben er geen last van: inloggen, magic link en wachtwoord-reset raken `auth.users` niet met INSERT.
- `shouldCreateUser: false` in `signInWithOtp` voorkomt bovendien dat de UI ooit een signup-intent stuurt, en de neutrale melding ("Als dit adres bekend is, ontvang je een inloglink.") voorkomt account-enumeration: voor bestaande én onbestaande adressen identieke feedback, ook bij errors (error alleen naar console).
- Geen enkele code-path in `src/` gebruikt `signUp(`, `inviteUserByEmail` of `admin.createUser` (geverifieerd met grep) — er was dus alleen het magic-link-pad over.

## Trade-offs accepted
- Nieuwe medewerkers/relaties kunnen niet zelf een account krijgen; alles verloopt via de eigenaar (bewuste keuze: single-user product).
- Tijdelijk een account toevoegen vereist twee stappen (trigger droppen en opnieuw zetten) — zie hieronder.
- Bij per ongeluk terugzetten van de trigger (zonder disable_signup-check) blijft de Auth-instelling nog steeds dicht — dat is juist de bedoeling van de layered aanpak.

## Hoe voeg ik later tijdelijk een account toe?
1. `drop trigger kk_block_new_signups on auth.users;`
2. Account aanmaken (dashboard "Add user", invite of signUp) — `disable_signup` hoeft hiervoor niet omgezet te worden bij dashboard "Add user" (admin-pad), wel bij publieke signup.
3. Daarna migration `supabase/migrations/019_block_new_signups.sql` opnieuw draaien (zet de trigger terug).
4. Verifieer met: `select tgname, tgenabled from pg_trigger where tgrelid = 'auth.users'::regclass and not tgisinternal;` — zowel `kk_block_new_signups` als `on_auth_user_created` moeten erin staan.

## Supersedes
— (eerste beslissing over registratie; gerelateerd: geen)

## Verificatie
- `GET https://ythjnatklbnjtvvgpwlr.supabase.co/auth/v1/settings` → `"disable_signup": true` (2026-09-22)
- `supabase/migrations/019_block_new_signups.sql` — **toegepast op productie via SQL Editor, bevestigd door Jaap op 2026-09-22** (Supabase MCP was niet gekoppeld in de sessie; project_id `ythjnatklbnjtvvgpwlr`)
- Live API-check 2026-09-22: `POST /auth/v1/signup` met een nieuw adres wordt geweigerd (HTTP 422, geen account aangemaakt)
- Aanbevolen (nog uit te voeren): trigger-verificatie-query: `select tgname, tgenabled from pg_trigger where tgrelid = 'auth.users'::regclass and not tgisinternal;` — zowel `kk_block_new_signups` als `on_auth_user_created` moeten erin staan
- `tests/e2e/auth-signup-disabled.spec.ts` — API-test (disable_signup===true) + UI-test (neutrale melding, geen "Signups not allowed")
- Grep `src/` op `signUp(|inviteUserByEmail|admin.createUser` → 0 hits

## Status: compleet
Alle drie de lagen zijn actief in productie:
1. Auth-instelling `disable_signup=true` (geverifieerd via settings-endpoint)
2. DB-trigger `kk_block_new_signups` op `auth.users` (migration 019 toegepast 2026-09-22)
3. UI: `shouldCreateUser: false` + neutrale melding (live na deploy van commit 825a5de)