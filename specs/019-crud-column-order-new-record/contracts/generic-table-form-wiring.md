# Interface Contract: GenericTable → DynamicForm kolomvolgorde-doorvoering

**Branch**: `019-crud-column-order-new-record` | **Date**: 2026-09-22

Dit contract beschrijft de enige interface-wijziging van deze feature: welke kolomlijst `GenericTable` doorgeeft aan `DynamicForm`, en welke gedragsgaranties daarop gelden.

---

## Betrokken interfaces (bestaand, signatures ongewijzigd)

### `DynamicFormProps` (`src/components/db-explorer/DynamicForm.tsx:9-17`)

```typescript
interface DynamicFormProps {
  columns: ColumnInfo[]
  foreignKeys: ForeignKeyInfo[]
  fkOptions: Record<string, { value: unknown; label: string }[]>
  hiddenColumns?: string[]
  initialValues: Record<string, unknown>
  onSubmit: (values: Record<string, unknown>) => void
  onCancel: () => void
}
```

**Wijziging**: geen. De signature blijft identiek. Alleen de **semantiek** van `columns` wordt in de enige call-site aangescherpt: de array is nu gesorteerd volgens de opgeslagen gebruikersvoorkeur.

### `applyColumnOrder` (`src/lib/column-order.ts:3-23`) — hergebruikt, ongewijzigd

```typescript
function applyColumnOrder(allColumns: ColumnInfo[], savedOrder: string[]): ColumnInfo[]
```

Garanties (reeds unit-getest in `tests/e2e/crud-column-reorder.spec.ts`):
- lege/geen `savedOrder` → natuurlijke volgorde (kopie)
- namen in `savedOrder` zonder match → overgeslagen
- kolommen zonder vermelding → achteraan, natuurlijke volgorde onderling
- input wordt niet gemuteerd

---

## Wijziging in `GenericTable.tsx`

**Regel 308-316** — vóór:

```tsx
<DynamicForm
  columns={columns}
  ...
/>
```

**Ná**:

```tsx
<DynamicForm
  columns={orderedColumns}
  ...
/>
```

Waar `orderedColumns = useMemo(() => applyColumnOrder(columns, columnOrder), [columns, columnOrder])` (regel 143-146, ongewijzigd).

---

## Gedragsgaranties (post-conditions)

| # | Garantie | Bron (spec) |
|---|----------|-------------|
| 1 | Veldvolgorde in aanmaakformulier = tabelkop-volgorde (indien voorkeur opgeslagen) | FR-001, SC-001 |
| 2 | Bewerkformulier = aanmaakformulier (zelfde component, zelfde input) | FR-002, SC-002 |
| 3 | Veldset verandert niet: PK/identity/generated en hidden columns blijven uitgesloten (zelfde filter, order-preserving) | FR-005 |
| 4 | Zonder opgeslagen volgorde: natuurlijke database-volgorde (identiek aan huidig gedrag) | FR-006 |
| 5 | Nieuwe/verwijderde kolommen correct verwerkt via `applyColumnOrder`-garanties | FR-003, FR-004 |
| 6 | Geen extra gebruikersactie vereist | FR-007, SC-004 |
| 7 | Waarden-afhandeling (initialValues, onChange, submit) volledig ongewijzigd | FR-005 |

## Pre-conditions

- `columnOrder`-prop op `GenericTable` bevat de opgeslagen `kk_crud_overviews.column_order` (bestaande doorvoering via `page.tsx` → `CrudTableWrapper` → `LocalDynamicTable`) — geen wijziging nodig in die keten.

## Non-goals

- Geen aparte formulier-volgorde-instelling (geen nieuwe prop, geen nieuwe persistence)
- Geen wijziging aan `displayColumns`-logica (afkappen op 8 kolommen, PK-uitsluiting in tabel blijven tabel-only)
- Geen drag-and-drop binnen het formulier