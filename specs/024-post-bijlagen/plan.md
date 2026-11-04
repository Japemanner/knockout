# Implementation Plan: Bijlagen bij een post

**Branch**: `024-post-bijlagen` | **Date**: 2026-10-14 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/024-post-bijlagen/spec.md` + technische kaders uit de opdracht (migratienaam, bucket-config, opslagpad, upload-strategie, validatiefunctie, dnd-kit, testvormen, bestandsgrenzen).

## Summary

Voeg aan posts in de content-kalender (feature 023) een bijlagen-sectie toe: JPG/PNG-afbeeldingen (max 20) óf precies één PDF, max 20 MB per bestand, privé per gebruiker. Bestanden gaan naar een nieuwe private Supabase Storage-bucket `content-media` onder het pad `{user_id}/{post_id}/{uuid}-{bestandsnaam}`; metadata staat in de nieuwe tabel `kk_content_attachments` (RLS, vier policies). Uploads verlopen rechtstreeks vanuit de browser-client naar Storage (server actions draaien als Netlify Function met een request-limiet van circa 6 MB); na een geslaagde upload registreert een server action de rij, en mislukt die, dan verwijdert de action het object weer (compensatie). Weergave loopt via batch `createSignedUrls` (1 uur geldig) vanuit `src/lib/content/queries.ts`. Validatie (type, grootte, afbeeldingen-óf-PDF-regel) zit in één pure functie `validateAttachmentAdd` in `src/lib/content/attachments.ts`, aangeroepen aan client- én serverkant. Volgorde van afbeeldingen via bestaand `@dnd-kit/sortable`; de kalender toont een paperclip-icoon met aantal op de postchip. `deletePost` ruimt eerst alle objecten onder `{user_id}/{post_id}/` op voordat de post wordt verwijderd.

**Prerequisite**: feature 023 (content-kalender) is geïmplementeerd: `kk_content_posts` bestaat en de editor (`PostEditorDialog.tsx`), postchip (`PostChip.tsx`), server actions (`src/actions/content.ts`, incl. `deletePost`) en querylaag (`src/lib/content/queries.ts`) bestaan. Op moment van dit plan is 023 nog niet geïmplementeerd — dit plan is uitvoerbaar zodra 023 is geland. Bestandsgrens uit de opdracht: bestaande bestanden alleen `PostEditorDialog.tsx`, `PostChip.tsx`, `content.ts`, `queries.ts` en `database.types.ts` wijzigen; alle overige work is in nieuwe bestanden (`attachments.ts`, `AttachmentsSection.tsx`, migratie, tests).

## Technical Context

**Language/Version**: TypeScript 5.6 (strict) + React 18 + Next.js 15 (App Router)

**Primary Dependencies**: @supabase/ssr (bestaand), @supabase/supabase-js v2 (bestaand), @dnd-kit/sortable 8.0.0 (bestaand, al in repo), lucide-react (bestaand, Paperclip/FileText-iconen), shadcn/ui (bestaand) — geen nieuwe packages

**Storage**: Supabase PostgreSQL — nieuwe tabel `kk_content_attachments` (FK naar `kk_content_posts` on delete cascade) + Supabase Storage — nieuwe private bucket `content-media` (file_size_limit 20.971.520 bytes, mime-types jpeg/png/pdf)

**Testing**: Playwright — unit-patroon voor pure functies (conventie `tests/e2e/decimal-helper.spec.ts`) + E2E met login-skip-guards (`if (page.url().includes('/login'))`)

**Target Platform**: Web (Netlify), desktop-first; mobiele weergave erft de sectie (P3 van 023)

**Project Type**: Next.js App Router web application (server components + server actions)

**Performance Goals**: weigeringen 100% client-side vóór enig netwerkverkeer (SC-002); editor laadt bijlagen in ≤2 round-trips (rijen-query + één batch `createSignedUrls` voor max 20 bestanden); kalender-queries krijgen `attachment_count` mee via één embedded count-aggregatie (geen N+1)

**Constraints**: géén uploads via server actions (Netlify Function request-limiet circa 6 MB) — directe browser-upload via de bestaande browser-client; één Supabase-client per omgeving (bestaande helpers `createClient()` browser / `getAuthenticatedClient()` server actions / server-client in queries); geen service-role benodigd — signed URL's via de RLS-scoped serverclient; bucket is private, geen openbare links

**Scale/Scope**: 5 bestaande bestanden gewijzigd, 2 nieuwe src-bestanden, 1 migratie, 2 testbestanden; posts typisch <100, bijlagen ≤20 per post, totaalvolume klein (<1 GB)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

*De constitutie in `.specify/memory/constitution.md` is nog een ongevulde template; conform de werkwijze van 022 gelden de non-negotiable rules uit AGENTS.md als gates.*

| Gate | Status | Note |
|------|--------|------|
| RLS on every table | PASS | Nieuwe tabel `kk_content_attachments` krijgt RLS + vier policies (`user_id = auth.uid()`, patroon 007_hours_tracking.sql); F-01-check na feature via Supabase MCP |
| No secrets in client code | PASS | Alleen bestaande `NEXT_PUBLIC_*`-waarden; service role blijft server-only en is niet nodig |
| Edge Functions for privileged ops | N/A | Alle operaties zijn user-owned data onder de ingelogde gebruiker; RLS dekt alles, geen service-role-operaties |
| PKCE auth flow | PASS | Ongewijzigd; hergebruik bestaande client-setup |
| Netlify SPA redirects | N/A | Geen routing-wijzigingen |
| Storage bucket policies | PASS | Private bucket `content-media` met vier expliciete policies op `storage.objects` (bucket + eigen map); F-10-check na feature via Supabase MCP |
| TypeScript strict mode | PASS | Nieuwe types volledig getypeerd; geen `any` |
| Eén Supabase-client | PASS | Browser-upload via bestaande `createClient()` uit `src/lib/supabase/client.ts`; server actions via `getAuthenticatedClient()`; queries via serverclient — geen tweede instantie |

Geen constitution violations. Geen complexity tracking nodig.

## Project Structure

### Documentation (this feature)

```text
specs/024-post-bijlagen/
├── plan.md              # Dit bestand
├── research.md          # Phase 0 output — beslissingen + alternatieven
├── data-model.md        # Phase 1 output — tabel, bucket, padconventie, lifecycle
├── contracts/
│   └── attachments.md   # Phase 1 output — validatiefunctie, server actions, UI-contract
├── quickstart.md        # Phase 1 output — verificatie-instructies
├── checklists/
│   └── requirements.md  # Tijdens /speckit.specify aangemaakt (16/16 passing)
└── tasks.md             # Phase 2 output (/speckit.tasks — niet door /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── components/content/
│   ├── PostEditorDialog.tsx        # WIJZIGING — bijlagen-sectie integreren (sectie "Bijlagen" met upload, lijst, regels)
│   ├── PostChip.tsx                # WIJZIGING — paperclip-icoon + aantal bij attachment_count > 0
│   └── AttachmentsSection.tsx      # NIEUW — uploadzone, thumbnails/PDF-regels, download, verwijderen, drag-volgorde
├── actions/content.ts              # UITBREIDING — registerAttachment, deleteAttachment, reorderAttachments; deletePost ruimt storage op
├── lib/content/
│   ├── queries.ts                  # UITBREIDING — bijlagen per post + batch createSignedUrls; attachment_count in kalender-query
│   └── attachments.ts              # NIEUW — validateAttachmentAdd (pure) + buildStoragePath + constanten/limieten
└── types/database.types.ts         # WIJZIGING — kk_content_attachments-types (na migratie via `npm run types:update`)

supabase/migrations/
└── 023_content_attachments.sql     # NIEUW — bucket, storage-policies, tabel, RLS (idempotent)

tests/e2e/
├── attachment-validation.spec.ts   # NIEUW — unit-patroon op validateAttachmentAdd (zoals decimal-helper.spec.ts)
└── content-attachments.spec.ts     # NIEUW — E2E met login-skip-guards: upload, weigeringen, verwijderen
```

**Structure Decision**: Single-project layout (bestaand). Nieuwe componenten in de (door 023 aangemaakte) `content`-domeinmap; pure logica in `src/lib/content/`; mutaties als server actions in het domeinbestand `src/actions/content.ts`; migratie volgt de bestaande nummering (022 = content-kalender, 023 = bijlagen); unit- en E2E-tests volgen de bestaande Playwright-conventies.

## Implementation Phases

### Phase 1 — Migratie `supabase/migrations/023_content_attachments.sql` (idempotent)

Volgens [data-model.md](./data-model.md); toepassen via Supabase MCP, daarna `npm run types:update`:

1. Private bucket `content-media`: `insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values (..., false, 20971520, array['image/jpeg','image/png','application/pdf']) on conflict (id) do nothing`
2. Vier policies op `storage.objects` voor `authenticated`: `bucket_id = 'content-media' and (storage.foldername(name))[1] = auth.uid()::text` — select (USING), insert (WITH CHECK), update (USING + WITH CHECK), delete (USING); elke policy voorafgegaan door `drop policy if exists`
3. Tabel `kk_content_attachments`: id, user_id (→ auth.users on delete cascade), post_id (→ kk_content_posts on delete cascade), storage_path, file_name, mime_type (CHECK in de drie types), size_bytes (CHECK > 0 en ≤ 20971520), position (default 0), created_at; index op (post_id, position); `enable row level security`
4. Vier RLS-policies op de tabel (select/insert/update/delete, `user_id = auth.uid()` — patroon uit 007_hours_tracking.sql)

### Phase 2 — Pure validatie `src/lib/content/attachments.ts`

Constanten (`MAX_FILE_BYTES = 20 * 1024 * 1024`, `MAX_IMAGES = 20`, `ALLOWED_MIME_TYPES`) en twee pure functies, client- én server-side aanroepbaar:

1. `validateAttachmentAdd(existing, file)` — type/grootte/óf-regel; retourneert `{ ok: true }` of `{ ok: false, error }` met Nederlandse uitleg (exacte teksten in [contracts/attachments.md](./contracts/attachments.md))
2. `buildStoragePath(userId, postId, fileName)` — `{userId}/{postId}/{uuid}-{fileName}`

### Phase 3 — Server actions `src/actions/content.ts` (uitbreiding)

Volgens [contracts/attachments.md](./contracts/attachments.md); alle via `getAuthenticatedClient()`:

1. `registerAttachment({ postId, storagePath, fileName, mimeType, sizeBytes })` — server-side hervalidatie via `validateAttachmentAdd`, insert op append-positie (`MAX(position) + 1`, bij leeg 0); mislukt de insert, dan `storage.remove([storagePath])` (compensatie) en `{ success: false }`
2. `deleteAttachment(attachmentId)` — eerst `storage.remove([storage_path])`, daarna de rij verwijderen; object-fout → afbreken zonder wijziging (herstelbaar door opnieuw te proberen); rij-fout → fout terug (rij verdwijnt uiterlijk mee via post-cascade)
3. `reorderAttachments(postId, orderedIds)` — ownership-check (alle ids behoren bij postId van deze gebruiker), één `.upsert(orderedIds.map((id, position) => ({ id, position })), { onConflict: 'id' })`
4. `deletePost` uitbreiding — vóór de bestaande verwijderflow: alle objecten onder `{user_id}/{post_id}/` via `storage.list` ophalen en met `storage.remove` verwijderen (dekt ook weesobjecten); bij storage-fout: post NIET verwijderen en fout tonen (hardt FR-007/SC-003 af); FK-cascade ruimt daarna de rijen

### Phase 4 — Querylaag `src/lib/content/queries.ts` (uitbreiding)

1. `getAttachmentsWithUrls(postId)` — rijen op `post_id` gesorteerd op `position`, daarna één batch `createSignedUrls(paths, 3600)` (1 uur); retourneert `AttachmentWithUrl[]` (id, file_name, mime_type, size_bytes, position, url)
2. Kalender/ideeënbak-query: posts-select uitbreiden met `kk_content_attachments(count)` → `attachment_count` per post (één embedded aggregatie, geen N+1)

### Phase 5 — UI

1. **`AttachmentsSection.tsx` (nieuw)** — sectie "Bijlagen" in de editor: uploadknop (accept `.jpg,.jpeg,.png,.pdf`, multiple) + drag-neerzet-zone; per bestand eerst `validateAttachmentAdd` (weigering vóór versturen, toast met uitleg), dan upload via bestaande browser-client (`createClient()` uit `src/lib/supabase/client.ts`) naar `buildStoragePath`, spinner per bestand, daarna `registerAttachment`; afbeeldingen als thumbnail-grid (signed url), PDF als bestandsnaam met FileText-icoon; download-knop (signed url + `download=<file_name>`-parameter), verwijder-knop met in-app bevestiging; volgorde via `SortableContext` (rectSortingStrategy) — `onDragEnd` optimistisch herordenen + `reorderAttachments`, bij fout rollback + toast (conform 023-sleepconventie); lege staat toont de regels als hulptekst
2. **`PostEditorDialog.tsx` (wijziging)** — sectie renderen onder de posttekst-zone, aangevoerd met `getAttachmentsWithUrls`; editor blijft bruikbaar tijdens uploads (asynchroon, geen blokkade)
3. **`PostChip.tsx` (wijziging)** — klein Paperclip-icoon + aantal bij `attachment_count > 0` (kalender én ideeënbak)

### Phase 6 — Tests

1. **`tests/e2e/attachment-validation.spec.ts` (nieuw, unit-patroon)** — `validateAttachmentAdd`: geldige types; te groot (20 MB + 1 byte); verkeerd type (GIF/WEBP); 21e afbeelding geweigerd; exact 20 afbeeldingen toegestaan; tweede PDF geweigerd; PDF bij afbeeldingspost geweigerd; afbeelding bij PDF-post geweigerd
2. **`tests/e2e/content-attachments.spec.ts` (nieuw, E2E met login-skip-guards)** — upload twee PNG's → twee thumbnails in volgorde (SC-001/US1-scenario 1, mutatie zichtbaar in UI); PDF bij afbeeldingspost → foutmelding zichtbaar en géén extra bijlage (US1-scenario 2); 25 MB-bestand via `setInputFiles`-buffer → geweigerd vóór upload (US1-scenario 3); verwijderen met bevestiging → thumbnail weg (US1/FR-006)
3. Regressieregels (AGENTS.md): mutaties UI-verifieerbaar, data-correctheid, skip-guards; bestaande suite blijft groen

### Phase 7 — After-feature checks (conform AGENTS.md)

- `tsc --noEmit` + `npx eslint src/ --max-warnings 0`
- `@feature-tracker` → FEATURES.md
- Playwright regressiesuite volledig groen
- Fitness-check: scripts + F-01 (RLS tabel) en F-10 (bucket-policies) via Supabase MCP; schrijf FITNESS.md

## Risk Analysis

| Risico | Impact | Mitigatie |
|--------|--------|-----------|
| 023 is nog niet geïmplementeerd | Plan refereert aan bestanden/tabellen die nog niet bestaan | Expliciete prerequisite; fasen 3-6 zijn uitvoerbaar zodra 023 geland is; migratie (fase 1) vereist `kk_content_posts` en kan pas ná de 023-migratie |
| Upload via server action faalt op Netlify-limiet (~6 MB) | PDF's/afbeeldingen >6 MB onbruikbaar | Uploads gaan rechtstreeks vanuit de browser naar Storage; server action registreert alleen metadata (kleine payload) |
| `createSignedUrls` context | Private bucket vereist RLS-scoped toegang | Gedeelde fetcher in `queries.ts` (uren-patroon): server bij SSR-prefetch, browser-client na hydratie; foldername-policy geeft de eigen map vrij; één batch-call per post |
| Registratie mislukt ná geslaagde upload | Weesobject in Storage | Compensatie in `registerAttachment`: object direct weer `remove`-en; `deletePost`-cleanup dekt restanten onder het prefix |
| Post-verwijdering met onbereikbare storage | Bestanden blijven achter (FR-007/SC-003 schade) | `deletePost` verwijdert eerst álle objecten; bij storage-fout wordt de post niet verwijderd (fout zichtbaar, herstelbaar) |
| Grote bestanden trager upload | Editor lijkt vast te staan | Per-bestand spinner; uploads asynchroon; editor blijft bewerkbaar |
| Twee tabs gelijktijdig (volgorde/upload) | Laatste schrijfactie wint; positie-gat mogelijk | Bestaande race-conventie (spec edge case); append-positie `MAX+1` voorkomt duplicaat-posities |
| Migratie opnieuw draaien | Dubbele policies/bucket | Migratie idempotent: `on conflict do nothing`, `drop policy if exists`, `if not exists` |
| Bucket-limit wordt genegeerd (oudere Storage-versies) | Te grote bestanden komen door | Dubbele afzekering: `size_bytes`-CHECK in de tabel + `validateAttachmentAdd` vóór upload |

## Out of Scope

- Video-upload, bewerken/croppen van afbeeldingen, automatisch PDF's genereren, openbare deellinks (uit de opdracht)
- Thumbnails/resizing-server-side (Edge Function); de editor toont de originele bestanden via signed URL's
- Bijlagen bij andere entiteiten dan posts (contentsoorten, notities)
- Opschoning van losse bestanden zonder post (job/scheduled task); restanten worden gedekt door de `deletePost`-cleanup
- Externe CDN of multipart uploads; standaard `storage.upload` volstaat bij ≤20 MB