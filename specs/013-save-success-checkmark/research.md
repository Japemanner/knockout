# Phase 0 Research: Save Success Checkmark

**Branch**: `013-save-success-checkmark` | **Date**: 2026-08-17

Dit document consolideert de onderzoeksvragen die in het plan naar boven kwamen. Alle keuzes zijn gemaakt op basis van codebase-onderzoek en de vastgelegde aannames in [spec.md](./spec.md).

---

## Onderzoek 1: Welke bewerkingsoppervlakken vallen onder "borden" en "kaarten"?

**Vraag**: De spec noemt zowel "borden" als "kaarten". Welke bewerkingsformulieren in de codebase hebben een "Opslaan"-knop onder deze twee categorieën?

### Bevindingen

Codebase-scan (`grep "Opslaan"` over `src/**/*.tsx`) leverde 15 hits op. Na filteren op de scope "borden en kaarten":

**Onder "kaarten" (P1)**:
- `src/components/kanban/CardDetailModal.tsx:232` — `{isSaving ? 'Opslaan...' : 'Opslaan'}` in de kaartdetail-dialoog. Dit is dé plek die het verzoek beschrijft: een kaart opent vanuit een bord, gebruiker wijzigt velden, klikt op "Opslaan".

**Onder "borden" (P2)**:
- `src/actions/boards.ts:32` bevat een `updateBoard` server action (naam bewerken), maar er is **geen UI-component** in de codebase die deze action aanroept. `grep "updateBoard"` over `src/**/*.tsx` levert 0 hits. Het enige bord-gerelateerde formulier is `CreateBoardDialog.tsx`, die een "Aanmaken"-knop heeft (geen "Opslaan") en `createBoard` aanroept — niet `updateBoard`.
- `BoardHeader.tsx` toont alleen de bordnaam + een verwijder-knop. Geen bewerkingsformulier, geen "Opslaan"-knop.
- Conclusie: er bestaat momenteel **geen bewerkingsformulier voor bordinstellingen** met een "Opslaan"-knop. P2 uit de spec heeft geen concreet oppervlak om te implementeren.

**Buiten scope** (andere modules met "Opslaan"-knoppen, niet gerelateerd aan borden/kaarten):
- `src/components/crud/ColumnVisibilityDialog.tsx:85` (CRUD-tabbladen)
- `src/components/db-explorer/ConnectionList.tsx:101`, `DynamicForm.tsx:54` (DB-explorer)
- `src/components/hours/ClientManageDialog.tsx:310`, `CurrentSection.tsx:190`, `HoursEntryForm.tsx`, `HoursHistory.tsx:443` (Urenregistratie)
- `src/components/time-tracking/TimeEntriesList.tsx:131` (Tijdregistratie)
- `src/components/command-center/PrioritiesSection.tsx:117` (Command center)
- `src/app/(auth)/reset-password/page.tsx:102` (Auth)

### Beslissing

**P1 (kaartdetail-dialoog) is het enige oppervlak dat in deze feature wordt gewijzigd.** P2 (bordbewerking) wordt in dit plan niet geïmplementeerd omdat er geen bestaand bewerkingsformulier voor borden is. Als later een bord-bewerkingsformulier wordt toegevoegd, kan hetzelfde patroon (UI-state + Check-icon swap) daar worden hergebruikt.

De Assumption in de spec ("De feature is beperkt tot de bewerkingsknoppen onder 'borden' en 'kaarten' zoals beschreven") wordt daarmee bijgestuurd naar: **enkel de kaartdetail-dialoog**, omdat dat de enige plek is die daadwerkelijk een "Opslaan"-knop heeft binnen het borden/kaarten-domein.

### Rationale

Het verzoek spreekt over "op de kaarten" — dat is expliciet de kaartdetail-dialoog. "Onder borden" is waarschijnlijk een informele verwijzing naar dezelfde interactie in het borden-gedeelte van de app (kaarten bestaan immers alleen binnen borden). Er is geen bewijs dat de gebruiker een niet-bestaand bord-bewerkingsformulier bedoelt.

### Alternatives considered
- Een nieuw bord-bewerkingsformulier bouwen om P2 te dekken: valt buiten dit verzoek (scope-creep). Verworpen.
- De feature toepassen op alle 15 "Opslaan"-knoppen in de codebase: veel te breed, de gebruiker noemde expliciet alleen "borden en kaarten". Verworpen.

---

## Onderzoek 2: Hoe presenteren we het groene vinkje — knop vervangen of icoon naast de knop?

**Vraag**: Vervangen we de knop "Opslaan" door een vinkje op dezelfde plek, of tonen we het vinkje ernaast?

### Bevindingen

**Optie A: Knop direct vervangen door een groen vinkje** ✅ GEKOZEN
- De spec zegt expliciet: "op de plaats van het knop 'Opslaan' een groen vinkje zien" — letterlijk op dezelfde positie.
- Implementatie: een voorwaardelijke render `{isSaved ? <CheckSpan /> : <SaveButton />}` op de plek waar nu de knop staat (`CardDetailModal.tsx:231-233`).
- Het vinkje is een `<span>` met het `Check` icoon uit `lucide-react` (al aanwezig) in een groene kleur, eventueel met een kleine "Opgeslagen"-label voor de duidelijkheid.
- **Nadeel**: de knop is tijdelijk onbereikbaar — de gebruiker kan niet opnieuw opslaan totdat het vinkje is teruggezet. Dit is acceptabel omdat de data al is opgeslagen en een nieuwe wijziging het vinkje direct weer terugzet naar de knop.

**Optie B: Vinkje naast de knop tonen**
- Knop blijft zichtbaar, vinkje verschijnt ernaast.
- **Nadeel**: komt niet overeen met het verzoek ("op de plaats van het knop"). Verworpen.

### Beslissing
**Optie A**. Voorwaardelijke render die de knop direct vervangt door een groen vinkje op dezelfde positie in de layout.

### Rationale
Volgt het verzoek letterlijk. Minimalistische wijziging — één voorwaardelijke branch op de bestaande knop-positie. Geen nieuwe layout-logica.

### Alternatives considered
- Vinkje naast de knop: verworpen wegens niet-matchen met verzoek.
- Knop groen kleuren in plaats van vinkje: minder duidelijk als "klaar"-signaal, niet wat de gebruiker vroeg.

---

## Onderzoek 3: Hoe lang blijft het groene vinkje zichtbaar?

**Vraag**: Wat is een redelijke periode voordat het vinkje automatisch terugverandert in de knop "Opslaan"?

### Bevindingen

- Te kort (<1s): gebruiker ziet het vinkje mogelijk niet eens, zeker bij snelle handelingen.
- Te lang (>5s): het vinkje blijft staan terwijl er niets meer op te slaan is, wat verwarrend kan zijn.
- Industriestandaard voor "saved indicator" in editors (bijv. Notion, Linear, Trello): 1,5–3 seconden.

### Beslissing
**2 seconden**. Het vinkje verdwijnt na 2000ms vanzelf en de knop "Opslaan" keert terug.

### Rationale
Genoeg tijd voor de gebruiker om de bevestiging bewust waar te nemen, kort genoeg om niet te hinderen. Past bij vergelijkbare apps.

### Alternatives considered
- 1 seconde: te kort, risico op missen.
- 5 seconden: te lang, kan verwarrend zijn bij opeenvolgende bewerkingen.
- Permanent tot volgende wijziging (geen timer): werkt ook, maar de spec noemt expliciet "automatisch herstel" (User Story 3). Daarom een timer.

---

## Onderzoek 4: Hoe detecteren we "nieuwe wijziging" om het vinkje vroegtijdig te resetten?

**Vraag**: FR-003 zegt dat het vinkje direct terug moet veranderen in de knop zodra de gebruiker een veld wijzigt. Hoe implementeren we dit zonder dubbele code per veld?

### Bevindingen

De `CardDetailModal` heeft zes `onChange`-handlers die state muteren:
- `setTitle` (regel 140)
- `setDescription` (regel 192)
- `setUrl` (regel 185)
- `setDeadline` (regel 206)
- `setIsStarred` (regel 97 — via `handleToggleStar`, async)
- kolom-verplaatsing (regel 215 — via `handleMoveNext`, async)

Opties:
- **Optie A: Een wrapper-functie rond elke setter** — bijv. een lokale `markDirty()` die `setIsSaved(false)` aanroept, handmatig toegevoegd in elke `onChange`. Expliciet, maar vereist aanraking van 6 handlers.
- **Optie B: Een `useEffect` die `isSaved` reset wanneer een van de velden verandert** ✅ GEKOZEN — een enkele `useEffect` met dependency-array `[title, description, url, deadline, isStarred]` roept `setIsSaved(false)` aan. Eén plek, geen handmatige aanpassing per handler.
- **Optie C: Custom hook** — een `useSavedIndicator()`-hook die de state en de reset-logica inkapselt. Over-engineered voor één plek in de codebase.

### Beslissing
**Optie B**. Eén `useEffect` in `CardDetailModal` die `isSaved` reset naar `false` zodra een van de bewerkte velden verandert. De timer wordt in dezelfde effect geannuleerd.

### Rationale
Minimale code, lokaal in één component, geen handmatige aanpassing per `onChange`. Past bij de bestaande stijl van de component (deze gebruikt al `useEffect` voor het resetten van state bij `card`-veranderingen, regel 53-59).

### Alternatives considered
- Optie A (wrapper per setter): werkt, maar meer code en kans op vergeten een nieuwe setter te wrappen.
- Optie C (custom hook): alleen nuttig als het patroon op meerdere plekken wordt toegepast. Nu is er één plek. Verworpen.

---

## Onderzoek 5: Hoe voorkomen we dat het vinkje wordt getoond als de dialoog sluit vóór de opslag voltooid is?

**Vraag**: FR-007 zegt dat het vinkje niet mag verschijnen als de gebruiker de dialoog sluit terwijl het opslaan nog loopt. Hoe doen we dat?

### Bevindingen

De `Dialog`-component van shadcn/ui sluit via `onOpenChange`. In `KanbanBoard.tsx:196` wordt `onOpenChange={(open) => { if (!open) setSelectedCard(null) }}` gebruikt — dus sluiten = `selectedCard` op `null`. De `CardDetailModal` zelf is nog steeds gemount tot React hem unmount.

Risico: als `handleSave` nog loopt en de gebruiker sluit de dialoog, kan `setIsSaved(true)` nog worden uitgevoerd nadat de dialoog al is gesloten, wat leidt tot een kort zichtbaar vinkje bij heropenen of een state-lekkage.

### Beslissing
Twee veiligheidsmaatregelen:
1. **Gekoppelde levenscyclus**: gebruik een `useRef` voor een `isMounted`-vlag, of controleer in `handleSave` na de `await` of `open` nog `true` is vóór `setIsSaved(true)` aan te roepen. Concreet: `if (!open) return` na de `await`, vóór state-update.
2. **Reset bij sluiten**: in de bestaande `useEffect` op `card` (regel 53-59) voegen we `setIsSaved(false)` toe, zodat bij elke nieuwe kaart-open het vinkje altijd start als "knop zichtbaar".

### Rationale
Defensief. Voorkomt state-lekkage tussen opeenvolgende kaart-openingen. Minimale code, sluit aan bij bestaande reset-logica in `useEffect`.

### Alternatives considered
- `AbortController` voor de fetch: `updateCard` is een server action via Next.js, abort-ondersteuning is complex en niet standaard. Verworpen.
- Dialoog sluiten blokkeren tijdens opslaan: momenteel is `disabled={isSaving}` op de knop, maar niet op de `Dialog`-overlay. Dat is een grotere UX-wijziging buiten scope. Verworpen.

---

## Samenvatting van beslissingen

| # | Kwestie | Beslissing |
|---|---------|-----------|
| 1 | Scope van oppervlakken | Alleen `CardDetailModal.tsx` — er is geen bestaand bord-bewerkingsformulier |
| 2 | Weergave vinkje | Knop direct vervangen door groen vinkje op dezelfde positie (voorwaardelijke render) |
| 3 | Zichtbaarheidsduur | 2000ms, daarna automatische terugkeer naar de knop |
| 4 | Reset bij nieuwe wijziging | Eén `useEffect` met dependency-array op de bewerkte velden |
| 5 | Voorkomen vinkje bij sluiten vóór opslag | `if (!open) return` na `await` in `handleSave` + reset in bestaande `useEffect` op `card` |

Alle keuzes zijn gemaakt. Geen open punten meer voor Phase 1.