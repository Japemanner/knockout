# Quickstart: Bijlagen bij een post

**Feature**: 024-post-bijlagen | **Date**: 2026-10-14

## Prerequisite

1. Feature 023 (content-kalender) is geïmplementeerd: posts, editor (`PostEditorDialog.tsx`), postchip (`PostChip.tsx`), `src/actions/content.ts` en `src/lib/content/queries.ts` bestaan; de 023-migratie (met `kk_content_posts`) is toegepast.
2. Migratie `supabase/migrations/023_content_attachments.sql` is toegepast (via Supabase MCP) en `npm run types:update` is gedraaid (`kk_content_attachments`-types gegenereerd).

## Verificatie van de feature

1. Start de dev-server (`npm run dev`) en log in
2. Open **Content** in de linkerbalk en klik op een post; de editor toont de sectie **"Bijlagen"** met de hulptekst "Max 20 afbeeldingen óf 1 PDF · max 20 MB per bestand"
3. Upload twee PNG's (via de knop of slepen-neerzetten):
   - Er verschijnen twee **thumbnails in uploadvolgorde** (acceptiescenario US1-1)
   - Herlaad de editor: volgorde en thumbnails ongewijzigd
4. Upload een bestand van 25 MB (bijv. een grote buffer via de dev-tools of een testbestand):
   - Weigering direct zichtbaar met uitleg "Dit bestand is groter dan 20 MB." — er is niets geüpload (US1-3)
5. Upload een PDF bij de post met afbeeldingen:
   - Weigering met uitleg "Een post heeft óf afbeeldingen, óf één PDF — niet beide." (US1-2)
6. Verwijder een post zonder bijlagen → probeer daarna één PDF op een verse post:
   - De PDF toont als bestandsnaam met icoon; er is geen paperclip-verwarring (chip toont pas bij count > 0)
7. Sleep in de editor de derde afbeelding naar de eerste plek:
   - De volgorde direct aangepast en na herladen ongewijzigd (US2-1)
8. Klik de download-knop van een bijlage: het bestand downloadt met de originele bestandsnaam
9. Verwijder één bijlage: eerst de bevestiging, daarna is de thumbnail weg
10. Kijk in de kalender: posts met bijlagen tonen het **paperclip-icoon met aantal** (US2-2/US2-3); de ideeënbak-chip toont hetzelfde
11. Verwijder een post mét bijlagen (na bevestiging):
    - Controleer via Supabase (dashboard of MCP) dat de map `{user_id}/{post_id}/` in de bucket `content-media` leeg/verwijderd is en de rijen uit `kk_content_attachments` weg zijn (US1-4/SC-003)

## Wat is er gewijzigd

- `supabase/migrations/023_content_attachments.sql` — bucket `content-media` (private, 20 MB, jpeg/png/pdf), vier storage-policies, tabel `kk_content_attachments` met RLS + vier policies
- `src/lib/content/attachments.ts` — nieuw: `validateAttachmentAdd`, `buildStoragePath`, constanten
- `src/actions/content.ts` — `registerAttachment`, `deleteAttachment`, `reorderAttachments`; `deletePost` ruimt eerst storage op
- `src/lib/content/queries.ts` — `getAttachmentsWithUrls` (batch signed urls); `attachment_count` in de posts-query
- `src/components/content/AttachmentsSection.tsx` — nieuw: upload, thumbnails/PDF-regels, download, verwijderen, drag-volgorde
- `src/components/content/PostEditorDialog.tsx` — sectie "Bijlagen" geïntegreerd
- `src/components/content/PostChip.tsx` — paperclip-icoon met aantal
- `src/types/database.types.ts` — gegenereerd bijgewerkt
- `tests/e2e/attachment-validation.spec.ts` + `tests/e2e/content-attachments.spec.ts` — unit- en E2E-dekking

## Wat is er NIET gewijzigd

- Geen bestaande tabellen aangepast; alleen FK-cascade vanaf `kk_content_attachments`
- Posttekst-, status- en slotlogica van 023 ongewijzigd
- Geen nieuwe packages (dnd-kit/sortable was al aanwezig)
- Geen openbare bucket-toegang: weergave uitsluitend via signed URL's (1 uur)

## Sanity checks na implementatie

- `tsc --noEmit` — compileert zonder errors
- `npx eslint src/ --max-warnings 0` — geen lint-warnings
- Playwright: `attachment-validation.spec.ts` en `content-attachments.spec.ts` groen (of geskipt zonder login); volledige regressionsuite groen
- Fitness-check via Supabase MCP: RLS actief op `kk_content_attachments` (F-01) en bucket-policies aanwezig op `content-media` (F-10)