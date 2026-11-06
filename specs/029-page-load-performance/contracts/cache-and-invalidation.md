# Contract: Cache en invalidatie

**Feature**: 029-page-load-performance | **Date**: 2026-11-06

Dit contract legt vast wanneer data als vers geldt, wanneer opnieuw wordt opgehaald en welke mutatie welke cache ongeldig maakt. Het is de bron voor de Playwright-tests en voor toekomstige querywijzigingen.

## 1. Definities

- **Vers**: `now - dataUpdatedAt < 30_000 ms`.
- **Verouderd**: `now - dataUpdatedAt >= 30_000 ms`.
- **Paginawissel**: client-side navigatie via `<Link>` of `router.push` zonder volledige page reload.
- **Tabwissel**: het browservenster verliest en herkrijgt focus.
- **Mutatie**: een serveractie of React Query-mutatie die data schrijft.

## 2. Server-side routercache

| Regel | Waarde |
|-------|--------|
| `experimental.staleTimes.dynamic` | 30 seconden |
| `experimental.staleTimes.static` | Next.js-default (300 seconden), ongewijzigd |
| Back/forward-gedrag | Blijft Next.js-standaard |
| Invalidatie | `revalidatePath` in de betrokken serveractie; `router.refresh()` waar dat al gebeurde |

**Contract**:

1. Een paginawissel binnen 30 seconden naar een route die al is bezocht, mag geen nieuwe RSC-payload opleveren.
2. Een serveractie die data wijzigt, roept `revalidatePath` aan voor elke zichtbare route die die data toont. De bestaande aanroepen in `src/actions/*` blijven leidend.
3. Een paginawissel na een mutatie toont de nieuwe stand, ook als de vorige payload minder dan 30 seconden oud was.
4. Een directe page reload (`F5`) omzeilt de clientroutercache en haalt altijd de nieuwste serverdata op.

## 3. Client-side TanStack Query

| Regel | Waarde |
|-------|--------|
| Globale `staleTime` | 60 seconden (bestaand) |
| Globale `gcTime` | 5 minuten (bestaand) |
| Globale `refetchOnWindowFocus` | `false` |
| `refetchOnMount` | Default (`true` bij verouderde data) |
| `refetchInterval` | Alleen actieve tijdklok: 15 seconden |

**Contract**:

1. Elke lijst-/leesquery heeft een `staleTime` van minimaal 30 seconden.
2. Een paginawissel binnen 30 seconden doet geen request voor een verse query.
3. Een tabwissel doet geen request voor een verse query, ongeacht de leeftijd.
4. Een actieve tijdklok blijft elke 15 seconden verversen zolang de widget gemount is.
5. Een mislukte refetch laat de laatst bekende data staan; de UI toont de bestaande foutstaat.

## 4. Mutatie → invalidatiematrix

| Mutatie | Betrokken query keys | Aanvullend |
|---------|----------------------|------------|
| Contentpost toevoegen | `content.posts` | `setQueryData` (prepend) + `invalidateQueries` |
| Contentpost wijzigen | `content.posts` | `setQueryData` (vervangen) + `invalidateQueries` |
| Contentpost verwijderen | `content.posts` | `setQueryData` (filteren) + `invalidateQueries` |
| Contentsoort wijzigen/archiveren | `content.pillars` | `invalidateQueries` |
| Urenregel toevoegen/wijzigen/verwijderen | `hours.entries`, `hours.openEntries`, `hours.dashboard`, `hours.revenue` | `invalidateQueries` |
| Klant wijzigen | `hours.clients`, `hours.dashboard`, `hours.revenue` | `invalidateQueries` |
| Prioriteit wijzigen | `priorities` | `invalidateQueries` + `revalidatePath('/command-center')` |
| Tijdregistratie starten/stoppen | `time-tracking.*` | `invalidateQueries` |
| Databaserecord wijzigen | `table-records`, `local-table-records` | `invalidateQueries` |
| Bord/kaart wijzigen | Server-side routes | `revalidatePath('/boards', '/boards/[id]', '/command-center', '/starred')` zoals nu |

**Contract**:

1. Elke mutatie die een lijst beïnvloedt, invalidate de bijbehorende key of revalideert de bijbehorende route.
2. Geen enkele mutatie verlaat zich alleen op de 30-secondenvervaltijd.
3. Een optimistic update blijft de bestaande rollback-strategie volgen.

## 5. Verboden wijzigingen

- `staleTime: Infinity` of `gcTime: Infinity`.
- `refetchOnWindowFocus: true` als globale default.
- Een nieuwe globale cache-laag bovenop TanStack Query.
- `router.refresh()` toevoegen aan elke paginawissel.
- `revalidatePath` verwijderen zonder een gelijkwaardige React Query-invalidatie.
- De 15-secondenpoll van de actieve tijdklok verwijderen of verlagen.

## 6. Verificatie

- Playwright: `tests/e2e/performance.spec.ts` controleert P-10, P-11 en P-12.
- Handmatig: Network-paneel met "Disable cache" uit en een tweede bezoek.
- Code-review: elke `useQuery` in `src/hooks` heeft een `staleTime` ≥ 30 seconden, behalve de gedocumenteerde tijdklok-uitzondering.
