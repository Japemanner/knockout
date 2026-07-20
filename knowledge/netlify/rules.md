# Netlify Rules

_Bevestigd in productie — standaard toepassen._

1. **Geen outbound TCP naar niet-443 poorten vanuit serverless functions.** Gebruik altijd HTTPS/REST API's voor externe data-toegang. Directe `pg.Pool` naar Supabase Supavisor (poort 6543) faalt op runtime.

2. **Middleware op Node runtime (default).** Geen `export const runtime = 'edge'` of `'experimental-edge'` in `src/middleware.ts`. Gebruik de default Node runtime.

3. **Geen `unstable_cache` uit `next/cache`.** Gebruik React `cache()` voor per-request dedup, maar geen cross-request cache met `unstable_cache` — geeft server-side exceptions op Netlify met Supabase-client instanties.

4. **Vertrouw niet op Netlify deploy-preview status als enige indicator.** Build-succes betekent niet dat runtime queries werken. Test na deploy altijd de pagina's die externe connecties gebruiken.

5. **Bekijk `/decisions/2026-07-20-netlify-pg-pool-edge-cache.md` voordat je latency-optimisaties probeert.** De pg-pool, edge-middleware en unstable_cache opties zijn op Netlify serverless niet haalbaar.