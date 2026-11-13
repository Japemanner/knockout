# Phase 1 Data Model — Content-ideeën filteren op soort

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**: 2026-11-13

## Overzicht

De feature voegt **geen opgeslagen gegevens** toe. Alle nieuwe modellen zijn afgeleide weergavemodellen op de bestaande Supabase-tabellen `kk_content_posts` en `kk_content_pillars`. Er is geen migratie, geen nieuwe kolom, geen nieuwe index en geen RLS-wijziging.

## Bestaande entiteiten

### ContentPost (bestaand)

Tabel: `kk_content_posts` (RLS: `user_id = auth.uid()`).

| Veld | Type | Gebruik in deze feature |
|------|------|--------------------------|
| `id` | `string` (uuid) | Identiteit en React-key; filteren verandert dit niet. |
| `user_id` | `string` | RLS-grens; niet gebruikt in de filterlogica. |
| `pillar_id` | `string \| null` | Bepaalt bij welke soort een idee hoort. `null` of een onbekende id telt als "Geen soort". |
| `title` | `string` | Bestaande rijweergave; ongewijzigd. |
| `body` | `string` | Bestaande detailweergave; ongewijzigd. |
| `status` | `ContentStatus` | Wordt **niet** gebruikt om te filteren; alle statussen blijven zichtbaar en tellen mee. |
| `created_at` | `string` (ISO) | Bestaande sorteersleutel (nieuwste eerst); ongewijzigd. |
| `updated_at` | `string` (ISO) | Bestaande cache-/resync-sleutel; ongewijzigd. |
| `format`, `planned_date`, `planned_time`, `linkedin_url`, `scheduled_on_linkedin_at` | legacy | Buiten beeld; de filter raakt deze velden niet aan. |
| `source_url`, `notes` | `string \| null` | Bestaande detailvelden; ongewijzigd. |

**Relaties**: `ContentPost.pillar_id` verwijst conceptueel naar `ContentPillar.id`. De database-relatie en RLS blijven ongewijzigd. Een post met een `pillar_id` die niet in de geladen soorten voorkomt, wordt in de UI als "Geen soort" behandeld.

### ContentPillar (bestaand)

Tabel: `kk_content_pillars` (RLS: `user_id = auth.uid()`).

| Veld | Type | Gebruik in deze feature |
|------|------|--------------------------|
| `id` | `string` (uuid) | Filterwaarde voor `IdeaFilter.kind = 'pillar'`. |
| `user_id` | `string` | RLS-grens; niet gebruikt in de filterlogica. |
| `name` | `string` | Label in de filteroptie, de beschrijvingsstrook en de gefilterde lege staat. |
| `description` | `string \| null` | De **korte beschrijving** in de strook. Leeg/`null` → "Geen korte beschrijving." |
| `color` | `PillarColor` | Kleurdot in de filteroptie en de beschrijvingsstrook. |
| `archived` | `boolean` | Soort blijft filterbaar; toont een archiefmarkering. |
| `position` | `number` | Bestaande sorteersleutel voor de filteropties (via `fetchPillars`). |
| `audience` | `string \| null` | Bestaand veld; niet gebruikt in deze feature. |
| `created_at`, `updated_at` | `string` (ISO) | Bestaande cache-/resync-sleutels; ongewijzigd. |

**Relaties**: Eén soort kan veel posts hebben. Soorten worden niet verwijderd, alleen gearchiveerd; daardoor blijven bestaande posts en filteropties bestaan.

## Afgeleide modellen

### IdeaFilter (nieuw, niet opgeslagen)

```ts
export type IdeaFilter =
  | { kind: 'all' }
  | { kind: 'none' }
  | { kind: 'pillar'; pillarId: string }
```

- `all`: toon alle posts.
- `none`: toon posts zonder soort (lege of onbekende `pillar_id`).
- `pillar`: toon posts van precies één bekende soort.
- Precies één waarde is actief.
- De waarde wordt niet opgeslagen en niet tussen sessies onthouden.

### ALL_IDEA_FILTER (nieuw, constante)

```ts
export const ALL_IDEA_FILTER: IdeaFilter = { kind: 'all' }
```

- Stabiele referentie voor de standaardkeuze en de fallback.
- Wordt gebruikt bij het openen van de pagina, bij "Toon alle ideeën" en wanneer een gekozen optie niet meer bestaat.

### IdeaFilterOption (nieuw, afgeleid)

```ts
export interface IdeaFilterOption {
  filter: IdeaFilter
  label: string
  count: number
  color: PillarColor | null
  archived: boolean
}
```

- `label`: "Alle soorten", de soortnaam of "Geen soort".
- `count`: aantal posts voor deze optie, over alle statussen.
- `color`: `null` voor "Alle soorten" en "Geen soort"; anders de pillarkleur.
- `archived`: alleen `true` bij een gearchiveerde soort.
- Wordt uitsluitend afgeleid uit `IdeaCounts`; niet opgeslagen.

### IdeaCounts (bestaand)

```ts
export interface IdeaCountRow {
  pillarId: string | null
  name: string
  color: PillarColor | null
  archived: boolean
  count: number
}

export interface IdeaCounts {
  rows: IdeaCountRow[]
  total: number
  unassigned: number
}
```

- `rows`: alle soorten in positie/naam-volgorde, inclusief 0 en gearchiveerd; "Geen soort" alleen wanneer `unassigned > 0`.
- `total`: alle posts, ongeacht status.
- `unassigned`: posts met een lege of onbekende `pillar_id`.
- Blijft de bestaande bron voor zowel het overzicht als de filterbalk.

### IdeaFilterViewState (nieuw, afgeleid)

```ts
export type IdeaFilterViewState = 'loading' | 'error' | 'ready' | 'hidden'
```

- `loading`: posts of soorten initial laden; toon een skeleton, geen definitieve aantallen.
- `error`: soorten konden niet laden; toon de in-app melding met retry, geen opties.
- `ready`: toon de filteropties en, bij een gekozen soort, de beschrijvingsstrook.
- `hidden`: geen soorten, of een posts-fout; toon geen filterbalk.

Deze staat wordt in de view afgeleid; er is geen aparte store of opgeslagen status.

## Regels en validatie

### Filterregels

1. **Eén optie actief**: `IdeaFilter` is een discriminated union; er is geen array van actieve filters.
2. **Geldigheid**:
   - `pillar` is geldig als `knownPillarIds.has(pillarId)`.
   - `none` is geldig als `hasUnassigned === true`.
   - `all` is altijd geldig.
3. **Fallback**: een ongeldige keuze wordt vervangen door `ALL_IDEA_FILTER`. De UI-state wordt via een `useEffect` gelijkgetrokken, zodat de keuze niet later onverwacht terugkomt.
4. **Geen mutatie**: filteren, tellen en labelen muteren de posts- of pillars-array niet en veranderen geen enkel record.
5. **Volgorde**: de gefilterde lijst behoudt de bestaande volgorde van `posts` (nieuwste eerst). De filteropties behouden de volgorde van `counts.rows` (soorten op positie/naam, "Geen soort" achteraan).
6. **Status**: `status` is geen filtercriterium. Alle vijf statussen tellen mee in de aantallen en blijven zichtbaar in de lijst.
7. **Onbekende soort**: een post met een `pillar_id` die niet in `pillars` voorkomt, valt onder "Geen soort", zowel in de telling als in de filtering.
8. **Gearchiveerde soort**: blijft een geldige filteroptie en houdt zijn posts; de optie en de strook tonen een archiefmarkering.
9. **Soort met 0 ideeën**: blijft een geldige filteroptie met count 0; kiezen toont de gefilterde lege staat.
10. **Geen soorten**: de filterbalk wordt verborgen; alle posts blijven zichtbaar.
11. **Niet opgeslagen**: de filterkeuze wordt niet in Supabase, localStorage of een cookie bewaard.

### Beschrijvingsregels

1. De strook verschijnt alleen bij `filter.kind === 'pillar'` en een bestaande soort.
2. De strook toont naam, kleur, archiefmarkering en `description`.
3. `description === null` of een lege/whitespace-string → "Geen korte beschrijving."
4. De strook is alleen-lezen in de ideeënweergave; bewerken gebeurt in `PillarsDialog`.
5. Een lange beschrijving wordt standaard afgekapt en kan met een knop volledig worden getoond; de volledige tekst blijft altijd bereikbaar.
6. Na een wijziging van `description` in `PillarsDialog` invalideert `useUpdatePillar` de pillars-query; de strook toont de nieuwe tekst zonder paginavernieuwing.

### Tellingen

1. `counts.total` = alle posts, inclusief alle statussen.
2. `counts.rows[i].count` = posts met die `pillar_id`, over alle statussen.
3. `counts.unassigned` = posts met `pillar_id === null` of een onbekende `pillar_id`.
4. De som van alle soorttellingen plus `unassigned` is gelijk aan `counts.total`.
5. De tellingen zijn onafhankelijk van de actieve filter; ze veranderen niet door te filteren.

## State transitions

| Van | Gebeurtenis | Naar |
|-----|-------------|------|
| `all` | Gebruiker kiest soort A | `pillar(A)` |
| `all` | Gebruiker kiest "Geen soort" (alleen als beschikbaar) | `none` |
| `pillar(A)` | Gebruiker kiest "Alle soorten" | `all` |
| `pillar(A)` | Gebruiker kiest soort B | `pillar(B)` |
| `pillar(A)` | Soort A wordt gearchiveerd | `pillar(A)` (blijft geldig, toont archiefmarkering) |
| `pillar(A)` | Soort A verdwijnt onverwacht uit de data | `all` (defensieve fallback) |
| `none` | Gebruiker kiest "Alle soorten" | `all` |
| `none` | Laatste losse idee krijgt een soort | `all` (optie verdwijnt) |
| `all` | Nieuwe paginaweergave | `all` |
| `all` | Wisselen naar "Overzicht" en terug | `all` (state blijft binnen dezelfde paginaweergave) |

## Persistentie en migratie

- **Geen nieuwe tabellen**: de feature gebruikt `kk_content_posts` en `kk_content_pillars`.
- **Geen nieuwe kolommen**: `pillar_id`, `status`, `description`, `archived`, `color` bestaan al.
- **Geen nieuwe indexen**: de bestaande queries en RLS blijven ongewijzigd.
- **Geen nieuwe RLS-policies**: de bestaande user-scoped policies blijven de grens.
- **Geen migratie**: `supabase/migrations/` blijft ongewijzigd.
- **Geen opgeslagen filter**: de filterkeuze is vluchtige UI-state.
- **Geen gegevensverlies**: er wordt niets verwijderd of gemuteerd; de feature is een afgeleide weergave.

## Datacontract met de bestaande lagen

| Laag | Contract |
|------|----------|
| `fetchPosts` | Levert alle posts van de gebruiker, nieuwste eerst, alle statussen. Ongewijzigd. |
| `fetchPillars` | Levert alle soorten van de gebruiker, inclusief gearchiveerd, op positie/naam. Ongewijzigd. |
| `usePosts` / `usePillars` | Leveren de bestaande React Query-data en loading/error-staten. Ongewijzigd. |
| `useCreatePost` / `useUpdatePost` / `useDeletePost` | Werken de posts-cache bij en invalideren `contentKeys.posts`. Ongewijzigd. |
| `useUpdatePillar` / `useSetPillarArchived` | Invalideren `contentKeys.pillars`. Ongewijzigd. |
| `countIdeasByPillar` | Blijft de telbron voor overzicht en filter. Ongewijzigd. |
| `IdeaList` | Ontvangt voortaan de gefilterde posts plus `totalCount`, `activeFilterLabel`, `onClearFilter` en `onRetry`. |
| `ContentView` | Bezit de lokale `IdeaFilter`-state en leidt opties, aantallen, zichtbare posts en de actieve soort af. |

## Dataset-aannames

- Persoonlijk gebruik; doorgaans enkele honderden posts en tientallen soorten, maximaal enkele duizenden posts.
- De volledige posts- en pillars-array is al geladen door de bestaande SSR-prefetch en React Query-hooks.
- De app is single-user per account; er is geen collaboratieve filterstate nodig.
- De laatste opslag wint bij gelijktijdige tabbladen; er is geen realtime conflictmodel.
