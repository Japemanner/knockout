# Quickstart: CRUD Kolomvolgorde naar Record-Formulier

**Branch**: `019-crud-column-order-new-record` | **Date**: 2026-09-22

Korte handleiding voor het handmatig verifiëren van de feature na implementatie.

---

## Voorbereiding

1. Zorg dat `.env.local` een geldige `DIRECT_DATABASE_URL` bevat.
2. Start de dev-server: `npm run dev`
3. Open de app, log in, navigeer naar **CRUD** in de sidebar.
4. Open een CRUD-overzicht met meerdere zichtbare kolommen.

---

## Handmatige testpaden

### Pad A: Kolomvolgorde doorgetrokken naar nieuw record

1. Sleep een kolomkop (bijv. de tweede kolom) naar de eerste positie.
2. Wacht tot het opslaan is voltooid (pagina ververst).
3. Klik **+ Record**.
4. **Verwacht**: het veld van de verplaatste kolom staat vooraan in het formulier, in dezelfde volgorde als de tabelkoppen.

### Pad B: Bewerkformulier volgt dezelfde volgorde

1. Met dezelfde aangepaste volgorde actief, klik het potlood-icoon van een bestaand record.
2. **Verwacht**: het bewerkformulier toont de velden in dezelfde volgorde als het aanmaakformulier (en dus de tabel).

### Pad C: Reset volgorde → formulier terug naar standaard

1. Kies **Reset volgorde** in het kolom-instellingenmenu (indien beschikbaar) of zet de volgorde handmatig terug.
2. Open **+ Record**.
3. **Verwacht**: het formulier volgt de standaard database-volgorde.

### Pad D: Verborgen kolommen blijven uit het formulier

1. Verberg een kolom via het kolom-instellingenmenu.
2. Open **+ Record**.
3. **Verwacht**: het verborgen veld ontbreekt in het formulier (bestaand gedrag), overige velden volgen de opgeslagen volgorde.

### Pad E: Nieuwe kolom achteraan

1. Voeg (bijv. via SQL) een nieuwe kolom toe aan de onderliggende tabel terwijl een volgorde is opgeslagen.
2. Open **+ Record**.
3. **Verwacht**: het nieuwe veld staat achteraan in het formulier; de rest van de volgorde is onverstoord.

---

## Automatisch testpad

Eén Playwright-test (`tests/e2e/crud-form-order.spec.ts`): opent een CRUD-overzicht, leest de volgorde van de tabelkoppen, opent **+ Record**, leest de veldvolgorde in het formulier en verifieert dat de formuliervelden in dezelfde relatieve volgorde staan als de tabelkolommen. Volgt het bestaande login-skip-patroon uit `regression.spec.ts`.

---

## Wat niet te testen

- De sorteerfunctie zelf (`applyColumnOrder`) — al unit-getest in `crud-column-reorder.spec.ts`.
- Drag-and-drop-mechaniek — feature 015, ongewijzigd.
- Veldselectie (hidden/PK/identity) — bestaand gedrag, ongewijzigd.