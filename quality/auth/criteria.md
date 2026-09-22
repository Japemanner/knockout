# Criteria: auth-wijzigingen (Knockout)

## Output
Wijzigingen aan authenticatie: registratie blokkeren, login-flows, accountbeheer.

## Criteria
1. **Defense in depth** — Elk registratiepad is afgedekt door minimaal 2 onafhankelijke lagen (Auth-instelling + DB-trigger). PASS alleen als beide geverifieerd zijn.
2. **Bestaande accounts onaangetast** — Wachtwoord-login, magic link en wachtwoord-reset werken nog (geen INSERT op auth.users in die flows). PASS alleen als flow-analyse dit bevestigt.
3. **Geen account-enumeration** — UI toont bij auth-flows identieke neutrale meldingen voor bestaande én onbestaande adressen; errors alleen naar console.
4. **Regressietest-dekking** — Minimaal één E2E-test per afgesloten registratiepad (API + UI), die netjes skipten wanneer env vars ontbreken en die de mutation/gedrag zichtbaar verifiëren.
5. **Root cause in commit** — Commit body bevat de oorzaak (niet alleen het symptoom) conform bugfix-workflow AGENTS.md.
6. **Geen secrets gelekt** — Geen keys/tokens in output, commits of logs; anon key uitsluitend gebruikt in headers, nooit geprint.
7. **TypeScript strict** — `tsc --noEmit` schoon na de wijziging.