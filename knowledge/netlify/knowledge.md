# Netlify Knowledge

## Feiten en patronen (bevestigd in productie)

### Outbound netwerk
- ✅ HTTPS (poort 443) naar externe API's werkt altijd
- ❌ Directe TCP-connecties naar externe databases op niet-standaard poorten werken niet betrouwbaar in serverless functions
- ✅ Supabase REST API (PostgREST, poort 443) werkt probleemloos
- ❌ Supabase Supavisor transaction pooler (poort 6543) faalt op runtime ondanks correct geconfigureerde `DIRECT_DATABASE_URL`

### Next.js runtime op Netlify
- ✅ Node runtime (default) is stabiel voor middleware
- ❌ `experimental-edge` runtime voor middleware geeft server-side exceptions met `@supabase/ssr` `getClaims()` op Next.js 15.5.19 + `@netlify/plugin-nextjs` v5.7.0
- ❌ `edge` runtime voor middleware faalt al op build-time ("the edge runtime for rendering is currently experimental. Use runtime 'experimental-edge' instead.")

### Next.js caching op Netlify
- ✅ React `cache()` (per-request dedup) werkt probleemloos
- ❌ `unstable_cache` uit `next/cache` geeft server-side exceptions in dashboard-layout met Supabase-client instanties op Next.js 15.5.19

### Build & deploy
- ✅ `npm run build` sluit lokale fouten betrouwbaar uit
- ✅ Netlify deploy-preview status is een betrouwbare indicator voor build-succes, maar niet voor runtime-succes
- ⚠️ Netlify status API rapporteert niet altijd terug naar GitHub Status API voor de `001-multi-kanban-workspace` branch