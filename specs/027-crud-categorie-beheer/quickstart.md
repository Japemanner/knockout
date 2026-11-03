# Quickstart: Centraal categoriebeheer verifiëren

**Feature**: 027-crud-categorie-beheer | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

## Voorwaarden

- Ingelogde sessie in de app (zonder login skippen de E2E-tests zichzelf).
- `.env.local` met de bestaande Supabase-waarden.
- `npm install` en een draaiende dev-server (`npm run dev`) of `PLAYWRIGHT_NO_SERVER=1` als er al een server op poort 3000 draait.
- Minimaal één CRUD-overzicht aanwezig om de tellingen en de "overzichten blijven bestaan"-flow te kunnen zien. Zo niet, maak er eerst één aan via "Nieuwe CRUD".

## Handmatige controle — desktop

1. Open `http://localhost:3000/crud`.
2. Controleer in de paginakop: **"Categorieën beheren"** staat direct naast **"Nieuwe CRUD"** en is zichtbaar zonder hover.
3. Klik op "Categorieën beheren". Het paneel opent met de titel "Categorieën beheren" en toont alle categorieën in aanmaakvolgorde, elk met een telling (`0 overzichten` / `1 overzicht` / `n overzichten`).
4. Maak een categorie "Test 027" aan via het invoerveld + "Toevoegen":
   - de categorie verschijnt direct in het paneel én als tab achter "Alle";
   - de telling is `0 overzichten`.
5. Hernoem "Test 027" naar "Test 027 gewijzigd" via de potloodknop:
   - de naam is direct zichtbaar in het paneel en op de tab;
   - herlaad de pagina: de nieuwe naam blijft staan.
6. Klik op de tab "Test 027 gewijzigd" en daarna op "Nieuwe CRUD": de categorie is vooraf ingevuld (bestaand gedrag).
7. Verplaats een bestaand overzicht naar de categorie via het kaartmenu (desktop) en open het beheerpaneel opnieuw: de telling staat nu op `1 overzicht`.
8. Verwijder de categorie via de prullenbakknop:
   - de bevestigingsweergave noemt de categorienaam en zegt dat overzichten blijven bestaan;
   - na bevestigen verdwijnt de categorie en haar tab;
   - het overzicht staat nog steeds onder "Alle".
9. Controleer op de tabs: **geen** `+`, potlood- of prullenbakicoontjes meer; tabs wisselen alleen het filter.

## Handmatige controle — mobiel (375 px)

1. Open DevTools → device toolbar → 375 × 667 (of een iPhone SE-profile).
2. Open `/crud`.
3. Controleer dat zowel "Categorieën beheren" als "Nieuwe CRUD" zichtbaar en aanraakbaar zijn; geen van beide zit achter hover of een overloopmenu. De knoppen mogen onder de titel staan, maar blijven naast elkaar in de actiegroep.
4. Open het paneel en voer de stappen 4, 5 en 8 hierboven uit met alleen tikken:
   - alle rijen en knoppen zijn bereikbaar;
   - bij veel categorieën scrollt het paneel intern;
   - geen enkele actie vereist hover.
5. Controleer dat de tabrij horizontaal scrolt en niet verticaal stapelt.

## Automatische controle

```powershell
# Alleen de categorie-suite
npx playwright test tests/e2e/crud-categorieen.spec.ts

# Regressie op het CRUD-tabblad (bestaande suite naast categorieën)
npx playwright test

# Types en lint (verplicht vóór commit)
npx tsc --noEmit
npx eslint src/ --max-warnings 0
```

Verwacht resultaat:

- De categorie-suite is groen of skipt zichzelf netjes wanneer er geen login-sessie is.
- De nieuwe mobiele test faalt niet op zichtbaarheid van de knoppen of op hover-afhankelijkheid.
- `tsc` en `eslint` geven geen fouten/warnings.

## Handmatige visuele checklist

- [ ] "Categorieën beheren" staat naast "Nieuwe CRUD" en is op 375 px zichtbaar.
- [ ] Paneel toont alle categorieën met naam en juiste telling.
- [ ] Aanmaken, hernoemen en verwijderen werken zonder hover.
- [ ] Hernoemen blijft behouden na herladen.
- [ ] Verwijderen vraagt bevestiging, noemt de naam en laat overzichten bestaan.
- [ ] Verwijderen van de actieve categorie brengt de pagina terug naar "Alle".
- [ ] Tabrij is één horizontale, scrollbare rij zonder beheeracties.
- [ ] Foutpad (bijv. lege naam) toont een duidelijke melding en wijzigt niets.

## Opruimen

Verwijder testcategorieën die je hebt aangemaakt. Testoverzichten horen niet in deze feature thuis; gebruik een bestaand overzicht voor de tellingstest.
