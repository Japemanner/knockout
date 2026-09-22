import { test, expect } from '@playwright/test'
import {
  filterKindForColumn,
  availableOps,
  isFilterComplete,
  matchesFilter,
  filterRows,
  pruneStaleFilters,
  countActiveFilters,
  isActiveFilterOnHiddenColumns,
  type ColumnFilters,
} from '@/lib/column-filters'
import type { ColumnFilter } from '@/types/database.types'
import type { ColumnInfo } from '@/lib/db/introspect'

function makeColumn(name: string, dataType: string, overrides: Partial<ColumnInfo> = {}): ColumnInfo {
  return {
    name,
    dataType,
    isNullable: true,
    isPrimaryKey: false,
    isIdentity: false,
    isGenerated: 'NEVER',
    defaultValue: null,
    maxLength: null,
    ...overrides,
  }
}

const textCol = makeColumn('naam', 'text')
const numCol = makeColumn('bedrag', 'numeric')
const dateCol = makeColumn('datum', 'date')
const boolCol = makeColumn('actief', 'boolean')

test.describe('filterKindForColumn', () => {
  test('tekstkolommen zijn text', () => {
    expect(filterKindForColumn(textCol)).toBe('text')
    expect(filterKindForColumn(makeColumn('x', 'character varying'))).toBe('text')
  })
  test('numerieke kolommen zijn number', () => {
    expect(filterKindForColumn(numCol)).toBe('number')
    expect(filterKindForColumn(makeColumn('x', 'integer'))).toBe('number')
    expect(filterKindForColumn(makeColumn('x', 'double precision'))).toBe('number')
  })
  test('datumkolommen zijn date', () => {
    expect(filterKindForColumn(dateCol)).toBe('date')
    expect(filterKindForColumn(makeColumn('x', 'timestamp with time zone'))).toBe('date')
  })
  test('booleaankolommen zijn boolean', () => {
    expect(filterKindForColumn(boolCol)).toBe('boolean')
  })
})

test.describe('availableOps', () => {
  test('tekst heeft contains + equals', () => {
    expect(availableOps('text')).toEqual(['contains', 'equals'])
  })
  test('getal heeft vergelijkingsoperatoren', () => {
    expect(availableOps('number')).toEqual(['equals', 'gt', 'gte', 'lt', 'lte', 'between'])
  })
  test('boolean heeft is_true/is_false', () => {
    expect(availableOps('boolean')).toEqual(['is_true', 'is_false'])
  })
})

test.describe('isFilterComplete', () => {
  test('undefined is incompleet', () => {
    expect(isFilterComplete(undefined)).toBe(false)
  })
  test('lege waarde is incompleet', () => {
    expect(isFilterComplete({ op: 'contains', value: '' })).toBe(false)
  })
  test('boolean filters zijn altijd compleet', () => {
    expect(isFilterComplete({ op: 'is_true' })).toBe(true)
  })
  test('between heeft twee waarden nodig', () => {
    expect(isFilterComplete({ op: 'between', value: '1' })).toBe(false)
    expect(isFilterComplete({ op: 'between', value: '1', value2: '10' })).toBe(true)
  })
  test('gevulde waarde is compleet', () => {
    expect(isFilterComplete({ op: 'contains', value: 'abc' })).toBe(true)
  })
})

test.describe('matchesFilter', () => {
  test('contains is case-insensitive', () => {
    const f: ColumnFilter = { op: 'contains', value: 'jansen' }
    expect(matchesFilter('Jaap Jansen', f)).toBe(true)
    expect(matchesFilter('jansen bv', f)).toBe(true)
    expect(matchesFilter('Pieters', f)).toBe(false)
  })
  test('contains op null-val is geen match', () => {
    expect(matchesFilter(null, { op: 'contains', value: 'x' })).toBe(false)
  })
  test('equals is case-insensitive voor tekst', () => {
    expect(matchesFilter('Amsterdam', { op: 'equals', value: 'amsterdam' })).toBe(true)
  })
  test('gt vergelijkt numeriek', () => {
    expect(matchesFilter(101, { op: 'gt', value: 100 })).toBe(true)
    expect(matchesFilter(99, { op: 'gt', value: 100 })).toBe(false)
  })
  test('gte inclusief grens', () => {
    expect(matchesFilter(100, { op: 'gte', value: 100 })).toBe(true)
  })
  test('lte inclusief grens', () => {
    expect(matchesFilter(100, { op: 'lte', value: 100 })).toBe(true)
  })
  test('between accepteert omgekeerde grenzen', () => {
    expect(matchesFilter(5, { op: 'between', value: 1, value2: 10 })).toBe(true)
    expect(matchesFilter(5, { op: 'between', value: 10, value2: 1 })).toBe(true)
    expect(matchesFilter(15, { op: 'between', value: 1, value2: 10 })).toBe(false)
  })
  test('between werkt op datumstrings', () => {
    const f: ColumnFilter = { op: 'between', value: '2026-01-01', value2: '2026-12-31' }
    expect(matchesFilter('2026-06-15', f)).toBe(true)
    expect(matchesFilter('2025-06-15', f)).toBe(false)
  })
  test('is_true / is_false', () => {
    expect(matchesFilter(true, { op: 'is_true' })).toBe(true)
    expect(matchesFilter(false, { op: 'is_true' })).toBe(false)
    expect(matchesFilter(false, { op: 'is_false' })).toBe(true)
  })
  test('incompleet filter matcht alles', () => {
    expect(matchesFilter('watdanook', { op: 'contains', value: '' })).toBe(true)
  })
})

test.describe('filterRows (EN-voorwaarde)', () => {
  const rows = [
    { naam: 'Alpha', bedrag: 10, actief: true },
    { naam: 'Beta', bedrag: 50, actief: false },
    { naam: 'Alfacomplex', bedrag: 100, actief: true },
  ]

  test('enkele filter', () => {
    const filters: ColumnFilters = { naam: { op: 'contains', value: 'al' } }
    expect(filterRows(rows, filters, [textCol, numCol, boolCol])).toHaveLength(2)
  })
  test('twee filters combineren met EN', () => {
    const filters: ColumnFilters = {
      naam: { op: 'contains', value: 'al' },
      bedrag: { op: 'gt', value: 20 },
    }
    const result = filterRows(rows, filters, [textCol, numCol, boolCol])
    expect(result).toHaveLength(1)
    expect(result[0]!.naam).toBe('Alfacomplex')
  })
  test('geen filters retourneert alle rijen', () => {
    expect(filterRows(rows, {}, [textCol, numCol, boolCol])).toHaveLength(3)
  })
  test('lege filters (lege string) retourneert alle rijen', () => {
    const filters: ColumnFilters = { naam: { op: 'contains', value: '' } }
    expect(filterRows(rows, filters, [textCol, numCol, boolCol])).toHaveLength(3)
  })
})

test.describe('pruneStaleFilters', () => {
  test('verwijderde kolommen worden weggefilterd', () => {
    const filters: ColumnFilters = {
      naam: { op: 'contains', value: 'a' },
      bestaat_niet: { op: 'contains', value: 'b' },
    }
    const result = pruneStaleFilters(filters, ['naam', 'bedrag'])
    expect(Object.keys(result)).toEqual(['naam'])
  })
  test('incomplete filters worden weggefilterd', () => {
    const filters: ColumnFilters = { naam: { op: 'contains', value: '' } }
    expect(Object.keys(pruneStaleFilters(filters, ['naam']))).toEqual([])
  })
})

test.describe('countActiveFilters / isActiveFilterOnHiddenColumns', () => {
  test('telt alleen complete filters op geldige kolommen', () => {
    const filters: ColumnFilters = {
      naam: { op: 'contains', value: 'a' },
      bedrag: { op: 'gt', value: 5 },
      leeg: { op: 'contains', value: '' },
    }
    expect(countActiveFilters(filters, ['naam', 'bedrag', 'leeg'])).toBe(2)
  })
  test('detecteert filters op verborgen kolommen', () => {
    const filters: ColumnFilters = {
      naam: { op: 'contains', value: 'a' },
      bedrag: { op: 'gt', value: 5 },
    }
    expect(isActiveFilterOnHiddenColumns(filters, ['naam'])).toBe(true)
    expect(isActiveFilterOnHiddenColumns(filters, ['naam', 'bedrag'])).toBe(false)
  })
})