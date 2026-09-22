# 2026-09-22 — /uren reads via SSR-prefetch en browser-client i.p.v. server actions

## Decision: Reads op /uren gaan via SSR-prefetch (HydrationBoundary) en de browser Supabase-client; server actions blijven alleen voor mutaties. `revalidatePath('/uren')` is verwijderd uit createClient en updateClient.

## Context

Na hydratie van /uren deed de pagina vijf reads via Next.js server actions (listClients, getRevenueStats, getDashboardStats, listOpenEntries, listEntries). Next.js voert server actions één voor één uit, dus vijf seriële round-trips naar de Netlify function in de VS (~vijfhonderd ms tot seconden per page load). page.tsx haalde bovendien de clients al op maar gebruikte ze niet — alleen `initialClients.length` belandde in een verborgen span. Daarnaast matchte de optimistic-update key `['hours','entries',{limit:50,offset:0}]` nooit met de echte key (die ook fromDate/toDate/clientId bevat), dus de optimistic updates deden niets.

## Alternatives considered

1. **Server actions parallel aanroepen via Promise.all** — verlaagt de latentie, maar houdt vijf aparte Netlify function-invocations; server actions zijn per design ook niet bedoeld als read-API voor de client.
2. **`getDashboardStats` naar SQL (RPC) verzetten** — sneller op de server, maar lost het kernprobleem (seriële server-action round-trips na hydratie) niet op. Expliciet out of scope.
3. **react-query `initialData` per query via props** — vijf losse props, veel boilerplate, geen gedeelde prefetch-batch. HydrationBoundary is de standaard TanStack Query v5-aanpak.

## Reasoning

- SSR-prefetch met `QueryClient.prefetchQuery` + `dehydrate` + `HydrationBoundary` (TanStack Query v5, API gecontroleerd via Context7) stuurt alle vijf reads parallel naar Supabase vanaf de server én embedt de resultaten in de SSR-response: 0 server-action-calls na hydratie.
- De query-logica staat nu in `src/lib/hours/queries.ts` (gedeeld door server en browser) met een meegegeven Supabase-client, dus de browser kan dezelfde functies gebruiken voor refetch (na mutaties, bij window focus) — rechtstreeks en parallel, RLS zorgt voor user-isolatie (`user_id = auth.uid()` op kk_clients en kk_hour_entries).
- Supabase-fouten worden nu gegooid i.p.v. stil `[]` terug te geven, zodat React Query de retry-detectie en error-states correct afhandelt.
- Tijdzone-bug gefixt: de server draait in UTC, de browser in Europe/Amsterdam. `src/lib/hours/dates.ts` (`amsterdamTodayISO`, `amsterdamFirstOfMonthISO`, `amsterdamReferenceDate`) zorgt dat SSR- en client-query-keys dezelfde datums bevatten (rond middernacht verschilden die), en dat `startOfMonthISO()` niet langer via `toISOString()` op lokale middernacht de vorige maand teruggeeft.
- Optimistic updates gebruiken nu `cancelQueries`/`getQueriesData`/`setQueriesData` op prefix `['hours','entries']` met rollback van alle snapshots bij fout, conform het TanStack Query v5-optimalupdatepatroon.
- `revalidatePath('/uren')` weg: React Query invalidatie ververst de data al direct; `revalidatePath` liet de server daarentegen de hele pagina opnieuw renderen in de response van de action.

## Trade-offs accepted

- De browser-client doet de reads: een extra batch Supabase-calls vanaf de client bij refetch, maar parallel en zonder Netlify-tussenlaag — netto sneller.
- Queries in `queries.ts` mogen geen 'use server' bevatten, dus de read-logica is geen server action meer en publiek in de client bundle (bevat geen secrets).
- `useHours.ts` hangt af van `useAuthStore` (gevuld door AuthInitializer): zonder userId staan de queries op `enabled: false`; op een niet-geïnitialiseerde pagina zou /uren leeg blijven — de route zit achter de auth-middleware, dus niet relevant.
- De vijf verwijderde server actions (listClients, listActiveClients, listEntries, listOpenEntries, getDashboardStats, getRevenueStats) zijn niet langer beschikbaar voor hergebruik elders; bij nieuwe behoefte komen de fetchers uit `src/lib/hours/queries.ts`.

## Supersedes

- `/decisions/` had geen eerdere beslissing over de /uren data-laag; dit is de eerste vastlegging. Gerelateerd (niet superseded): `2026-07-23-crud-postgrest-migration.md` (PostgREST i.p.v. pg.Pool — zelfde richting: geen directe DB-toegang uit de app).