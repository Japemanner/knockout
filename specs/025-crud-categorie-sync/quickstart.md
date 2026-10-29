# Quickstart: 025-crud-categorie-sync

**Feature**: 025-crud-categorie-sync | **Datum**: 2026-10-29

## Voorwaarden

1. Migratie `supabase/migrations/024_crud_categories.sql` is toegepast via de Supabase MCP; geverifieerd: RLS actief op `kk_crud_categories` met vier policies (F-01) en `category_id` bestaat op `kk_crud_overviews`.
2. `npm run types:update` is gedraaid (of de types zijn handmatig toegevoegd conform de 023-tussenoplossing).
3. `npm run dev` draait; er is minstens één CRUD overzicht op een bestaande `kk_`-tabel.

## US1 — Categorieën aanmaken en tonen

1. Open `/crud` → de tab "Alle" is zichtbaar. Klik "+" → maak "Klanten" aan → de tab verschijnt in dezelfde horizontale rij.
2. Selecteer "Klanten" → klik "Nieuwe CRUD" → het dialoog heeft "Klanten" vooringevuld bij Categorie. Maak aan → het overzicht staat onder "Klanten"; "Alle" toont alles.
3. Maak ~15 categorieën aan → de tabrij blijft één regel en is horizontaal scrollbaar (geen verticale stapeling).
4. Een lege categorienaam wordt geweigerd met een melding.

## US2 — Hernoemen en beheren

1. Hernoem "Klanten" naar "Relaties" → de tab toont direct "Relaties"; herlaad de pagina → de naam is behouden.
2. Verplaats het overzicht via het kaartmenu naar "Geen categorie" → het verdwijnt uit "Relaties" en is zichtbaar onder "Alle".
3. Verwijder "Relaties" (bevestiging noemt: overzichten blijven bestaan) → de tab verdwijnt, de overzichten blijven ongecategoriseerd onder "Alle".

## US3 — Supabase-sync

1. Voeg in Supabase een kolom `opmerking text` toe aan de tabel van een bestaand overzicht. Open het overzicht → klik "Synchroniseren" → toast *"Structuur bijgewerkt (1 toegevoegd, 0 verwijderd)"*; de nieuwe kolom is direct zichtbaar; verborgen kolommen, volgorde en filters zijn ongewijzigd.
2. Verwijder de kolom weer in Supabase → klik "Synchroniseren" → de kolom verdwijnt zonder foutmelding; een eventuele filter/verborgen-verwijzing is opgeruimd (controleer de kolom-zichtbaarheid-dialoog).
3. Wijzig een kolomtype (bijv. `text` → `numeric`) → synchroniseren → het filter op die kolom werkt voortaan op getal.
4. Klik "Synchroniseren" zonder wijzigingen → toast *"Structuur is actueel"* (geen fout).
5. Hernoem/verwijder de tabel in Supabase → synchroniseren → duidelijke foutmelding; het overzicht en de instellingen zijn ongewijzigd behouden.

## Checks na afronding

- `npx tsc --noEmit` groen; `npx eslint src/ --max-warnings 0` groen.
- Playwright: `tests/e2e/crud-categorieen.spec.ts` en `tests/e2e/crud-schema-sync-logic.spec.ts` groen (login-skip-guards); bestaande suite groen.
- F-01 via Supabase MCP (RLS op `kk_crud_categories`); F-10 N/A (geen storage).
- FEATURES.md bijgewerkt (`@feature-tracker`); FITNESS.md bijgewerkt (`@fitness-checker`).