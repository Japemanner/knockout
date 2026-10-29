import { pruneStaleFilters, type ColumnFilters } from '@/lib/column-filters'
import type { ColumnInfo } from '@/lib/db/introspect'

export interface ColumnSettings {
  hiddenColumns: string[]
  columnOrder: string[]
  filters: ColumnFilters
}

export function diffColumns(
  previous: string[],
  current: string[]
): { added: string[]; removed: string[] } {
  const previousSet = new Set(previous)
  const currentSet = new Set(current)
  return {
    added: current.filter((name) => !previousSet.has(name)),
    removed: previous.filter((name) => !currentSet.has(name)),
  }
}

export function pruneColumnSettings(
  settings: ColumnSettings,
  currentColumns: ColumnInfo[]
): ColumnSettings {
  const names = currentColumns.map((c) => c.name)
  const valid = new Set(names)
  return {
    hiddenColumns: settings.hiddenColumns.filter((name) => valid.has(name)),
    columnOrder: settings.columnOrder.filter((name) => valid.has(name)),
    filters: pruneStaleFilters(settings.filters, names),
  }
}