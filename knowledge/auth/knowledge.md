# Knowledge: Knockout auth & registratie

## Feiten en patronen

### Project
- Productie Supabase-project: `ythjnatklbnjtvvgpwlr` (https://knockout-jape.netlify.app). Het project-ID in `opencode.json` (`ddfjigrjwlfpaljhhogv`) is NIET productie.
- Supabase MCP was in de sessie van 2026-09-22 niet gekoppeld (geen tools/resources beschikbaar). Fallback: SQL uitschrijven voor de gebruiker (SQL Editor) of HTTP-calls naar publieke endpoints.

### Auth-configuratie (geverifieerd 2026-09-22)
- `GET /auth/v1/settings` (publiek met anon key): `disable_signup: true`, `mailer_autoconfirm: false`, `external.*` allemaal false (geen OAuth-providers actief), `email: true`.
- De anon key zit in de client-bundle van de live site (Next.js `NEXT_PUBLIC_`-vars) en kan uit de JS-chunks worden geëxtraheerd voor verificatie-doeleinden.

### Registratiepaden die nu dicht zijn (defense in depth)
1. `disable_signup=true` (Auth-instelling) — blokkeert signUp + magic-link-signup op server-niveau.
2. DB-trigger `kk_block_new_signups` (BEFORE INSERT op `auth.users`, migration 019) — backstop voor admin.createUser, invites, dashboard "Add user". **Toegepast op productie via SQL Editor, bevestigd door Jaap op 2026-09-22.**
3. `shouldCreateUser: false` in `signInWithOtp` (LoginForm.tsx) — UI stuurt nooit signup-intent.
4. Neutrale toast-melding bij magic link (succes én error identiek) — geen account-enumeration; echte error alleen naar console.

### Live verificatie (2026-09-22)
- `GET /auth/v1/settings` → `disable_signup: true`.
- `POST /auth/v1/signup` met nieuw adres → geweigerd (HTTP 422, geen account aangemaakt).
- Alle drie de lagen actief; zie `/decisions/2026-09-22-registratie-uitgeschakeld.md` voor de procedure voor tijdelijk account toevoegen.

### Bestaande login-flows blijven werken
- Wachtwoord-login (`signInWithPassword`), magic link voor bestaande accounts, wachtwoord-reset (`resetPasswordForEmail` in forgot-password/page.tsx) — geen van deze doet INSERT op `auth.users`.

### Grep-resultaten (2026-09-22)
- `signUp(`, `inviteUserByEmail`, `admin.createUser` → 0 hits in `src/`. Enige OTP-call: `LoginForm.tsx` (gefixt). Enige reset-call: `forgot-password/page.tsx`.

### Windows/omgeving
- `bash` op PATH in deze omgeving is WSL-bash; scripts met Windows-paden draaien met Git Bash (`C:\Program Files\Git\bin\bash.exe`).
- `scripts/fitness-check.sh` moet LF line endings hebben; CRLF breekt het script (`$'\r': command not found`). Was CRLF in de working tree (sindsdien gefixt, zie rules).