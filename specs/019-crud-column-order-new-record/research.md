# Phase 0 Research: CRUD Kolomvolgorde naar Record-Formulier

**Branch**: `019-crud-column-order-new-record` | **Date**: 2026-09-22

Dit document consolideert de onderzoeksvragen uit het plan. Alle keuzes zijn gebaseerd op codebase-onderzoek (geen externe dependencies nodig — dit is een pure hergebruik-feature).

---

## Onderzoek 1: Waar ontstaat het gat tussen tabelweergave en formulier?

**Vraag**: Waarom toont de tabel de opgeslagen volgorde wél, maar het formulier niet?

### Bevindingen

- `GenericTable.tsx:143-146` berekent `orderedColumns = applyColumnOrder(columns, columnOrder)` — gebruikt voor de tabelkoppen (via `displayColumns`, regel 147).
- `GenericTable.tsx:308-316` geeft bij het formulier **`columns`** door (regel 309), niet `orderedColumns`.
- `DynamicForm.tsx:33` filtert `nonPkColumns` uit de ontvangen lijst — de volgorde van de ontvangen array bepaalt de veldvolgorde.
- De opgeslagen volgorde komt uit `kk_crud_overviews.column_order` (per gebruiker per overzicht), doorgegeven via `page.tsx` → `CrudTableWrapper` → `LocalDynamicTable` → `GenericTable` (prop `columnOrder`, bestaat al).

**Conclusie**: Het is een één-regel-wijziging in de aanroep (`columns` → `orderedColumns`). Alle benodigde infrastructuur bestaat al.

---

## Onderzoek 2: Prop-wijziging op `DynamicForm` vs. sorteren in `GenericTable`?

**Vraag**: Voegen we een `columnOrder`-prop toe aan `DynamicForm` (die dan zelf sorteert), of geven we de reeds gesorteerde lijst door?

### Bevindingen

**Optie A: Nieuwe prop `columnOrder` op `DynamicForm`** 
- `DynamicForm` roept zelf `applyColumnOrder` aan.
- Nadeel: dubbele sortering-logica op component-niveau; `GenericTable` sorteert al voor de tabel. De sorting-concern lekt naar twee componenten.
- Nadeel: `DynamicForm` heeft maar één caller (`GenericTable`) — de extra prop is dan ook dode flexibiliteit.

**Optie B: Reeds gesorteerde lijst doorgeven** ✅ GEKOZEN
- `GenericTable` heeft `orderedColumns` al berekend (memoized); geef die door in plaats van `columns`.
- `DynamicForm` blijft ongewijzigd in zijn interface: het ontvangt `columns` en de veldvolgorde volgt de array-volgorde — dat is al zijn bestaande impliciete contract.
- Eén bron van waarheid voor volgorde (`applyColumnOrder`), één call-site.

**Beslissing**: Optie B. `columns={orderedColumns}` op regel 309. Geen interface-wijziging aan `DynamicForm`.

**Rationale**: Minimale diff, geen dubbele logica, geen breukgevaar voor de enige caller. Voldoet direct aan FR-001, FR-002, FR-003 en FR-004 (de robuustheid zit al in `applyColumnOrder`: niet-bestaande namen worden overgeslagen, ontbrekende kolommen achteraan toegevoegd — gedekt door bestaande unit-tests in `crud-column-reorder.spec.ts`).

**Alternatives considered**: Nieuwe prop (Optie A) verworpen wegens over-engineering voor één caller.

---

## Onderzoek 3: Filteren in `DynamicForm` — verstoort het de volgorde?

**Vraag**: `DynamicForm.tsx:33` filtert PK/identity/generated/hidden eruit. Kan dat de gesorteerde volgorde verstoren?

### Bevindingen

- `Array.prototype.filter` is order-preserving: de relatieve volgorde van overblijvende elementen blijft exact gelijk. De filter zelf hoeft dus niet te veranderen.
- Belangrijk detail: de veldselectie (`welke` velden) moet blijven werken op basis van **dezelfde criteria**. Wanneer we `orderedColumns` doorgeven, filtert `DynamicForm` PK/identity/generated/hidden uit de gesorteerde lijst — de set velden is identiek (sorteren verandert geen veldattributen), alleen de volgorde verandert.
- Randgeval: `displayColumns` (tabel) snijdt PK en de eerste 8 zichtbare kolommen af, maar het formulier toont historisch alle niet-verborgen, bewerkbare velden. Dat verschil blijven we respecteren — de spec vraagt alleen om dezelfde **volgorde**, niet dezelfde veldset (spec, Assumptions: "bestaand gedrag rond veldselectie blijft ongewijzigd").
- Het PK-veld (`pkColumn`, apart gevonden via `columns.find`, regel 34) blijft bovenaan het formulier staan ongeacht de volgorde — bestaand gedrag, ongewijzigd.

**Conclusie**: Geen wijziging nodig in `DynamicForm`; `filter` behoudt de gesorteerde volgorde automatisch.

---

## Onderzoek 4: Hoe gedraagt het formulier zich bij kolom-wijzigingen in de database?

**Vraag**: Nieuwe/verwijderde kolommen — hoe gedraagt het formulier zich?

### Bevindingen

- `applyColumnOrder` (bestaand, getest in `crud-column-reorder.spec.ts`): namen in `savedOrder` die niet meer bestaan worden overgeslagen; kolommen die niet in `savedOrder` voorkomen worden achteraan in natuurlijke (database-)volgorde toegevoegd.
- Dit dekt FR-003 en FR-004 volledig zonder nieuwe code.

**Beslissing**: Geen extra logica nodig; het bestaande gedrag van `applyColumnOrder` is voldoende en unit-getest.

---

## Onderzoek 5: Teststrategie — wat is automatisch te verifiëren?

**Vraag**: Hoe verifiëren we dat het formulier de gesleepte volgorde volgt?

### Bevindingen

- De sorteerlogica zelf (`applyColumnOrder`) is al unit-getest — geen nieuwe helper, dus geen nieuwe unit-tests nodig.
- Wat nieuw moet: een UI-e2e-test die de keten dekt: kolom slepen → opslaan (server action `updateCrudOverview` + `router.refresh`) → "+ Record" openen → verifiëren dat het eerste formulierveld overeenkomt met de eerste tabelkolom.
- Bestaand patroon in `regression.spec.ts`: tests skippen netjes zonder login (`skipIfNotLoggedIn`). De CRUD-pagina vereist login.
- Drag-and-drop via Playwright: dnd-kit gebruikt pointer events; direct HTML5-drag simuleren is lastig. Betrouwbaarder alternatief: de test verifieert de correlatie tussen tabelkop-volgorde en formulier-veldvolgorde zoals de pagina ze rendert (na een eventueel vooraf gezette `column_order`), en gebruikt dezelfde skip-guard.

**Beslissing**: Eén nieuw Playwright-testbestand `tests/e2e/crud-form-order.spec.ts` dat: (1) een CRUD-overzicht opent, (2) de tabelkop-volgorde leest, (3) "+ Record" opent, (4) de veldvolgorde in het formulier leest, en (5) verifieert dat de formuliervelden in dezelfde relatieve volgorde staan als de zichtbare tabelkolommen. Login-guard volgens bestaand patroon.

**Rationale**: Test wat de gebruiker ervaart (FR-001/SC-001) zonder afhankelijk te zijn van drag-event-simulatie; de onderliggende sorteerlogica is al gedekt.

---

## Samenvatting van beslissingen

| # | Kwestie | Beslissing |
|---|---------|-----------|
| 1 | Gat-analyse | Eén-regelwijziging: `GenericTable.tsx:309` `columns` → `orderedColumns` |
| 2 | Prop-ontwerp | Reeds gesorteerde lijst doorgeven; geen nieuwe `DynamicForm`-prop |
| 3 | Filter-gedrag | Geen wijziging — `filter` is order-preserving |
| 4 | Kolom-wijzigingen | Hergebruik bestaand `applyColumnOrder`-gedrag (unit-getest) |
| 5 | Teststrategie | UI-e2e-test die kop-volgorde vs. formulierveld-volgorde correlateert |

Geen open NEEDS CLARIFICATION-punten meer voor Phase 1.