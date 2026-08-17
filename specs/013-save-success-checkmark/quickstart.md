# Quickstart: Save Success Checkmark

**Branch**: `013-save-success-checkmark` | **Date**: 2026-08-17

Korte handleiding voor het verifiëren van de feature na implementatie. Voorlooptje op Phase 2 (tasks.md) — dit is wat je handmatig of via een Playwright-test kunt doen om te bevestigen dat alles werkt.

---

## Voorbereiding

1. Zorg dat `.env.local` geldige Supabase-credentials bevat (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
2. Zorg dat er minimaal één bord met één kolom en één kaart bestaat in de database (via de app: navigeer naar `/boards`, maak een bord aan als er nog geen is, voeg een kaart toe).
3. Start de dev-server: `npm run dev`
4. Open de app, log in, navigeer naar **Borden** in de sidebar.
5. Klik op een bord om het te openen.
6. Klik op een kaart om de kaartdetail-dialoog te openen.

---

## Handmatige testpaden

### Pad A: Groen vinkje verschijnt na succesvolle opslag

1. Open een kaartdetail-dialoog.
2. Wijzig de titel (of een ander veld: omschrijving, URL, deadline).
3. Klik op **Opslaan**.
4. **Verwacht**: tijdens het opslaan toont de knop "Opslaan...". Zodra het opslaan slaagt, verandert de knop direct in een groen vinkje (met `Check`-icoon en label "Opgeslagen") op dezelfde positie.
5. Wacht ~2 seconden.
6. **Verwacht**: het groene vinkje verdwijnt vanzelf en de knop "Opslaan" keert terug.

### Pad B: Nieuwe wijziging reset het vinkje direct

1. Open een kaartdetail-dialoog.
2. Wijzig de titel, klik op **Opslaan**.
3. Zodra het groene vinkje verschijnt, wijzig direct de omschrijving (typ een teken).
4. **Verwacht**: het groene vinkje verdwijnt onmiddellijk en de knop "Opslaan" verschijnt weer — nog vóór de 2 seconden timer afloopt.

### Pad C: Mislukte opslag toont geen vinkje

1. Open een kaartdetail-dialoog.
2. Wijzig een veld.
3. Onderbreek de verbinding (bijv. schakel netwerk uit, of gebruik DevTools → Network → Offline).
4. Klik op **Opslaan**.
5. **Verwacht**: opslaan faalt; knop "Opslaan" blijft zichtbaar (geen groen vinkje); toast met foutmelding verschijnt.

### Pad D: Dialoog sluiten tijdens opslaan toont geen vinkje bij heropenen

1. Open een kaartdetail-dialoog.
2. Wijzig een veld.
3. Klik op **Opslaan** en sluit direct de dialoog (klik op overlay of ESC) vóór het opslagen klaar is.
4. Heropen dezelfde kaart.
5. **Verwacht**: de knop "Opslaan" is zichtbaar, geen groen vinkje. (Zelfs als de opslag op de achtergrond slaagt, mag het vinkje niet verschijnen.)

### Pad E: Nieuwe kaart openen toont geen vinkje

1. Sla een kaart succesvol op zodat het groene vinkje verschijnt.
2. Sluit de dialoog.
3. Open een andere kaart.
4. **Verwacht**: knop "Opslaan" is zichtbaar, geen groen vinkje (state is gereset bij openen).

### Pad F: Sterren-toggle en kolom-verplaatsing resetten vinkje

1. Open een kaart, sla op, wacht tot vinkje verschijnt.
2. Klik op de ster-knop (sterren toggle) of "Naar [volgende kolom]".
3. **Verwacht**: vinkje verdwijnt direct, knop "Opslaan" verschijnt weer.

---

## Automatisch testpad (optioneel, Phase 2)

Een Playwright-e2e-test kan paden A en B dekken. De test navigeert naar een bord, opent een kaart, wijzigt een veld, klikt op "Opslaan" en verifieert dat het groene vinkje in de DOM verschijnt (bijv. door te zoeken naar een `Check`-icoon of het label "Opgeslagen"). Vervolgens wijzigt de test een ander veld en verifieert dat het vinkje weer verdwijnt. Dit wordt in `tasks.md` uitgewerkt.

---

## Wat niet te testen

- Server-side opslaglogica — ongewijzigd, wordt al gedekt door bestaande tests.
- CRUD-formulieren in andere modules (urenregistratie, DB-explorer, command center) — buiten scope.
- Bord-verwijdering of bord-aanmaak — buiten scope.
- Donkere-modus-weergave van het vinkje — visuele verificatie via screenshot, geen functionele test nodig.