# Tasks: Bijlagen bij een post

**Input**: Design documents from `/specs/024-post-bijlagen/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/attachments.md, quickstart.md

**Tests**: Inbegrepen — de opdracht vraagt expliciet unit-tests op `validateAttachmentAdd` en E2E met login-skip-guards (plan fase 6).

**Organization**: Taken gegroepeerd per user story (US1 uploaden/beheren P1, US2 volgorde/kalender-signalering P2), uitvoerbaar zodra de prerequisite (feature 023 geïmplementeerd) is vervuld.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Kan parallel (andere bestanden, geen afhankelijkheden van onvoltooide taken)
- **[Story]**: User story uit spec.md (US1, US2)
- Bestandspaden staan in elke taak

## Path Conventions

Single project: `src/`, `tests/`, `supabase/migrations/` op repository-root (zie plan.md Project Structure).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prerequisite-check en het migratie-artefact aanmaken

- [ ] T001 Verifieer prerequisite: feature 023 is geland — `kk_content_posts` bestaat (Supabase MCP) en `src/components/content/PostEditorDialog.tsx`, `src/components/content/PostChip.tsx`, `src/actions/content.ts` (incl. `deletePost`), `src/lib/content/queries.ts` zijn aanwezig; bij ontbreken: stoppen en eerst 023 implementeren
- [ ] T002 [P] Schrijf de idempotente migratie `supabase/migrations/023_content_attachments.sql` volgens [data-model.md](./data-model.md): bucket `content-media` (private, file_size_limit 20971520, mime-types jpeg/png/pdf, `on conflict do nothing`), vier `storage.objects`-policies (select/insert/update/delete, `bucket_id = 'content-media' and (storage.foldername(name))[1] = auth.uid()::text`, elk vooraf `drop policy if exists`), tabel `kk_content_attachments` (FK `post_id → kk_content_posts on delete cascade`, CHECKs op mime_type en size_bytes, index `(post_id, position)`), RLS + vier policies volgens het 007-patroon

**Checkpoint**: Migratiebestand staat klaar; nog niet toegepast.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Schema en types live — blokkeert alle user-story-werk

**⚠️ CRITICAL**: Geen user-story-werk vóór afronding van deze fase

- [ ] T003 Pas de migratie toe via de Supabase MCP (na de 023-migratie) en verifieer direct: RLS actief op `kk_content_attachments` (F-01), vier tabel-policies aanwezig, bucket `content-media` bestaat met juiste limits en vier bucket-policies (F-10)
- [ ] T004 Draai `npm run types:update` en exporteer de `kk_content_attachments`-types (Row/Insert) uit `src/types/database.types.ts` zodat domein-types (`Attachment`, `AttachmentInsert`) herbruikbaar zijn

**Checkpoint**: Database + types klaar — US1 kan beginnen.

---

## Phase 3: User Story 1 - Bijlagen uploaden en beheren (Priority: P1) 🎯 MVP

**Goal**: Sectie "Bijlagen" in de editor: upload JPG/PNG/PDF (max 20 MB), óf-regel, thumbnails/PDF-weergave, download, verwijderen met bevestiging, cleanup bij post-verwijdering, privé via RLS.

**Independent Test**: Post openen, twee PNG's uploaden (twee thumbnails in volgorde), PDF bij afbeeldingspost weigeren met uitleg, 25 MB-bestand weigeren vóór versturen, post verwijderen en via Supabase verifiëren dat bestanden én rijen weg zijn (spec US1-scenario's 1 t/m 5).

### Tests for User Story 1 (write first — RED vóór implementatie)

- [ ] T005 [P] [US1] Schrijf unit-tests op `validateAttachmentAdd` in `tests/e2e/attachment-validation.spec.ts` volgens het decimal-helper-patroon (pure imports, geen page): geldige types/afmetingen; te groot (20 MB + 1 byte); verkeerd type (GIF/WEBP); 21e afbeelding geweigerd; exact 20 toegestaan; tweede PDF geweigerd; PDF bij afbeeldingspost en omgekeerd geweigerd — met de exacte foutmeldingen uit [contracts/attachments.md](./contracts/attachments.md) — en controleer dat ze faLEN (module bestaat nog niet)

### Implementation for User Story 1

- [ ] T006 [US1] Maak `src/lib/content/attachments.ts`: constanten (`MAX_FILE_BYTES`, `MAX_IMAGES`, `ALLOWED_MIME_TYPES`), `validateAttachmentAdd` en `buildStoragePath` exact volgens het contract — maakt T005 groen (depends on T005)
- [ ] T007 [US1] Breid `src/actions/content.ts` uit met `registerAttachment` (server-side hervalidatie via T006, pad-check onder `{userId}/{postId}/`, append-positie `MAX(position) + 1`, compensatie `storage.remove` bij mislukte insert) en `deleteAttachment` (eerst object `remove`, dan rij; object-fout = niets gewijzigd) volgens het action-contract (depends on T004, T006)
- [ ] T008 [US1] Breid `deletePost` in `src/actions/content.ts` uit: eerst `storage.from('content-media').list('{userId}/{postId}/')` + `storage.remove(paths)` (skip bij lege lijst); bij storage-fout post NIET verwijderen en fout teruggeven; FK-cascade ruimt daarna de rijen (depends on T007, zelfde bestand)
- [ ] T009 [P] [US1] Breid `src/lib/content/queries.ts` uit met `getAttachmentsWithUrls(postId)`: rijen op `post_id` gesorteerd op `position`, daarna één batch `createSignedUrls(paths, 3600)`; type `AttachmentWithUrl` zoals in het contract; lege lijst = geen signed-urls-call (depends on T004)
- [ ] T010 [US1] Maak `src/components/content/AttachmentsSection.tsx`: sectie "Bijlagen" met uploadknop (`accept=".jpg,.jpeg,.png,.pdf"`, multiple) + drag-neerzet-zone, per bestand eerst `validateAttachmentAdd` (weigering vóór versturen + toast), upload via bestaande browser-client (`createClient()` uit `src/lib/supabase/client.ts`) naar `buildStoragePath`, spinner per bestand, daarna `registerAttachment`; thumbnail-grid voor afbeeldingen, FileText-regel met bestandsnaam + formaat voor PDF; download-knop (signed url + `download={file_name}`), verwijder-knop met in-app bevestiging → `deleteAttachment`; lege staat met hulptekst (depends on T006, T007, T009)
- [ ] T011 [US1] Integreer de sectie in `src/components/content/PostEditorDialog.tsx`: render `AttachmentsSection` onder de posttekst-zone, aangevoerd door `getAttachmentsWithUrls`; editor blijft bewerkbaar tijdens uploads (depends on T010)
- [ ] T012 [US1] Schrijf E2E-tests in `tests/e2e/content-attachments.spec.ts` met login-skip-guards (`if (page.url().includes('/login'))`): upload twee PNG's → twee thumbnails in volgorde (mutatie zichtbaar); PDF bij afbeeldingspost → foutmelding zichtbaar én géén extra bijlage; 25 MB via `setInputFiles`-buffer → geweigerd vóór upload; verwijderen met bevestiging → thumbnail weg (depends on T011)

**Checkpoint**: US1 volledig functioneel en onafhankelijk testbaar (quickstart.md stappen 2-6, 8-11).

---

## Phase 4: User Story 2 - Volgorde en kalender-signalering (Priority: P2)

**Goal**: Volgorde van afbeeldingen slepen (persisted) en paperclip-icoon met aantal op de postchip in kalender en ideeënbak.

**Independent Test**: Post met drie afbeeldingen openen, derde naar eerste plek slepen — volgorde direct en na herladen ongewijzigd; kalender toont paperclip + aantal bij posts mét bijlagen en géén icoon zonder (spec US2-scenario's 1 t/m 3).

### Implementation for User Story 2

- [ ] T013 [US2] Voeg `reorderAttachments(postId, orderedIds)` toe aan `src/actions/content.ts`: ownership-check (id-set exact gelijk aan de bijlagen van de post), één `.upsert(... { onConflict: 'id' })`, client-side React Query invalidatie (conform uren-besluit) (depends on T007, zelfde bestand)
- [ ] T014 [US2] Voeg drag-volgorde toe aan `src/components/content/AttachmentsSection.tsx`: `SortableContext` met `rectSortingStrategy` (@dnd-kit/sortable 8.0.0, bestaande dependency), `onDragEnd` → optimistisch herordenen + `reorderAttachments`, bij fout rollback + destructive toast (conform 023-sleepconventie); drag alleen bij afbeeldingen (depends on T010, T013)
- [ ] T015 [P] [US2] Breid de posts-query voor kalender en ideeënbak uit in `src/lib/content/queries.ts` met `kk_content_attachments(count)` → `attachment_count` per post, één embedded aggregatie (depends on T004)
- [ ] T016 [P] [US2] Voeg het paperclip-icoon toe aan `src/components/content/PostChip.tsx`: prop `attachmentCount`, klein `Paperclip`-icoon (lucide-react) + aantal bij `> 0`, geen render bij 0 (geen layout-shift), geldig in dagcellen, ideeënbak en mobiele daglijst (depends on T015 voor de prop-vorm)
- [ ] T017 [US2] Breid `tests/e2e/content-attachments.spec.ts` uit met US2-dekking: sleep derde afbeelding naar eerste plek → volgorde na herladen ongewijzigd (persistente mutatie); paperclip + "2" zichtbaar op de chip; post zonder bijlagen zonder icoon (depends on T014, T016)

**Checkpoint**: US1 én US2 beide onafhankelijk werkend en getest.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: After-feature checks conform AGENTS.md

- [ ] T018 Draai `tsc --noEmit` en `npx eslint src/ --max-warnings 0` — beide schoon
- [ ] T019 Draai de volledige Playwright-regressiesuite — groen (of geskipt zonder login); nieuwe specs meenemen
- [ ] T020 Werk FEATURES.md bij via `@feature-tracker` (bijlagen-sectie, óf-regel, paperclip, cleanup)
- [ ] T021 Draai de fitness-check: `bash scripts/fitness-check.sh`, daarna F-01 (RLS `kk_content_attachments`) en F-10 (bucket-policies `content-media`) via Supabase MCP; schrijf FITNESS.md
- [ ] T022 Valideer de volledige quickstart.md-route handmatig in de browser (stappen 2 t/m 11), inclusief opslag-controle na post-verwijdering via Supabase

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: geen afhankelijkheden — T001 eerst, T002 kan parallel
- **Foundational (Phase 2)**: T003 vereist T002 en de 023-migratie; T004 vereist T003 — **blokkeert alle user stories**
- **US1 (Phase 3)**: vereist Foundational volledig
- **US2 (Phase 4)**: vereist US1 (AttachmentsSection, register, tabel); bouwt op dezelfde bestanden voort
- **Polish (Phase 5)**: vereist US1 + US2 volledig

### User Story Dependencies

- **US1 (P1)**: na Phase 2 — geen dependency op andere stories
- **US2 (P2)**: na US1 (zelfde component/bestanden; onafhankelijk testbaar dankzij aparte acties en props)

### Within Each User Story

- Tests vóór implementatie (unit: T005 → T006 rood-groen; E2E: T012 na UI-integratie)
- Pure logica → server actions → queries → UI → integratie → E2E
- Zelfde bestand (content.ts: T007→T008→T013; AttachmentsSection.tsx: T010→T014) = sequentieel

### Parallel Opportunities

- T002 los van T001
- T005 (testbestand) parallel met T007/T009 (andere bestanden)
- T009 (queries.ts) parallel met T007/T008 (content.ts)
- T015 (queries.ts) parallel met T013 (content.ts) en T016 (PostChip.tsx)

---

## Parallel Example: User Story 1

```text
# Na Phase 2 (parallel, verschillende bestanden):
Task T005: unit-tests in tests/e2e/attachment-validation.spec.ts
Task T007: registerAttachment/deleteAttachment in src/actions/content.ts
Task T009: getAttachmentsWithUrls in src/lib/content/queries.ts

# Daarna sequentieel (afhankelijkheden):
T006 → T008 → T010 → T011 → T012
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 + Phase 2 af → database live
2. Phase 3 (US1) af → **MVP: uploaden, weigeren, downloaden, verwijderen, cleanup**
3. Stop en valideer onafhankelijk (quickstart.md stappen 2-6, 8-11)

### Incremental Delivery

4. Phase 4 (US2) erbij → volgorde-slepen + kalender-signalering; opnieuw valideren
5. Phase 5 afronden (checks, FEATURES.md, FITNESS.md) → commit per logische groep met conventional message

---

## Notes

- [P] = andere bestanden, geen afhankelijkheid van onvolgende taken
- [Story]-labels mappen 1-op-1 op spec.md (FR-001 t/m FR-008 → US1; FR-009/FR-010 → US2)
- Unit-test T005 moet rood zijn vóór T006 (module bestaat nog niet); E2E T012/T017 draaien groen na implementatie
- Regressieregels AGENTS.md: elke mutatie UI-verifieerbaar; login-skip-guards overal; data-correctheid tegen verwachte waarden
- Commit na elke taak of logische groep (conventies uit AGENTS.md); hook-fouten niet bypassen