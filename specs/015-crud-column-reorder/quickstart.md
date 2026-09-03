# Quickstart: CRUD Kolom Volgorde Aanpasbaar

**Date**: 2026-08-29
**Feature**: 015-crud-column-reorder

## Prerequisites

- Supabase project met `kk_crud_overviews` tabel (migratie 003 toegepast)
- `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` geïnstalleerd (al aanwezig)
- Ingelogde gebruiker met minimaal één CRUD-overzicht gekoppeld aan een tabel met ≥2 kolommen

## Verification steps

### 1. Migration uitvoeren

```sql
-- Supabase SQL Editor of MCP
ALTER TABLE kk_crud_overviews
  ADD COLUMN IF NOT EXISTS column_order TEXT[] NOT NULL DEFAULT '{}';
```

Verifieer: `SELECT column_order FROM kk_crud_overviews LIMIT 1;` retourneert `{}`.

### 2. TypeScript compile

```bash
npx tsc --noEmit
```

Verwacht: 0 errors.

### 3. Kolom verslepen (P1 happy path)

1. Open een CRUD-overzicht met meerdere zichtbare kolommen
2. Hover over een kolomkop — cursor wordt `grab` en sleep-handle icoon verschijnt
3. Pak de kolomkop en sleep naar een andere positie
4. Los op
5. Verwacht: kolom staat op nieuwe positie, andere kolommen schuiven mee
6. Herlaad de pagina (F5)
7. Verwacht: nieuwe kolomvolgorde is behouden (SC-002)

### 4. Reset volgorde (P2)

1. Na stap 3 hierboven, klik op "Kolommen" knop
2. Klik op "Reset volgorde" in het dialoog
3. Verwacht: tabel keert terug naar oorspronkelijke volgorde (SC-003)
4. Herlaad de pagina
5. Verwacht: standaardvolgorde is nog steeds actief

### 5. Onafhankelijkheid per overzicht

1. Pas volgorde aan in CRUD-overzicht A
2. Open CRUD-overzicht B
3. Verwacht: overzicht B heeft zijn eigen (onafhankelijke) volgorde

### 6. Nieuwe kolom in DB

1. Voeg een kolom toe aan de onderliggende tabel via Supabase
2. Open het CRUD-overzicht waar je eerder een volgorde had opgeslagen
3. Verwacht: nieuwe kolom verschijnt aan het einde, bestaande volgorde behouden (SC-006)

### 7. E2E test

```bash
npx playwright test tests/e2e/crud-column-reorder.spec.ts
```

Verwacht: test slaagt.

## Rollback

```sql
ALTER TABLE kk_crud_overviews DROP COLUMN IF EXISTS column_order;
```

Code rollback: revert de branch. Geen data-verlies (kolom bevat alleen voorkeur-data).