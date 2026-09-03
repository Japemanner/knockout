# Contract: column-order helper

**Date**: 2026-08-29
**Feature**: 015-crud-column-reorder
**File**: `src/lib/column-order.ts`

## Functions

### `applyColumnOrder(allColumns: ColumnInfo[], savedOrder: string[]): ColumnInfo[]`

Herordent `allColumns` op basis van `savedOrder`. Pure functie — muteert input niet.

**Parameters:**
- `allColumns`: alle kolommen uit DB-introspectie, in natuurlijke volgorde
- `savedOrder`: opgeslagen volgorde van kolomnamen (uit `kk_crud_overviews.column_order`); leeg `[]` betekent natuurlijke volgorde

**Returns:** nieuwe array met `allColumns` herordend. Kolommen in `savedOrder` eerst (in die volgorde), daarna kolommen niet in `savedOrder` (in natuurlijke volgorde). Kolommen in `savedOrder` maar niet in `allColumns` worden overgeslagen.

**Examples:**

```ts
applyColumnOrder([A, B, C, D, E], [C, A, E])
// → [C, A, E, B, D]

applyColumnOrder([A, B, C], [])
// → [A, B, C]  (natuurlijke volgorde)

applyColumnOrder([A, B, C, D], [B, X, A])
// → [B, A, C, D]  (X genegeerd — niet in allColumns)

applyColumnOrder([A, B], [A, B, C, D])
// → [A, B]  (C en D genegeerd — niet in allColumns)
```

---

### `reorderArray<T>(arr: T[], from: number, to: number): T[]`

Pure array-herordening. Retourneert nieuwe array met element op index `from` verplaatst naar index `to`. Andere elementen schuiven op.

**Parameters:**
- `arr`: input array (niet gemuteerd)
- `from`: huidige index van te verplaatsen element
- `to`: doel-index

**Returns:** nieuwe array met element verplaatst.

**Examples:**

```ts
reorderArray(['A', 'B', 'C'], 0, 2)
// → ['B', 'C', 'A']

reorderArray(['A', 'B', 'C'], 2, 0)
// → ['C', 'A', 'B']
```

---

### `isDefaultOrder(savedOrder: string[]): boolean`

Geeft `true` als `savedOrder` leeg is (`[]` of `undefined`). Gebruikt voor "Reset volgorde" knop-state.

**Parameters:**
- `savedOrder`: opgeslagen kolomvolgorde

**Returns:** `true` als natuurlijke volgorde (default), `false` als aangepast.

```ts
isDefaultOrder([])        // → true
isDefaultOrder(['A', 'B']) // → false
isDefaultOrder(undefined) // → true
```

## Types

```ts
import type { ColumnInfo } from '@/actions/local-db'
```

## Constraints

- Alle functies zijn pure (geen side-effects, geen mutatie van input)
- Geen React-afhankelijkheden
- Geen `any` types
- Volledig testbaar zonder DOM of Supabase