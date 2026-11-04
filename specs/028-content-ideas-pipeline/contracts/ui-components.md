# Contract: UI-componenten — Content-pijplijn

**Feature**: 028-content-ideas-pipeline | **Date**: 2026-11-03

## Componentstructuur

```text
src/app/(dashboard)/content/page.tsx      Server component: bestaande SSR-prefetch pillars + posts (ongewijzigd)
└── ContentView.tsx                       Client shell: tabbladen, data, editor-state
    ├── IdeaComposer.tsx                  Bestaand: snel een idee vastleggen (ongewijzigd)
    ├── PipelineBlock.tsx                 NIEUW: niet-live ideeën, count, staten
    ├── IdeaList.tsx                      Bestaand: alle ideeën, inclusief live (ongewijzigd)
    ├── ContentOverview.tsx               Bestaand: aantallen per contentsoort (ongewijzigd)
    ├── IdeaEditorDialog.tsx              Bestaand: detail bewerken/verwijderen (ongewijzigd)
    └── PillarsDialog.tsx                 Bestaand: contentsoorten beheren (ongewijzigd)
```

Er zijn geen nieuwe server actions, queries of databestanden. Alleen `ContentView.tsx`, `src/lib/content/ideas.ts` en de twee testbestanden wijzigen; `PipelineBlock.tsx` is nieuw.

## ContentView

**Props**: geen (ongewijzigd).

**Nieuwe afgeleide data**:

```ts
const pipelinePosts = useMemo(() => selectPipelinePosts(posts), [posts])
```

**Nieuwe render** binnen `content-panel-ideeen`:

```tsx
<IdeaComposer ... />
<PipelineBlock
  posts={pipelinePosts}
  hasAnyPosts={posts.length > 0}
  pillarById={pillarById}
  onOpen={(post) => setEditorPostId(post.id)}
  isLoading={postsQuery.isLoading}
  isError={postsQuery.isError}
  onRetry={() => { void postsQuery.refetch() }}
/>
<IdeaList ... />
```

**Ongewijzigd**:

- De bestaande tablist en `content-tab-ideeen` / `content-tab-overzicht`.
- `usePillars()` en `usePosts()` met de bestaande query-keys.
- `countIdeasByPillar` voor het overzicht.
- `IdeaList` toont alle posts, inclusief live, met de bestaande `idea-row`-testid.
- De editor-state en `IdeaEditorDialog`.
- Geen pijplijnblok in `content-panel-overzicht`.

## PipelineBlock

**Props**:

```ts
interface PipelineBlockProps {
  /** Al gefilterd op status !== 'live', in de bestaande volgorde (nieuwste eerst). */
  posts: ContentPost[]
  /** True als de volledige posts-array items bevat; bepaalt de lege tekst. */
  hasAnyPosts: boolean
  pillarById: Map<string, ContentPillar>
  onOpen: (post: ContentPost) => void
  isLoading: boolean
  isError: boolean
  onRetry: () => void
}
```

**Kop**:

- Sectie met `aria-labelledby` naar de kop.
- Icoon `ListChecks` (lucide-react).
- Titel `Pijplijn`.
- Aantal: `posts.length`, met `data-testid="pipeline-count"` en `aria-live="polite"`.
- Geen knop "Toon alles"; de volledige lijst staat er direct onder.

**Rij-contract**:

| Onderdeel | Regel |
|-----------|-------|
| Structuur | `<ul>` met `<li>` per post; elk `li` bevat één native `<button type="button">` |
| Kleurstip | `pillarColors[pillar.color].dot`; zonder soort een neutrale grijze stip |
| Titel | `post.title`, afgekapt met `truncate`; volledige titel in de editor |
| Status | `statusLabel(post.status)` in een `Badge` met `statusBadgeClasses(post.status)`; altijd tekst, niet alleen kleur |
| Contentsoort | Naam van de soort of `Geen soort`; gearchiveerd toont `(gearchiveerd)` |
| Datum | **Niet** in het blok; de volledige lijst toont de aanmaakdatum al |
| Klik | Roept `onOpen(post)` aan; Enter/Space werken via native buttongedrag |
| Focus | Zichtbare focusring (`focus-visible:ring-1 focus-visible:ring-ring`) |
| Testids | `pipeline-row` op de button; `pipeline-row-title`, `pipeline-row-status`, `pipeline-row-pillar` op de delen |

**Staatmatrix** (in deze volgorde evalueren):

| Conditie | Weergave | Testid |
|----------|----------|--------|
| `isLoading && posts.length === 0 && !isError` | Laadmelding "Pijplijn laden…" met 2–3 skeletonrijen | `pipeline-loading` |
| `isError && posts.length === 0` | "Kon de pijplijn niet laden." + knop "Opnieuw proberen" | `pipeline-error`, `pipeline-retry` |
| `!isLoading && !isError && posts.length === 0` | Lege staat (zie hieronder) | `pipeline-empty` |
| `isError && posts.length > 0` | Compacte foutbanner "Kon de pijplijn niet verversen." + "Opnieuw proberen", daarna de bestaande rijen | `pipeline-error`, `pipeline-retry` |
| Anders | Alle rijen | `pipeline-row` |

**Lege staat**:

- `hasAnyPosts === true`: titel "Niets in de pijplijn", beschrijving "Alle ideeën zijn live."
- `hasAnyPosts === false`: titel "Nog geen ideeën", beschrijving "Voeg hierboven een idee toe om je pijplijn te starten."
- Het blok en het aantal 0 blijven zichtbaar.
- Geen foutmelding en geen skeleton in deze staat.

**Lay-out**:

- Zelfde kaartstijl als `IdeaList`: `rounded-lg border bg-card`.
- Kop met `border-b p-3`, rijen in `space-y-1.5 p-3`.
- Interne scroll: `max-h-72 overflow-y-auto` (mobiel `max-h-64`), `pr-1` voor de scrollbar, `overscroll-contain`.
- Geen horizontaal scrollen: `min-w-0`, `truncate`, flex-wrap voor status en soort.
- Op 375 px blijven titel, status en soort leesbaar.

**Toegankelijkheid**:

- `<section aria-labelledby="pipeline-heading">`, kop als `<h2 id="pipeline-heading">`.
- `<ul>`/`<li>` voor de rijen; geen `role="list"` nodig bij native lijsten.
- Rijen zijn native buttons; Tab bereikt elke rij, Enter/Space opent de editor.
- Het aantal is een tekstknooppunt met `aria-live="polite"`, zodat een wijziging wordt aangekondigd.
- Status is altijd tekst; kleur is aanvullend.
- Geen browserdialoogvensters; de editor en toast verzorgen bevestigingen.

## Data-testids

| Testid | Element |
|--------|---------|
| `content-pipeline` | Buitenste `<section>` |
| `pipeline-heading` | Kop "Pijplijn" |
| `pipeline-count` | Aantal niet-live ideeën |
| `pipeline-row` | Rij-button |
| `pipeline-row-title` | Titel in de rij |
| `pipeline-row-status` | Statusbadge in de rij |
| `pipeline-row-pillar` | Contentsoort in de rij |
| `pipeline-loading` | Laadstaat |
| `pipeline-error` | Foutstaat of foutbanner |
| `pipeline-retry` | Knop "Opnieuw proberen" |
| `pipeline-empty` | Lege staat |

Bestaande testids (`idea-row`, `idea-title-input`, `idea-editor`, enz.) blijven ongewijzigd. `pipeline-row` en `idea-row` zijn bewust gescheiden, zodat tests de juiste lijst meten.

## Pure logica

In `src/lib/content/ideas.ts`:

```ts
export function isPipelineStatus(status: ContentStatus): boolean {
  return status !== 'live'
}

export function selectPipelinePosts<T extends Pick<ContentPost, 'status'>>(posts: T[]): T[] {
  return posts.filter((post) => isPipelineStatus(post.status))
}

export type PipelineViewState = 'loading' | 'error-empty' | 'empty' | 'error-with-data' | 'ready'

export function pipelineViewState(params: {
  count: number
  isLoading: boolean
  isError: boolean
}): PipelineViewState {
  if (params.isError && params.count === 0) return 'error-empty'
  if (params.isLoading && params.count === 0) return 'loading'
  if (params.count === 0) return 'empty'
  if (params.isError) return 'error-with-data'
  return 'ready'
}
```

- Geen React, geen Supabase, geen neveneffecten.
- Behoudt de volgorde van de invoerarray.
- Muteert de invoerarray niet.
- Wordt zowel door `ContentView` als door de logicatests gebruikt.
- `pipelineViewState` is de enige plek die de staatvolgorde bepaalt; de UI vertaalt de uitkomst naar skeleton, foutbanner, lege staat of rijen.

## Server actions / queries

**Geen wijzigingen.** De bestaande contracten uit feature 026 blijven gelden:

- `usePosts()` levert alle posts, nieuwste eerst.
- `useCreatePost()` prependt een nieuw idee en invalideert `contentKeys.posts`.
- `useUpdatePost()` vervangt het bijgewerkte idee en invalideert `contentKeys.posts`.
- `useDeletePost()` verwijdert het idee en invalideert `contentKeys.posts`.
- `fetchPosts` blijft alle statussen ophalen; er komt geen statusfilter in de query.
- `revalidatePath` blijft afwezig.
