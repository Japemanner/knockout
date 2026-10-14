# Research: LinkedIn content-kalender

**Feature**: 023-content-kalender | **Date**: 2026-10-14

## Reconciliatie met de implementatie (2026-10-14)

Tijdens de planfase is in een parallelle sessie de data-laag geïmplementeerd die dit onderzoek beschrijft (migratie `022_content_calendar.sql`, `src/actions/content.ts`, `src/lib/content/calendar.ts`, `src/lib/content/queries.ts`, handmatig uitgebreide types). De architectuur volgt de beslissingen hieronder (uren-besluit, SSR-prefetch, RLS 007-patroon, dnd-kit, één pure module, geen revalidatePath). De documenten volgen de implementatie op deze naamgevings- en vormpunten:

| Onderzoek | Implementatie | Delta |
|-----------|---------------|-------|
| `kk_content_types` (beslissing 4) | `kk_content_pillars` + `position`-kolom | Andere naam; pillars = contentsoorten; volgorde in beheer-dialoog |
| slots: `enabled`, `time`-tekst, weekday 0-6 (beslissing 4/7/8) | `active`, Postgres `time` (`post_time`), weekday 1-7 (ISO) | `time`-type serialiseert als `HH:MM:SS`; `displayTime` trimt in de weergave |
| posts: `post_date`/`post_time`, `scheduled_at` (beslissing 4) | `planned_date`/`planned_time`, `scheduled_on_linkedin_at` | Kolomnamen |
| Kleuren 8 NL-waarden (beslissing 8) | 8 EN-waarden ('blue'…'gray') | Engelse keys; UI mapt op Tailwind-klassen |
| Pure modules `slots.ts` + `text.ts` (beslissing 2/4) | één module `calendar.ts` | Samengevoegd — zelfde functies, één bestand |
| `saveSlotsForType`, `movePostToDate`/`movePostToBacklog`, archiveren in `updateContentType` (beslissing 4/6) | `upsertSlot`/`deleteSlot`, één `movePost(postId, date, time)`, `setPillarArchived` | Fijnere slot-CRUD; één sleep-action; aparte archiverings-action |
| Migratie `022_content_kalender.sql` (beslissing 9) | `022_content_calendar.sql` (handmatig SQL Editor) | Engelse naam; toepassing per kanban-R3 |
| `types:update` na migratie (beslissing 9) | types handmatig toegevoegd | Na toepassen van de migratie op een database: `npm run types:update` draaien ter vervanging |
| — (nieuwe toevoeging) | DB-vingnet-CHECK: Gepland/Live vereisen `planned_date`+`planned_time` | Versterkt FR-023 ook buiten de app |

## Vraagpunten uit Technical Context

Geen NEEDS CLARIFICATION-markers. De spec (na expliciete vooraf vastgestelde keuzes) is volledig bepaald; onderstaande beslissingen zijn uit de codebase, eerdere beslissingen (`/decisions/`) en Supabase-documentatie gevalideerd.

## Onderzoek

### 1. Waar wordt data gelezen — server actions, SSR of browser-client?

**Decision**: Het /uren-patroon uit besluit `2026-09-22-uren-reads-browser-client.md`: SSR-prefetch in `src/app/(dashboard)/content/page.tsx` (QueryClient + `prefetchQuery` parallel + `HydrationBoundary`), daarna leest de client via de bestaande browser-client; mutaties blijven server actions in `src/actions/content.ts`. Query-logica deelt de server/client in `src/lib/content/queries.ts` (géén 'use server'); React Query invalidatie na mutaties; **geen `revalidatePath`**.

**Rationale**: De spec eist SC-002 (elk leeg slot in de komende vier weken direct zichtbaar zonder klikken) en SC-004 (na het initiële laden geen aanvullende serververzoeken voor de getoonde data). Het uren-besluit heeft exact dit probleem opgelost: nul seriële server-action round-trips na hydratie, parallelle reads, RLS dekt user-isolatie. Posts + soorten + slots zijn klein in volume (persoonlijk profiel), dus drie parallelle reads volstaan.

**Alternatives considered**:
- Reads via server actions — afgewezen: seriële Netlify-function round-trips na hydratie (precies het probleem uit het uren-besluit).
- Volledige client-fetch zonder SSR — afgewezen: langere eerste render, geen hydration-cache, onnodig afwijken van het bewezen patroon.

### 2. Hoe ontstaan de lege slot-voorkomens in de maand?

**Decision**: Slot-voorkomens worden **client-side berekend** door een pure functie `computeSlotsForMonth` (+ `fillWeekSlots`) in `src/lib/content/slots.ts`: weekslots × kalenderdagen, per ISO-week en per contentsoort gekoppeld aan posts volgens de koppelregel uit FR-016 (voorkomens op volgorde (datum, tijd) ↔ posts van die soort in die week op volgorde (datum, tijd); ongekoppelde voorkomens → leeg slot).

**Rationale**: FR-016 is een presentatieregel over weergave, geen opslag — een slot-voorkomentabel in de database zou dupliceren wat uit weekslots + posts afleidbaar is. SC-004 verbiedt bovendien extra serververzoeken voor getoonde data: bij maandnavigatie binnen het prefetch-venster ontstaat alles uit reeds geladen data. Pure functies zijn deterministisch unit-testbaar (decimal-helper-patroon, `tests/e2e/decimal-helper.spec.ts` als conventie) — cruciaal want de koppelregel is de lastigste logica van de feature (weekgrenzen, maandgrenzen, aanmaakdatum-geldigheid).

**Alternatives considered**:
- Database-RPC met json_agg per maand — afgewezen: extra round-trip per maandnavigatie (schendt SC-004), logica ontestbaar zonder DB.
- Server component berekening per request — afgewezen: herladen vereist voor navigatie, geen caching per maand.

### 3. Welk prefetch-venster hanteert de kalender voor maandnavigatie?

**Decision**: De pagina prefetcht posts voor drie maanden (vorige, huidige, volgende) via maandsleutels (`contentKeys.posts(month)`), plus alle contentsoorten met slots (`contentKeys.types`). React Query vult buiten het venster bij via de browser-client (achtergrond, parallel, geen Netlify-hop).

**Rationale**: SC-001 (vier weken vooruit plannen zonder de pagina te verlaten) en SC-004 (geen extra verzoeken voor getoonde data): binnen ±1 maand is navigatie 100% uit cache. Buiten het venster is een fetch onvermijdelijk maar asynchroon en zonder Netlify-tussenlaag. Posts zijn klein; drie maanden prefetch is goedkoop.

**Alternatives considered**:
- Alle posts ooit prefetchen — afgewezen: groeit onbeperkt; venster is voorspelbaarder.
- Alleen huidige maand — afgewezen: eerste navigatie richting verleden/toekomst schendt de geest van SC-004 en voelt traag.

### 4. Tabelmodel: hoe slaan we contentsoorten, weekslots en posts op?

**Decision**: Drie tabellen: `kk_content_types` (soort met kleur, doelgroep, beschrijving, archief), `kk_content_slots` (per soort per weekdag één rij: weekday, time, enabled, created_at als geldigheidsstart) en `kk_content_posts` (post met soort-FK, format, status, optionele datum/tijd, titel, posttekst, bron-URL, LinkedIn-URL, notities, scheduled_at). Alle drie met `user_id` + RLS (vier policies per tabel, 007-patroon). Zie [data-model.md](./data-model.md).

**Rationale**: De spec onderscheidt expliciet soort, weekslot (met aanmaakmoment: "slots gelden pas vanaf de dag dat ze zijn aangemaakt", FR-005) en post als aparte begrippen met eigen levensduur (archiveren vs. verwijderen; slot-aan/uit per dag; poststatussen). Eén slot-rij per soort-weekdag maakt "weekdag wijzigen = één slot" trivial waar (spec-aanname) en de created_at-kolom draagt FR-005 gratis.

**Alternatives considered**:
- Slots als JSON-kolom op kk_content_types — afgewezen: ondoorzoekbaar, lastiger te muteren per dag, geen created_at-per-slot voor FR-005.
- Voorkomens vooraf materialiseren — afgewezen: zie beslissing 2.

### 5. Editor als pagina of dialoog?

**Decision**: `PostEditorDialog.tsx` — een shadcn-Dialog bovenop de kalenderpagina (bestaand ui-patroon: CardDetailModal op de borden). Openen vanaf: postklik (bewerken), leeg slot (nieuwe post met datum/tijd/soort gevuld, status Concept), "Nieuwe post" (nieuw idee zonder datum, status Idee).

**Rationale**: De spec beschrijft een editor-flow die start en eindigt op de kalender (sluiten met bevestiging, opslaan expliciet) zonder paginanavigatie; een dialog houdt de kalendercontext (en scrollpositie) intact. De naamgeving `PostEditorDialog`/`PostChip`/`content.ts`/`queries.ts` is vastgelegd in feature 024 (dat op deze feature voortbouwt) — dit plan conformeert zich daar expliciet aan zodat 024 zonder rework kan landen.

**Alternatives considered**:
- Aparte route /content/[postId] — afgewezen: navigatie kost de kalendercontext; geen deep-link-behoefte in de spec (persoonlijke planning).

### 6. Sleep-implementatie in de kalender?

**Decision**: Eigen `DndContext` in de kalenderclient met droppable dagcellen en ideeënbak; posts en ideeën zijn draggable via `useDraggable` (@dnd-kit/core, bestaande dependency). Geén `SortableContext` (volgorde binnen een dag is tijdsgesorteerd, niet handmatig). Eigen kleine hook `useCalendarDrag.ts` met de drie regels uit US4 (dagcel ↔ dagcel ↔ ideeënbak, inclusief LinkedIn-melding bij Gepland en weigering bij Live/Gepland→ideeënbak).

**Rationale**: `useKanbanDrag.ts` is gebouwd voor één bord met kolommen, subtask-drops en board-switching (dezelfde redenering als 022-research, beslissing 5): parametriseren dwingt conditionele takken af die de hook onhoudbaar maken. De kalender heeft andere drop-targets (dagen met tijdregels) en andere businessregels (statusweigeringen + melding). Mobiel (US5) heeft geen drag nodig — sensorconfig blijft beperkt tot Pointer/Touch zoals bestaand.

**Alternatives considered**:
- HTML5 drag-and-drop — afgewezen: geen touch-ondersteuning, geen toegankelijkheid; dnd-kit is al de repo-standaard.

### 7. Hoe gaan we om met tijdzones en de weekindeling?

**Decision**: Hergebruik de helpers uit `src/lib/hours/dates.ts` (`amsterdamTodayISO`, `amsterdamReferenceDate`) voor "vandaag"-bepaling (gemiste slots, verlopen markering). `post_date` als ISO-tekst `YYYY-MM-DD` (`date`-type in Postgres, `date-fns` met de referentie-Date in de client), `post_time` en slot-time als `HH:MM` (text + CHECK). Weekindeling: ISO (maandag t/m zondag) via `date-fns` `startOfWeek`/`endOfWeek` met weekStartsOn 1; slot-matching per ISO-week over maandgrenzen.

**Rationale**: De spec eist "datums en tijden zijn lokale Nederlandse tijd; zomer- en wintertijd mogen niets verschuiven" — exact de bug die het uren-besluit heeft opgelost met deze helpers; hergebruik voorkomt herhaling. `HH:MM`-tekst vermijdt de `:00`-serialisatie-verrassing van het Postgres `time`-type en matcht de UI-notatie direct.

**Alternatives considered**:
- Postgres `time`-type — afgewezen: serialiseert naar `HH:MM:SS`; elke weergave moet dan trimmen; CHECK op formaat is voldoende en expliciet.
- UTC-tijden opslaan — afgewezen: posts hebben een kalenderdag + tijd, geen instant; ISO-dagtekst is stabiel over runtime-tijdzones (server UTC, browser Amsterdam).

### 8. Hoe worden de 8 vaste kleuren en de statussen gemodelleerd?

**Decision**: Kleuren als 8 vaste tekstwaarden in een CHECK-constraint op `kk_content_types.color`; de UI mapt de waarde op vaste Tailwind-klassen (kleurcode lokaal in één mapping-object). Statussen als vaste tekstwaarden met CHECK op `kk_content_posts.status` in de vaste volgorde Idee → Concept → Klaar → Gepland → Live; format idem (Tekst, Afbeelding, Carrousel, Video, Poll).

**Rationale**: Conform repo-conventie (`target_period` in kk_clients: text + CHECK), geen enum-types nodig, waarden leesbaar in de database en in Supabase-tables. De vaste volgorde zit in één array-constante in de client; statusregels (tekstlengte, datum/tijd, scheduled_at vastleggen/wissen) zijn pure functies in `src/lib/content/text.ts` — unit-testbaar per FR-019 t/m FR-025.

**Alternatives considered**:
- Postgres ENUM-types — afgewezen: waardewijzigingen vereisen ALTER TYPE; CHECK is flexibeler en matcht de bestaande stijl.
- Kleur als hex in de database — afgewezen: spec zegt "keuze uit 8 vaste kleuren" — de set is domein, niet vrij veld.

### 9. Hoe wordt de migratie toegepast?

**Decision**: Migratiebestand `supabase/migrations/022_content_kalender.sql` (idempotent, 007-stijl: `if not exists`, `drop policy if exists` + `create policy`), toegepast via Supabase MCP; als MCP/CLI-token niet beschikbaar is via het SQL-Editor-pakket (kanban-regel R3 uit `/knowledge/kanban/rules.md`). Daarna `npm run types:update` voor `src/types/database.types.ts`.

**Rationale**: Repo-conventie: alle schema-wijzigingen als idempotente migratie vastgelegd (007, 019, 021); toepassing loopt via de beproefde weg. Nummering: 022 is het eerstvolgende nummer (huidige max 021); feature 024 (bijlagen) gebruikt al 023 — de nummering sluit naadloos aan.

**Alternatives considered**:
- Direct SQL in de SQL Editor zonder migratiebestand — afgewezen: breekt de herhaalbaarheid en de review-trail.
- `supabase db push` vanaf CLI — afgewezen zolang er geen remote-CLI-token is; MCP is de AGENTS.md-standaardweg.

## Conclusie

Alle onderzoeksvragen beantwoord. Implementatie: 1 migratie (3 tabellen, 12 RLS-policies), 1 nieuwe pagina met SSR-prefetch, ~9 nieuwe componenten in `src/components/content/`, pure logica in `src/lib/content/` (slots, text, queries), mutaties in `src/actions/content.ts`, eigen dnd-hook, React Query-hook `useContent.ts`, nav-item in AppShell, unit- en E2E-tests. Geen nieuwe dependencies. Dataflow conform uren-besluit; bestandsnamen conformeerd aan feature 024 (PostEditorDialog, PostChip, content.ts, queries.ts, kk_content_posts).