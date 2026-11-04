# Research: Content-pijplijn met niet-live ideeën

**Feature**: 028-content-ideas-pipeline | **Date**: 2026-11-03 | **Spec**: [spec.md](./spec.md)

Dit document legt de technische keuzes vast voor het pijplijnblok boven de ideeënlijst. De feature bouwt voort op de bestaande content-ideeënbank uit feature 026: dezelfde route, dezelfde posts-query, dezelfde editor en dezelfde React Query-cache.

## 1. Pijplijn als afgeleide van de bestaande posts-query

**Decision**: Het pijplijnblok gebruikt de al geladen `usePosts()`-data uit `ContentView`. Er komt geen nieuwe query, RPC of serveractie.

**Rationale**: De posts-query haalt alle posts van de gebruiker op, inclusief live, en wordt al gebruikt door de volledige lijst en het overzicht. De pijplijn is niets anders dan een subset daarvan. Een tweede query zou een extra netwerkrequest, een tweede bron van waarheid en extra invalidatie opleveren, terwijl de data al aanwezig is. De bestaande React Query-cache-updates na toevoegen, bewerken en verwijderen werken daardoor automatisch door in het blok.

**Alternatives considered**:
- Een aparte Supabase-query met `.neq('status', 'live')`: extra round-trip en dezelfde data twee keer ophalen.
- Een SQL-view of RPC voor de pijplijn: extra databaseobject en extra invalidatie, terwijl de volledige lijst de posts toch nodig heeft.
- Een aparte React Query-key voor de pijplijn: twee caches die uit sync kunnen raken.

## 2. Eén pure selectieregel in `src/lib/content/ideas.ts`

**Decision**: Voeg `isPipelineStatus(status)` en `selectPipelinePosts(posts)` toe aan de bestaande pure logica. `isPipelineStatus` is waar voor alles behalve `live`; `selectPipelinePosts` filtert zonder de volgorde te wijzigen en zonder de invoerarray te muteren.

**Rationale**: De definities "nog niet live" en "dezelfde volgorde als de lijst" horen op één plek. Zo gebruikt de UI exact dezelfde regel als de tests, en is een toekomstige status automatisch onderdeel van de pijplijn zonder de UI aan te passen. De functie is eenvoudig unit-testbaar naast `countIdeasByPillar`.

**Alternatives considered**:
- Filteren in `PipelineBlock`: verbergt de regel in een component en maakt hem lastiger los te testen.
- Filteren in `ContentOverview` of `IdeaList`: vermengt de pijplijn met een andere verantwoordelijkheid.
- Een hardcoded lijst `['idee','concept','klaar','gepland']`: werkt nu, maar sluit een toekomstige niet-live status onbedoeld uit; `status !== 'live'` volgt de spec direct.

## 3. Apart presentational component tussen composer en lijst

**Decision**: Maak `src/components/content/PipelineBlock.tsx` en render die in `ContentView` na `IdeaComposer` en vóór `IdeaList`.

**Rationale**: Het blok heeft een eigen kop, count, rijen en laad-/fout-/leegstaten; dat is een duidelijke eigen verantwoordelijkheid. Een apart component houdt `ContentView` leesbaar en maakt het blok onafhankelijk controleerbaar. De plaatsing volgt de spec: boven de volledige ideeënlijst, onder het invoerformulier, zodat snel vastleggen bovenaan blijft staan.

**Alternatives considered**:
- Het blok in `IdeaList` integreren: de lijst is de volledige verzameling; een subset in dezelfde kop zou de betekenis van de lijst vertroebelen.
- Het blok boven de composer plaatsen: duwt snel vastleggen naar beneden en wijkt af van de gekozen interpretatie in de spec.
- Een aparte tab: de gebruiker wil de pijplijn juist naast de ideeën zien, niet als derde view.

## 4. Bestaande detail-editor hergebruiken

**Decision**: Een klik op een pijplijnrij zet dezelfde `editorPostId` als de volledige lijst en opent `IdeaEditorDialog`. Het blok heeft geen eigen editor of formulier.

**Rationale**: De editor bevat al alle velden, statusvalidatie, tekenteller, verwijderbevestiging en foutafhandeling. Hergebruik voorkomt dubbele logica en zorgt dat statuswijzigingen via dezelfde serveractie en cache-update verlopen. Zo blijven de pijplijn en de volledige lijst automatisch consistent.

**Alternatives considered**:
- Een compacte inline-editor in het blok: meer code, meer validatie en een tweede opslagpad.
- Alleen een link naar de volledige lijst: extra zoekstap voor de gebruiker.

## 5. Actualiteit via de bestaande React Query-cache

**Decision**: Geen nieuwe invalidatiestrategie. `useCreatePost` prependt het nieuwe idee, `useUpdatePost` vervangt het bijgewerkte idee en `useDeletePost` verwijdert het idee uit `contentKeys.posts`; daarna invalideert elke mutatie de posts-query. `ContentView` leidt de pijplijn opnieuw af uit de bijgewerkte array.

**Rationale**: Dit is de bestaande, geteste datalaag van feature 026. De pijplijn hoeft alleen opnieuw te filteren; er is geen extra `revalidatePath`, geen extra fetch en geen tweede cache. Daardoor is een statuswijziging vrijwel direct zichtbaar en blijft de code eenvoudig.

**Alternatives considered**:
- Een aparte pijplijn-cache bijwerken: dubbele boekhouding en een reëel risico op verouderde rijen.
- `router.refresh()` of `revalidatePath`: onnodige server-round-trip en in strijd met de bestaande datalaagafspraak.
- Polling: verspilt requests en lost een probleem op dat de cache-updates al oplossen.

## 6. Laad-, fout- en leegstaten met `refetch()`

**Decision**: De staatvolgorde in het blok is: laden → fout zonder data → leeg → rijen. Bij een fout zonder data toont het blok "Kon de pijplijn niet laden." met een knop "Opnieuw proberen" die `postsQuery.refetch()` aanroept. Bij een fout met bestaande data blijven de rijen zichtbaar en verschijnt daarboven een compacte foutbanner met dezelfde retry-knop.

**Rationale**: De spec eist dat een laadfout niet als lege pijplijn wordt getoond. React Query v5 geeft via `refetch()` een promise terug en houdt bij een mislukte refetch de eerder opgehaalde data beschikbaar; de query kan dan `isError` zijn terwijl er nog data is. Door die combinatie apart te behandelen, verliest de gebruiker nooit bruikbare rijen door een tijdelijke netwerkfout. De lege staat krijgt een andere, positieve tekst dan de foutstaat.

**Alternatives considered**:
- Bij elke fout alle rijen verbergen: onnodig dataverlies in de UI en slechtere ervaring bij een tijdelijke storing.
- Alleen een toast tonen: de fout is dan niet persistent zichtbaar in het blok.
- De lege staat als fout tonen: verkeerde interpretatie van een geldige lege pijplijn.

## 7. Interne scroll in plaats van een limiet op het aantal rijen

**Decision**: Het blok toont alle niet-live ideeën en krijgt een begrensde hoogte met `overflow-y-auto` (`max-h-72`, op mobiel `max-h-64`). Er komt geen "toon meer"-knop en geen afkap op aantal.

**Rationale**: De spec eist dat alle niet-live ideeën in het blok staan. Een interne scroll houdt de pagina behapbaar zonder items te verbergen. Bij 200 items blijft de volledige set bereikbaar en blijft de volledige ideeënlijst eronder staan.

**Alternatives considered**:
- Alleen de eerste N items tonen: in strijd met "alle niet-live ideeën".
- De pagina onbeperkt laten groeien: duwt de volledige lijst te ver weg.
- Infinite scroll: onnodige complexiteit voor een persoonlijke ideeënbank.

## 8. Toegankelijkheid en toetsenbordbediening

**Decision**: Het blok is een `<section>` met `aria-labelledby` naar de kop "Pijplijn". De rijen staan in een `<ul>`/`<li>` en zijn native `<button>`-elementen. De status wordt als tekst getoond via `statusLabel`; kleur is aanvullend. Het aantal krijgt `aria-live="polite"` zodat een wijziging niet stil blijft voor hulpmiddelen.

**Rationale**: Native buttons geven Enter/Space, focus en rol gratis. Een lijststructuur maakt het aantal en de relatie tussen rijen duidelijk. Status als tekst voorkomt dat de betekenis alleen van kleur afhangt (FR-022). Dit sluit aan op de bestaande toegankelijke tablist en lijstrijen in de content-feature.

**Alternatives considered**:
- `div` met `onClick` en handmatige `tabIndex`/`onKeyDown`: meer code en meer kans op ontbrekende toetsenbordondersteuning.
- Status alleen via de badgekleur: onvoldoende contrast en niet voor iedereen leesbaar.
- Een `aria-live` op het hele blok: te veel ruis bij elke render; alleen het aantal is genoeg.

## 9. "Nog niet live" is alles behalve Live

**Decision**: De pijplijn bevat Idee, Concept, Klaar en Gepland. Live is de enige uitsluiting. Er komen geen nieuwe statussen en de bestaande statusregels blijven ongewijzigd.

**Rationale**: De gebruiker wil zien wat er nog in de pijplijn zit; een gepland of klaar idee is nog niet gepubliceerd en hoort er dus bij. De statuswaarden zijn al aanwezig in de database en de editor. Door `status !== 'live'` te gebruiken, blijft de regel toekomstbestendig zonder de statuslijst te dupliceren.

**Alternatives considered**:
- Alleen Idee en Concept als pijplijn: sluit Klaar en Gepland ten onrechte uit.
- Een nieuwe status "gepubliceerd" introduceren: schemawijziging en datamigratie zonder vraag.
- Live uit de volledige lijst verwijderen: in strijd met de spec en met bestaand gedrag.

## 10. Geen schemawijziging, geen nieuwe acties

**Decision**: `supabase/`, `src/actions/content.ts`, `src/hooks/useContent.ts`, `src/lib/content/queries.ts` en `src/types/database.types.ts` blijven ongewijzigd. Er is geen migratie nodig.

**Rationale**: De benodigde data (`status`, `pillar_id`, `title`, `created_at`) staat al in `kk_content_posts` en wordt al opgehaald. RLS is al user-scoped. Een schemawijziging zou alleen risico toevoegen. De feature is volledig een client-side afgeleide view.

**Alternatives considered**:
- Een opgeslagen pijplijn-tabel of -kolom: dubbele data en extra synchronisatie.
- Een database-index voor "niet live": de bestaande posts-query haalt toch alles op; de filter is O(n) in de browser.
- Een nieuwe serveractie: er is geen mutatie die specifiek bij de pijplijn hoort.

## 11. Teststrategie: pure selectie + login-gated E2E

**Decision**: Breid `tests/e2e/content-ideas-logic.spec.ts` uit met tests voor alle statussen, volgorde, leegte en het niet muteren van de invoer. Breid `tests/e2e/content-ideas.spec.ts` uit met een `content-pijplijn`-describe: zichtbaarheid, count, new idea, Live → weg, Live → Gepland → terug, klik naar editor, verwijderen, lange titel, mobiel en de foutbanner met retry. De bestaande login-skip-guard blijft verplicht.

**Rationale**: De filterregel is pure logica en hoort niet in een trage E2E-test. De gebruikersflows en de live-uitsluiting moeten wel end-to-end worden bewezen, inclusief persistentie en cache-updates. Een aparte `pipeline-row`-testid voorkomt dat bestaande `idea-row`-asserties de verkeerde lijst meten.

**Alternatives considered**:
- Alleen E2E: traag en de statusmatrix is beter als unit-test af te dekken.
- Alleen unit-tests: bewijst niet dat de UI live-ideeën daadwerkelijk buiten het blok houdt.
- Een nieuwe component-testtooling introduceren: onnodig; Playwright is de bestaande standaard.

## 12. Hergebruik van bestaande visuele mappings

**Decision**: Gebruik `statusBadgeClasses` en `statusLabel` uit `src/components/content/colors.ts` en `src/lib/content/ideas.ts`, en `pillarColors` voor de kleurstip. Het blok krijgt dezelfde kaartstijl als `IdeaList`.

**Rationale**: De status- en pillarkleuren zijn al consistent in de lijst, editor en het overzicht. Hergebruik voorkomt een tweede kleurenset en houdt de visuele taal herkenbaar. De badge toont altijd tekst, dus kleur is niet de enige informatiedrager.

**Alternatives considered**:
- Nieuwe pijplijnspecifieke kleuren: inconsistente betekenis en extra onderhoud.
- Alleen een gekleurde rand: slechter leesbaar en niet toegankelijk.

## 13. Context7-controle

De volgende actuele documentatie is geraadpleegd:

- **TanStack Query v5**: `refetch()` is de juiste manier om een mislukte query opnieuw te proberen; bij een mislukte refetch blijft eerder opgehaalde data beschikbaar. Dit onderbouwt de foutbanner-met-bestaande-rijen.
- **Next.js App Router + TanStack Query**: de bestaande SSR-prefetch met `prefetchQuery`, `dehydrate` en `HydrationBoundary` blijft ongewijzigd; de pijplijn lift mee op dezelfde gehydrateerde posts-query.

Er zijn geen nieuwe library-API's nodig buiten wat feature 026 al gebruikt.
