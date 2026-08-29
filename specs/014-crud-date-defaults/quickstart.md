# Quickstart: CRUD Datum-Standaardwaarden

**Date**: 2026-08-29

## Voorbereiding

1. Zorg dat je op branch `014-crud-date-defaults` bent:
   ```powershell
   git checkout 014-crud-date-defaults
   ```

2. Zorg dat de dev-server draait:
   ```powershell
   npm run dev
   ```

3. Zorg dat je bent ingelogd als admin in de applicatie.

## Handmatige verificatie

### Test 1: Nieuw record met date-kolom (P1)

1. Navigeer naar een tabel in de CRUD-interface die een `date`-kolom heeft **zonder** database-DEFAULT (bijv. een tabel met een `start_date DATE`-kolom zonder `DEFAULT`-clause).
2. Klik op **"Record"** (de nieuw-record-knop).
3. **Verwacht**: Het datumveld is automatisch gevuld met de datum van vandaag (`YYYY-MM-DD`).
4. Klik op **Opslaan** zonder iets te wijzigen.
5. **Verwacht**: Het record wordt opgeslagen met de huidige datum.

### Test 2: Nieuw record met timestamp-kolom (P1)

1. Navigeer naar een tabel met een `timestamp`- of `timestamptz`-kolom zonder database-DEFAULT.
2. Klik op **"Record"**.
3. **Verwacht**: Het veld is gevuld met `YYYY-MM-DDTHH:mm` (huidige datum + tijd).
4. Wijzig de waarde handmatig naar een andere datum/tijd.
5. Klik op **Opslaan**.
6. **Verwacht**: De door jou gekozen waarde is opgeslagen, niet de automatisch gevulde.

### Test 3: Nieuw record met time-kolom (P1)

1. Navigeer naar een tabel met een `time`-kolom zonder database-DEFAULT.
2. Klik op **"Record"**.
3. **Verwacht**: Het veld is een `<input type="time">` (niet een plain text-input) en is gevuld met de huidige tijd (`HH:mm`).

### Test 4: Database-DEFAULT wordt gerespecteerd (P2)

1. Navigeer naar een tabel met een datumkolom die WEL een `DEFAULT` heeft in het schema (bijv. `created_at TIMESTAMP DEFAULT now()`).
2. Klik op **"Record"**.
3. **Verwacht**: Het veld is NIET client-side gevuld met de huidige datum/tijd. Het is leeg of toont de database-default (afhankelijk van of PostgREST deze al invult).
4. Sla op.
5. **Verwacht**: De database-default wordt toegekend door de database.

### Test 5: Bewerken laat bestaande datum staan (P3)

1. Open een tabel met bestaande records die datumwaarden bevatten.
2. Klik op de **edit**-knop (potlood-icoon) bij een record.
3. **Verwacht**: Het datumveld toont de oorspronkelijk opgeslagen waarde, niet de huidige datum.
4. Sla op zonder wijzigingen.
5. **Verwacht**: De oorspronkelijke datum is behouden.

### Test 6: Nullable datumveld kan worden gewist (edge case)

1. Open een "Nieuw record"-formulier met een `nullable` datumveld dat automatisch is gevuld.
2. Wis de waarde in het datumveld (maak het leeg).
3. Sla op.
4. **Verwacht**: Het record wordt opgeslagen met `NULL` voor dat veld (geen foutmelding).

## Geautomatiseerde verificatie

### Playwright E2E

```powershell
npx playwright test tests/e2e/crud-date-defaults.spec.ts
```

### TypeScript-check

```powershell
npx tsc --noEmit
```

### Fitness check

```powershell
bash scripts/fitness-check.sh
```

## Definitie van "klaar"

- [ ] Test 1-6 handmatig uitgevoerd en bevestigd
- [ ] Playwright E2E-test groen
- [ ] `tsc --noEmit` schoon
- [ ] Fitness check schoon
- [ ] FEATURES.md bijgewerkt
- [ ] Commit met `feat(crud): ...` message