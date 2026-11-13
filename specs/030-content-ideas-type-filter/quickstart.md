# Quickstart — Content-ideeën filteren op soort

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**: 2026-11-13

## 1. Voorwaarden

- Node.js 20+ en de bestaande dependencies zijn geïnstalleerd (`npm install`).
- `.env.local` bevat de bestaande `NEXT_PUBLIC_SUPABASE_URL` en `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- De Supabase-migraties van feature 025/026 zijn toegepast; `kk_content_posts` en `kk_content_pillars` bestaan met RLS.
- Voor de E2E-tests is een geauthenticeerde Playwright-sessie nodig. Zonder sessie slaan de contenttests over via de bestaande login-skip-guard.
- Er is **geen nieuwe migratie** nodig.

## 2. Lokaal starten

```powershell
npm run dev
```

Open `http://localhost:3000/content` en log in.

## 3. Handmatige verificatie

### 3.1 Geen pijplijn meer

1. Open **Content → Ideeën**.
2. Controleer dat er nergens een blok **"Pijplijn"** staat en dat `data-testid="content-pipeline"` niet in de DOM voorkomt.
3. Controleer dat de ideeënlijst alle ideeën toont, inclusief ideeën met status **Live**.
4. Controleer dat de volgorde nieuwste-eerst is gebleven en dat een klik op een rij de bestaande editor opent.

**Verwacht**: één ideeënlijst, geen pijplijn, alle statussen zichtbaar.

### 3.2 Filterbalk en tellingen

1. Maak via **Soorten** minimaal twee soorten aan: A met een korte beschrijving, B zonder beschrijving. (De naam en kleur stel je bij het aanmaken in; de korte beschrijving vul je daarna in het veld **Korte beschrijving** in de rij van de soort in en sla je op met **Opslaan**.)
2. Maak enkele ideeën aan: twee van A, één van B en één zonder soort.
3. Open **Ideeën**.
4. Controleer de filterbalk:
   - **"Alle soorten"** staat vooraan en is actief.
   - A en B staan met hun kleur en het juiste aantal.
   - **"Geen soort"** staat er met het juiste aantal.
5. Kies A.

**Verwacht**: alleen de twee ideeën van A zijn zichtbaar; de lijstkop toont "2 van 4"; de tellingen van B en "Geen soort" blijven zichtbaar in de filterbalk.

6. Kies **"Geen soort"**.

**Verwacht**: alleen het losse idee is zichtbaar; er is geen beschrijvingsstrook.

7. Kies **"Alle soorten"**.

**Verwacht**: alle vier de ideeën zijn zichtbaar.

### 3.3 Korte beschrijving

1. Kies soort A met de korte beschrijving.
2. Controleer de strook tussen de filterbalk en de lijst.

**Verwacht**: de strook toont de kleur, de naam A en de volledige korte beschrijving.

3. Kies soort B zonder beschrijving.

**Verwacht**: de strook toont "Geen korte beschrijving."

4. Kies **"Alle soorten"**.

**Verwacht**: er is geen beschrijvingsstrook voor één soort.

5. Open **Soorten**, wijzig de korte beschrijving van A en sla op. Sluit het venster en kies A opnieuw (of blijf op A als de strook al zichtbaar was).

**Verwacht**: de strook toont direct de nieuwe tekst, zonder paginavernieuwing.

6. Vul een zeer lange beschrijving (bijv. 300 tekens) in en kies de soort.

**Verwacht**: de tekst is standaard afgekapt; **"Toon volledige beschrijving"** klapt de volledige tekst uit en **"Toon minder"** klapt hem weer in.

### 3.4 Gearchiveerde soort

1. Archiveer soort A via **Soorten**.
2. Open **Ideeën** en bekijk de filterbalk.

**Verwacht**: A blijft als filteroptie staan met **(gearchiveerd)**; de ideeën van A blijven zichtbaar wanneer je A kiest; de beschrijvingsstrook toont ook de archiefmarkering.

### 3.5 Gefilterde lege staat

1. Maak een soort C zonder ideeën.
2. Kies C in de filterbalk.

**Verwacht**: de lijst toont **"Geen ideeën voor C."** met een knop **"Toon alle ideeën"**. De algemene melding "Nog geen ideeën" verschijnt niet.

3. Klik **"Toon alle ideeën"**.

**Verwacht**: "Alle soorten" is actief en alle ideeën zijn zichtbaar.

### 3.6 "Geen soort" verdwijnt

1. Kies **"Geen soort"** terwijl er precies één los idee is.
2. Open dat idee en wijs het een soort toe; sla op.

**Verwacht**: de optie "Geen soort" verdwijnt, de filter valt terug op **"Alle soorten"** en alle ideeën blijven zichtbaar.

### 3.7 Actualiteit na mutaties

1. Kies soort A.
2. Voeg een nieuw idee van A toe.

**Verwacht**: het idee verschijnt direct in de gefilterde lijst; het aantal van A stijgt met 1.

3. Voeg een idee van B toe terwijl A gefilterd is.

**Verwacht**: het nieuwe idee verschijnt niet in de lijst; het aantal van B stijgt met 1 en dat van A blijft gelijk.

4. Wijzig een idee van A naar B.

**Verwacht**: het idee verdwijnt uit de A-lijst en verschijnt in de B-lijst; beide aantallen kloppen direct.

5. Verwijder het laatste idee van A terwijl A gefilterd is.

**Verwacht**: de gefilterde lege staat voor A verschijnt; het aantal van A staat op 0.

### 3.8 Mobiel en toetsenbord

1. Zet de viewport op **375 px** breed (DevTools → responsive).
2. Open **Ideeën**.
3. Controleer dat de filterbalk wikkelt en dat de pagina niet horizontaal scrollt.
4. Navigeer met **Tab** naar de filteropties en kies er één met **Enter** of **Space**.

**Verwacht**: alle opties zijn bereikbaar, de focus is zichtbaar en de gekozen optie is actief. De actieve optie is ook zonder kleur te onderscheiden.

### 3.9 Laad- en foutstaten

1. **Posts-fout**: blokkeer in DevTools (of met Playwright `route.abort()`) de requests naar `**/rest/v1/kk_content_posts*` en herlaad.
   - **Verwacht**: de lijst toont "Kon de ideeën niet laden. Probeer het opnieuw." met een knop **"Opnieuw proberen"**; de filterbalk is verborgen; er verschijnt geen lege staat.
   - Deblokkeer en klik **"Opnieuw proberen"**; de lijst herstelt.
2. **Soorten-fout**: blokkeer `**/rest/v1/kk_content_pillars*` en herlaad.
   - **Verwacht**: de filterbalk toont "Filteren is tijdelijk niet beschikbaar. De ideeënlijst toont alle ideeën." met **"Opnieuw proberen"**; de lijst toont alle posts.
   - Deblokkeer en klik **"Opnieuw proberen"**; de filterbalk verschijnt weer.
3. **0 soorten**: gebruik een account zonder soorten.
   - **Verwacht**: er is geen filterbalk; de lijst toont alle posts.

## 4. Automatische verificatie

### 4.1 Typecheck en lint

```powershell
npx tsc --noEmit
npx eslint src/ --max-warnings 0
```

### 4.2 Pure logica

```powershell
npx playwright test tests/e2e/content-ideas-logic.spec.ts
```

Verwacht: alle tests groen, inclusief de nieuwe tests voor `buildIdeaFilterOptions`, `matchesIdeaFilter`, `filterIdeas`, `resolveIdeaFilter` en `ideaFilterLabel`.

### 4.3 Content-E2E

```powershell
npx playwright test tests/e2e/content-ideas.spec.ts
```

Verwacht: alle contenttests groen. Zonder login slaan de tests over met de bestaande skip-melding.

### 4.4 Volledige suite

```powershell
npx playwright test
```

### 4.5 Fitness checks

```powershell
bash scripts/fitness-check.sh
```

Verwacht: geen blocking failures. Na de feature ook de F-01-controle via Supabase MCP uitvoeren (RLS op `kk_content_posts` en `kk_content_pillars` ongewijzigd) en de vereiste Snyk-controles.

### 4.6 Aanvullende controles

```powershell
# Geen pijplijnresten in de bron; in tests mag alleen de expliciete negatieve assertie staan
rg -n "PipelineBlock|content-pipeline|pipeline-row|Pijplijn" src tests
```

Verwacht: **geen treffers in `src/`**. In `tests/` mogen alleen de bewuste negatieve asserties voorkomen (bijv. `expect(page.getByTestId('content-pipeline')).toHaveCount(0)` en `expect(page.getByText('Pijplijn')).toHaveCount(0)`); er mogen geen verwijzingen naar `pipeline-row`, `pipeline-count` of andere verwijderde testids meer zijn.

```powershell
# Geen onbedoelde datamodelwijziging
git diff -- src/types/database.types.ts src/actions/content.ts src/lib/content/queries.ts supabase/
```

Verwacht: geen wijzigingen.

## 5. Definition of Done

- [ ] Geen pijplijnblok, pijplijnhelpers of pijplijntests meer.
- [ ] Filterbalk met "Alle soorten", alle soorten (incl. 0 en gearchiveerd) en "Geen soort" wanneer nodig.
- [ ] Beschrijvingsstrook met naam, kleur, archiefmarkering en korte beschrijving; lange tekst uitklapbaar.
- [ ] Gefilterde lege staat met "Toon alle ideeën".
- [ ] Tellingen en lijst direct actueel na toevoegen, bewerken, van soort wisselen, verwijderen en soortwijzigingen.
- [ ] "Geen soort" valt terug op "Alle soorten" wanneer de optie verdwijnt.
- [ ] 375 px zonder horizontaal scrollen; toetsenbordbediening met zichtbare focus.
- [ ] Eerlijke laad- en foutstaten met retry; geen misleidende lege lijst.
- [ ] `npx tsc --noEmit`, `npx eslint src/ --max-warnings 0`, de Playwright-suite en `bash scripts/fitness-check.sh` zijn groen.
- [ ] `FEATURES.md` en `FITNESS.md` zijn bijgewerkt; de SPECKIT-verwijzing in `AGENTS.md` wijst naar dit plan.
- [ ] Geen wijziging in `src/types/database.types.ts`, `src/actions/content.ts`, `src/lib/content/queries.ts` of `supabase/`.
