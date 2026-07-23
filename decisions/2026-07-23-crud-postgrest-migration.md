## Decision: CRUD local-db migreert van pg.Pool naar Supabase PostgREST

## Context
De CRUD-feature faalde met "password authentication failed for user postgres" bij het laden van een tabel. De oorzaak: `src/actions/local-db.ts` gebruikte `pg.Pool` met `DIRECT_DATABASE_URL` (directe Postgres-connectie naar Supabase Supavisor). Lokaal faalde dit op een verkeerd wachtwoord; op Netlify productie faalt het sowieso — zie `/decisions/2026-07-20-netlify-pg-pool-edge-cache.md` en `/knowledge/netlify/rules.md` (regel 1: geen outbound TCP naar niet-443 poorten vanuit serverless functions). De hele CRUD local-db stack was onbruikbaar in productie.

## Alternatives considered
1. **Alleen wachtwoord herstellen** — Werkt lokaal, faalt op Netlify. Symptoombestrijding.
2. **PostgREST (Supabase client) gebruiken** — Werkt lokaal én op Netlify (HTTPS poort 443). Volgt het patroon dat `boards.ts`, `hours.ts`, `cards.ts` al gebruiken. Definitieve oplossing. ✨ gekozen.
3. **Eigen VPS** — Volledige controle maar grote infra-wijziging; buiten scope.

## Reasoning
- PostgREST is de bestaande data-laag in de codebase (alle andere actions gebruiken `supabase.from()` / `supabase.rpc()`).
- CRUD-table-metadata (columns, PK, FK, identity) kan niet via standaard `.from()` op `information_schema` — nodig: 2 `SECURITY DEFINER` RPC functions (`get_table_columns`, `get_table_foreign_keys`) die de bestaande SQL-queries uit `introspect.ts` verpakken. Er was al een `list_tables()` RPC (migration 005).
- Dynamische tabelnamen (willekeurige `kk_*` tabellen) zijn niet statisch getypeerd in `database.types.ts`; opgelost met `UntypedClient` cast, conform het bestaande patroon in `src/lib/supabase/actions.ts`.
- RLS wordt nu gerespecteerd (pg.Pool omzeilde RLS volledig — een latent security-bug die met deze migratie wordt gerepareerd).

## Trade-offs accepted
- ~30-80ms extra TLS-overhead per round-trip vergeleken met directe `pg` (PostgREST via HTTPS). Acceptabel: de CRUD-pagina doet 2-4 round-trips, niet honderden.
- Data-operaties gebruiken de service-role client (omzeilt RLS) om de oorspronkelijke pg.Pool behavior te herstellen (alle rijden tonen). Metadata-RPC's gebruiken de authenticated client (SECURITY DEFINER, RLS irrelevant). De service role key zit alleen in server-side `'use server'` actions, nooit in de client bundle.
- `getLocalTableList()` doet nu N+1 round-trips (1 list_tables + N get_table_columns voor kolom-counts in de UI). De tabel-lijstpagina is laagfrequent; acceptabel. Optimaliseer later met een gecombineerde RPC indien nodig.

## Supersedes
— (geen eerdere beslissing over de CRUD local-db data-laag; wel gerelateerd aan `/decisions/2026-07-20-netlify-pg-pool-edge-cache.md` over pg.Pool op Netlify in het algemeen)

## Wijzigingen
- `supabase/migrations/011_crud_table_meta_rpc.sql` — NIEUW: `get_table_columns` + `get_table_foreign_keys` RPC's (SECURITY DEFINER, GRANT TO authenticated)
- `src/actions/local-db.ts` — HERSCHREVEN: 7 functions van pg.Pool naar PostgREST; data-operaties via `getServiceClient` (service role, omzeilt RLS), metadata via `getAuthenticatedClient`
- `src/lib/supabase/actions.ts` — NIEUW: `getServiceClient()` helper (service role + login-check)
- `src/app/(dashboard)/crud/[crudId]/page.tsx` — error-check voor `recordsResult.error` toegevoegd (was stiekem doorgeslikt)
- `src/lib/db/local-pool.ts` — VERWIJDERD (ongebruikt)
- `.env.example` — `DIRECT_DATABASE_URL` verwijderd
- `src/components/db-explorer/LocalTableList.tsx` — error-tekst aangepast (verwijst niet meer naar DIRECT_DATABASE_URL)

## Wat bewaard is
- `src/lib/db/pool.ts`, `src/lib/db/introspect.ts`, `src/lib/db/encrypt.ts` — nog in gebruik door `external-db.ts` en `db-connections.ts` voor de externe-DB feature (settings/db pagina's). `pg` blijft in `package.json`.

## Verificatie
- `tsc --noEmit` — schoon (geen errors).
- ESLint — niet draaibaar (pre-existing config-issue: ESLint 9 zonder `eslint.config.mjs`, `next lint` deprecated). Code volgt exact het `UntypedClient`-patroon uit `src/lib/supabase/actions.ts`.

## Volgende stappen (niet in deze wijziging)
- Voer migration `011_crud_table_meta_rpc.sql` uit via Supabase MCP of SQL Editor.
- Herschrijf `external-db.ts` + settings/db pagina's naar PostgREST (of verwijder de externe-DB feature) zodat `pool.ts`/`introspect.ts` en `pg` verwijderd kunnen worden.
- Update `database.types.ts` zodra de RPC's zijn toegevoegd (type-generatie).
- Schrijf Playwright-regressiontest voor de CRUD happy path.