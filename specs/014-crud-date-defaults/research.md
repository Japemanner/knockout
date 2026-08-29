# Research: CRUD Datum-Standaardwaarden

**Date**: 2026-08-29
**Spec**: [spec.md](./spec.md)

## CRUD-architectuur

Alle CRUD-paden komen samen in één centrale component: **`GenericTable`** (`src/components/db-explorer/GenericTable.tsx`). Er is één formuliercomponent (`DynamicForm` → `FormFieldMapper`) die zowel create als edit afhandelt.

### Pad-structuur

| Bron | Route | Component |
|------|-------|-----------|
| Lokaal (eigen Supabase) | `/db/[tableName]`, `/crud/[crudId]` | `LocalDynamicTable` → `GenericTable` |
| Extern (aangesloten PostgreSQL) | `/settings/db/[connectionId]/[tableName]` | `DynamicTable` → `GenericTable` |

Beide wrapped `GenericTable` met een `TableDataSource`-adapter; de UI-logica is identiek.

## Sleutellocaties

### GenericTable.tsx

- **Lijn 47**: `showForm` state — `'create' | { row } | null`
- **Lijn 131-135**: "Record"-knop → `setShowForm('create')`
- **Lijn 179**: Edit-knop per rij → `setShowForm({ row })`
- **Lijn 206**: `initialValues={showForm === 'create' ? {} : showForm.row}` — **de plek waar create een lege `{}` doorgeeft**
- **Lijn 80, 97**: `autoColumns`-filter verwijdert PK/identity/generated-kolommen uit de payload vóór insert/update

### DynamicForm.tsx

- **Lijn 18-19**: `const [values, setValues] = useState<Record<string, unknown>>(initialValues)` — kopieert initialValues één keer bij mount
- **Lijn 29-30**: `nonPkColumns` filtert `isGenerated === 'ALWAYS'` uit het formulier. `BY DEFAULT` blijft zichtbaar.

### FormFieldMapper.tsx

- **Lijn 99**: `isRequired = !column.isNullable && column.defaultValue === null && !column.isPrimaryKey` — **bewijst dat `defaultValue` al in de frontend beschikbaar is**
- **Lijn 167-180**: date/timestamp-branch → `<Input type="date">` of `<Input type="datetime-local">`. **`time`-types ontbreken hier** — die vallen door naar de fallback plain `<Input>` (lijn 182-187).

## Column metadata

### ColumnInfo-type

`src/lib/db/introspect.ts:4-13`:

```ts
export interface ColumnInfo {
  name: string
  dataType: string
  isNullable: boolean
  isPrimaryKey: boolean
  isIdentity: boolean
  isGenerated: 'ALWAYS' | 'BY DEFAULT' | 'NEVER'
  defaultValue: string | null
  maxLength: number | null
}
```

### defaultValue-beschikbaarheid

**Ja, volledig** — beide introspectie-bronnen vullen `defaultValue`:

1. **Externe DB** (`src/lib/db/introspect.ts:69-106`): query op `information_schema.columns`, retourneert `column_default`
2. **Eigen Supabase DB** (`src/actions/local-db.ts:43-54`): RPC `get_table_columns` (migratie `supabase/migrations/011_crud_table_meta_rpc.sql:11-45`), retourneert `column_default::text`

De check `column.defaultValue === null` is voldoende om "geen database-default" te detecteren.

## Bestaande date-patronen

### `todayISO()` (3x gedupliceerd)

`src/components/hours/HoursEntryForm.tsx:12-16` (identiek in `HoursHistory.tsx:33-36`):

```ts
function todayISO(): string {
  const d = new Date()
  const tzOffset = d.getTimezoneOffset() * 60000
  return new Date(d.getTime() - tzOffset).toISOString().split('T')[0] ?? ''
}
```

Produceert `YYYY-MM-DD` in lokale tijd door `getTimezoneOffset()`-correctie op `toISOString()`.

### `datetime-local` en `time` format

Niet aanwezig in de codebase. Nieuw te schrijven:
- `nowLocalDateTime()` → `YYYY-MM-DDTHH:mm` (16 chars, slice op `toISOString()`)
- `nowLocalTime()` → `HH:mm` (5 chars, `toTimeString().slice(0, 5)`)

### Opslaan naar Supabase

CRUD-flow stuurt ruwe strings via `dataSource.createRecord(values)`:
- Lokaal: `createLocalRecord` → `supabase.from(table).insert(values)` — PostgREST accepteert ISO-strings
- Extern: `createRecord` → parameterized `INSERT` via `pg` — PostgreSQL cast automatisch

Geen conversie in de action-laag. De input-waarde gaat rechtstreeks naar de DB.

## Tijdzone-conventie

De app gebruikt **browser-lokale tijd** (via `getTimezoneOffset()`-correctie). Geen gecentraliseerde timezone-configuratie. Server-actions gebruiken `new Date().toISOString()` (UTC) voor `updated_at`-kolommen. Voor de CRUD-form-feature is browser-lokaal voldoende en consistent met het `todayISO`-patroon.

## Patroon-referentie: spec 008

`specs/008-crud-decimal-dot-input/` volgde hetzelfde patroon:
- Pure helper in `src/lib/decimal.ts` (testbaar los van React)
- Kleine wijziging in `FormFieldMapper.tsx` (numeric branch)
- `DynamicForm.tsx` werd niet gewijzigd

Deze feature volgt hetzelfde patroon, maar wijziging zit in `DynamicForm.tsx` (voor initialisatie) én `FormFieldMapper.tsx` (voor `time`-type rendering).

## Conclusie

- **Eén plek van ingreep**: `DynamicForm.tsx` lijn 18-19 (initialisatie) + `FormFieldMapper.tsx` lijn 167 (time-branch)
- **Eén nieuwe helper**: `src/lib/date-defaults.ts` (~40 regels, pure functions)
- **Geen nieuwe dependencies, geen migrations, geen action-wijzigingen**
- `column.defaultValue` is al beschikbaar — de check `=== null` is voldoende voor FR-006