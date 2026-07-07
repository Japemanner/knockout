# Interface Contract: `src/lib/decimal.ts`

**Branch**: `008-crud-decimal-dot-input` | **Date**: 2026-07-06

Dit is het publieke contract van de pure helper-module die door `FormFieldMapper` wordt geïmporteerd. Alle functies zijn zuiver (geen side-effects, geen I/O, deterministisch).

---

## Types

```typescript
export type DecimalParseResult =
  | { ok: true; value: number | null }   // null = leeg (nullable kolom)
  | { ok: false; error: string }         // foutmelding voor inline weergave
```

---

## Functies

### `parseDecimalInput(raw: string, isNullable: boolean): DecimalParseResult`

Parseert ruwe string-invoer voor decimale kolommen (`numeric`, `decimal`, `real`, `double precision`, `float4`, `float8`).

**Gedrag**:
- `""` (leeg) + `isNullable === true` → `{ ok: true, value: null }`
- `""` (leeg) + `isNullable === false` → `{ ok: false, error: "Dit veld is verplicht" }`
- `1.5` → `{ ok: true, value: 1.5 }`
- `1,5` → `{ ok: true, value: 1.5 }` (komma genormaliseerd naar punt)
- `-1.5`, `-1,5` → `{ ok: true, value: -1.5 }`
- `0.5`, `0,5` → `{ ok: true, value: 0.5 }`
- `42` → `{ ok: true, value: 42 }`
- `1..5`, `1,,5`, `1,5.0` → `{ ok: false, error: "Ongeldige decimale waarde" }`
- `1.234,56`, `1,234.56` → `{ ok: false, error: "Ongeldige decimale waarde" }` (meerdere scheidingstekens)
- `1abc`, `abc` → `{ ok: false, error: "Ongeldige decimale waarde" }`
- `.` of `,` alleen → `{ ok: false, error: "Ongeldige decimale waarde" }`

**Implementatie-contract**:
- Komt intern binnen: normaliseer `,` → `.`, dan test regex `^-?\d+(\.\d+)?$` of `^-?\d+$`. Als match: `Number(genormaliseerd)`. Else: fout.
- Gebruikt `Number()`, niet `parseFloat` — `parseFloat("1abc")` geeft `1` (silent truncatie), `Number("1abc")` geeft `NaN`. We willen fout, geen truncatie.

### `parseIntegerInput(raw: string, isNullable: boolean): DecimalParseResult`

Parseert ruwe string-invoer voor integer-kolommen (`integer`, `int4`, `smallint`, `int2`, `bigint`, `int8`).

**Gedrag**:
- `""` (leeg) + `isNullable === true` → `{ ok: true, value: null }`
- `""` (leeg) + `isNullable === false` → `{ ok: false, error: "Dit veld is verplicht" }`
- `42` → `{ ok: true, value: 42 }`
- `-42` → `{ ok: true, value: -42 }`
- `0` → `{ ok: true, value: 0 }`
- `1.5`, `1,5` → `{ ok: false, error: "Gehele getallen toegestaan — geen decimale scheidingsteken" }`
- `1abc` → `{ ok: false, error: "Ongeldig geheel getal" }`
- `1.0` → `{ ok: false, error: "Gehele getallen toegestaan — geen decimale scheidingsteken" }` (we wijzen af, ook al is numeriek gelijk aan `1`)

**Implementatie-contract**:
- Regex `^-?\d+$`. Als match: `Number(raw)` (geeft integer). Else: fout.
- Geen normalisatie van komma — integer mag geen komma bevatten.

### `normalizeForDisplay(value: unknown): string`

Converteert een database-waarde naar de weergave-string voor het input-veld (punt-notatie).

**Gedrag**:
- `null` / `undefined` → `""`
- `42` (Number) → `"42"`
- `1.5` (Number) → `"1.5"`
- `"1.5"` (string) → `"1.5"` (al punt)
- `"1,5"` (string, hypothetisch) → `"1.5"` (komma → punt)
- `"-0.75"` → `"-0.75"`

**Implementatie-contract**:
- `String(value ?? "")` als basis
- Vervang alle `,` door `.`
- Geldt voor zowel decimale als integer-weergave (integer heeft nooit komma, dus no-op)

### `isDecimalType(dataType: string): boolean`

Type-guard: retourneert `true` als `dataType` een decimaal PostgreSQL-type is.

**Gedrag**:
- `numeric`, `decimal`, `real`, `double precision`, `float4`, `float8` → `true`
- Alles anders → `false`

### `isIntegerType(dataType: string): boolean`

Type-guard: retourneert `true` als `dataType` een integer PostgreSQL-type is.

**Gedrag**:
- `integer`, `int`, `int4`, `smallint`, `int2`, `bigint`, `int8` → `true`
- Alles anders → `false`

---

## Pre-conditions / Post-conditions

- Pre: `raw` is een string (altijd — komt van `e.target.value`)
- Post: bij `ok: true` is `value` een geldige `number` of `null` — nooit `NaN`, nooit `undefined`
- Post: bij `ok: false` is `error` een niet-lege Nederlandse string, geschikt voor directe UI-weergave
- Alle functies werpen nooit — fouten worden als `DecimalParseResult` geretourneerd
- Alle functies zijn pure: zelfde input → zelfde output, geen side-effects

---

## Consument

`src/components/db-explorer/FormFieldMapper.tsx` — de numeric input-branch (huidige lijn 70-82) wordt herschreven om deze functies te gebruiken. `DynamicForm.tsx` roept `onChange(parsedValue)` aan; als `parsedValue === null && error !== null` dan toont de UI de foutmelding inline en de submit-handler in `DynamicForm` blokkeert opslaan (optionele Phase-2-aanpassing).