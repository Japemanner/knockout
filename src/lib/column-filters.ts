import type { ColumnInfo } from '@/lib/db/introspect'
import type { ColumnFilter, ColumnFilterOp } from '@/types/database.types'

export type ColumnFilters = Record<string, ColumnFilter>

export type FilterableKind = 'text' | 'number' | 'date' | 'boolean'

export function filterKindForColumn(column: ColumnInfo): FilterableKind {
  const t = column.dataType.toLowerCase()
  if (t === 'boolean') return 'boolean'
  if (t === 'date' || t === 'timestamp with time zone' || t === 'timestamp without time zone' || t === 'time without time zone' || t === 'time with time zone') return 'date'
  if (isNumericType(t)) return 'number'
  return 'text'
}

function isNumericType(t: string): boolean {
  return [
    'smallint', 'integer', 'bigint', 'decimal', 'numeric',
    'real', 'double precision', 'money',
  ].includes(t)
}

export function availableOps(kind: FilterableKind): ColumnFilterOp[] {
  switch (kind) {
    case 'text': return ['contains', 'equals']
    case 'number': return ['equals', 'gt', 'gte', 'lt', 'lte', 'between']
    case 'date': return ['equals', 'gt', 'gte', 'lt', 'lte', 'between']
    case 'boolean': return ['is_true', 'is_false']
  }
}

export function isFilterComplete(filter: ColumnFilter | undefined): boolean {
  if (!filter) return false
  if (filter.op === 'is_true' || filter.op === 'is_false') return true
  if (filter.op === 'between') return filter.value !== undefined && filter.value !== '' && filter.value2 !== undefined && filter.value2 !== ''
  return filter.value !== undefined && filter.value !== ''
}

export function matchesFilter(cellValue: unknown, filter: ColumnFilter): boolean {
  if (!isFilterComplete(filter)) return true

  switch (filter.op) {
    case 'contains': {
      if (cellValue === null || cellValue === undefined) return false
      return String(cellValue).toLowerCase().includes(String(filter.value).toLowerCase())
    }
    case 'equals': {
      if (cellValue === null || cellValue === undefined) return false
      return String(cellValue).toLowerCase() === String(filter.value).toLowerCase()
    }
    case 'gt': case 'gte': case 'lt': case 'lte': {
      if (cellValue === null || cellValue === undefined) return false
      const cell = toComparable(cellValue, filter.value)
      const bound = toComparable(filter.value, filter.value)
      if (cell === null || bound === null) return false
      if (filter.op === 'gt') return cell > bound
      if (filter.op === 'gte') return cell >= bound
      if (filter.op === 'lt') return cell < bound
      return cell <= bound
    }
    case 'between': {
      if (cellValue === null || cellValue === undefined) return false
      const cell = toComparable(cellValue, filter.value)
      const lo = toComparable(filter.value, filter.value)
      const hi = toComparable(filter.value2, filter.value)
      if (cell === null || lo === null || hi === null) return false
      return cell >= Math.min(lo, hi) && cell <= Math.max(lo, hi)
    }
    case 'is_true': return cellValue === true
    case 'is_false': return cellValue === false
  }
}

function toComparable(a: unknown, hint: unknown): number | null {
  if (a === null || a === undefined || a === '') return null
  if (typeof a === 'number') return a
  if (typeof a === 'boolean') return a ? 1 : 0
  const n = Number(a)
  if (!Number.isNaN(n)) return n
  const t = new Date(String(a)).getTime()
  if (!Number.isNaN(t)) return t
  return null
}

export function filterRows(
  rows: Record<string, unknown>[],
  filters: ColumnFilters,
  columns: ColumnInfo[]
): Record<string, unknown>[] {
  const active = Object.entries(filters).filter(([, f]) => isFilterComplete(f))
  if (active.length === 0) return rows
  return rows.filter((row) =>
    active.every(([columnName, f]) => matchesFilter(row[columnName], f))
  )
}

export function pruneStaleFilters(
  filters: ColumnFilters,
  validColumnNames: string[]
): ColumnFilters {
  const valid = new Set(validColumnNames)
  const pruned: ColumnFilters = {}
  for (const [name, f] of Object.entries(filters)) {
    if (valid.has(name) && isFilterComplete(f)) pruned[name] = f
  }
  return pruned
}

export function countActiveFilters(filters: ColumnFilters, validColumnNames: string[]): number {
  return Object.keys(pruneStaleFilters(filters, validColumnNames)).length
}

export function hasActiveFilters(filters: ColumnFilters, validColumnNames: string[]): boolean {
  return countActiveFilters(filters, validColumnNames) > 0
}

export function isActiveFilterOnHiddenColumns(
  filters: ColumnFilters,
  visibleColumnNames: string[]
): boolean {
  const visible = new Set(visibleColumnNames)
  return Object.entries(filters).some(([name, f]) => isFilterComplete(f) && !visible.has(name))
}