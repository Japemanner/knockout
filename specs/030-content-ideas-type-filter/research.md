# Phase 0 Research — Content-ideeën filteren op soort

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**: 2026-11-13

## Samenvatting

Er zijn geen open `[NEEDS CLARIFICATION]`-punten in de specificatie. De belangrijkste technische keuzes zijn:

1. De filter is **volledig afgeleid** van de al geladen posts en soorten; er komt geen nieuwe query, serveractie of migratie.
2. De bestaande `countIdeasByPillar()` is de **enige bron** voor de filteropties en aantallen.
3. De filter is **single-select** en gebruikt native buttons met `aria-pressed`; geen `<select>`, geen multi-select.
4. De korte beschrijving staat in een **alleen-lezen strook** onder de filteropties en wordt bij lange tekst uitgeklapt.
5. De bestaande React Query-cache-updates en -invalidaties houden alles actueel; er is geen nieuwe freshness-laag nodig.
6. De pijplijncomponent, de pijplijnhelpers en de pijplijntests worden **verwijderd**, niet verborgen.

---

## R1 — Filter client-side afleiden uit bestaande data

**Decision**: `ContentView` filtert de bestaande `usePosts()`-array met pure helpers. De filteropties en aantallen komen uit `countIdeasByPillar(posts, pillars)`. Er komt geen nieuwe query, RPC of serveractie.

**Rationale**:
- `usePosts()` haalt al **alle** posts van de gebruiker op, zonder datumfilter en ongeacht status (`src/lib/content/queries.ts`, `fetchPosts`).
- `usePillars()` haalt al **alle** soorten op, inclusief gearchiveerd (`src/lib/content/queries.ts`, `fetchPillars`).
- De pagina wordt al SSR-geprefetcht in `src/app/(dashboard)/content/page.tsx`; de data is bij hydratie beschikbaar, dus filteren kan direct.
- Filteren en tellen zijn O(n) en hebben geen netwerkround-trip nodig. Dat past bij de performance-eis van <1 seconde en voorkomt een nieuwe waterfall.
- De bestaande `countIdeasByPillar()` telt al al het benodigde: alle soorten (ook 0 en gearchiveerd) en "Geen soort" voor lege of onbekende `pillar_id`.

**Alternatives considered**:
- **Server-side filteren met een queryparameter**: verworpen. Dat voegt een netwerkrequest, een serveraction/route en extra cachecomplexiteit toe, terwijl de volledige dataset al geladen is. Het zou ook de SSR-hydratie en de bestaande React Query-keys doorbreken.
- **Een aparte Supabase-view of RPC**: verworpen. Nieuwe database-objecten en migraties zijn niet nodig; de bestaande RLS en tabellen volstaan.
- **Filteren in de server component**: verworpen. De filterkeuze is een client-interactie; een serverround-trip per klik is trager en complexer.

**Evidence**: `src/lib/content/queries.ts` (fetchPosts/fetchPillars), `src/app/(dashboard)/content/page.tsx` (SSR-prefetch), `src/hooks/useContent.ts` (bestaande hooks), `src/lib/content/ideas.ts` (`countIdeasByPillar`).

---

## R2 — Single-select filter met native buttons

**Decision**: De filter bestaat uit een rij native `button`-elementen in een `role="group"` met een toegankelijke naam. Precies één optie is actief; de actieve optie heeft `aria-pressed="true"` en een duidelijke visuele markering. Opties: "Alle soorten", elke soort en "Geen soort" (alleen wanneer nodig).

**Rationale**:
- De specificatie vraagt één filteroptie tegelijk (Assumptions: "Filtermodus: één actieve filteroptie tegelijk").
- Native buttons zijn van nature toetsenbordbedienbaar (Tab, Enter, Space) en hebben een zichtbare focusring met de bestaande `focus-visible`-stijlen.
- `aria-pressed` maakt de actieve optie ook voor hulpsoftware duidelijk; de actieve optie verschilt bovendien in achtergrond/tekstcontrast, niet alleen in kleur.
- De tellingen en kleurstippen kunnen direct in de knop worden getoond; dat kan in een `<select>` niet of alleen met beperkte opmaak.
- `flex flex-wrap` voorkomt horizontaal scrollen van de pagina en houdt alle opties bereikbaar.

**Alternatives considered**:
- **`<select>`**: verworpen. Minder zichtbaar welke opties bestaan, geen kleurstippen, en de tellingen moeten als tekst in de opties worden gepropt. Op mobiel is een native select wel compact, maar de specificatie vraagt juist een gemakkelijk zichtbare filterbalk.
- **Multi-select**: verworpen. De specificatie vraagt één soort tegelijk; multi-select voegt complexiteit toe (samengestelde tellingen, "geen resultaten"-logica, meer toegankelijkheidsregels) zonder gevraagde waarde.
- **Radiogroup met `role="radio"`**: overwogen. Semantisch vergelijkbaar, maar vereist meer handmatige arrow-key-navigatie en `aria-checked`-beheer. Native buttons met `aria-pressed` zijn eenvoudiger en voldoen aan de eis.

**Evidence**: bestaande knop- en focusstijlen in `src/components/content/*.tsx`; `pillarColors` in `src/components/content/colors.ts`; specificatie FR-006 t/m FR-019 en FR-039/FR-040.

---

## R3 — `countIdeasByPillar` als enige bron voor opties en aantallen

**Decision**: Bouw de filteropties met een nieuwe pure functie `buildIdeaFilterOptions(counts)` op basis van de bestaande `IdeaCounts.rows`. "Alle soorten" krijgt `counts.total`; elke rij wordt een soortoptie; een rij met `pillarId === null` wordt "Geen soort". De volgorde blijft die van `counts.rows` (soorten op positie/naam, "Geen soort" achteraan).

**Rationale**:
- `countIdeasByPillar()` telt alle posts, ongeacht status (FR-008/FR-003).
- Het neemt alle soorten mee, ook met 0 ideeën en gearchiveerd (FR-009).
- Het voegt "Geen soort" alleen toe als er daadwerkelijk posts zonder soort zijn (FR-010).
- Het behandelt een onbekende `pillar_id` als "Geen soort"; de filter moet dezelfde regel gebruiken, anders wijken telling en lijst af.
- Eén bron voorkomt dat het overzicht en de filterbalk verschillende aantallen tonen.

**Alternatives considered**:
- **Een tweede telroutine in de filtercomponent**: verworpen. Twee telregels kunnen uit elkaar lopen, vooral bij onbekende `pillar_id` of gearchiveerde soorten.
- **Alleen soorten met ≥1 idee tonen**: verworpen. De specificatie eist alle soorten, inclusief 0 (FR-009); het overzicht toont die ook.
- **"Geen soort" altijd tonen**: verworpen. De specificatie zegt alleen bij minstens één los idee (FR-010).

**Evidence**: `src/lib/content/ideas.ts` (`countIdeasByPillar`, regels 139–174); bestaande tests in `tests/e2e/content-ideas-logic.spec.ts` (regels 59–114).

---

## R4 — Fallback wanneer een filteroptie verdwijnt

**Decision**: Naast de ruwe filterstate komt een afgeleide `effectiveFilter = resolveIdeaFilter(filter, { knownPillarIds, hasUnassigned })`. Is de gekozen optie niet meer geldig, dan geeft de functie `ALL_IDEA_FILTER` terug. Een kleine `useEffect` zet de state gelijk aan `effectiveFilter`, zodat een later terugkerende optie niet onverwacht opnieuw actief wordt.

**Rationale**:
- De optie "Geen soort" verdwijnt zodra het laatste losse idee een soort krijgt (FR-017). Zonder fallback zou de lijst leeg kunnen lijken of een verdwenen optie actief blijven.
- Soorten worden niet verwijderd, maar een defensieve fallback voor een onbekende `pillar_id` is goedkoop en voorkomt een lege lijst bij onverwachte data.
- De `useEffect` is een bewuste synchronisatie van UI-state met de beschikbare opties; de afgeleide waarde alleen zou de state kunnen laten "hangen", waardoor de optie later weer actief wordt.

**Alternatives considered**:
- **Alleen een afgeleide waarde, geen state-reset**: verworpen. De state blijft dan `none`; als er later weer een los idee komt, springt de filter onverwacht terug naar "Geen soort".
- **De optie "Geen soort" altijd zichtbaar houden**: verworpen. De specificatie zegt dat de optie alleen verschijnt als er losse ideeën zijn (FR-010).
- **Een `key` op de hele lijst forceren**: verworpen. Dat reset meer state dan nodig en is een grover middel.

**Evidence**: specificatie FR-017; `countIdeasByPillar` (unassigned-regel); bestaande React-state-patronen in `ContentView.tsx`.

---

## R5 — Beschrijvingsstrook onder de filteropties

**Decision**: Toon de korte beschrijving in een aparte, alleen-lezen strook direct onder de filteropties en boven de lijst. De strook verschijnt alleen bij een gekozen soort (niet bij "Alle soorten" of "Geen soort"). Hij toont de kleurdot, de naam, een archiefmarkering en de volledige beschrijving. Is de beschrijving leeg, dan staat er "Geen korte beschrijving." Bij een lange beschrijving wordt de tekst standaard op drie regels afgekapt (`line-clamp-3`) met een knop "Toon volledige beschrijving" / "Toon minder" en `aria-expanded`.

**Rationale**:
- De specificatie noemt de strook expliciet tussen filterbalk en lijst (FR-020/FR-021).
- De korte beschrijving is een bestaand veld van `ContentPillar` (`description`) en wordt al in `PillarsDialog` bewerkt; de ideeënweergave hoeft alleen te lezen (FR-025).
- `line-clamp` is een kernutility in Tailwind CSS 3.4; geen plugin of nieuwe dependency nodig. De Context7-documentatie bevestigt `line-clamp-*` en arbitrary values.
- Een uitklapknop houdt de lijst bruikbaar bij een onverwacht lange beschrijving en houdt de volledige tekst bereikbaar (FR-024).
- De strook leest `pillarById` uit de bestaande `usePillars()`-cache; na een wijziging in "Soorten" invalideert `useUpdatePillar` de pillars-query, waardoor de strook direct bijwerkt (FR-026).

**Alternatives considered**:
- **De beschrijving in elke ideeënrij tonen**: verworpen. Dat is repetitief, maakt rijen onrustig en geeft geen antwoord op "wat betekent deze soort?".
- **De beschrijving in een tooltip of `title`**: verworpen. Niet goed toegankelijk op touch en niet "makkelijk te zien".
- **Altijd de volledige tekst tonen**: overwogen. Eenvoudiger, maar een lange tekst duwt de lijst ver naar beneden. De uitklapbare variant is veiliger.
- **De beschrijving bewerkbaar maken in de strook**: verworpen. De specificatie houdt bewerken in "Soorten" (FR-025); dubbele editors vergroten het risico op inconsistenties.

**Evidence**: `src/types/database.types.ts` (`ContentPillar.description`); `src/components/content/PillarsDialog.tsx` (bestaande bewerking); Context7 Tailwind CSS v3 `line-clamp`; specificatie FR-020 t/m FR-026.

---

## R6 — Eerlijke laad- en foutstaten

**Decision**:
- Zolang posts of soorten **initial laden**, toont de filterbalk een skeleton en geen definitieve aantallen; de lijst houdt de bestaande laadskeleton.
- Bij een **posts-fout** toont de lijst de bestaande foutmelding met een nieuwe "Opnieuw proberen"-knop; de filterbalk wordt verborgen.
- Bij een **soorten-fout** wordt de filterbalk vervangen door een in-app melding "Filteren is tijdelijk niet beschikbaar. De ideeënlijst toont alle ideeën." met "Opnieuw proberen"; de lijst toont alle posts.
- Bij **0 soorten** wordt de filterbalk verborgen en toont de lijst alle posts.

**Rationale**:
- De specificatie eist dat een laad- of foutstaat nooit als een lege lijst wordt getoond (FR-033/FR-034/FR-035).
- De bestaande `IdeaList` had alleen een fouttekst zonder retry; omdat het pijplijnblok (met retry) verdwijnt, moet de lijst zelf een retry krijgen.
- De filteraantallen zijn afgeleid van posts; bij een posts-fout zijn ze niet betrouwbaar. Verbergen is eerlijker dan nul tonen.
- Zonder soorten is filteren niet zinvol (FR-036); de lijst blijft bruikbaar.

**Alternatives considered**:
- **De filterbalk altijd tonen met 0-aantallen tijdens laden**: verworpen. Dat suggereert ten onrechte dat er geen ideeën zijn.
- **De filterbalk bij een soorten-fout toch tonen met de oude cache**: overwogen. Bij een echte fout kan de cache verouderd zijn; de specificatie zegt dat de lijst alle ideeën moet tonen. Een expliciete melding met retry is eerlijker.
- **Geen retry toevoegen aan `IdeaList`**: verworpen. De specificatie eist een retrymogelijkheid; het pijplijnblok dat die eerder bood, verdwijnt.

**Evidence**: `src/components/content/IdeaList.tsx` (bestaande laad-/fout-/leegstaat); `src/components/content/PipelineBlock.tsx` (retrypatroon dat verhuist); specificatie FR-033 t/m FR-036.

---

## R7 — Actualiteit via bestaande React Query-invalidatie

**Decision**: Er komen geen nieuwe invalidaties of refetch-strategieën. `useCreatePost`, `useUpdatePost` en `useDeletePost` werken de posts-cache bij met `setQueryData` en invalideren `contentKeys.posts`; `useUpdatePillar` en `useSetPillarArchived` invalideren `contentKeys.pillars`. De afgeleide filter-, tel- en beschrijvingswaarden reageren daar automatisch op.

**Rationale**:
- De bestaande hooks doen precies wat nodig is: de optimistic/cache-update maakt de wijziging direct zichtbaar, de invalidatie haalt de definitieve serverstand op.
- De filter is een pure afgeleide van `posts` en `pillars`; zodra die arrays veranderen, herberekenen `useMemo`-waarden de opties, aantallen, zichtbare lijst en beschrijving.
- Geen `revalidatePath` nodig; de pagina is een client-view boven een SSR-hydratie.
- Context7 (TanStack Query v5) bevestigt het patroon: `setQueryData` voor de directe update en `invalidateQueries` voor de definitieve refetch na een mutatie.

**Alternatives considered**:
- **Extra `refetch()` na elke mutatie**: verworpen. De bestaande invalidatie doet dit al; een extra refetch verdubbelt netwerkverkeer.
- **Optimistic updates toevoegen**: overwogen, maar niet nodig. De bestaande `setQueryData` na succes geeft al een directe update; optimistic updates voegen rollback-complexiteit toe.
- **`revalidatePath` toevoegen**: verworpen. De content-reads lopen via React Query en de browserclient, niet via een server-rendered pagina die revalidatie nodig heeft.

**Evidence**: `src/hooks/useContent.ts` (regels 105–147); Context7 `/tanstack/query/v5.84.1` — "Updating Query Cache with Mutation Response" en "Invalidating Queries on Mutation Success"; `decisions/2026-09-22-uren-reads-browser-client.md`.

---

## R8 — Geen nieuwe dependencies; bestaande Tailwind-utilities

**Decision**: Gebruik alleen bestaande React-, Tailwind-, TanStack Query- en shadcn/ui-API's. Voor de filterbalk: `flex flex-wrap`, `gap-*`, `min-w-0`, `truncate`, `focus-visible:ring-*`. Voor de beschrijving: `line-clamp-3` en `break-words`. Geen nieuwe npm-packages, geen Tailwind-plugin.

**Rationale**:
- Tailwind CSS 3.4 bevat `line-clamp-*` als kernutility en `flex-wrap`/`overflow-*` voor responsieve layouts. Context7 bevestigt dit.
- De bestaande `pillarColors`, `statusBadgeClasses`, kaartstijlen en focusringen worden hergebruikt, zodat de nieuwe UI bij de rest past.
- Geen nieuwe dependency betekent geen extra bundle- of supply-chain-risico en geen wijziging in `package-lock.json`.

**Alternatives considered**:
- **Een headless UI-bibliotheek voor de filter**: verworpen. Native buttons en de bestaande Tailwind-stijlen zijn voldoende.
- **Een eigen Tailwind-plugin voor line-clamp**: verworpen. `line-clamp` zit al in Tailwind 3.4.
- **Een aparte state manager voor de filter**: verworpen. `useState` in `ContentView` is voldoende; de filter is lokale UI-state.

**Evidence**: `package.json` (Tailwind 3.4.19, React 18.3.1, TanStack Query 5.100.14); Context7 Tailwind CSS v3 `flex-wrap`, `overflow-x-auto`, `line-clamp`; bestaande `colors.ts`.

---

## R9 — Teststrategie: pure logica + E2E, pijplijntests vervangen

**Decision**:
- Pure tests in `tests/e2e/content-ideas-logic.spec.ts` voor `buildIdeaFilterOptions`, `matchesIdeaFilter`, `filterIdeas`, `resolveIdeaFilter` en `ideaFilterLabel`.
- E2E in `tests/e2e/content-ideas.spec.ts` voor de zichtbare filter, tellingen, beschrijvingsstrook, fallback, actualiteit, mobiel, toetsenbord en foutstaten.
- De bestaande pijplijn-describes en pijplijnimports worden verwijderd; de overige contenttests (opslaan, bewerken, verwijderen, soortenbeheer, overzicht, legacy) blijven behouden.
- De login-skip-guard (`page.url().includes('/login')`) blijft verplicht.

**Rationale**:
- De filter- en telregels zijn pure functies; die horen in de bestaande logic-spec, net als `countIdeasByPillar`.
- De E2E-suite dekt de gebruikersflows en de actualiteit na mutaties, conform de AGENTS.md-regressietestregel.
- Het verwijderen van de pijplijn levert anders dode tests en dode testids op; de nieuwe tests dekken de vervangen functionaliteit.
- De bestaande tests voor soortenbeheer en overzicht blijven nodig, omdat de feature die onderdelen niet mag breken.

**Alternatives considered**:
- **Alleen E2E, geen pure tests**: verworpen. De fallback- en onbekende-pillar-regels zijn randgevallen die als pure functie veel goedkoper en betrouwbaarder te testen zijn.
- **Pijplijntests laten staan**: verworpen. Ze verwijzen naar verwijderde testids en componenten en zouden de suite laten falen.
- **Nieuwe testbestanden aanmaken**: overwogen, maar de bestaande content-specs zijn de logische plek; geen nieuwe suite naast de bestaande.

**Evidence**: `tests/e2e/content-ideas-logic.spec.ts`; `tests/e2e/content-ideas.spec.ts` (pijplijn-describes regels 297–526); AGENTS.md regressietestregel.

---

## R10 — Toegankelijkheid en kleurgebruik

**Decision**:
- Filtergroep: `role="group"` met `aria-label="Filter op contentsoort"`; opties zijn native buttons met `aria-pressed`.
- Actieve optie: `aria-pressed="true"` plus een achtergrond/tekstcontrast dat ook zonder kleur waarneembaar is.
- Zichtbare focusring via de bestaande `focus-visible:ring-1 focus-visible:ring-ring`.
- Beschrijvingsstrook: een kop "Korte beschrijving" en een `aria-expanded`-knop voor lange tekst.
- Aantallen staan als tekst in de knop en in de `aria-label`, niet alleen als visueel element.
- Geen browserdialoogvensters; fouten en bevestigingen blijven in de app.

**Rationale**:
- De specificatie eist toetsenbordbediening, zichtbare focus en een actieve optie die niet alleen via kleur wordt overgebracht (FR-039/FR-040).
- Native buttons geven Enter/Space gratis; een `role="group"` met `aria-pressed` is een gangbaar en begrijpelijk patroon.
- De bestaande app gebruikt dezelfde focus- en kaartstijlen; consistentie verlaagt de leercurve.

**Alternatives considered**:
- **Een `role="tablist"` voor de filter**: verworpen. De filter is geen navigatie tussen panels; `aria-pressed` op knoppen past beter.
- **Alleen kleur voor de actieve optie**: verworpen. Niet toegankelijk voor kleurenblinden en in strijd met FR-039.
- **Een aangepaste dropdown met focus-trap**: verworpen. Onnodige complexiteit; de opties passen in een wrapbare rij.

**Evidence**: bestaande `focus-visible`-stijlen in `ContentView.tsx`, `IdeaList.tsx`, `PipelineBlock.tsx`; specificatie FR-039/FR-040/FR-041.

---

## R11 — Performance en schaal

**Decision**: Bereken `counts`, `filterOptions`, `visiblePosts` en `activePillar` met `useMemo` op basis van de bestaande arrays. Geen nieuwe netwerkrequests; geen nieuwe database-objecten. De filter is O(n) per wijziging van posts, pillars of filter.

**Rationale**:
- Bij 200–2000 posts en tientallen soorten is een lineaire filter- en telpass ruim onder de 1 seconde.
- De SSR-hydratie levert de eerste data al; de eerste render hoeft alleen afgeleiden te berekenen.
- `useMemo` voorkomt onnodige herberekeningen bij re-renders die niet met de data of filter te maken hebben.

**Alternatives considered**:
- **Een geïndexeerde Map per filter**: overwogen. Voor de verwachte schaal niet nodig; `countIdeasByPillar` en `filterIdeas` zijn al lineair en eenvoudig te bewijzen.
- **Virtualisatie van de filteropties**: verworpen. Tientallen opties rechtvaardigen geen virtualisatiecomplexiteit.
- **Paginering van de lijst**: verworpen. De bestaande lijst toont al alle posts en de feature verandert die schaal niet.

**Evidence**: `src/lib/content/queries.ts` (POSTS_PAGE_SIZE 1000, fetch alles), bestaande `useMemo`-patronen in `ContentView.tsx`; specificatie SC-003/SC-005/SC-007.

---

## R12 — Geen datamodel- of RLS-wijziging

**Decision**: Er komen geen nieuwe tabellen, kolommen, indexen, policies of migraties. `src/types/database.types.ts`, `src/actions/content.ts` en `supabase/` blijven ongewijzigd. De feature is een pure UI- en afgeleide-logica-wijziging.

**Rationale**:
- De benodigde velden bestaan al: `ContentPost.pillar_id`, `ContentPost.status`, `ContentPillar.description`, `ContentPillar.archived`, `ContentPillar.color`.
- De filterkeuze wordt niet opgeslagen (FR-013); er is dus geen persistentiemodel nodig.
- RLS blijft de bestaande grens; de feature leest alleen data die de gebruiker al mag lezen.
- Geen migratie betekent geen risico op RLS-regressies of productiestoring.

**Alternatives considered**:
- **Een opgeslagen filtervoorkeur per gebruiker**: verworpen. De specificatie zegt expliciet dat de keuze niet wordt opgeslagen.
- **Een nieuwe view/RPC voor tellingen**: verworpen. `countIdeasByPillar` doet het al client-side op de geladen data.
- **Een nieuwe `last_filter`-kolom**: verworpen. Buiten scope en in strijd met FR-013.

**Evidence**: `src/types/database.types.ts` (`ContentPost`, `ContentPillar`); `src/actions/content.ts`; `supabase/migrations/` (geen wijziging); specificatie FR-013/FR-042 en Out of Scope.

---

## Open punten

Geen. De specificatie heeft geen `[NEEDS CLARIFICATION]`-markers. De bovenstaande beslissingen dekken de open UX-details (plaatsing, filtermodus, lange beschrijving, fallback) en zijn als aannames in de specificatie vastgelegd.
