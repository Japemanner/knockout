# Contract: date-defaults helper

**Module**: `src/lib/date-defaults.ts`
**Depends on**: `ColumnInfo` from `src/lib/db/introspect.ts`

## Functions

### `isDateColumn(dataType: string): boolean`

Returns `true` when `dataType` equals `"date"`.

### `isTimestampColumn(dataType: string): boolean`

Returns `true` when `dataType` is one of:
- `"timestamp"`
- `"timestamp without time zone"`
- `"timestamp with time zone"`
- `"timestamptz"`

### `isTimeColumn(dataType: string): boolean`

Returns `true` when `dataType` is one of:
- `"time"`
- `"time without time zone"`
- `"time with time zone"`
- `"timetz"`

### `todayISO(): string`

Returns the current date in `YYYY-MM-DD` format, adjusted for the browser's local timezone. Identical to the existing pattern in `src/components/hours/HoursEntryForm.tsx:12-16`.

### `nowLocalDateTime(): string`

Returns the current date and time in `YYYY-MM-DDTHH:mm` format (16 chars), adjusted for the browser's local timezone. Suitable for `<input type="datetime-local">`.

### `nowLocalTime(): string`

Returns the current time in `HH:mm` format (5 chars), in the browser's local timezone. Suitable for `<input type="time">`.

### `buildDateDefaults(columns: ColumnInfo[]): Record<string, string>`

**Input**: array of column metadata objects.
**Output**: a map of `{ [columnName]: defaultValue }` for columns that should be client-side auto-filled.

**Rules**:
- For each column where `defaultValue === null`:
  - If `isDateColumn(dataType)` → `{ [name]: todayISO() }`
  - If `isTimestampColumn(dataType)` → `{ [name]: nowLocalDateTime() }`
  - If `isTimeColumn(dataType)` → `{ [name]: nowLocalTime() }`
- Columns with `defaultValue !== null` are excluded (database-default is leidend).
- Columns that are not date/timestamp/time types are excluded.
- Returns `{}` when no columns qualify.

## Consumer

`DynamicForm.tsx` calls `buildDateDefaults(columns)` once at mount when `initialValues` is empty (create-mode). The result is merged into the initial `values` state via spread.

## Non-goals

- Does not parse or interpret database DEFAULT expressions (only checks presence).
- Does not perform timezone conversion beyond the existing browser-local pattern.
- Does not validate that the generated string matches the column's exact format — PostgreSQL and PostgREST both accept `YYYY-MM-DD` / `YYYY-MM-DDTHH:mm` for the corresponding column types.