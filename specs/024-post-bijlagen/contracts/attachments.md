# Contract: Bijlagen — validatiefunctie, server actions, query's en UI

**Feature**: 024-post-bijlagen | **Date**: 2026-10-14

---

# Contract: Pure functie validateAttachmentAdd (+ buildStoragePath)

## Locatie

`src/lib/content/attachments.ts` (nieuw). Geen 'use server', geen dependencies buiten types — puur, deterministisch, client- én server-side aanroepbaar.

## Signature

```typescript
export const MAX_FILE_BYTES = 20 * 1024 * 1024        // 20.971.520
export const MAX_IMAGES = 20
export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'application/pdf'] as const

export interface AttachmentRuleInput {
  mime_type: string
}

export interface FileRuleInput {
  type: string    // File.type
  size: number    // File.size
}

export type Validation = { ok: true } | { ok: false; error: string }

export function validateAttachmentAdd(
  existing: AttachmentRuleInput[],
  file: FileRuleInput,
): Validation

export function buildStoragePath(userId: string, postId: string, fileName: string): string
```

## Gedrag (contractregels)

1. `validateAttachmentAdd` toetst in vaste volgorde en stopt bij de eerste weigering:
   - mime niet toegestaan → `{ ok: false, error: 'Alleen JPG, PNG en PDF zijn toegestaan.' }`
   - `size > MAX_FILE_BYTES` → `{ ok: false, error: 'Dit bestand is groter dan 20 MB.' }`
   - file is PDF (`application/pdf`) en `existing` is niet leeg → `{ ok: false, error: 'Een post heeft óf afbeeldingen, óf één PDF — niet beide.' }`
   - file is afbeelding en `existing` bevat een PDF → dezelfde óf-regel-foutmelding
   - file is afbeelding en `existing` bevat al `MAX_IMAGES` afbeeldingen → `{ ok: false, error: 'Maximaal 20 afbeeldingen per post.' }`
   - file is PDF en `existing` bevat al een PDF → `{ ok: false, error: 'Maximaal één PDF per post.' }`
2. `existing` telt alleen afbeeldingen voor de 20-grens; een PDF in `existing` blokkeert elke afbeelding en vice versa (óf-regel).
3. Elke foutmelding legt de regel uit (FR-003/SC-002): de gebruiker leest wát en waarom.
4. `buildStoragePath` retourneert `{userId}/{postId}/{uuid4()}-{fileName}`; bestandsnaam ongewijzigd (spaties/unicode mogen); uuid vooraan zodat gelijknamige uploads niet botsen.

## Pre/post-conditions

| Voorwaarde | Verwachting |
|------------|-------------|
| Pre: aanroep kan zonder Netwerk/browser-API | Geen side effects; zelfde input → zelfde output |
| Post: `{ ok: true }` | Upload én server-hervalidatie zullen het bestand accepteren (zelfde regels, zelfde constanten) |

---

# Contract: Server actions (src/actions/content.ts, uitbreiding)

Alle vier draaien via `getAuthenticatedClient()` (ingelogde gebruiker; RLS geldt). Retourtype conform het bestaande `ActionResult<T>`-patroon uit het domein.

## registerAttachment

```typescript
export async function registerAttachment(input: {
  postId: string
  storagePath: string
  fileName: string
  mimeType: string
  sizeBytes: number
}): Promise<ActionResult<Attachment>>
```

1. Haalt bestaande bijlagen van de post op en draait `validateAttachmentAdd` server-side opnieuw — weigering → `{ success: false, error }` (met compensatie: `storage.remove([storagePath])`, het object was al geüpload).
2. Berekent append-positie: `MAX(position) + 1` (0 bij leeg).
3. Insert de rij; mislukt de insert (ook na geslaagde hervalidatie, bijv. race met ander tabblad) → `storage.remove([storagePath])` en `{ success: false, error }` — nooit een weesobject.
4. `storagePath` moet onder `{userId}/{postId}/` liggen (action-check); afwijkende paden geweigerd.
5. Bij succes: de rij terug; de client invalideert de content React Query-caches (conform uren-besluit `2026-09-22-uren-reads-browser-client.md`; géén `revalidatePath`).

## deleteAttachment

```typescript
export async function deleteAttachment(attachmentId: string): Promise<ActionResult<null>>
```

1. Haalt de bijlage op (RLS: alleen eigen rijen zichtbaar).
2. `storage.remove([storage_path])` eerst; mislukt dit → `{ success: false, error }` zonder dat er iets gewijzigd is (rij blijft, gebruiker kan opnieuw).
3. Daarna de rij verwijderen; mislukt dat → `{ success: false, error }` (object is weg; rij verdwijnt uiterlijk mee via post-cascade en blokkeert niets).

## reorderAttachments

```typescript
export async function reorderAttachments(
  postId: string,
  orderedIds: string[],
): Promise<ActionResult<null>>
```

1. Haalt de bijlagen van de post op en controleert dat `orderedIds` exact de id-reeks van die post is (zelfde verzameling, geen vreemde ids) — anders `{ success: false, error }`.
2. Eén `.upsert(orderedIds.map((id, position) => ({ id, position })), { onConflict: 'id' })` — één round-trip.
3. PDF's zitten nooit in de reeks (geen drag bij één PDF); afwijkende input wordt door de id-set-check afgevangen.
4. Bij succes: client-side React Query invalidatie (geen `revalidatePath`, conform uren-besluit); bij fout: geen mutatie, fout terug (client doet rollback + toast).

## deletePost (bestaande action, uitbreiding)

1. Vóór de bestaande verwijderflow: bijlagen-rijen van de post ophalen en — robuuster — `storage.from('content-media').list('{userId}/{postId}/')` draaien; alle gevonden paden met `storage.remove(paths)` verwijderen (dekt ook weesobjecten; `remove` overslaan als de lijst leeg is).
2. Mislukt list/remove → `{ success: false, error: 'Kon de bijlagen niet verwijderen' }`; de post wordt NIET verwijderd (FR-007/SC-003 hard afgedwongen; situatie is herstelbaar).
3. Daarna de bestaande post-verwijdering; FK-cascade ruimt de `kk_content_attachments`-rijen.

---

# Contract: Querylaag (src/lib/content/queries.ts, uitbreiding)

## getAttachmentsWithUrls

```typescript
export interface AttachmentWithUrl {
  id: string
  file_name: string
  mime_type: string
  size_bytes: number
  position: number
  url: string        // signed url, 1 uur geldig
}

export async function getAttachmentsWithUrls(postId: string): Promise<AttachmentWithUrl[]>
```

- Rijen `.eq('post_id', postId).order('position')`, daarna één batch `createSignedUrls(paths, 3600)`; per rij de `signedUrl` matchend op pad. Gedeelde fetcher conform het uren-patroon: meegegeven client (server bij SSR-prefetch, browser-client na hydratie); RLS-foldername-policy geeft de eigen map vrij onder de ingelogde gebruiker.
- Lege lijst → géén `createSignedUrls`-call.

## attachment_count op posts (kalender + ideeënbak)

- Bestaande posts-query uit 023 uitbreiden met `kk_content_attachments(count)` → per post `attachment_count: number` (0 bij geen bijlagen) in dezelfde round-trip (geen N+1).

---

# Contract: UI-component AttachmentsSection

## Locatie

`src/components/content/AttachmentsSection.tsx` (nieuw). Wordt door `PostEditorDialog.tsx` gerenderd als sectie "Bijlagen".

## Props

```typescript
interface AttachmentsSectionProps {
  postId: string
  attachments: AttachmentWithUrl[]   // initieel uit getAttachmentsWithUrls
  onChange(next: Attachment[]): void // editor-state update; de editor blijft eigenaar van de lijst
}
```

## Gedrag

- Uploadknop (`accept=".jpg,.jpeg,.png,.pdf"`, `multiple`) + drag-neerzet-zone; beide verlopen per bestand door `validateAttachmentAdd` vóór enig verkeer: weigering → toast met de foutmelding, niets verstuurd (SC-002).
- Geldig bestand → upload via de bestaande browser-client (`createClient()` uit `src/lib/supabase/client.ts`) naar `buildStoragePath`, spinner per bestand, daarna `registerAttachment`; bij `success: false` toast en geen lijstmutatie. Meerdere bestanden uploaden sequentieel per bestand (append-volgorde = klikvolgorde).
- Afbeeldingen: thumbnail-grid via signed url. PDF: regel met `FileText`-icoon + `file_name` + formaat-label (KB/MB). Max 20 afbeeldingen maakt het grid scrollbaar; PDF-regel eronder uit.
- Per bijlage: download-knop (signed url + `download={file_name}`-parameter) en verwijder-knop met in-app bevestiging (bestaande dialoogconventie van de editor); na bevestiging `deleteAttachment`, bij succes rij weg (FR-006).
- Volgorde: `SortableContext` (`rectSortingStrategy`, @dnd-kit/sortable 8.0.0) rond het thumbnail-grid; `onDragEnd` → optimistisch herordenen in lokale lijst → `reorderAttachments`; bij fout rollback + destructive toast (conform 023-sleepconventie FR-033).
- Lege staat: hulptekst "Max 20 afbeeldingen óf 1 PDF · max 20 MB per bestand".
- Signed URL's ouder dan de sessie (1 uur) raken pas na herladen/handelingen zichtbaar fout; elke mutatie verversen via server-response voorkomt dode links in de actieve sessie.

## Niet-functionele UI-eisen

- `tsc --noEmit` clean; geen `any` (strict mode).
- Hergebruik shadcn/ui (Button, toast, bevestigingsdialoog) en lucide-react (Paperclip, FileText, Download, Trash2, GripVertical) — geen nieuwe dependencies.
- Editor blijft bewerkbaar tijdens uploads (asynchroon, geen blokkade van opslaan/sluiten-flow van 023; openstaande uploads tonen een teller in de sectiekop).
- Mobiel (<768 px): grid wordt 2-koloms; drag werkt via bestaande touch-sensor-instellingen.

---

# Contract: PostChip-paperclip (src/components/content/PostChip.tsx, wijziging)

- Nieuwe prop `attachmentCount: number` (uit de posts-query; 0 bij geen bijlagen).
- `attachmentCount > 0` → klein `Paperclip`-icoon + aantal naast de statusbadge (zelfde hoogte als de tijd-labels; geen layout-shift bij 0 want dan geen render).
- Toepassing in kalenderdagcellen én ideeënbak (beide renderen de chip); mobiele daglijst erft het mee.
- Geen eigen fetch: het icoon is een pure render van de prop (FR-010).