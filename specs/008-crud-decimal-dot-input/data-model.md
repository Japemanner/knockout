# Phase 1 Data Model: CRUD Decimale Input

**Branch**: `008-crud-decimal-dot-input` | **Date**: 2026-07-06

Deze feature wijzigt geen database-schema. Het is een UI-only wijziging aan de invoer- en weergave-logica van bestaande CRUD-formuliervelden. Hieronder staat het logische datamodel van de invoer-stroom en de betrokken entiteiten.

---

## Betrokken entiteiten

### ColumnInfo (bestaand, ongewijzigd)

Bron: `src/lib/db/introspect.ts:4-13`. Database-kolom metadata, gebruikt door `FormFieldMapper` om het juiste input-type te kiezen.

| Veld | Type | Betekenis |
|------|------|-----------|
| `name` | `string` | Kolomnaam |
| `dataType` | `string` | PostgreSQL type-naam (bijv. `numeric`, `integer`, `text`) |
| `isNullable` | `boolean` | Mag `NULL` zijn |
| `isPrimaryKey` | `boolean` | PK-kolom |
| `isIdentity` | `boolean` | Identity-kolom |
| `isGenerated` | `'ALWAYS' \| 'BY DEFAULT' \| 'NEVER'` | Generated-kolom |
| `defaultValue` | `string \| null` | Default-waarde |
| `maxLength` | `number \| null` | Max lengte (varchar) |

Geen wijziging. `dataType` blijft de basis voor de keuze tussen decimaal/integer/text.

### FormField invoer-waarde (runtime, geen persistentie)

De waarde die de gebruiker typt en die via `onChange` naar `DynamicForm`-state gaat.

| Veld | Type | Betekenis |
|------|------|-----------|
| `rawInput` | `string` | Ruwe string uit het input-veld vóór parsing |
| `parsedValue` | `number \| null` | Genormaliseerde waarde na parsing (`null` bij ongeldig) |
| `displayValue` | `string` | Weergave-string in het veld (punt-notatie) |
| `error` | `string \| null` | Foutmelding indien ongeldig, anders `null` |

### Validatie-regels (afgeleid uit spec.md FR-001 t/m FR-011)

**Decimale velden** (types: `numeric`, `decimal`, `real`, `double precision`, `float4`, `float8`):

| Regel | Bron | Gedrag |
|-------|------|--------|
| Accepteer `.` als decimaal scheidingsteken | FR-001 | `1.5` → `1.5` |
| Accepteer `,` als decimaal scheidingsteken | FR-002 | `1,5` → `1.5` |
| Normaliseer komma naar punt vóór opslag | FR-003 | intern `1,5` → `Number("1.5")` |
| Maximaal één scheidingsteken | FR-006 | `1..5`, `1,,5`, `1,5.0` → fout |
| Alleen cijfers + één `.` of `,` + optioneel leidende `-` | FR-007 | `1abc` → fout |
| Leeg mag als `isNullable` | FR-008 | `""` → `null` |
| Negatief toegestaan | FR-009 | `-1.5`, `-1,5` → `-1.5` |
| Geen `NaN` naar database | FR-010 | `parseDecimalInput` retourneert `null` bij ongeldig → submit blokkeert |
| Geen duizendtals-scheidingstekens | FR-011 | `1.234,56` of `1,234.56` → fout (meerdere scheidingstekens) |

**Integer-velden** (types: `integer`, `int`, `int4`, `smallint`, `int2`, `bigint`, `int8`):

| Regel | Bron | Gedrag |
|-------|------|--------|
| Alleen gehele getallen | FR-005 | `42` → `42` |
| Optioneel leidende `-` | (impliciet) | `-42` → `-42` |
| `.` of `,` afgewezen | FR-005 | `1.5`, `1,5` → foutmelding |
| Letters/symbolen afgewezen | FR-007 | `42abc` → fout |
| Leeg mag als `isNullable` | FR-008 | `""` → `null` |

### Weergave-regels (FR-004)

Bij edit-modus wordt `displayValue` berekend uit de database-waarde via `normalizeForDisplay`:

| Database-waarde | `displayValue` |
|-----------------|----------------|
| `null` | `""` |
| `1.5` (Number) | `"1.5"` |
| `"1.5"` (string) | `"1.5"` |
| `"1,5"` (hypothetisch) | `"1.5"` (komma → punt) |
| `42` (integer) | `"42"` |
| `0.75` | `"0.75"` |
| `-1.5` | `"-1.5"` |

---

## Geen database-wijzigingen

- Geen nieuwe tabellen
- Geen nieuwe kolommen
- Geen nieuwe RLS-policies
- Geen migraties
- PostgreSQL `numeric`/`decimal` opslag-formaat is ongewijzigd (punt-notatie)

De feature raakt uitsluitend de UI-laag (`FormFieldMapper.tsx`) en voegt één pure helper-module toe (`src/lib/decimal.ts`). Alle server-actions (`createLocalRecord`, `updateLocalRecord` in `src/actions/local-db.ts`) ontvangen al getypeerde waarden via `DynamicForm`-state en behoeven geen aanpassing.