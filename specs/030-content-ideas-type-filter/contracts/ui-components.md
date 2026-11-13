# Phase 1 UI Contract — Filterbalk, beschrijvingsstrook en ideeënlijst

**Feature**: [spec.md](../spec.md) | **Plan**: [plan.md](../plan.md) | **Date**: 2026-11-13

Dit contract beschrijft de props, staten, toegankelijkheid en testhaken van de nieuwe en gewijzigde UI-onderdelen. Het is de afspraak tussen de pure logica, de componenten en de E2E-tests.

## 1. Pure logica (`src/lib/content/ideas.ts`)

### 1.1 `IdeaFilter`

```ts
export type IdeaFilter =
  | { kind: 'all' }
  | { kind: 'none' }
  | { kind: 'pillar'; pillarId: string }
```

**Invarianten**:
- Precies één lid is actief.
- `pillar` is alleen geldig als de `pillarId` in de geladen soorten bestaat.
- `none` is alleen geldig als er minstens één post zonder bekende soort is.
- De waarde is serialiseerbaar en bevat geen functies of datums.

### 1.2 `ALL_IDEA_FILTER`

```ts
export const ALL_IDEA_FILTER: IdeaFilter = { kind: 'all' }
```

- Stabiele referentie; wordt gebruikt als standaard en als fallback.
- Wordt nooit gemuteerd.

### 1.3 `IdeaFilterOption`

```ts
export interface IdeaFilterOption {
  filter: IdeaFilter
  label: string
  count: number
  color: PillarColor | null
  archived: boolean
}
```

**Invarianten**:
- De eerste optie is altijd `ALL_IDEA_FILTER` met label "Alle soorten" en `count === counts.total`.
- Daarna volgen de rijen van `counts.rows` in de bestaande volgorde.
- Een rij met `pillarId !== null` wordt `{ kind: 'pillar', pillarId }`.
- Een rij met `pillarId === null` wordt `{ kind: 'none' }` met label "Geen soort".
- `archived` is alleen `true` bij een gearchiveerde soort.
- `color` is `null` voor "Alle soorten" en "Geen soort".

### 1.4 `buildIdeaFilterOptions`

```ts
export function buildIdeaFilterOptions(counts: IdeaCounts): IdeaFilterOption[]
```

- Pure functie; muteert `counts` niet.
- Levert altijd minstens "Alle soorten".
- Neemt alle soorten mee, inclusief 0 en gearchiveerd.
- Voegt "Geen soort" alleen toe als `counts.rows` die rij bevat (dus als `unassigned > 0`).
- De som van alle `count`-waarden exclusief "Alle soorten" is gelijk aan `counts.total`.

### 1.5 `matchesIdeaFilter`

```ts
export function matchesIdeaFilter(
  post: Pick<ContentPost, 'pillar_id'>,
  filter: IdeaFilter,
  knownPillarIds: ReadonlySet<string>,
): boolean
```

| Filter | Matcht |
|--------|--------|
| `all` | Elke post. |
| `none` | `post.pillar_id === null` of `!knownPillarIds.has(post.pillar_id)`. |
| `pillar` | `post.pillar_id === filter.pillarId` én `knownPillarIds.has(post.pillar_id)`. |

- Een onbekende `pillar_id` matcht nooit een `pillar`-filter, ook niet als de id toevallig gelijk is aan de filterwaarde maar niet in `knownPillarIds` staat.

### 1.6 `filterIdeas`

```ts
export function filterIdeas<T extends Pick<ContentPost, 'pillar_id'>>(
  posts: T[],
  filter: IdeaFilter,
  knownPillarIds: ReadonlySet<string>,
): T[]
```

- Retourneert een nieuwe array; muteert `posts` niet.
- Behoudt de volgorde van `posts`.
- Gebruikt `matchesIdeaFilter` voor elk item.
- Bij `all` wordt de invoerarray niet gekopieerd als dat niet nodig is? **Contract**: altijd een nieuwe array teruggeven, zodat de caller niet per ongeluk de cache-array muteert. (Een implementatie mag `posts.filter(() => true)` gebruiken; de identiteit van de array is niet gegarandeerd.)

### 1.7 `resolveIdeaFilter`

```ts
export function resolveIdeaFilter(
  filter: IdeaFilter,
  options: { knownPillarIds: ReadonlySet<string>; hasUnassigned: boolean },
): IdeaFilter
```

- `all` → `filter` (of `ALL_IDEA_FILTER`).
- `pillar` met bekende id → `filter`.
- `pillar` met onbekende id → `ALL_IDEA_FILTER`.
- `none` met `hasUnassigned === true` → `filter`.
- `none` met `hasUnassigned === false` → `ALL_IDEA_FILTER`.
- Retourneert bij een geldige keuze dezelfde objectreferentie als de invoer, zodat een `useEffect` met identiteitsvergelijking niet onnodig reset.

### 1.8 `ideaFilterLabel`

```ts
export function ideaFilterLabel(
  filter: IdeaFilter,
  pillarNameById: ReadonlyMap<string, string>,
): string
```

- `all` → "Alle soorten".
- `none` → "Geen soort".
- `pillar` met bekende naam → de naam.
- `pillar` zonder bekende naam → "Geen soort" (defensieve fallback).

## 2. `IdeaFilterBar` (nieuw component)

**Bestand**: `src/components/content/IdeaFilterBar.tsx`

### 2.1 Props

```ts
interface IdeaFilterBarProps {
  options: IdeaFilterOption[]
  activeFilter: IdeaFilter
  activePillar: ContentPillar | null
  onFilterChange: (filter: IdeaFilter) => void
  isLoading: boolean
  isError: boolean
  onRetry: () => void
}
```

| Prop | Verantwoordelijkheid |
|------|----------------------|
| `options` | De volledige, geordende lijst uit `buildIdeaFilterOptions(counts)`. |
| `activeFilter` | De **effectieve** filter (na `resolveIdeaFilter`), niet de ruwe state. |
| `activePillar` | De soort bij `activeFilter.kind === 'pillar'`, anders `null`. Wordt gebruikt voor de beschrijvingsstrook. |
| `onFilterChange` | Wordt aangeroepen met de gekozen `IdeaFilter`; de parent zet de state. |
| `isLoading` | Toont de skeleton; geen definitieve aantallen. |
| `isError` | Toont de foutmelding met retry; geen opties of beschrijvingsstrook. |
| `onRetry` | Roept `pillarsQuery.refetch()` aan. |

### 2.2 Rendering

```text
<section data-testid="idea-filter" aria-labelledby="idea-filter-heading">
  <h2 id="idea-filter-heading">Filter op soort</h2>
  <div role="group" aria-label="Filter op contentsoort">
    {options.map(option => <button aria-pressed={...}>…</button>)}
  </div>
  {activePillar && <PillarDescription pillar={activePillar} />}
</section>
```

- De sectie is alleen zichtbaar wanneer de parent hem rendert (dus niet bij 0 soorten, posts-fout of verborgen staat).
- `options` bevat altijd "Alle soorten" als eerste optie.
- Elke optie is een native `button` met `type="button"`.
- De optie toont:
  - een kleurdot (alleen bij een soort),
  - de naam (afgekapt met `title` en `min-w-0`),
  - een archiefmarkering `(gearchiveerd)` bij een gearchiveerde soort,
  - het aantal in een `span` met `data-testid="idea-filter-count"`.
- De actieve optie heeft `aria-pressed="true"` en een duidelijke achtergrond/tekstcontrast; de inactieve optie heeft een outline/kaartstijl. De actieve optie is niet uitsluitend via kleur te herkennen.
- De actieve optie wordt **op waarde** bepaald (`option.filter.kind` en, bij een soort, `option.filter.pillarId`), niet op objectidentiteit: de opties worden elke render opnieuw opgebouwd.
- De opties gebruiken `flex flex-wrap` en `gap-1.5`, zodat ze op smalle schermen wikkelen en de pagina niet horizontaal scrollt.
- De focusring is zichtbaar via de bestaande `focus-visible:ring-1 focus-visible:ring-ring`.

### 2.3 Beschrijvingsstrook (`PillarDescription`)

- Wordt alleen gerenderd als `activeFilter.kind === 'pillar'` en `activePillar` niet `null` is.
- Toont:
  - een kop "Korte beschrijving" (bijv. `h3` of een klein label),
  - de kleurdot en de soortnaam,
  - `(gearchiveerd)` bij een gearchiveerde soort,
  - de beschrijving of "Geen korte beschrijving." als die leeg is.
- De beschrijving is alleen-lezen.
- Lange tekst: standaard `line-clamp-3`; een knop "Toon volledige beschrijving" / "Toon minder" met `aria-expanded` klapt de tekst uit. De knop verschijnt alleen als de tekst een redelijke drempel overschrijdt (bijv. meer dan 180 tekens) of als de tekst daadwerkelijk overflowt.
- De uitklapstate wordt gereset wanneer een andere soort actief wordt (bijv. via `key={activePillar.id}` op het strookcomponent of een expliciete reset), zodat een vorige uitgeklapte tekst niet onbedoeld open blijft staan.
- De tekst gebruikt `break-words` en `min-w-0`, zodat lange woorden op 375 px niet overflowen.
- `data-testid`s:
  - `idea-filter-description`
  - `idea-filter-description-text`
  - `idea-filter-description-toggle`

### 2.4 Staten

| Staat | Voorwaarde | UI |
|-------|------------|----|
| Loading | `isLoading === true` | `data-testid="idea-filter-loading"`; skeletonpillen; geen aantallen; geen beschrijvingsstrook. |
| Error | `isError === true` | `data-testid="idea-filter-error"`; tekst "Filteren is tijdelijk niet beschikbaar. De ideeënlijst toont alle ideeën."; knop "Opnieuw proberen" (`idea-filter-retry`). |
| Ready | `!isLoading && !isError` | Filteropties en, indien van toepassing, de beschrijvingsstrook. |
| Hidden | Parent rendert de component niet | Geen filterbalk; de lijst toont alle posts. |

- De component zelf rendert bij `isLoading` geen opties, ook niet met lege aantallen.
- De component zelf rendert bij `isError` geen opties en geen beschrijvingsstrook.
- De parent beslist of de component überhaupt wordt gerenderd (0 soorten, posts-fout).

### 2.5 Toegankelijkheid

- `role="group"` met `aria-label="Filter op contentsoort"`.
- Elke optie is een native button; Tab, Enter en Space werken zonder extra key handlers.
- `aria-pressed` geeft de actieve optie aan.
- De zichtbare naam en het aantal staan als tekst in de knop; de toegankelijke naam bevat minimaal de soortnaam en het aantal.
- De beschrijvingsstrook heeft een zichtbare kop en is gekoppeld aan de actieve soort.
- De uitklapknop gebruikt `aria-expanded` en een duidelijke tekst.
- Geen browserdialoogvensters; de foutmelding staat in de app.

## 3. `IdeaList` (gewijzigd component)

**Bestand**: `src/components/content/IdeaList.tsx`

### 3.1 Props

```ts
interface IdeaListProps {
  posts: ContentPost[]                 // de zichtbare (gefilterde) posts
  totalCount?: number                  // totale aantal posts, voor "x van y"
  pillarById: Map<string, ContentPillar>
  onOpen: (post: ContentPost) => void
  isLoading?: boolean
  isError?: boolean
  onRetry?: () => void
  activeFilterLabel?: string | null    // null/undefined bij "Alle soorten"
  onClearFilter?: () => void
}
```

| Prop | Verantwoordelijkheid |
|------|----------------------|
| `posts` | De al gefilterde lijst; de component filtert zelf niet. |
| `totalCount` | Het totale aantal posts; bij een actief filter toont de kop "x van y". |
| `pillarById` | Bestaande map voor de soortnaam, kleur en archiefmarkering per rij. |
| `onOpen` | Opent de bestaande editor. |
| `isLoading` | Bestaande laadskeleton. |
| `isError` | Bestaande foutmelding, nu met retry. |
| `onRetry` | Roept `postsQuery.refetch()` aan. |
| `activeFilterLabel` | Naam van de actieve soort of "Geen soort"; `null` bij "Alle soorten". |
| `onClearFilter` | Zet de filter terug op "Alle soorten". |

### 3.2 Kop

- Toont "Ideeën" en het aantal.
- Zonder filter of wanneer `totalCount` ontbreekt: alleen `posts.length`.
- Met een actief filter en `totalCount !== posts.length`: `"{posts.length} van {totalCount}"`.
- `data-testid="idea-list-count"`.

### 3.3 Staten

| Staat | Voorwaarde | UI |
|-------|------------|----|
| Loading | `isLoading === true` | Bestaande skeleton met `aria-label="Ideeën laden"`. |
| Error | `!isLoading && isError` | Bestaande fouttekst "Kon de ideeën niet laden. Probeer het opnieuw." plus een knop "Opnieuw proberen" (`data-testid="idea-list-retry"`). |
| General empty | `!isLoading && !isError && posts.length === 0 && (totalCount ?? 0) === 0` | Bestaande tekst "Nog geen ideeën. Typ hierboven een titel en druk op Enter." (`data-testid="idea-list-empty"`). |
| Filtered empty | `!isLoading && !isError && posts.length === 0 && (totalCount ?? 0) > 0 && activeFilterLabel` | Tekst "Geen ideeën voor {activeFilterLabel}." plus een knop "Toon alle ideeën" (`data-testid="idea-list-clear-filter"`), met `data-testid="idea-list-empty-filtered"`. |
| Ready | `!isLoading && !isError && posts.length > 0` | Bestaande rijen. |

- De algemene lege staat mag nooit verschijnen wanneer er wel posts bestaan maar het filter niets oplevert.
- De gefilterde lege staat noemt de gekozen soort of "Geen soort".
- De "Toon alle ideeën"-knop roept `onClearFilter` aan; de parent zet de filter op `ALL_IDEA_FILTER`.

### 3.4 Rijen

- Ongewijzigd: kleurdot, titel, statusbadge, soortnaam of "Geen soort", aanmaakdatum.
- Een klik of Enter/Space opent de bestaande editor.
- Gearchiveerde soorten tonen "(gearchiveerd)".
- `data-testid="idea-row"`, `data-post-id`, `idea-row-title`, `idea-row-pillar` blijven behouden.

## 4. `ContentView` (gewijzigde container)

**Bestand**: `src/components/content/ContentView.tsx`

### 4.1 State en afgeleiden

```ts
const [filter, setFilter] = useState<IdeaFilter>(ALL_IDEA_FILTER)
const counts = useMemo(() => countIdeasByPillar(posts, pillars), [posts, pillars])
const knownPillarIds = useMemo(() => new Set(pillars.map(p => p.id)), [pillars])
const effectiveFilter = useMemo(
  () => resolveIdeaFilter(filter, { knownPillarIds, hasUnassigned: counts.unassigned > 0 }),
  [filter, knownPillarIds, counts.unassigned],
)
const visiblePosts = useMemo(
  () => filterIdeas(posts, effectiveFilter, knownPillarIds),
  [posts, effectiveFilter, knownPillarIds],
)
const filterOptions = useMemo(() => buildIdeaFilterOptions(counts), [counts])
const activePillar =
  effectiveFilter.kind === 'pillar' ? pillarById.get(effectiveFilter.pillarId) ?? null : null
const activeFilterLabel =
  effectiveFilter.kind === 'all' ? null : ideaFilterLabel(effectiveFilter, pillarNameById)
```

- `useEffect` synchroniseert `filter` met `effectiveFilter` wanneer die afwijkt, zodat een verdwenen optie niet later opnieuw actief wordt.
- De filterstate blijft behouden bij wisselen tussen "Ideeën" en "Overzicht", omdat beide panelen gemount blijven.
- Bij een nieuwe paginaweergave start de state op `ALL_IDEA_FILTER`.

### 4.2 Renderbeslissing

- `postsQuery.isLoading || pillarsQuery.isLoading`: toon `IdeaFilterBar` met `isLoading`.
- `pillarsQuery.isError`: toon `IdeaFilterBar` met `isError` (geen opties), mits de posts niet zelf in een initiële fout zitten; de lijst toont alle posts.
- `postsQuery.isError`: verberg de filterbalk; de lijst toont de fout met retry.
- `pillars.length === 0`: verberg de filterbalk; de lijst toont alle posts.
- Anders: toon `IdeaFilterBar` met de opties en de actieve soort.

### 4.3 `IdeaList`-props

```tsx
<IdeaList
  posts={visiblePosts}
  totalCount={posts.length}
  pillarById={pillarById}
  onOpen={(post) => setEditorPostId(post.id)}
  isLoading={postsQuery.isLoading}
  isError={postsQuery.isError}
  onRetry={() => { void postsQuery.refetch() }}
  activeFilterLabel={activeFilterLabel}
  onClearFilter={() => setFilter(ALL_IDEA_FILTER)}
/>
```

- `ContentOverview` blijft `counts` (alle posts) ontvangen; de filter beïnvloedt het overzicht niet.
- `PipelineBlock` wordt niet meer geïmporteerd of gerenderd.

## 5. Data-testids

| Testid | Onderdeel | Betekenis |
|--------|-----------|-----------|
| `idea-filter` | `IdeaFilterBar` | De filterbalk is zichtbaar. |
| `idea-filter-loading` | `IdeaFilterBar` | De filteraantallen laden nog. |
| `idea-filter-error` | `IdeaFilterBar` | De soorten konden niet laden. |
| `idea-filter-retry` | `IdeaFilterBar` | Retryknop voor de soorten. |
| `idea-filter-option` | `IdeaFilterBar` | Een filteroptie; met `data-filter-kind` en `data-pillar-id`. |
| `idea-filter-count` | `IdeaFilterBar` | Het aantal in een filteroptie. |
| `idea-filter-description` | `IdeaFilterBar` | De beschrijvingsstrook. |
| `idea-filter-description-text` | `IdeaFilterBar` | De tekst van de korte beschrijving. |
| `idea-filter-description-toggle` | `IdeaFilterBar` | Uitklappen/inklappen van een lange beschrijving. |
| `idea-list-count` | `IdeaList` | Het aantal zichtbare (en totale) ideeën. |
| `idea-list-error` | `IdeaList` | De posts konden niet laden. |
| `idea-list-retry` | `IdeaList` | Retryknop voor de posts. |
| `idea-list-empty` | `IdeaList` | Algemene lege staat. |
| `idea-list-empty-filtered` | `IdeaList` | Lege staat door het actieve filter. |
| `idea-list-clear-filter` | `IdeaList` | "Toon alle ideeën". |
| `content-pipeline` | **verwijderd** | Mag nergens meer voorkomen. |
| `pipeline-*` | **verwijderd** | Mogen nergens meer voorkomen. |

## 6. Acceptance matrix

| Spec-eis | Contractonderdeel | Bewijs |
|----------|-------------------|--------|
| FR-001/FR-002: één lijst, geen pijplijn | `ContentView` render + verwijderen `PipelineBlock` | E2E: `content-pipeline` count 0; `Pijplijn` count 0. |
| FR-003/FR-004: alle statussen, statuslabel en volgorde | `IdeaList` ongewijzigde rijen; `filterIdeas` bewaart volgorde | Pure test: alle statussen; E2E: live idee zichtbaar. |
| FR-005: overzicht en soortenbeheer blijven | `ContentOverview`/`PillarsDialog` ongewijzigd | Bestaande E2E-tests blijven groen. |
| FR-006/FR-007/FR-008: filterbalk, standaard all, tellingen | `buildIdeaFilterOptions`, `IdeaFilterBar` | Pure test: opties en aantallen; E2E: "Alle soorten" actief. |
| FR-009/FR-010: alle soorten, 0, gearchiveerd, "Geen soort" | `buildIdeaFilterOptions` | Pure test: 0/archived/none; E2E: opties zichtbaar. |
| FR-011/FR-012: single-select en filtering | `resolveIdeaFilter`, `filterIdeas`, `IdeaFilterBar` | Pure test: filter per soort/none; E2E: alleen juiste rijen. |
| FR-013: niet opgeslagen, wel behouden tussen tabs | `ContentView` state + hidden panels | E2E: filter blijft actief na tabwissel. |
| FR-014: geen mutatie | `filterIdeas`/`matchesIdeaFilter` | Pure test: invoerarray ongewijzigd. |
| FR-015: zichtbaar/totaal in de kop | `IdeaList` `totalCount` | E2E: "x van y". |
| FR-016: gefilterde lege staat + actie | `IdeaList` filtered empty | E2E: lege staat en "Toon alle ideeën". |
| FR-017: fallback bij verdwijnen "Geen soort" | `resolveIdeaFilter` + `useEffect` | Pure test + E2E: laatste losse idee krijgt soort → "Alle soorten". |
| FR-018/FR-019: archief en hernoemen | `IdeaFilterBar`, `IdeaList` | E2E: archiefmarkering; nieuwe naam direct. |
| FR-020/FR-021: beschrijvingsstrook met naam/kleur | `PillarDescription` | E2E: strook zichtbaar met tekst en kleur. |
| FR-022/FR-023: lege beschrijving, verbergen bij all | `PillarDescription` | E2E: "Geen korte beschrijving"; strook weg bij all. |
| FR-024: lange beschrijving | `PillarDescription` toggle | E2E: uitklappen. |
| FR-025: alleen-lezen | `PillarDescription` zonder inputs | E2E: geen bewerkveld in de strook. |
| FR-026: directe update na wijziging | bestaande `useUpdatePillar`-invalidatie | E2E: beschrijving wijzigen → strook update. |
| FR-027 t/m FR-032: actualiteit | bestaande React Query-cache-updates | E2E: toevoegen, wisselen, verwijderen, hernoemen. |
| FR-033/FR-034: laden en posts-fout | `IdeaList` loading/error + retry | E2E: loading/error. |
| FR-035: soorten-fout | `IdeaFilterBar` error + retry; lijst alle posts | E2E: filter error, lijst zichtbaar. |
| FR-036: geen soorten | `ContentView` verbergt filter | E2E: geen filter, alle posts. |
| FR-037/FR-038: veel soorten en 375 px | `flex flex-wrap`, `min-w-0`, `truncate` | E2E: 20 soorten/375 px zonder pagina-overflow. |
| FR-039/FR-040: toetsenbord en kleur | native buttons, `aria-pressed`, focusring | E2E: toetsenbord; handmatige controle. |
| FR-041: in-app meldingen | `IdeaFilterBar`/`IdeaList` | E2E: geen browserdialoog. |
| FR-042: bestaande data/editor/status | Geen wijziging in actions/types | `git diff` + bestaande tests. |
| SC-001 t/m SC-009 | Alle bovenstaande | Playwright-suite + handmatige quickstart. |
