# Phase 1 Data Model: CRUD Kolomvolgorde naar Record-Formulier

**Branch**: `019-crud-column-order-new-record` | **Date**: 2026-09-22

Deze feature wijzigt geen database-schema en voegt geen nieuwe datastructuren toe. Het is een UI-only rewiring: de reeds bestaande, per-gebruiker opgeslagen kolomvolgorde wordt doorgevoerd naar het record-formulier. Hieronder het logische datamodel van de betrokken entiteiten en de datastroom.

---

## Betrokken entiteiten

### kk_crud_overviews (bestaand, ongewijzigd)

Per-gebruiker per-overzicht CRUD-configuratie in Supabase PostgreSQL (RLS actief).

| Veld | Type | Betekenis |
|------|------|-----------|
| `id` | `uuid` | CRUD-overzicht-id |
| `user_id` | `uuid` | Eigenaar van de voorkeur |
| `table_name` | `text` | Doeltabel |
| `hidden_columns` | `text[]` | Verborgen kolomnamen |
| `column_order` | `text[] NOT NULL DEFAULT '{}'` | Geordende lijst kolomnamen — **bron van waarheid voor deze feature** |
| `column_filters` | `jsonb` | Opgeslagen filters |

**Wijziging**: geen. De feature leest alleen `column_order`.

### ColumnInfo (bestaand, ongewijzigd)

Bron: `src/lib/db/introspect.ts:4-13`. Per kolom: `name`, `dataType`, `isNullable`, `isPrimaryKey`, `isIdentity`, `isGenerated`, `defaultValue`, `maxLength`. De array-volgorde uit de introspectie-RPC (`get_table_columns`, `ORDER BY ordinal_position`) is de standaardvolgorde.

### Kolomvolgorde-voorkeur (runtime, geen nieuwe persistentie)

De runtime-transformatie van kolommen gebeurt in twee stappen, beide bestaand:

| Stap | Functie | Input | Output |
|------|---------|-------|--------|
| 1. Sorteren | `applyColumnOrder(allColumns, savedOrder)` — `src/lib/column-order.ts` | Ongeordende `ColumnInfo[]` + `column_order` | Gesorteerde `ColumnInfo[]`: opgeslagen volgorde voorop, ontbrekende kolommen achteraan in natuurlijke volgorde |
| 2. Filteren | `nonPkColumns`-filter — `DynamicForm.tsx:33` | Gesorteerde `ColumnInfo[]` | Bewerkbare, zichtbare velden (order-preserving) |

---

## Datastroom (vóór vs. ná de wijziging)

**Vóór** (huidig gedrag):

```text
page.tsx (column_order uit DB)
  → CrudTableWrapper → LocalDynamicTable → GenericTable (prop columnOrder)
      ├── tabelkoppen: applyColumnOrder(columns, columnOrder) → displayColumns ✅
      └── formulier:   DynamicForm(columns)                      ← ruwe DB-volgorde ❌
```

**Ná**:

```text
page.tsx (column_order uit DB)
  → CrudTableWrapper → LocalDynamicTable → GenericTable (prop columnOrder)
      ├── tabelkoppen: applyColumnOrder(columns, columnOrder) → displayColumns ✅
      └── formulier:   DynamicForm(orderedColumns)              ← zelfde gesorteerde lijst ✅
```

Slechts één edge verandert: `GenericTable.tsx:309` geeft `orderedColumns` door in plaats van `columns`. Aangezien `orderedColumns` al memoized is (regel 143-146) en `DynamicForm`'s filter order-preserving is, verandert de veldset niet — alleen de volgorde.

---

## Gedragsregels (afgeleid uit spec.md FR-001 t/m FR-007)

| Regel | Bron | Gedrag |
|-------|------|--------|
| Formuliervelden volgen opgeslagen kolomvolgorde | FR-001, FR-002 | array-volgorde van `orderedColumns` bepaalt veldvolgorde in aanmaak- én bewerkformulier |
| Nieuwe kolommen achteraan | FR-003 | `applyColumnOrder` voegt onbekende kolommen achteraan toe (bestaand, unit-getest) |
| Verwijderde kolommen overgeslagen | FR-004 | `applyColumnOrder` negeert namen die niet in `allColumns` voorkomen (bestaand) |
| Veldselectie ongewijzigd | FR-005 | PK/identity/generated/hidden-filter in `DynamicForm.tsx:33` werkt op dezelfde criteria |
| Standaardvolgorde zonder voorkeur | FR-006 | lege/afwezige `column_order` → `applyColumnOrder` retourneert natuurlijke volgorde |
| Geen extra gebruikersactie | FR-007 | volgorde geldt automatisch bij het openen van het formulier |

---

## Geen database-wijzigingen

- Geen nieuwe tabellen, kolommen, RLS-policies of migraties
- Geen nieuwe server actions (`updateCrudOverview` bestaat al en wordt ongewijzigd hergebruikt)
- Geen nieuwe client state — de sortering is puur afgeleid van bestaande props