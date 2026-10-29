import { test, expect } from '@playwright/test'
import { diffColumns, pruneColumnSettings } from '@/lib/crud/schema-sync'
import type { ColumnFilter } from '@/types/database.types'
import type { ColumnInfo } from '@/lib/db/introspect'

// Unit-patroon (decimal-helper-conventie) voor de pure helpers van feature
// 025-crud-categorie-sync (US3 — Supabase-sync).

function makeColumn(name: string): ColumnInfo {
  return {
    name,
    dataType: 'text',
    isNullable: true,
    isPrimaryKey: false,
    isIdentity: false,
    isGenerated: 'NEVER',
    defaultValue: null,
    maxLength: null,
  }
}

function completeFilter(value = 'x'): ColumnFilter {
  return { op: 'contains', value }
}

test.describe('diffColumns', () => {
  test('identificeert toegevoegde en verwijderde kolommen', () => {
    const { added, removed } = diffColumns(['a', 'b', 'c'], ['b', 'c', 'd'])
    expect(added).toEqual(['d'])
    expect(removed).toEqual(['a'])
  })

  test('identieke sets geven lege diff', () => {
    const { added, removed } = diffColumns(['a', 'b'], ['a', 'b'])
    expect(added).toEqual([])
    expect(removed).toEqual([])
  })

  test('lege previous geeft alles als toegevoegd', () => {
    const { added, removed } = diffColumns([], ['a', 'b'])
    expect(added).toEqual(['a', 'b'])
    expect(removed).toEqual([])
  })

  test('lege current geeft alles als verwijderd', () => {
    const { added, removed } = diffColumns(['a', 'b'], [])
    expect(added).toEqual([])
    expect(removed).toEqual(['a', 'b'])
  })

  test('hernoemde kolom geldt als verwijderd plus toegevoegd (spec edge case)', () => {
    const { added, removed } = diffColumns(['oude_naam', 'b'], ['nieuwe_naam', 'b'])
    expect(added).toEqual(['nieuwe_naam'])
    expect(removed).toEqual(['oude_naam'])
  })
})

test.describe('pruneColumnSettings', () => {
  test('ruimt verwijderde kolommen op uit verborgen kolommen en volgorde', () => {
    const result = pruneColumnSettings(
      { hiddenColumns: ['a', 'weg'], columnOrder: ['weg', 'b', 'c'], filters: {} },
      [makeColumn('a'), makeColumn('b'), makeColumn('c')]
    )
    expect(result.hiddenColumns).toEqual(['a'])
    expect(result.columnOrder).toEqual(['b', 'c'])
  })

  test('behoudt relatieve volgorde van resterende kolommen', () => {
    const result = pruneColumnSettings(
      { hiddenColumns: [], columnOrder: ['c', 'weg', 'a', 'b'], filters: {} },
      [makeColumn('a'), makeColumn('b'), makeColumn('c')]
    )
    expect(result.columnOrder).toEqual(['c', 'a', 'b'])
  })

  test('behoudt complete filters op bestaande kolommen, ruimt filters op verwijderde kolommen', () => {
    const result = pruneColumnSettings(
      { hiddenColumns: [], columnOrder: [], filters: { a: completeFilter(), weg: completeFilter() } },
      [makeColumn('a'), makeColumn('b')]
    )
    expect(Object.keys(result.filters)).toEqual(['a'])
  })

  test('hernoemde kolom: oude instellingen worden niet op de nieuwe naam hersteld', () => {
    const result = pruneColumnSettings(
      {
        hiddenColumns: ['oude_naam'],
        columnOrder: ['oude_naam', 'b'],
        filters: { oude_naam: completeFilter() },
      },
      [makeColumn('nieuwe_naam'), makeColumn('b')]
    )
    expect(result.hiddenColumns).toEqual([])
    expect(result.columnOrder).toEqual(['b'])
    expect(Object.keys(result.filters)).toEqual([])
  })

  test('nieuwe kolommen zonder instellingen laten bestaande instellingen ongemoeid', () => {
    const result = pruneColumnSettings(
      { hiddenColumns: ['a'], columnOrder: ['a', 'b'], filters: { a: completeFilter() } },
      [makeColumn('a'), makeColumn('b'), makeColumn('nieuw')]
    )
    expect(result.hiddenColumns).toEqual(['a'])
    expect(result.columnOrder).toEqual(['a', 'b'])
    expect(Object.keys(result.filters)).toEqual(['a'])
  })

  test('muteert input niet', () => {
    const settings = {
      hiddenColumns: ['a', 'weg'],
      columnOrder: ['weg', 'a'],
      filters: { weg: completeFilter() },
    }
    pruneColumnSettings(settings, [makeColumn('a')])
    expect(settings.hiddenColumns).toEqual(['a', 'weg'])
    expect(settings.columnOrder).toEqual(['weg', 'a'])
    expect(Object.keys(settings.filters)).toEqual(['weg'])
  })
})