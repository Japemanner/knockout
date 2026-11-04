# LinkedIn content-kalender: input voor speckit

Twee features, bewust gesplitst zodat GLM per run één afgebakend ding bouwt:

- **023 content-kalender (kern)**: contentsoorten, weekslots, maandkalender, ideeënbak, post-editor, statussen.
- **024 content-bijlagen**: afbeeldingen en PDF-carrousels in Supabase Storage. Pas starten als 023 op productie draait.

Per feature:

1. `/speckit.specify` + plak blok **A** (alles tussen de `---`-lijnen)
2. `/speckit.clarify`: de keuzes staan al in blok A; vraagt GLM iets dat daar beantwoord is, verwijs naar het betreffende kopje
3. `/speckit.plan` + plak blok **B**
4. `/speckit.tasks`, daarna `/speckit.implement`

Blok A is bewust vrij van techniek (wat en waarom), blok B bevat het hoe. Zo blijft spec.md leesbaar en komen de technische keuzes in plan.md terecht.

---
---

# 023 · Blok A · `/speckit.specify`

---

Voeg aan Knockout een LinkedIn content-kalender toe waarmee ik mijn LinkedIn-posts plan, schrijf en bijhoud. Alleen voor mijn persoonlijke LinkedIn-profiel. Knockout publiceert niets zelf: ik plan posts in LinkedIn zelf in en houd in Knockout bij wat er gepland en live staat.

## Vastgestelde keuzes

- Publiceren gebeurt handmatig in LinkedIn. Knockout is de planning en de schrijfplek; de status "Gepland" zet ik zelf. Reden: de LinkedIn-API kan in LinkedIn ingeplande posts niet uitlezen en heeft geen veld voor ingepland publiceren.
- Contentsoorten hangen aan vaste slots per weekdag (bijv. woensdag 08:00 = "Praktijk voor financieel adviseurs"). De kalender toont lege slots, zodat ik gaten direct zie. Per week afwijken mag.
- De volledige posttekst staat in Knockout.
- Hoofdweergave: maandraster met een ideeënbak ernaast.
- Navigatie: nieuw item "Content" in de linkerbalk, direct onder "Uren".
- Contentsoorten en slots maak ik zelf aan in de app; er komt geen startset mee.

## User stories

### US1 · Contentsoorten en weekslots beheren (P1)

Ik leg vast welke soorten content ik post en op welke vaste dagen en tijden.

- Een contentsoort heeft: naam (verplicht), doelgroep, korte beschrijving, kleur (keuze uit 8 vaste kleuren).
- Per contentsoort kies ik nul of meer weekdagen (ma t/m zo), elk met een eigen tijd (standaard 08:00). Elke dag kan per slot aan of uit.
- Een contentsoort kan ik archiveren, niet verwijderen. Gearchiveerde soorten krijgen geen nieuwe lege slots meer; bestaande posts met die soort blijven zichtbaar.
- Beheer gebeurt in een dialoog "Soorten & slots" vanaf de kalenderpagina.

Acceptatie:
1. Given geen contentsoorten, When ik "Praktijk financieel adviseurs" aanmaak met slot woensdag 08:00, Then toont de kalender op elke woensdag vanaf vandaag een leeg slot met die naam en tijd.
2. Given een soort met slots, When ik de soort archiveer, Then verdwijnen de lege slots van die soort uit de kalender en blijven de posts staan.
3. Given een slot dat ik vandaag aanmaak, When ik een maand terugblader, Then zie ik daar geen lege slots van dit slot (slots gelden pas vanaf de dag dat ze zijn aangemaakt).

### US2 · Maandkalender met posts en lege slots (P1)

Ik open "Content" in de linkerbalk en zie de huidige maand als raster van hele weken (maandag t/m zondag, dagen buiten de maand gedimd). Bovenaan: vorige/volgende maand, "Vandaag", "Nieuwe post", "Soorten & slots".

In elke dagcel:
- **Posts**: kleurstreep van de contentsoort, tijd, titel (afgekapt), statusbadge. Gesorteerd op tijd. Meer dan 3 items: toon 3 + "+n", klik toont alles.
- **Lege slots**: gestippeld kader in de kleur van de soort met "Soortnaam · 08:00". Klik maakt een nieuwe post aan met datum, tijd en soort ingevuld en status Concept, en opent de editor.
- **Gemiste slots**: een leeg slot op een datum vóór vandaag wordt grijs getoond als "gemist", niet klikbaar.
- **Verlopen post**: een post met datum vóór vandaag en status Idee, Concept of Klaar krijgt een rode markering.

Wanneer is een slot gevuld: per ISO-week en per contentsoort tel ik de slots en de posts met een datum in die week. De slots van die soort in die week worden op volgorde (datum, tijd) gevuld door de posts op volgorde (datum, tijd). Gevolg: verplaats ik de woensdagpost naar donderdag in dezelfde week, dan is het woensdagslot nog steeds gevuld en verschijnt er geen gat.

Acceptatie:
1. Given een woensdagslot en een post van die soort op donderdag dezelfde week, When ik de kalender bekijk, Then staat er op woensdag geen leeg slot.
2. Given een soort met slots op dinsdag en donderdag en één post op dinsdag, When ik de week bekijk, Then staat donderdag als leeg slot.
3. Given een post zonder contentsoort, When ik de kalender bekijk, Then staat de post op zijn datum en vult hij geen slot.
4. Given ik klik in de linkerbalk op "Content", Then opent de kalender op de huidige maand; het item staat direct onder "Uren".

### US3 · Post schrijven en status bijhouden (P1)

Klik op een post opent de editor met: titel (intern, verplicht), contentsoort, format (Tekst, Afbeelding, Carrousel, Video, Poll), status, datum, tijd, posttekst, bron-URL (artikel of bron waar de post op voortbouwt), LinkedIn-URL, notities.

Posttekst:
- Tekenteller "1.234 / 3.000"; boven 3.000 rood.
- Hook-preview: de tekst tot de eerste van (a) het derde regeleinde of (b) 210 tekens, gevolgd door "…meer". Label: "Opening in de feed (benadering)".
- Knop "Kopieer tekst" zet de posttekst op het klembord en toont een bevestiging.

Statussen, in deze volgorde: Idee, Concept, Klaar, Gepland, Live. Vrij te wisselen, met deze regels:
- Klaar, Gepland en Live vereisen een niet-lege posttekst van maximaal 3.000 tekens.
- Gepland en Live vereisen een datum en tijd.
- Bij overgang naar Gepland legt Knockout het moment vast waarop ik de post in LinkedIn heb ingepland; terug naar een lagere status wist dat moment.
- Live zonder LinkedIn-URL krijgt op de kaart een badge "URL ontbreekt". Een ingevulde LinkedIn-URL moet beginnen met `https://www.linkedin.com/`.

Opslaan gaat expliciet (knop "Opslaan" en Ctrl/Cmd+S). Sluiten met niet-opgeslagen wijzigingen vraagt eerst bevestiging in de app (geen browserdialoog). Verwijderen van een post vraagt bevestiging.

Acceptatie:
1. Given een post met 3.100 tekens, When ik status Klaar kies, Then weigert de app dat met de melding dat de tekst te lang is; opslaan als Concept lukt wel.
2. Given een post zonder datum, When ik status Gepland kies, Then vraagt de app om datum en tijd.
3. Given een post met status Live en zonder URL, Then toont de kaart "URL ontbreekt".
4. Given een post met tekst, When ik "Kopieer tekst" klik, Then staat de exacte posttekst op het klembord.

### US4 · Ideeënbak en slepen (P2)

Naast het maandraster staat de ideeënbak: alle posts zonder datum, nieuwste bovenaan. Bovenin een invoerveld: titel typen + Enter maakt een nieuw idee (status Idee, geen datum).

Slepen:
- Idee → dagcel: krijgt die datum. Heeft die dag een leeg slot van de soort van de post, dan neemt de post de tijd van dat slot over; anders blijft de bestaande tijd, en zonder tijd wordt het 08:00. Status blijft gelijk.
- Post → andere dagcel: zelfde tijdregel.
- Post → ideeënbak: datum en tijd worden gewist. Alleen voor Idee, Concept en Klaar.
- Posts met status Gepland mogen naar een andere dag, met de melding "Pas de datum ook aan in LinkedIn". Dezelfde melding bij een datum- of tijdwijziging van een geplande post in de editor.
- Posts met status Live zijn niet sleepbaar.
- Een geplande post naar de ideeënbak slepen wordt geweigerd met een melding.

Acceptatie:
1. Given een idee zonder soort, When ik het op een dag zonder slots sleep, Then krijgt het die datum en tijd 08:00 en blijft het status Idee.
2. Given een geplande post, When ik hem naar een andere dag sleep, Then verschuift hij en zie ik "Pas de datum ook aan in LinkedIn".
3. Given een slepende actie die op de server mislukt, Then springt de post terug naar zijn oude plek en zie ik een foutmelding.

### US5 · Mobiel (P3)

Onder 768 px breed wordt het raster een lijst per dag (alleen dagen met posts of slots), met de ideeënbak eronder. Slepen is mobiel niet nodig; datum wijzigen gaat via de editor.

## Randgevallen

- Twee posts op dezelfde dag: beide tonen, op tijd gesorteerd.
- Meer posts van een soort in een week dan slots: de extra posts tonen gewoon, zonder gat of fout.
- Slot-template gewijzigd (andere dag of tijd): geldt voor alle weken vanaf de aanmaakdatum van het slot.
- Gearchiveerde soort: posts tonen de soortnaam gedimd.
- Datums en tijden zijn lokale Nederlandse tijd; zomer- en wintertijd mogen niets verschuiven.

## Buiten scope

Publiceren via de LinkedIn-API, herinneringen (n8n, Slack, mail), Command Center-widget, AI-schrijfhulp, statistieken en analytics-import, andere LinkedIn-accounts of bedrijfspagina's, bijlagen (feature 024), video-upload, terugkerende series, meerdere gebruikers.

## Succescriteria

- SC-001: Ik plan vier weken vooruit (alle slots gevuld of bewust leeg) zonder de pagina te verlaten.
- SC-002: Elk leeg slot in de komende vier weken is zichtbaar zonder te klikken.
- SC-003: Van een post met status Klaar naar LinkedIn kost één klik (kopiëren).
- SC-004: Na het laden van /content gaan er geen server-action-calls uit voor het lezen van data.

---
---

# 023 · Blok B · `/speckit.plan`

---

Volg de bestaande patronen in deze repo. Geen nieuwe dependencies.

## Stack en patronen

- Next.js 15 App Router, React 18, TypeScript strict, Tailwind v3, Radix-componenten uit `src/components/ui/`, `@dnd-kit/core`, TanStack Query v5, `date-fns` v4, Supabase via `@supabase/ssr`.
- **Datalaag precies zoals /uren** (zie `decisions/2026-09-22-uren-reads-browser-client.md`):
  - `src/app/(dashboard)/content/page.tsx`: SSR-prefetch met `QueryClient.prefetchQuery` + `dehydrate` + `HydrationBoundary`, net als `src/app/(dashboard)/uren/page.tsx`.
  - Reads in `src/lib/content/queries.ts` (geen `'use server'`), met meegegeven Supabase-client, gedeeld door server en browser. Supabase-fouten gooien, niet stil `[]` teruggeven.
  - Mutaties als server actions in `src/actions/content.ts` via `getAuthenticatedClient()` uit `src/lib/supabase/actions.ts`. **Geen `revalidatePath`**; de client invalideert React Query-keys.
  - Optimistic update voor slepen (`movePost`) met `cancelQueries` / `getQueriesData` / `setQueriesData` en rollback + toast bij fout.
  - Vandaag-datum via `amsterdamTodayISO()` uit `src/lib/hours/dates.ts`. Nooit `toISOString()` op een lokale datum.
- Query-keys in `contentKeys`: `pillars` (incl. slots), `month(yyyy-MM)`, `ideas`.
- De maandquery haalt posts op over het **volledige zichtbare raster** (maandag van de eerste week t/m zondag van de laatste week), niet alleen de kalendermaand; anders klopt de slotmatching aan de randen van de maand niet.

## Database: `supabase/migrations/022_content_calendar.sql`

Idempotent, opbouw zoals `007_hours_tracking.sql`: `CREATE TABLE IF NOT EXISTS`, RLS aan op elke tabel, vier policies per tabel (`user_id = auth.uid()`, met `DROP POLICY IF EXISTS` ervoor), `updated_at`-trigger via bestaande `update_updated_at()`. Ik draai de migratie handmatig in de Supabase SQL Editor op productie.

```
kk_content_pillars
  id uuid pk default gen_random_uuid()
  user_id uuid not null references auth.users(id) on delete cascade
  name text not null
  audience text
  description text
  color text not null default 'blue'
    check (color in ('blue','green','orange','purple','pink','yellow','teal','gray'))
  archived boolean not null default false
  position int not null default 0
  created_at, updated_at timestamptz not null default now()

kk_content_slots
  id uuid pk
  user_id uuid not null references auth.users(id) on delete cascade
  pillar_id uuid not null references kk_content_pillars(id) on delete cascade
  weekday smallint not null check (weekday between 1 and 7)   -- ISO: 1 = maandag
  post_time time not null default '08:00'
  active boolean not null default true
  created_at, updated_at timestamptz not null default now()
  unique (pillar_id, weekday)

kk_content_posts
  id uuid pk
  user_id uuid not null references auth.users(id) on delete cascade
  pillar_id uuid references kk_content_pillars(id) on delete set null
  title text not null
  body text not null default ''
  format text not null default 'tekst'
    check (format in ('tekst','afbeelding','carrousel','video','poll'))
  status text not null default 'idee'
    check (status in ('idee','concept','klaar','gepland','live'))
  planned_date date            -- null = ideeënbak
  planned_time time
  source_url text
  linkedin_url text
  notes text
  scheduled_on_linkedin_at timestamptz
  created_at, updated_at timestamptz not null default now()
  check (status not in ('gepland','live') or (planned_date is not null and planned_time is not null))
```

Indexen: `kk_content_posts(user_id, planned_date)`, `kk_content_slots(user_id)`, `kk_content_pillars(user_id)`.

Geen DB-constraint op de lengte van `body`: een concept mag tijdelijk langer zijn dan 3.000. De 3.000-grens bewaakt de applicatie bij statusovergangen (in de pure functie én in de server action).

Typen toevoegen aan `src/types/database.types.ts`.

## Pure logica: `src/lib/content/calendar.ts`

Geen React, geen Supabase; volledig unit-testbaar.

- `buildMonthGrid(year, month)` → weken (ma–zo) met `{ date: 'YYYY-MM-DD', inMonth: boolean }`. Gebruik `startOfISOWeek` / `endOfISOWeek` uit date-fns.
- `computeSlotOccurrences(gridDates, pillars, slots)` → per datum de slotvoorkomens `{ date, pillarId, time }`; alleen voor `active` slots van niet-gearchiveerde soorten en alleen voor datums `>= slot.created_at` (als Amsterdamse datum).
- `matchSlots(occurrences, posts)` → per ISO-week en per `pillarId`: sorteer slotvoorkomens op (datum, tijd), sorteer posts met die soort en een datum in die week op (datum, tijd), koppel de i-de post aan het i-de voorkomen. Retourneer de niet-gekoppelde voorkomens.
- `slotState(occurrence, today)` → `'open'` (datum ≥ vandaag) of `'gemist'`.
- `isOverdue(post, today)` → datum < vandaag en status in idee/concept/klaar.
- `charCount(text)` → `Array.from(text).length` (telt emoji als één teken).
- `hookPreview(text)` → tekst tot de eerste van: derde `\n`, of 210 tekens (via `Array.from`); `{ preview, truncated }`.
- `validateStatusChange(post, nextStatus)` → `{ ok: true } | { ok: false, reason }` volgens de regels in de spec.
- `resolveDropTime(post, targetDate, openSlotsOnDate)` → tijd van het lege slot van dezelfde soort op die dag, anders `post.planned_time`, anders `'08:00'`.

## UI

- `src/components/layout/AppShell.tsx`: in `navItems` direct na Uren `{ href: '/content', label: 'Content', icon: CalendarDays, external: false }` (lucide-react). Zelfde zichtbaarheid als Uren.
- `src/components/content/`:
  - `ContentView.tsx`: header (maandnavigatie, Vandaag, Nieuwe post, Soorten & slots), `DndContext` + `DragOverlay`, raster + ideeënbak.
  - `MonthGrid.tsx`, `DayCell.tsx` (droppable id `day:YYYY-MM-DD`), `PostChip.tsx` (draggable, niet bij status `live`), `SlotPlaceholder.tsx`.
  - `IdeasPanel.tsx` (droppable id `ideas`, quick-add input).
  - `PostEditorDialog.tsx` (Radix `Dialog` uit `src/components/ui/dialog.tsx`, `Textarea`, `Select`). Unsaved-changes-bevestiging als in-app dialoog. Ctrl/Cmd+S slaat op.
  - `PillarsDialog.tsx`: soorten met kleurkeuze, archiveren, per soort zeven dag-chips met tijdveld.
  - `colors.ts`: mapping van de 8 kleur-keys naar Tailwind-klassen met `dark:`-varianten.
- Statusbadges: idee grijs, concept geel, klaar blauw, gepland paars, live groen. Badge-component uit `src/components/ui/badge.tsx`.
- Meldingen via de bestaande toast (`src/components/ui/toast.tsx`). Nooit `alert`/`confirm`/`prompt`.

## Server actions: `src/actions/content.ts`

`createPillar`, `updatePillar`, `setPillarArchived`, `upsertSlot`, `deleteSlot`, `createPost`, `updatePost`, `movePost(id, date | null, time | null)`, `deletePost`. Elke action die status of tekst wijzigt roept `validateStatusChange` aan en weigert ongeldige combinaties server-side. Bij overgang naar `gepland`: `scheduled_on_linkedin_at = now()` als die leeg is; bij overgang naar een lagere status: `null`.

## Tests

- `tests/e2e/content-calendar-logic.spec.ts`: unit-tests op `calendar.ts`, opgezet zoals `tests/e2e/column-filters.spec.ts`. Minimaal:
  1. Woensdagslot, geen posts → elke woensdag vanaf aanmaakdatum een voorkomen; vóór vandaag `gemist`, vanaf vandaag `open`.
  2. Post van die soort op woensdag → slot gevuld.
  3. Post verplaatst naar donderdag zelfde week → woensdagslot gevuld.
  4. Post in de volgende week → woensdagslot deze week open.
  5. Slots di + do, één post op di → do open.
  6. Gearchiveerde soort → geen voorkomens; inactief slot → geen voorkomens.
  7. Slot aangemaakt op datum X → geen voorkomens vóór X.
  8. Post zonder soort vult geen slot; extra posts boven het aantal slots geven geen fout.
  9. Week over een maandgrens (di 29 sep 2026 + do 1 okt 2026) matcht als één week.
  10. `charCount` met emoji, `hookPreview` met 2 regeleindes en met lange eerste regel.
  11. `validateStatusChange`: 3.001 tekens → klaar geweigerd; gepland zonder datum geweigerd; live zonder URL toegestaan; ongeldige LinkedIn-URL geweigerd.
  12. `resolveDropTime`: slot op doeldag, geen slot met bestaande tijd, geen slot zonder tijd.
- `tests/e2e/content-calendar.spec.ts`: e2e met de bestaande login-skip-guards: nav-item staat direct onder Uren; soort + slot aanmaken → leeg slot zichtbaar; klik op leeg slot → editor met datum/tijd/soort ingevuld; idee aanmaken en naar een dag slepen; geplande post verslepen toont de LinkedIn-melding.

## Grenzen

- Raak geen bestaande modules aan behalve `AppShell.tsx` (nav-item) en `database.types.ts`.
- `npm run build` en lint moeten groen zijn (pre-commit hook).
- Geen Supabase Storage in deze feature.

---
---

# 024 · Blok A · `/speckit.specify`

---

Voeg aan de LinkedIn content-kalender in Knockout (feature 023) bijlagen toe aan posts: afbeeldingen en PDF-carrousels, zodat alles wat ik voor een post nodig heb op één plek staat.

## User story · Bijlagen bij een post (P1)

In de post-editor staat een sectie "Bijlagen".

- Uploaden van JPG, PNG of PDF, maximaal 20 MB per bestand.
- Een post heeft óf maximaal 20 afbeeldingen, óf precies één PDF; geen combinatie (LinkedIn staat dat in één post ook niet toe). Een upload die deze regel breekt wordt geweigerd met uitleg.
- Afbeeldingen tonen als thumbnail, PDF's als bestandsnaam met icoon. Elke bijlage kan ik downloaden en verwijderen (met bevestiging).
- Volgorde van afbeeldingen kan ik aanpassen door te slepen; die volgorde gebruik ik bij het uploaden in LinkedIn.
- In de kalender toont een post met bijlagen een klein paperclip-icoon met het aantal.
- Verwijder ik een post, dan verdwijnen de bijlagen ook uit de opslag.
- Bijlagen zijn privé: alleen ik kan ze zien.

Acceptatie:
1. Given een post zonder bijlagen, When ik twee PNG's upload, Then zie ik twee thumbnails in de gekozen volgorde.
2. Given een post met een PDF, When ik een afbeelding upload, Then weigert de app dat met uitleg.
3. Given een bestand van 25 MB, Then weigert de app de upload vóórdat er iets wordt verstuurd.
4. Given een post met bijlagen, When ik de post verwijder, Then zijn de bestanden ook uit de opslag verdwenen.

## Buiten scope

Video, bewerken van afbeeldingen, automatisch PDF's genereren, delen van bijlagen via openbare links.

---
---

# 024 · Blok B · `/speckit.plan`

---

- Migratie `supabase/migrations/023_content_attachments.sql` (idempotent):
  - Bucket `content-media`, **private**, `file_size_limit` 20971520, `allowed_mime_types` `image/jpeg`, `image/png`, `application/pdf` (insert in `storage.buckets` met `on conflict do nothing`).
  - Policies op `storage.objects` voor select/insert/update/delete: `bucket_id = 'content-media' and (storage.foldername(name))[1] = auth.uid()::text`.
  - Tabel `kk_content_attachments`: `id`, `user_id`, `post_id` (references `kk_content_posts` on delete cascade), `storage_path text not null`, `file_name text not null`, `mime_type text not null` (check op de drie types), `size_bytes int not null`, `position int not null default 0`, `created_at`. RLS + vier policies zoals in 022.
- Opslagpad: `{user_id}/{post_id}/{uuid}-{bestandsnaam}`.
- **Upload vanuit de browser-client direct naar Storage**, niet via een server action: server actions draaien als Netlify Function en die heeft een request-limiet van circa 6 MB. Na een geslaagde upload een server action die de rij in `kk_content_attachments` aanmaakt; mislukt die, dan het object weer verwijderen.
- Weergave via `createSignedUrl` (1 uur geldig), opgehaald in `src/lib/content/queries.ts`.
- Validatie (type, grootte, afbeeldingen-óf-PDF-regel) als pure functie `validateAttachmentAdd(existing, file)` in `src/lib/content/attachments.ts`, client- én server-side aangeroepen.
- `deletePost` in `src/actions/content.ts` uitbreiden: eerst alle objecten onder `{user_id}/{post_id}/` verwijderen, dan de post.
- Volgorde slepen met `@dnd-kit/sortable` (zit al in de repo).
- Tests: unit-tests op `validateAttachmentAdd`; e2e met login-skip-guards voor upload, weigering PDF+afbeelding en verwijderen.
- Grenzen: alleen `PostEditorDialog.tsx`, `PostChip.tsx` (icoon), `content.ts`, `queries.ts` en `database.types.ts` aanpassen.
