import type { ColumnInfo } from '@/lib/db/introspect'

export function applyColumnOrder(allColumns: ColumnInfo[], savedOrder: string[]): ColumnInfo[] {
  if (!savedOrder || savedOrder.length === 0) return [...allColumns]

  const byName = new Map(allColumns.map((c) => [c.name, c]))
  const ordered: ColumnInfo[] = []
  const seen = new Set<string>()

  for (const name of savedOrder) {
    const col = byName.get(name)
    if (col) {
      ordered.push(col)
      seen.add(name)
    }
  }

  for (const col of allColumns) {
    if (!seen.has(col.name)) ordered.push(col)
  }

  return ordered
}

export function reorderArray<T>(arr: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || from >= arr.length || to < 0 || to >= arr.length) return [...arr]
  const result = [...arr]
  const [item] = result.splice(from, 1)
  result.splice(to, 0, item!)
  return result
}

export function isDefaultOrder(savedOrder: string[] | undefined | null): boolean {
  return !savedOrder || savedOrder.length === 0
}