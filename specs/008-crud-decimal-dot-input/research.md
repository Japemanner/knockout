# Phase 0 Research: CRUD Decimale Input

**Branch**: `008-crud-decimal-dot-input` | **Date**: 2026-07-06

Dit document consolideert de onderzoeksvragen die in het plan als NEEDS CLARIFICATION of als technologiekeuze naar boven kwamen. Alle keuzes zijn gemaakt op basis van codebase-onderzoek en de vastgelegde aannames in [spec.md](./spec.md).

---

## Onderzoek 1: Input-strategie — `type="number"` vs `type="text"` met `inputMode`

**Vraag**: Welk HTML-input-type lost het NL-locale probleem op zonder nieuwe issues te introduceren?

### Bevindingen

**Optie A: `type="number"` met `lang="en"` + `step="any"`**
- Browser gebruikt `lang`-attribuut om het decimaal scheidingsteken te bepalen. Met `lang="en"` accepteert de browser zowel `.` als `,` (Chrome/Edge) of alleen `.` (Firefox strikt).
- `step="any"` staat alle decimale waarden toe.
- **Nadeel**: Browsergedrag is inconsistent. Firefox interpreteert `lang` strikter dan Chrome. Sommige browsers tonen spinner-pijltjes. `value`-attribuut kan door de browser worden gesaneerd (bijv. leeg gemaakt bij ongeldige invoer), waardoor we geen controle hebben over de foutmelding.
- **Nadeel**: We kunnen niet betrouwbaar detecteren of de gebruiker `1,5` typte — de browser kan het veld leegmaken vóór onze `onChange` het ziet.

**Optie B: `type="text"` met `inputMode="decimal"` + eigen parsing** ✅ GEKOZEN
- `type="text"` geeft volledige controle over de ruwe string-waarde. `onChange` ontvangt altijd wat de gebruiker typte.
- `inputMode="decimal"` opent op mobiel het numerieke toetsenbord met decimaal scheidingsteken.
- We bepalen zelf de parsing (`1,5` → `1.5` → `Number("1.5")` = `1.5`) en validatie (`1..5` → foutmelding).
- Weergave is een directe string-afbeelding van de database-waarde (punt-notatie) — geen browser-interferentie.
- **Nadeel**: Geen native browser-validatie — alle validatie moet zelf. Dit is juist een voordeel: we willen NL-locale-afhankelijkheid vermijden.

### Beslissing
**Optie B**. `type="text"` + `inputMode="decimal"` voor decimale types, `inputMode="numeric"` voor integer-types. Eigen parsing + validatie in `src/lib/decimal.ts`.

### Rationale
Volledige controle over invoer, parsing en foutmelding. Geen browser-locale-afhankelijkheid. Voldoet aan FR-001 t/m FR-011 (alle 11 requirements). De `inputMode`-attributen garanderen goed mobiel gedrag zonder UX-offer.

### Alternatives considered
- `type="number"` + `lang="en"`: verworpen wegens inconsistente browser-implementatie en verlies van controle over de ruwe string.
- `type="number"` zonder aanpassing: dit is het huidige gedrag — faalt per definitie (FR-001 niet gehaald).
- Custom input-component met masked input: te complex voor de behoefte, voegt dependencies toe.

---

## Onderzoek 2: Waar plaatsen we parsing/validatie — inline in component of in een helper-module?

**Vraag**: Pure functie in `lib/` of inline in `FormFieldMapper.tsx`?

### Bevindingen

**Optie A: Inline in FormFieldMapper.tsx**
- Minder bestanden, minder imports.
- **Nadeel**: Niet herbruikbaar, niet testbaar los van React, logica gemengd met weergave.

**Optie B: Pure helper-module `src/lib/decimal.ts`** ✅ GEKOZEN
- Pure functies: `parseDecimalInput(raw: string): number | null`, `parseIntegerInput(raw: string): number | null`, `isValidDecimalShape(raw: string): boolean`, `normalizeForDisplay(value: unknown): string`.
- Volledig testbaar zonder React-rendering.
- Herbruikbaar als ergens anders decimale invoer nodig is (bijv. toekomstige formulieren).
- TypeScript strict, geen `any`, geen dependencies.

### Beslissing
**Optie B**. Nieuw bestand `src/lib/decimal.ts` met pure functies. `FormFieldMapper.tsx` importeert en gebruikt deze functies.

### Rationale
Scheiding van verantwoordelijkheden (parsing = logica, FormFieldMapper = weergave). Testbaarheid — we kunnen unit-tests schrijven tegen `decimal.ts` zonder browser/React. Herbruikbaarheid.

### Alternatives considered
- Inline: verworpen wegens slechte testbaarheid en scheiding.
- NPM-package (bijv. `decimal.js`): te zwaar, voegt dependency toe, AGENTS.md zegt "geen onnodige dependencies".

---

## Onderzoek 3: Foutmeldingsstrategie — inline onder veld vs toast

**Vraag**: Hoe tonen we validatiefouten — inline onder het veld of via een toast?

### Bevindingen

**Optie A: Toast (zoals bestaande CRUD-acties)**
- Bestaand patroon in de codebase: `CreateCrudButton.tsx`, `CrudDetailActions.tsx` gebruiken `useToast` voor foutmeldingen.
- **Nadeel**: Toast is tijdelijk, verdwijnt na een paar seconden. Geen visuele koppeling met het specifieke veld. Gebruiker moet het veld terugvinden.

**Optie B: Inline onder het veld** ✅ GEKOZEN
- Foutmelding direct onder het invoerveld, rode tekst (`text-destructive` Tailwind-class, bestaand in shadcn/ui palette).
- Persistente koppeling met het veld dat de fout veroorzaakt. Gebruiker ziet direct welk veld.
- Blokkeert opslaan visueel — de gebruiker snapt "ik moet dit veld fixen vóór ik kan opslaan".
- shadcn/ui heeft geen form-error-component, dus een simpele `<p className="text-xs text-destructive">` volstaat.

### Beslissing
**Optie B**. Inline foutmelding onder het veld, met `text-destructive` styling. De `DynamicForm`-submit-logica controleert vóór opslaan of er fouten zijn en blokkeert indien nodig (optionele Phase-2-aanpassing — kan ook door `parseDecimalInput` `null` teruggeven en de submit-handler de waarde te laten negeren).

### Rationale
Beter voor usability: fout is direct zichtbaar bij het veld, niet weg-zwevend in een toast. Past bij formuliervalidatie-patronen. Geen nieuwe dependency.

### Alternatives considered
- Toast: verworpen wegens slechte veld-koppeling.
- Toast + inline: dubbel — overbodig complexiteit.

---

## Onderzoek 4: Hoe zorgen we dat integer-velden strikt blijven?

**Vraag**: Hoe voorkomen we dat integer-velden `1.5` of `1,5` accepteren zonder decimale velden te breken?

### Bevindingen

De bestaande code in `FormFieldMapper.tsx:54` deelt numerieke types in één `isNumeric`-array. We moeten dit splitsen:

- **Decimale types** (`numeric`, `decimal`, `real`, `double precision`, `float4`, `float8`): accepteren `.` of `,`, normaliseren naar `.`.
- **Integer-types** (`integer`, `int`, `int4`, `smallint`, `int2`, `bigint`, `int8`): alleen gehele getallen, eventueel met leidende `-`. `.` en `,` worden afgewezen.

De helper-module krijgt twee functies: `parseDecimalInput` en `parseIntegerInput`. De component kiest op basis van `column.dataType` welke functie en welk `inputMode` (`decimal` vs `numeric`) te gebruiken.

### Beslissing
Splitsing in twee parse-functies en twee `inputMode`-waarden, gestuurd door `column.dataType`.

### Rationale
Houdt integer-semantiek intact (FR-005) terwijl decimale invoer flexibel wordt (FR-001, FR-002). Eén plek per type-groep — duidelijke scheiding.

### Alternatives considered
- Eén parse-functie met een "strict"-vlag: minder leesbaar, mengt twee gedragingen in één functie. Verworpen.

---

## Onderzoek 5: Hoe verwerken we `value`-weergave bij edit-modus (punt-notatie afdwingen)?

**Vraag**: Hoe zorgen we dat bij heropenen van een record het veld altijd `1.5` toont, niet `1,5`?

### Bevindingen

In `DynamicForm.tsx:19` wordt `values` geïnitialiseerd vanuit `initialValues` (de ruwe database-row). PostgreSQL retourneert `numeric`/`decimal` als JS-`Number` of als string `1.5` (punt). De huidige code doet `String(value ?? '')` in `FormFieldMapper.tsx:76`, wat `1.5` (string) of `1.5` (vanuit Number) oplevert — beide punt-notatie.

Risico: als Supabase/PostgreSQL ooit een string met komma retourneert (zeer onwaarschijnlijk — PostgreSQL gebruikt altijd punt in het wire-formaat), moet we normaliseren. Voor zekerheid: bij het renderen van een decimale waarde in het veld, passen we `normalizeForDisplay(value)` toe die elke komma vervangt door punt.

### Beslissing
`normalizeForDisplay(value: unknown): string`-functie in `decimal.ts` die:
- `null`/`undefined` → `""`
- `1.5` (Number) → `"1.5"`
- `"1,5"` (string, hypothetisch) → `"1.5"`
- `"1.5"` → `"1.5"`

`FormFieldMapper` gebruikt deze functie voor de `value`-prop bij decimale velden. Integer-velden gebruiken eenvoudig `String(value ?? '')` (geen komma's in integers).

### Rationale
Garandeert FR-004 (weergave = database-waarde in punt-notatie) robuust, ongeacht wat PostgreSQL retourneert. Minimale kosten, maximale zekerheid.

### Alternatives considered
- Vertrouwen op PostgreSQL wire-formaat: werkt, maar als het ooit faalt is het een ondoorzichtige bug. Liever defensief.

---

## Samenvatting van beslissingen

| # | Kwestie | Beslissing |
|---|---------|-----------|
| 1 | Input-strategie | `type="text"` + `inputMode="decimal"` (decimal) / `inputMode="numeric"` (integer) + eigen parsing |
| 2 | Plaatsing logica | Pure helper-module `src/lib/decimal.ts` |
| 3 | Foutmelding | Inline onder veld met `text-destructive` |
| 4 | Integer vs decimal | Twee parse-functies, keuze op basis van `column.dataType` |
| 5 | Weergave-normalisatie | `normalizeForDisplay()`-functie, defensief toegepast |

Alle NEEDS CLARIFICATION-vragen uit het plan zijn hiermee opgelost. Geen open punten meer voor Phase 1.