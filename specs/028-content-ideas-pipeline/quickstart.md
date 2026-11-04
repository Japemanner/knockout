# Quickstart: Content-pijplijn met niet-live ideeën

**Feature**: 028-content-ideas-pipeline | **Date**: 2026-11-03

## Voorwaarden

1. De bestaande content-tabellen (`kk_content_posts`, `kk_content_pillars`) bestaan en RLS staat aan.
2. `.env.local` bevat de bestaande Supabase-URL en anon key.
3. `npm install` is uitgevoerd.
4. Er is een ingelogde sessie; zonder login slaan de E2E-tests over.

Deze feature heeft **geen migratie** nodig. Er zijn geen nieuwe tabellen, kolommen of policies.

## Lokaal starten

```bash
npm run dev
```

Open `http://localhost:3000/content` en log in. De weergave "Ideeën" is de standaardtab.

## Handmatige verificatie

### 1. Plaats en inhoud van het blok (FR-001 t/m FR-010)

- [ ] Het blok "Pijplijn" staat tussen het invoerformulier en de volledige ideeënlijst.
- [ ] De kop toont het aantal niet-live ideeën.
- [ ] Elke rij toont een titel, een statusbadge en een contentsoort (of "Geen soort").
- [ ] Een idee zonder soort toont "Geen soort"; een gearchiveerde soort toont de naam met "(gearchiveerd)".
- [ ] Een klik op een rij opent het bestaande detailvenster.
- [ ] In de tab "Overzicht" is geen pijplijnblok zichtbaar.

### 2. Nieuw idee en directe bijwerking (FR-011, SC-004)

- [ ] Noteer het huidige aantal in de kop.
- [ ] Typ alleen een titel en druk op Enter.
- [ ] Het nieuwe idee staat direct in het blok met status Idee en het aantal is met 1 verhoogd.
- [ ] Het idee staat ook in de volledige lijst eronder.
- [ ] Herlaad de pagina: het idee staat er nog steeds (persistentie).

### 3. Live-uitsluiting en statuswijzigingen (FR-002/FR-003/FR-012, SC-002/SC-003)

- [ ] Open het nieuwe idee vanuit het blok.
- [ ] Vul een korte idee-tekst in (verplicht voor Live) en zet de status op Live; sla op.
- [ ] Het idee verdwijnt direct uit het blok en het aantal daalt met 1.
- [ ] Het idee blijft zichtbaar in de volledige lijst.
- [ ] Open hetzelfde idee in de volledige lijst, zet de status terug op Gepland en sla op.
- [ ] Het idee verschijnt direct weer in het blok en het aantal stijgt met 1.
- [ ] Zet de status op Concept en sla op: het blijft in het blok.
- [ ] Zet de status op Klaar en sla op: het blijft in het blok.
- [ ] Zet de status op Idee en sla op: het blijft in het blok.

### 4. Bewerken, verwijderen en soorten (FR-013/FR-014)

- [ ] Wijzig de titel van een pijplijnidee via de editor; de rij in het blok toont direct de nieuwe titel.
- [ ] Hernoem een contentsoort via "Soorten"; de rij in het blok toont direct de nieuwe naam.
- [ ] Wijzig de kleur van de soort; de kleurstip in het blok verandert direct.
- [ ] Archiveer de soort; de rij toont direct "(gearchiveerd)".
- [ ] Verwijder een testidee via de editor en bevestig; het verdwijnt uit het blok en uit de volledige lijst, en het aantal daalt.

### 5. Lege staat (FR-017)

- [ ] Controleer dit in een account zonder niet-live ideeën, of zet tijdelijk alle testideeën op Live.
- [ ] Het blok blijft zichtbaar met "Niets in de pijplijn" en "Alle ideeën zijn live." en een aantal van 0.
- [ ] Zijn er helemaal geen ideeën, dan toont het blok "Nog geen ideeën" met de uitnodiging om er een toe te voegen.
- [ ] Er verschijnt geen foutmelding en geen skeleton in de lege staat.

### 6. Laden, fout en retry (FR-018/FR-019)

- [ ] Bij een trage eerste load toont het blok "Pijplijn laden…" en niet de lege staat.
- [ ] Simuleer een mislukte refetch: blokkeer in de DevTools het request naar `**/rest/v1/kk_content_posts*` en maak een nieuw idee aan (dit lokt een refetch uit).
- [ ] Het blok toont een foutbanner met "Opnieuw proberen" en blijft de bestaande rijen tonen.
- [ ] Hef de blokkade op en klik op "Opnieuw proberen": de foutbanner verdwijnt en het blok is weer actueel.
- [ ] De foutstaat zonder bestaande data toont "Kon de pijplijn niet laden." met de retry-knop en nooit de lege staat.

### 7. Veel items, lange titels en mobiel (FR-020/FR-021/FR-022, SC-005)

- [ ] Met veel niet-live ideeën scrollt het blok intern; alle items zijn bereikbaar.
- [ ] De pagina wordt niet onbeperkt langer; de volledige lijst staat er direct onder.
- [ ] Een zeer lange titel wordt in de rij afgekapt; de volledige titel staat in de editor.
- [ ] Zet de viewport op 375 px: het blok, de rijen en de statusbadges zijn leesbaar zonder horizontaal scrollen.
- [ ] Tab door het blok: elke rij krijgt een zichtbare focus; Enter of Space opent de editor.

## Automatische checks

```bash
npx tsc --noEmit
npm run lint
npx playwright test tests/e2e/content-ideas-logic.spec.ts
npx playwright test tests/e2e/content-ideas.spec.ts
npx playwright test
```

Verwacht:

- `tsc` en ESLint zonder fouten (`--max-warnings 0`).
- De logicatests draaien zonder login en bewijzen de statusmatrix, volgorde, leegte en zuiverheid van `selectPipelinePosts`.
- De E2E-tests slaan over zonder login en draaien groen met een geldige sessie.
- De volledige suite blijft groen; de bestaande `idea-row`-tests zijn niet geraakt.

## Handige testdata

- Gebruik unieke titels met `Date.now()` om botsingen bij parallelle E2E-runs te voorkomen.
- Test relatieve aantallen (huidig aantal ± 1), niet het globale totaal: er kunnen al bestaande ideeën in het account staan.
- Voor status Live is een niet-lege idee-tekst verplicht; vul die eerst in.
- Ruim testideeën op via de editor. Contentsoorten worden gearchiveerd, niet verwijderd.
- De lege staat is het eenvoudigst te controleren in een schoon testaccount of door alle testideeën tijdelijk op Live te zetten en daarna terug te zetten.

## Rollback

De feature is niet-destructief en heeft geen migratie. Terugdraaien bestaat uit het verwijderen van `PipelineBlock.tsx`, het terugdraaien van de `ContentView`-integratie en het verwijderen van de nieuwe tests. Er is geen database- of dataherstel nodig.
