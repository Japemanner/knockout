# Quickstart: CRUD Decimale Input met Punt en Komma

**Branch**: `008-crud-decimal-dot-input` | **Date**: 2026-07-06

Korte handleiding voor het verifiëren van de feature na implementatie. Voorlooptje op Phase 2 (tasks.md) — dit is wat je handmatig of via een Playwright-test kunt doen om te bevestigen dat alles werkt.

---

## Voorbereiding

1. Zorg dat `.env.local` een geldige `DIRECT_DATABASE_URL` bevat (Supabase pooler URL).
2. Zorg dat er een tabel met een `numeric`- of `decimal`-kolom bestaat in `public` schema, plus een met een `integer`-kolom. (De CRUD-overviews in de app verwijzen naar bestaande tabellen.)
3. Start de dev-server: `npm run dev`
4. Open de app, log in, navigeer naar **CRUD** in de sidebar.
5. Kies een CRUD-overview die een tabel met decimale kolommen toont.

---

## Handmatige testpaden

### Pad A: Decimale invoer met punt

1. Klik **Nieuw record** (of bewerk een bestaand record).
2. In een `numeric`- of `decimal`-veld: typ `1.5`.
3. Sla op.
4. **Verwacht**: record wordt opgeslagen, geen foutmelding, database bevat `1.5`.

### Pad B: Decimale invoer met komma

1. Open hetzelfde formulier.
2. Typ `1,5`.
3. Sla op.
4. **Verwacht**: record wordt opgeslagen, database bevat `1.5` (komma genormaliseerd).

### Pad C: Weergave is punt-notatie

1. Open een bestaand record met decimale waarde `1.5` in de database.
2. **Verwacht**: het veld toont `1.5` (punt), niet `1,5`.

### Pad D: Integer-veld blijft strikt

1. Open een formulier met een `integer`-kolom.
2. Typ `1.5` of `1,5`.
3. Probeer op te slaan.
4. **Verwacht**: opslaan wordt geblokkeerd, foutmelding "Gehele getallen toegestaan — geen decimale scheidingsteken" onder het veld.

### Pad E: Ongeldige invoer

1. Open een formulier met een `numeric`-veld.
2. Typ `1..5`.
3. **Verwacht**: foutmelding "Ongeldige decimale waarde" verschijnt inline, opslaan geblokkeerd.
4. Herhaal met `1,,5`, `1abc`, `1.234,56` — alle gevallen moeten foutmelding geven.

### Pad F: Leeg veld (nullable)

1. Open een formulier met een nullable `numeric`-veld.
2. Laat het veld leeg.
3. Sla op.
4. **Verwacht**: `NULL` wordt opgeslagen, geen foutmelding.

### Pad G: Negatieve waarde

1. Typ `-1,5` of `-1.5` in een decimaal veld.
2. Sla op.
3. **Verwacht**: database bevat `-1.5`.

---

## Automatisch testpad (optioneel, Phase 2)

Een Playwright-e2e-test kan paden A, B, C en D dekken. De test navigeert naar een CRUD-overview, opent het formulier, typt waarden, en verifieert de inline foutmelding en/of de opgeslagen database-waarde. Dit wordt in `tasks.md` uitgewerkt.

---

## Wat niet te testen

- De tabel-overzicht-weergave (buiten het edit-formulier) — dat volgt automatisch uit de database-waarde.
- Valuta-opmaak of duizendtals-scheidingstekens — buiten scope.
- Locale-toggle of NL/EN-switch — buiten scope.