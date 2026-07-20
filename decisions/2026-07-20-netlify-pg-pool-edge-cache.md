## Decision: pg-pool, edge-middleware en unstable_cache niet gebruiken op Netlify serverless

## Context
Tijdens de latency-optimisatie reeks (PR's #5-#14) hebben we geprobeerd om via een directe `pg.Pool` naar Supabase Supavisor (poort 6543) de PostgREST overhead te omzeilen. Daarnaast probeerden we `experimental-edge` runtime voor middleware en `unstable_cache` voor profiel-caching. Al deze pogingen resulteerden in 500 Internal Server Errors op productie (`/boards`, Request ID's 01KXYV1BRWWVZ2J4W22CVJHC0R en 01KXYW6WMARH43ZA1AX8M0D6EA).

## Alternatives considered
1. **pg.Pool naar Supavisor (poort 6543)** — Werkt lokaal, maar Netlify serverless functions kunnen geen outbound TCP-connecties maken naar externe databases op niet-standaard poorten. De Supabase REST API (PostgREST, poort 443) werkt wel.
2. **`experimental-edge` middleware runtime** — Werkt op build-time maar geeft runtime-problemen op Netlify's Next.js plugin (v5.7.0) met Next.js 15.5.19 in combinatie met `@supabase/ssr` `getClaims()`.
3. **`unstable_cache` voor profiel** — Geeft server-side exceptions op Netlify in de dashboard-layout, waarschijnlijk door cache-serialisatie-problemen met Supabase-client instanties.
4. **Directe Postgres connectie (poort 5432)** — Zelfde Netlify restrictie; bovendien raak je snel zonder connecties in serverless context.

## Reasoning
- Netlify serverless functions hebben beperkte outbound netwerkcommunicatie. Supabase REST API (HTTPS, poort 443) werkt altijd. Directe TCP-connecties naar databases op andere poorten werken niet betrouwbaar.
- De `experimental-edge` runtime voor middleware in Next.js 15.5.19 is op Netlify onvoorspelbaar met `@supabase/ssr` cookies-handling. Default Node runtime is stabiel.
- `unstable_cache` uit `next/cache` heeft op Netlify problemen met het serialiseren van Supabase-client-gerelateerde functies in Next.js 15.5.19.

## Trade-offs accepted
- We behouden PostgREST (REST API) als server-side data-laag. Dit betekent ~30-80ms extra TLS-overhead per round-trip vergeleken met directe `pg`.
- Middleware draait op Node runtime i.p.v. edge — iets hogere cold-start (~50-100ms per cold start).
- Profiel wordt per-request opgehaald (met React `cache()` dedup binnen één request-tree). Geen cross-request cache.

## Supersedes
— (geen eerdere beslissing over dit onderwerp)

## Geldige alternatieven voor toekomstige latency-verbeteringen
1. **Verhuizen naar Vercel** — Staat outbound TCP naar Supabase toe, waardoor `pg.Pool` wel werkt.
2. **Eigen VPS (Hetzner/Coolify)** — Volledige controle over netwerk en runtime.
3. **Supabase Edge Functions** — Server-side reads binnen Supabase's eigen netwerk, bereikbaar via HTTPS.
4. **Next.js 15 upgraden + Netlify plugin updaten** — Mogelijk dat nieuwere versies `edge` runtime en `unstable_cache` beter ondersteunen. Vereist uitgebreide compatibiliteitstest.
5. **RPC's (PostgREST `rpc()`)** — Vermijd client-side joins door server-side functies. Minder round-trips zonder de pg-pool nodig te hebben.