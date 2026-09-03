# Data Model: CRUD Datum-Standaardwaarden

**Date**: 2026-08-29

## Geen nieuwe tabellen of kolommen

Deze feature voegt geen database-schema-wijzigingen toe. Het is een puur frontend-gedrag dat bestaande kolom-metadata (`ColumnInfo`) gebruikt die al via introspectie beschikbaar is.

## Relevante bestaande entiteit: ColumnInfo

Bron: `src/lib/db/introspect.ts:4-13`

```ts
export interface ColumnInfo {
  name: string
  dataType: string              // bijv. "date", "timestamp with time zone", "time"
  isNullable: boolean
  isPrimaryKey: boolean
  isIdentity: boolean
  isGenerated: 'ALWAYS' | 'BY DEFAULT' | 'NEVER'
  defaultValue: string | null   // raw SQL default-uitdrukking, bijv. "now()" of null
  maxLength: number | null
}
```

### Velden die deze feature gebruikt

| Veld | Gebruik in feature |
|------|--------------------|
| `dataType` | Bepaalt of de kolom een date/timestamp/time-type is → selectie van default-waarde-formaat |
| `defaultValue` | Als `!== null` → kolom heeft een database-DEFAULT, client-side vulling wordt overgeslagen (FR-006) |
| `name` | Key in het `initialValues`-object dat aan `DynamicForm` wordt doorgegeven |

### Velden die deze feature NIET gebruikt

`isNullable`, `isPrimaryKey`, `isIdentity`, `isGenerated`, `maxLength` — deze worden al afgehandeld door bestaande logica in `DynamicForm` (filtering) en `FormFieldMapper` (rendering). De feature raakt deze niet.

## Data-flow bij create

```
ColumnInfo[] (from introspection)
        │
        ▼
buildDateDefaults(columns)          ← src/lib/date-defaults.ts (NEW)
        │
        │  voor elke column:
        │    - defaultValue !== null → skip
        │    - dataType is "date" → todayISO()
        │    - dataType is timestamp-variant → nowLocalDateTime()
        │    - dataType is time-variant → nowLocalTime()
        │
        ▼
Record<string, string>              ← bijv. { "created_at": "2026-08-29T14:30", "start_date": "2026-08-29" }
        │
        ▼
DynamicForm initial values state    ← merge met {} bij create
        │
        ▼
FormFieldMapper renders <Input>    ← value is gevuld, gebruiker kan overschrijven
        │
        ▼
dataSource.createRecord(values)     ← bestaande flow, ongewijzigd
```

## Data-flow bij edit

Ongewijzigd. `initialValues` is de bestaande row-data (niet leeg), dus `buildDateDefaults` wordt niet aangeroepen. Bestaande datumwaarden blijven staan (FR-005).