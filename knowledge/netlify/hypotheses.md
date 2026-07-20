# Netlify Hypotheses

_Onvoldoende data om te bevestigen — nog onderzoeken._

1. **Outbound TCP naar poort 5432 (directe Postgres) werkt mogelijk wel op Netlify** — niet getest. Supavisor op poort 6543 faalt, maar dat kan ook aan Supavisor liggen. Hypothese: directe Postgres op poort 5432 werkt misschien wel, maar heeft connectie-pool-uitputting in serverless context.

2. **`unstable_cache` werkt wel op nieuwere Next.js versies (≥15.2)** — Niet getest. Onze test was op Next.js 15.5.19. Mogelijk opgelost in 15.6+.

3. **`experimental-edge` middleware werkt wel zonder `getClaims()`** — Niet getest. Onze middleware gebruikt `getClaims()` van `@supabase/ssr`. Andere middleware-logica werkt misschien wel op edge.

4. **Vercel ondersteunt wél pg-pool, edge-middleware en unstable_cache** — Aanname gebaseerd op Vercel docs, niet getest met deze codebase.