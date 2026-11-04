# Data Model: Content-pijplijn met niet-live ideeën

**Feature**: 028-content-ideas-pipeline | **Date**: 2026-11-03 | **Spec**: [spec.md](./spec.md)

## Overzicht

De feature voegt **geen nieuwe opgeslagen gegevens** toe. Het pijplijnblok is een afgeleide view op de bestaande contenttabellen. De enige nieuwe "entiteit" is de **Pijplijn**: de verzameling ideeën waarvan de status niet Live is. Die verzameling wordt bij elke render uit de al geladen posts berekend en nooit opgeslagen.

Er is daarom **geen migratie**, geen nieuwe kolom, geen nieuwe tabel, geen nieuwe index en geen nieuwe RLS-policy nodig.

## Bestaande tabellen

### kk_content_posts (bestaand, ongewijzigd)

| Kolom | Type | Rol in deze feature |
|-------|------|---------------------|
| id | uuid pk | Identificator; gebruikt voor React-keys en editor-selectie |
| user_id | uuid not null | Eigenaar; RLS-scope |
| pillar_id | uuid nullable | Contentsoort; NULL = "Geen soort" |
| title | text not null | Titel in de pijplijnrij |
| body | text not null | Niet getoond in het blok; nodig voor statusregels |
| status | text not null | **Bepaalt of een idee in de pijplijn zit** |
| source_url | text nullable | Niet getoond in het blok |
| notes | text nullable | Niet getoond in het blok |
| created_at | timestamptz not null | Bepaalt de volgorde (nieuwste eerst) |
| updated_at | timestamptz not null | Wordt gebruikt door de editor; niet getoond in het blok |
| format / planned_date / planned_time / linkedin_url / scheduled_on_linkedin_at | bestaand | Legacy; niet gelezen of geschreven door deze feature |

- De bestaande query `fetchPosts(supabase, userId)` haalt **alle** posts op, zonder statusfilter, met `created_at DESC` en `id` als tiebreaker.
- De bestaande paginering in batches van 1.000 blijft ongewijzigd.
- RLS op `kk_content_posts` blijft ongewijzigd; de client leest alleen rijen van de ingelogde gebruiker.

### kk_content_pillars (bestaand, ongewijzigd)

| Kolom | Type | Rol in deze feature |
|-------|------|---------------------|
| id | uuid pk | Koppeling met `kk_content_posts.pillar_id` |
| user_id | uuid not null | Eigenaar; RLS-scope |
| name | text not null | Naam in de pijplijnrij |
| color | text not null | Kleurstip in de pijplijnrij |
| archived | boolean not null | Archiefmarkering in de pijplijnrij |
| position | int not null | Volgorde in het soortenbeheer en overzicht |
| created_at / updated_at | timestamptz not null | Audit |

- De bestaande `fetchPillars`-query en de `pillarById`-map in `ContentView` worden hergebruikt.
- Gearchiveerde soorten blijven zichtbaar bij bestaande ideeën, met archiefmarkering.

## Afgeleide entiteit: Pijplijn

| Eigenschap | Betekenis |
|------------|-----------|
| Definitie | Alle posts waarvan `status !== 'live'` |
| Ledensstatussen | `idee`, `concept`, `klaar`, `gepland` |
| Uitgesloten status | `live` |
| Volgorde | Zelfde volgorde als de posts-array: `created_at DESC`, daarna `id ASC` |
| Opslag | Geen; elke render afgeleid met `selectPipelinePosts(posts)` |
| Aantal | `pipelinePosts.length` |
| Herkomst | `usePosts()` in `ContentView`, dezelfde data als de volledige lijst en het overzicht |

### Statusmatrix

| Status | In pijplijn? | In volledige lijst? | Telt mee in overzicht? |
|--------|--------------|---------------------|-------------------------|
| Idee | Ja | Ja | Ja |
| Concept | Ja | Ja | Ja |
| Klaar | Ja | Ja | Ja |
| Gepland | Ja | Ja | Ja |
| Live | **Nee** | Ja | Ja |

Deze matrix is de volledige definitie van "nog niet live". Er zijn geen andere uitsluitingen op basis van datum, soort, archiefstatus of legacy-velden.

## Toestandsovergangen

| Gebeurtenis | Effect op de pijplijn | Effect op de volledige lijst | Effect op het overzicht |
|-------------|-----------------------|------------------------------|--------------------------|
| Nieuw idee opslaan (status Idee) | Verschijnt direct bovenaan | Verschijnt direct bovenaan | Totaal +1 |
| Status wijzigen naar Live | Verdwijnt direct; aantal −1 | Blijft staan | Totaal ongewijzigd |
| Status wijzigen van Live naar Idee/Concept/Klaar/Gepland | Verschijnt direct; aantal +1 | Blijft staan | Totaal ongewijzigd |
| Titel wijzigen | Rijtitel direct bijgewerkt | Rijtitel direct bijgewerkt | Ongewijzigd |
| Contentsoort wijzigen | Kleur/naam direct bijgewerkt | Kleur/naam direct bijgewerkt | Aantal per soort kan wijzigen |
| Idee verwijderen | Verdwijnt direct; aantal −1 | Verdwijnt direct | Totaal −1 |
| Soort hernoemen | Naam direct bijgewerkt | Naam direct bijgewerkt | Naam direct bijgewerkt |
| Soort archiveren | Archiefmarkering direct bijgewerkt | Archiefmarkering direct bijgewerkt | Archiefmarkering direct bijgewerkt |

De directe bijwerking komt uit de bestaande React Query-cache-updates in `src/hooks/useContent.ts` (`setQueryData` + invalidatie van `contentKeys.posts`). Er is geen nieuwe mutatie of revalidatiestrategie.

## Validatieregels

- **Selectie**: `status === 'live'` valt af; alle andere statussen horen in de pijplijn.
- **Volgorde**: de filterfunctie wijzigt de volgorde niet.
- **Zuiverheid**: `selectPipelinePosts` muteert de invoerarray niet en heeft geen neveneffecten.
- **Weergave**: elke rij toont minimaal titel, status en contentsoort (of "Geen soort").
- **Live-uitsluiting**: een live idee mag nooit in de pijplijn-DOM voorkomen.
- **Telling**: het getoonde aantal is exact `pipelinePosts.length`.
- **Lege staat**: bij nul niet-live ideeën blijft het blok zichtbaar met een melding en aantal 0.
- **Foutstaat**: bij een laadfout zonder data toont het blok een foutmelding met retry; bij een fout met bestaande data blijven de rijen zichtbaar met een foutbanner.

## Queries en datatoegang

| Onderdeel | Wijziging |
|-----------|-----------|
| `fetchPosts` | Geen; levert al alle statussen, nieuwste eerst, gepagineerd |
| `fetchPillars` | Geen |
| `contentKeys` | Geen |
| `usePosts` | Geen |
| `useCreatePost` / `useUpdatePost` / `useDeletePost` | Geen; bestaande cache-updates blijven de actualiteit garanderen |
| Server actions | Geen |
| SSR-prefetch in `content/page.tsx` | Geen |
| RLS / policies | Geen |
| Migraties | **Geen** |

## Datacontract voor de UI

`ContentView` levert aan `PipelineBlock`:

- `posts`: de al gefilterde niet-live posts, in de bestaande volgorde;
- `hasAnyPosts`: of de volledige posts-array überhaupt items bevat (voor de juiste lege tekst);
- `pillarById`: de bestaande map voor kleur, naam en archiefmarkering;
- `onOpen`: dezelfde editor-handler als de volledige lijst;
- `isLoading`, `isError` en `onRetry`: de bestaande query-staten en `refetch`.

Zie [contracts/ui-components.md](./contracts/ui-components.md) voor de exacte props en testids.
