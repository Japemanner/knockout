import { test, expect } from '@playwright/test'
import { applyColumnOrder, reorderArray, isDefaultOrder } from '@/lib/column-order'
import type { ColumnInfo } from '@/lib/db/introspect'

function makeColumn(name: string, overrides: Partial<ColumnInfo> = {}): ColumnInfo {
  return {
    name,
    dataType: 'text',
    isNullable: true,
    isPrimaryKey: false,
    isIdentity: false,
    isGenerated: 'NEVER',
    defaultValue: null,
    maxLength: null,
    ...overrides,
  }
}

const A = makeColumn('a')
const B = makeColumn('b')
const C = makeColumn('c')
const D = makeColumn('d')
const E = makeColumn('e')

test.describe('applyColumnOrder', () => {
  test('lege savedOrder retourneert natuurlijke volgorde', () => {
    expect(applyColumnOrder([A, B, C], [])).toEqual([A, B, C])
  })

  test('herordent volgens savedOrder, rest achteraan', () => {
    expect(applyColumnOrder([A, B, C, D, E], ['c', 'a', 'e'])).toEqual([C, A, E, B, D])
  })

  test('volledige savedOrder geeft exact die volgorde', () => {
    expect(applyColumnOrder([A, B, C], ['c', 'b', 'a'])).toEqual([C, B, A])
  })

  test('kolommen in savedOrder maar niet in allColumns worden overgeslagen', () => {
    expect(applyColumnOrder([A, B, C, D], ['b', 'x', 'a'])).toEqual([B, A, C, D])
  })

  test('kolommen in allColumns maar niet in savedOrder achteraan in natuurlijke volgorde', () => {
    expect(applyColumnOrder([A, B, C, D], ['c'])).toEqual([C, A, B, D])
  })

  test('muteert input niet', () => {
    const original = [A, B, C]
    applyColumnOrder(original, ['c', 'a'])
    expect(original).toEqual([A, B, C])
  })

  test('lege allColumns retourneert lege array', () => {
    expect(applyColumnOrder([], ['a', 'b'])).toEqual([])
  })
})

test.describe('reorderArray', () => {
  test('verplaatst element van begin naar eind', () => {
    expect(reorderArray(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a'])
  })

  test('verplaatst element van eind naar begin', () => {
    expect(reorderArray(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b'])
  })

  test('verplaatst element midden', () => {
    expect(reorderArray(['a', 'b', 'c', 'd'], 1, 2)).toEqual(['a', 'c', 'b', 'd'])
  })

  test('from === to retourneert kopie', () => {
    expect(reorderArray(['a', 'b'], 0, 0)).toEqual(['a', 'b'])
  })

  test('ongeldige index retourneert kopie', () => {
    expect(reorderArray(['a', 'b'], -1, 0)).toEqual(['a', 'b'])
    expect(reorderArray(['a', 'b'], 0, 5)).toEqual(['a', 'b'])
  })

  test('muteert input niet', () => {
    const original = ['a', 'b', 'c']
    reorderArray(original, 0, 2)
    expect(original).toEqual(['a', 'b', 'c'])
  })
})

test.describe('isDefaultOrder', () => {
  test('lege array is default', () => {
    expect(isDefaultOrder([])).toBe(true)
  })

  test('undefined is default', () => {
    expect(isDefaultOrder(undefined)).toBe(true)
  })

  test('null is default', () => {
    expect(isDefaultOrder(null)).toBe(true)
  })

  test('niet-lege array is niet default', () => {
    expect(isDefaultOrder(['a', 'b'])).toBe(false)
  })
})