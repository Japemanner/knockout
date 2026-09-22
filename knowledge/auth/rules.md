# Rules: Knockout auth (bevestigd — standaard toepassen)

## R1: Registratie blijft dicht — drie lagen, nooit één verwijderen
De registratieblokkade bestaat uit: (1) `disable_signup=true` in de Auth-instellingen, (2) DB-trigger `kk_block_new_signups` op `auth.users` (migration 019), (3) `shouldCreateUser: false` in `signInWithOtp`. Bij elke auth-gerelateerde wijziging: verifieer alle drie de lagen (settings-endpoint, trigger-query, LoginForm.tsx). Bevestigd 2026-09-22.

## R2: Tijdelijk account toevoegen = 4 stappen
1. `drop trigger kk_block_new_signups on auth.users;`
2. Account aanmaken
3. Migration 019 opnieuw draaien
4. Verifiëren: `select tgname, tgenabled from pg_trigger where tgrelid = 'auth.users'::regclass and not tgisinternal;` — zowel `kk_block_new_signups` als `on_auth_user_created` aanwezig.

## R3: Neutrale melding bij magic link — geen error-details naar de UI
Alle auth-error-details (bestaat dit adres? signup disabled?) mogen nooit in de UI verschijnen; alleen naar `console.error`. De toast toont voor elk adres dezelfde tekst. Bevestigd 2026-09-22 (account-enumeration risico).

## R4: Shell-scripts in deze repo draaien met Git Bash en LF
`fitness-check.sh` en de pre-commit hook vereisen LF. Draai shell-scripts met `& 'C:\Program Files\Git\bin\bash.exe' -c "...";` (de `bash` op PATH is WSL). Bevestigd 2026-09-22.