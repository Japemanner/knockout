# Phase 1 Data Model: Save Success Checkmark

**Branch**: `013-save-success-checkmark` | **Date**: 2026-08-17

Deze feature wijzigt geen database-schema en voegt geen persistente data toe. Het is een puur client-side UI-state-gedrag op de kaartdetail-dialoog. Hieronder staat het logische datamodel van de UI-stroom.

---

## Betrokken entiteiten

### Card (bestaand, ongewijzigd)

Bron: `src/types/database.types.ts` (Type `Card`). Database-entiteit in `kk_cards`-tabel. Bewaard via bestaande `updateCard` server action in `src/actions/cards.ts`.

| Veld | Type | Betekenis |
|------|------|-----------|
| `id` | `string` | PK |
| `title` | `string` | Kaarttitel |
| `description` | `string \| null` | Omschrijving (Markdown) |
| `url` | `string \| null` | Externe link |
| `is_starred` | `boolean` | Sterren-status |
| `is_archived` | `boolean` | Gearchiveerd |
| `deadline` | `string \| null` | Deadline (ISO-datum) |
| `parent_id` | `string \| null` | Parent-kaart voor subtaken |
| `column_id` | `string` | FK naar `kk_columns` |
| `position` | `number` | Sortering binnen kolom |
| `created_at` | `string` | Timestamp |
| `updated_at` | `string` | Timestamp |

Geen wijziging. De feature leest deze velden en schrijft ze via de bestaande `updateCard`-flow.

### SaveIndicatorState (nieuw, lokaal, niet-persistent)

Puurt client-side UI-state binnen `CardDetailModal`. Wordt niet opgeslagen in de database of in `localStorage`.

| Veld | Type | Betekenis |
|------|------|-----------|
| `isSaving` | `boolean` | Bestaand — `true` tijdens de `updateCard`-await |
| `isSaved` | `boolean` | **Nieuw** — `true` voor 2000ms na een succesvolle opslag; anders `false` |
| `savedTimerRef` | `ReturnType<typeof setTimeout> \| null` | **Nieuw** — referentie naar de actieve timer die `isSaved` reset |

### Visuele toestanden van de knop-positie

De plek van de knop "Opslaan" in `CardDetailModal.tsx:231-233` kent drie toestanden:

| Toestand | Voorwaarde | Weergave |
|----------|-----------|----------|
| `idle` | `!isSaving && !isSaved` | `<Button size="sm" onClick={handleSave}>Opslaan</Button>` |
| `saving` | `isSaving` | `<Button size="sm" disabled>Opslaan...</Button>` |
| `saved` | `!isSaving && isSaved` | `<span className="text-green-600 dark:text-green-500 inline-flex items-center gap-1 text-sm"><Check className="h-4 w-4" /> Opgeslagen</span>` |

### Toestandsovergangen

```
        ┌──── nieuwe wijziging ────┐
        │                          │
        ▼                          │
     ┌─────┐  klik "Opslaan"  ┌──────┐  await klaar + success  ┌──────┐  2000ms timer  ┌──────┐
     │ idle │ ───────────────▶ │saving│ ──────────────────────▶ │saved │ ─────────────▶ │ idle │
     └─────┘                   └──────┘                         └──────┘                 └──────┘
                                  │                                │
                                  │ await klaar + error            │ nieuwe wijziging
                                  ▼                                ▼
                               ┌─────┐                          ┌─────┐
                               │ idle│ (toast foutmelding)      │ idle│
                               └─────┘                          └─────┘
```

### Reset-regels

| Trigger | Bron | Gedrag |
|---------|------|--------|
| Nieuwe wijziging in `title`, `description`, `url`, `deadline`, `isStarred` | FR-003 | `setIsSaved(false)`, timer annuleren |
| Timer afloopt na 2000ms | FR-005 / User Story 3 | `setIsSaved(false)`, timer wissen |
| Dialoog sluit vóór opslag voltooid | FR-007 | `setIsSaved` niet meer aanroepen na `await`; bij heropenen is `isSaved === false` |
| Nieuwe kaart wordt geopend | FR-006 | `useEffect([card])` reset `isSaved` naar `false`, timer annuleren |
| Opslag mislukt | FR-004 | `isSaved` blijft `false`; knop blijft zichtbaar; toast met foutmelding |

---

## Geen database-wijzigingen

- Geen nieuwe tabellen
- Geen nieuwe kolommen
- Geen nieuwe RLS-policies
- Geen migraties
- Geen nieuwe server actions
- Geen wijziging aan `updateCard` in `src/actions/cards.ts`

De feature raakt uitsluitend de UI-laag (`CardDetailModal.tsx`) en voegt geen persistentie toe. Alle state is vluchtig (React-state) en gaat verloren bij unmount of page-refresh.