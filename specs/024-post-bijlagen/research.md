# Research: Bijlagen bij een post

**Feature**: 024-post-bijlagen | **Date**: 2026-10-14

## Vraagpunten uit Technical Context

Geen NEEDS CLARIFICATION-markers. De opdracht bevatte de technische kaders (migratienaam, bucket-config, opslagpad, upload-strategie, validatiefunctie, testvormen, bestandsgrenzen); onderstaande beslissingen zijn uit de codebase en de Supabase-documentatie (Context7, `/supabase/supabase`) gevalideerd.

## Onderzoek

### 1. Waar verloopt de upload — server action of browser-client?

**Decision**: Uploads gaan rechtstreeks vanuit de browser-client naar Supabase Storage (`supabase.storage.from('content-media').upload(path, file)` via de bestaande `createClient()` uit `src/lib/supabase/client.ts`). Na een geslaagde upload registreert een server action (`registerAttachment`) alleen de metadata-rij; mislukt die, dan verwijdert de action het object weer (compensatie).

**Rationale**: Server actions in Next.js op Netlify draaien als Netlify Functions met een request-limiet van circa 6 MB — een 20 MB-PDF zou daar altijd op stuklopen. Directe browser-upload heeft dat limiet niet, gebruikt de RLS-scoped sessie van de gebruiker (foldername-policy dwingt de eigen map af) en is het door Supabase gedocumenteerde standaardpatroon. De metadata-registratie als aparte server action houdt de kleine payload binnen alle limieten.

**Alternatives considered**:
- Upload via server action met FormData — afgewezen: onmogelijk boven ~6 MB (Netlify Function-limiet).
- Edge Function als upload-proxy — afgewezen: extra infrastructurele complexiteit en cold starts, terwijl Storage zelf de client-upload ondersteunt met RLS.
- TUS/resumable uploads — afgewezen: overkill bij 20 MB; standaard `upload()` volstaat.

### 2. Hoe wordt de bucket ingericht en afgeschermd?

**Decision**: Private bucket `content-media` via de idempotente migratie `supabase/migrations/023_content_attachments.sql`: `insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('content-media','content-media', false, 20971520, array['image/jpeg','image/png','application/pdf']) on conflict (id) do nothing`. Vier policies op `storage.objects` (select/insert/update/delete, `to authenticated`) met `bucket_id = 'content-media' and (storage.foldername(name))[1] = auth.uid()::text`.

**Rationale**: De foldername-policy is het door Supabase gedocumenteerde patroon voor per-gebruiker-mappen en sluit exact aan op de padconventie `{user_id}/{post_id}/{uuid}-{bestandsnaam}`. Oudere Storage-versies passen `allowed_mime_types`/`file_size_limit` niet altijd af — de tabel-CHECK op `size_bytes` en de client-validatie zijn de tweede en derde afzekering. De documentatie noemt expliciet dat een INSERT-policy zonder bijbehorende SELECT-policy tot 403 leidt (Storage doet `INSERT ... RETURNING *`); alle vier de policies zijn dus noodzakelijk. Migratiebestand past in de repo-conventie (007-patroon: `drop policy if exists` + `create policy`); toepassen verloopt via de Supabase MCP.

**Alternatives considered**:
- Bucket aanmaken via dashboard/MCP zonder migratiebestand — afgewezen: repo-conventie is alle schema-wijzigingen als idempotente migratie vast te leggen (herhaalbaar, reviewbaar).
- `public` bucket met ongecontroleerde URL's — afgewezen: bijlagen zijn privé per opdracht (FR-008); signed URL's zijn de enige toegang.

### 3. Hoe worden bestanden getoond en gedownload?

**Decision**: Gedeelde fetcher in `src/lib/content/queries.ts` (uren-patroon: client als parameter, bruikbaar vanaf de server én de browser): rijen ophalen op `post_id` (gesorteerd op `position`) en daarna één batch `createSignedUrls(paths, 3600)` — geldig 1 uur. De download-knop hangt `download=<file_name>` als query-parameter aan de signed URL; een tabblad-open gebruikt de URL zonder die parameter.

**Rationale**: `createSignedUrl(s)` op een private bucket vereist een client die onder de ingelogde gebruiker draait — de foldername-policy geeft precies diens eigen map vrij, dus geen service-role nodig. In het uren-patroon (besluit 2026-09-22) draait de read-fetcher op de server bij SSR-prefetch en op de browser-client na hydratie; beide zijn RLS-scoped. Batch `createSignedUrls` voorkomt tot 20 losse round-trips per post. Supabase Storage ondersteunt de `download`-query-parameter op object-URL's om een download met de originele bestandsnaam af te dwingen.

**Alternatives considered**:
- Losse `createSignedUrl` per bijlage — afgewezen: tot 20 extra round-trips per editor-open (schendt de geest van SC-004 uit 023: geen extra serververzoeken voor getoonde data).
- Openbare URL's — afgewezen: privé-contraregel (FR-008).

### 4. Waar zit de validatie (type, grootte, óf-regel)?

**Decision**: Eén pure functie `validateAttachmentAdd(existing, file)` in `src/lib/content/attachments.ts` (nieuw), aangeroepen in de client vóór enige upload én server-side opnieuw in `registerAttachment` (defense in depth). Constanten (20 MB, 20 afbeeldingen, drie mime-types) leven naast de functie en matchen de tabel-CHECKs.

**Rationale**: Pure functies zijn deterministisch unit-testbaar volgens de bestaande Playwright-conventie voor pure logica (`tests/e2e/decimal-helper.spec.ts` importeert functies zonder page). Dezelfde regelcode aan client- en serverkant voorkomt dat de server een staat accepteert die de client weigert (of vice versa). Client-validatie vóór de upload garandeert SC-002: niets wordt verstuurd bij een weigering.

**Alternatives considered**:
- Alleen server-side validatie — afgewezen: het 25 MB-bestand zou dan eerst volledig verstuurd moeten worden.
- Validatie in de UI-component — afgewezen: niet hergebruikbaar server-side en niet unit-testbaar.

### 5. Hoe worden bijlagen opgeschoond?

**Decision**: Drie opruimplijnen. (1) `deleteAttachment`: eerst `storage.remove([storage_path])`, dan de rij — bij object-fout blijft alles intact (herstelbaar); bij rij-fout is het object al weg en ruimt de FK-cascade de rij uiterlijk bij post-verwijdering. (2) `registerAttachment`: mislukt de rij-insert, dan verwijdert de action het geüploade object weer (compensatie, conform opdracht). (3) `deletePost`: verwijdert vóór de post-verwijdering álle objecten onder `{user_id}/{post_id}/` via `storage.list` + `storage.remove`; bij storage-fout wordt de post niet verwijderd. De FK `post_id → kk_content_posts on delete cascade` ruimt daarna de rijen automatisch.

**Rationale**: Storage-objects kennen geen foreign keys — alleen een expliciete cleanup met harde fout-afhandeling maakt FR-007/SC-003 afdwingbaar ("0% van de bestanden nog aanwezig"). `storage.list` onder het prefix dekt ook eventuele weesobjecten uit een mislukte compensatie. Opsomming: `remove([])` op een lege lijst overslaan. De verwijervolgorde (post alleen verwijderen ná geslaagde object-cleanup) voorkomt onmogelijk te herstellen situaties: een rijloos weesobject onder een verwijderd post-prefix is nadien niet meer vindbaar.

**Alternatives considered**:
- Alleen op DB-cascade vertrouwen — afgewezen: cascade ruimt rijen, nooit Storage-objecten.
- Dagelijkse opschoontaak — afgewezen: buiten scope (plan Out of Scope); cleanup-afspraken dekken het volledig.

### 6. Hoe werkt de volgorde-bepaling?

**Decision**: `position int not null default 0`, append-positie `MAX(position) + 1` bij nieuwe rij. Herordenen via server action `reorderAttachments(postId, orderedIds)` met één `.upsert(orderedIds.map((id, position) => ({ id, position })), { onConflict: 'id' })`, na een ownership-check dat alle ids bij de post van de gebruiker horen. UI: `SortableContext` uit het aanwezige `@dnd-kit/sortable` 8.0.0 met `rectSortingStrategy` voor het thumbnail-grid; optimistische update, rollback + toast bij server-fout (conform 023-sleepconventie).

**Rationale**: `upsert` met `onConflict: 'id'` is één round-trip voor ≤20 rijen (vergeleken: een loop van 20 updates of een aparte RPC). dnd-kit zit al in de repo (geverifieerd in package.json) en wordt op dezelfde manier gebruikt als in de kanbanborden. De ownership-check in de action vangt een verlopen UI-state (anders tab) af via RLS.

**Alternatives considered**:
- Positie-loop met losse updates — afgewezen: N round-trips, race-gevoeliger.
- Aparte RPC met `unnest`-update — afgewezen: extra SQL-object voor een edge-gemak dat upsert al dekt.
- `array_position`-kolom in de post — afgewezen: breekt de bijlage-tabel-ontvouwbaarheid (count, per-bijlage metadata) en de 1-tabel-1-entiteit-conventie.

### 7. Hoe krijgt de kalenderchip het aantal bijlagen?

**Decision**: De bestaande posts-query voor kalender en ideeënbak (uit 023) wordt uitgebreid met een embedded count-aggregatie: `kk_content_attachments(count)` levert `attachment_count` per post in dezelfde query. `PostChip.tsx` toont Paperclip + aantal bij `attachment_count > 0`.

**Rationale**: Supabase's embedded `(count)`-aggregatie voegt geen per-post round-trip toe (geen N+1) en houdt SC-004 uit 023 overeind (geen extra serververzoeken na de eerste load). Het icoon op de chip is puur een voorwaardelijke render — geen extra query.

**Alternatives considered**:
- Aparte bijlagen-query op de kalenderpagina en client-side samenvoegen — afgewezen: extra round-trip + joins.
- `AttachmentWithUrl` meesturen naar de chip — afgewezen: chip heeft alleen een telling nodig; signed URL's zijn editor-behoefte.

### 8. Hoe staat deze feature tot feature 023?

**Decision**: 024 is een opvolgende feature van de content-kalender en veronderstelt dat 023 is geïmplementeerd: `kk_content_posts`, `PostEditorDialog.tsx`, `PostChip.tsx`, `src/actions/content.ts` (incl. `deletePost`) en `src/lib/content/queries.ts` bestaan dan. De bestandsgrens uit de opdracht (alleen die vijf bestaande bestanden wijzigen) is zo gekozen dat 024 zonder rework van 023-bestanden kan landen.

**Rationale**: Op dit moment is 023 alleen gespecificeerd/gepland; er is nog geen content-code in `src/`. Alle verwijzingen in dit plan (fasen 1-6) zijn uitvoerbaar zodra 023 geland is; de migratie vereist `kk_content_posts` en moet ná de 023-migratie worden toegepast. De nummering (migratie 023_content_attachments) sluit daarop aan: 022 = content-kalender-migratie, 023 = bijlagen.

**Alternatives considered**:
- Bijlagen in 023 zelf opnemen — afgewezen: 023-spec zegt expliciet "bijlagen (aparte vervolgfeature)"; opsplitsen houdt beide features overzichtelijk en onafhankelijk testbaar.

## Conclusie

Alle onderzoeksvragen beantwoord. Implementatie: 1 migratie (bucket + policies + tabel + RLS), 1 nieuw lib-bestand (pure validatie + padconventie), 3 nieuwe server actions + `deletePost`-uitbreiding, query-uitbreidingen (batch signed urls + embedded count), 1 nieuwe UI-component + 2 UI-wijzigingen, 2 testbestanden. Geen nieuwe dependencies, geen service-role, geen Edge Functions. Prerequisite: 023 geïmplementeerd.