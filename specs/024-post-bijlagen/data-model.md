# Data Model: Bijlagen bij een post

**Feature**: 024-post-bijlagen | **Date**: 2026-10-14

## Overzicht

De feature voegt toe: (1) één nieuwe tabel `kk_content_attachments` (metadata, RLS, FK-cascade naar posts), (2) één nieuwe private Storage-bucket `content-media` met policies op `storage.objects`, en (3) een vaste padconventie. Bestanden zelf staan in Storage; de tabel is de bron van waarheid voor volgorde, naam en type.

## Nieuwe entiteit: kk_content_attachments

| Kolom | Type | Regels | Rol in deze feature |
|-------|------|--------|---------------------|
| id | uuid pk default gen_random_uuid() | — | Identificator in UI (drag, download, verwijderen) |
| user_id | uuid not null | references auth.users(id) on delete cascade | Eigenaar; RLS-scope (vier policies) |
| post_id | uuid not null | references kk_content_posts(id) on delete cascade | Koppeling aan de post; cascade ruimt de rijen bij post-verwijdering |
| storage_path | text not null | pad in bucket `content-media` | Uploadpad/downloadpad/signed url; padconventie `{user_id}/{post_id}/{uuid}-{file_name}` |
| file_name | text not null | originele naam | Weergave (PDF-regel), download-bestandsnaam |
| mime_type | text not null | CHECK in ('image/jpeg','image/png','application/pdf') | Weergavevorm (thumbnail vs PDF-regel) + óf-regel |
| size_bytes | int not null | CHECK (> 0 and <= 20971520) | 20 MB-grens server-side afgedwongen |
| position | int not null default 0 | append: MAX+1; 0..19 bij afbeeldingen | Volgorde van afbeeldingen (LinkedIn-uploadvolgorde) |
| created_at | timestamptz not null default now() | — | Audit |

- Index: `(post_id, position)` — bijlagen per post in volgorde ophalen.
- RLS: enabled + vier policies (select/insert/update/delete) op `user_id = auth.uid()` — zelfde patroon als `kk_clients`/`kk_hour_entries` in migratie 007.
- `updated_at`/trigger niet nodig: rijen zijn onveranderlijk behalve `position`; geen semantiek die een wijzigingstijd vereist.

## Storage: bucket content-media

```sql
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('content-media', 'content-media', false, 20971520,
        array['image/jpeg','image/png','application/pdf'])
on conflict (id) do nothing;
```

Vier policies op `storage.objects` (elk vooraf `drop policy if exists`, `to authenticated`):

| Operatie | Voorwaarde |
|----------|------------|
| select | USING (bucket_id = 'content-media' and (storage.foldername(name))[1] = auth.uid()::text) |
| insert | WITH CHECK (zelfde conditie) |
| update | USING + WITH CHECK (zelfde conditie) |
| delete | USING (zelfde conditie) |

Belangrijk (uit Supabase-documentatie): Storage doet na een upload `INSERT ... RETURNING *`; zonder select-policy faalt de upload met 403. De vier policies horen dus altijd samen.

## Padconventie

```text
{user_id}/{post_id}/{uuid}-{file_name}
```

- Map 1 = `user_id` → foldername-policy scoping.
- Map 2 = `post_id` → `deletePost`-cleanup ruimt per prefix (`storage.list('{user_id}/{post_id}/')` + `remove`), ook als er weesobjecten zouden zijn.
- `{uuid}-` prefix → gelijknamige bestanden botsen nooit; de originele `file_name` blijft in de tabel voor weergave en download.

## Óf-regel (invariant)

| Bestaande bijlagen | Nieuw bestand | Toegestaan? |
|--------------------|---------------|-------------|
| afbeeldingen (< 20) | afbeelding | Ja, tot exact 20 |
| afbeeldingen (20) | afbeelding | Nee — "Maximaal 20 afbeeldingen per post." |
| afbeeldingen (≥ 1) | PDF | Nee — óf-regel-uitleg |
| 1 PDF | afbeelding | Nee — óf-regel-uitleg |
| 1 PDF | PDF | Nee — "Maximaal één PDF per post." |
| — | PDF | Ja (post heeft dan precies één PDF) |

Deze regel zit in `validateAttachmentAdd` (client + server) en wordt niet afgedwongen door een DB-constraint — de tabel is per rij onschuldig; de combinatie-regel is domeinlogica die bij acties hoort, niet bij opslagvorm (een aparte unique-constraint kan "één PDF óf N afbeeldingen" niet uitdrukken).

## Query-vormen

### Bijlagen van een post (server, editor)

```text
kk_content_attachments
  .select(id, storage_path, file_name, mime_type, size_bytes, position, created_at)
  .eq('post_id', postId)
  .order('position')
```

Daarna: één batch `storage.from('content-media').createSignedUrls(paths, 3600)` → `AttachmentWithUrl[]` (url per rij; `signedUrl` uit de response per path).

### Aantal bijlagen per post (server, kalender + ideeënbak)

Uitbreiding op de bestaande posts-query uit 023:

```text
kk_content_posts
  .select(id, ..., kk_content_attachments(count))
  <filters en sortering conform 023-onderdeel>
```

Levert per post `kk_content_attachments: [{ count: n }]` → `attachment_count` op de PostChip. Eén embedded aggregatie; geen extra round-trip per post.

## State transitions (bijlage)

```text
[geen rij, geen object] --upload (browser-client, validateAttachmentAdd eerst)--> [object in Storage]
[object in Storage] --registerAttachment (server action, hervalidatie + insert)--> [rij + object]
  insert mislukt: storage.remove(object) --> [geen rij, geen object] (compensatie)
[rij + object] --deleteAttachment--> [geen rij, geen object]
  object-fout: niets gewijzigd (herstelbaar); rij-fout na geslaagde remove: rij blijft tot post-cascade
[rij + object] --reorderAttachments--> [rij met nieuwe position] (object ongewijzigd)
[post met rijen + objecten] --deletePost--> [geen objecten (list+remove per prefix), geen post]
  storage-fout: post niet verwijderd (fout zichtbaar, herstelbaar)
```

## Validatieregels

- Mime-type ∈ {'image/jpeg','image/png','application/pdf'} — client + server (`validateAttachmentAdd`) en DB-CHECK.
- size_bytes ≤ 20.971.520 — client + server en DB-CHECK; bucket-limit als extra afzekering.
- Óf-regel — client + server (`validateAttachmentAdd`), met Nederlandse uitleg bij elke weigering.
- Storagepad begint altijd met `{user_id}/` — afgedwongen door foldername-policies; upload buiten de eigen map is onmogelijk.
- `reorderAttachments`: alle aangeleverde ids moeten aan de post van de ingelogde gebruiker behoren (action-check + RLS).

## Database-impact

- **Nieuwe tabellen**: 1 (`kk_content_attachments`)
- **Nieuwe kolommen op bestaande tabellen**: geen
- **Nieuwe migraties**: 1 — `supabase/migrations/023_content_attachments.sql` (idempotent; vereist `kk_content_posts` uit de 023-migratie, dus ná die migratie toepassen)
- **RLS-wijzigingen**: 4 nieuwe policies op `kk_content_attachments`, 4 nieuwe policies op `storage.objects` (bucket `content-media`)
- **Nieuwe RPC's**: geen
- **Bucket**: `content-media` (private, 20 MB, jpeg/png/pdf)