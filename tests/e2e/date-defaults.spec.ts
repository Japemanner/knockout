import { test, expect } from '@playwright/test'
import {
  isDateColumn,
  isTimestampColumn,
  isTimeColumn,
  todayISO,
  nowLocalDateTime,
  nowLocalTime,
  buildDateDefaults,
} from '@/lib/date-defaults'
import type { ColumnInfo } from '@/lib/db/introspect'

function makeColumn(overrides: Partial<ColumnInfo> = {}): ColumnInfo {
  return {
    name: 'test_col',
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

test.describe('isDateColumn', () => {
  test('herkent date type', () => {
    expect(isDateColumn('date')).toBe(true)
  })

  test('wijst niet-date types af', () => {
    expect(isDateColumn('timestamp')).toBe(false)
    expect(isDateColumn('time')).toBe(false)
    expect(isDateColumn('text')).toBe(false)
  })
})

test.describe('isTimestampColumn', () => {
  test('herkent timestamp varianten', () => {
    expect(isTimestampColumn('timestamp')).toBe(true)
    expect(isTimestampColumn('timestamp without time zone')).toBe(true)
    expect(isTimestampColumn('timestamp with time zone')).toBe(true)
    expect(isTimestampColumn('timestamptz')).toBe(true)
  })

  test('wijst niet-timestamp types af', () => {
    expect(isTimestampColumn('date')).toBe(false)
    expect(isTimestampColumn('time')).toBe(false)
    expect(isTimestampColumn('text')).toBe(false)
  })
})

test.describe('isTimeColumn', () => {
  test('herkent time varianten', () => {
    expect(isTimeColumn('time')).toBe(true)
    expect(isTimeColumn('time without time zone')).toBe(true)
    expect(isTimeColumn('time with time zone')).toBe(true)
    expect(isTimeColumn('timetz')).toBe(true)
  })

  test('wijst niet-time types af', () => {
    expect(isTimeColumn('date')).toBe(false)
    expect(isTimeColumn('timestamp')).toBe(false)
    expect(isTimeColumn('text')).toBe(false)
  })
})

test.describe('todayISO', () => {
  test('produceert YYYY-MM-DD formaat', () => {
    const result = todayISO()
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  test('komt overeen met huidige lokale datum', () => {
    const now = new Date()
    const tzOffset = now.getTimezoneOffset() * 60000
    const expected = new Date(now.getTime() - tzOffset).toISOString().split('T')[0] ?? ''
    expect(todayISO()).toBe(expected)
  })
})

test.describe('nowLocalDateTime', () => {
  test('produceert YYYY-MM-DDTHH:mm formaat (16 chars)', () => {
    const result = nowLocalDateTime()
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
    expect(result).toHaveLength(16)
  })
})

test.describe('nowLocalTime', () => {
  test('produceert HH:mm formaat (5 chars)', () => {
    const result = nowLocalTime()
    expect(result).toMatch(/^\d{2}:\d{2}$/)
    expect(result).toHaveLength(5)
  })
})

test.describe('buildDateDefaults', () => {
  test('vult date-kolom zonder default met huidige datum', () => {
    const cols = [makeColumn({ name: 'start_date', dataType: 'date' })]
    const defaults = buildDateDefaults(cols)
    expect(defaults['start_date']).toBe(todayISO())
  })

  test('vult timestamp-kolom zonder default met huidige datetime', () => {
    const cols = [makeColumn({ name: 'created_at', dataType: 'timestamp' })]
    const defaults = buildDateDefaults(cols)
    expect(defaults['created_at']).toBe(nowLocalDateTime())
  })

  test('vult timestamptz-kolom zonder default met huidige datetime', () => {
    const cols = [makeColumn({ name: 'updated_at', dataType: 'timestamptz' })]
    const defaults = buildDateDefaults(cols)
    expect(defaults['updated_at']).toBe(nowLocalDateTime())
  })

  test('vult time-kolom zonder default met huidige tijd', () => {
    const cols = [makeColumn({ name: 'start_time', dataType: 'time' })]
    const defaults = buildDateDefaults(cols)
    expect(defaults['start_time']).toBe(nowLocalTime())
  })

  test('slaat kolom over met database-default', () => {
    const cols = [makeColumn({ name: 'created_at', dataType: 'timestamp', defaultValue: 'now()' })]
    const defaults = buildDateDefaults(cols)
    expect(defaults['created_at']).toBeUndefined()
  })

  test('slaat niet-datum kolommen over', () => {
    const cols = [makeColumn({ name: 'title', dataType: 'text' })]
    const defaults = buildDateDefaults(cols)
    expect(Object.keys(defaults)).toHaveLength(0)
  })

  test('combineert meerdere kolommen: wel default, geen default, geen datumtype', () => {
    const cols = [
      makeColumn({ name: 'start_date', dataType: 'date', defaultValue: null }),
      makeColumn({ name: 'created_at', dataType: 'timestamptz', defaultValue: 'now()' }),
      makeColumn({ name: 'title', dataType: 'text', defaultValue: null }),
      makeColumn({ name: 'start_time', dataType: 'time', defaultValue: null }),
    ]
    const defaults = buildDateDefaults(cols)
    expect(Object.keys(defaults)).toHaveLength(2)
    expect(defaults['start_date']).toBe(todayISO())
    expect(defaults['start_time']).toBe(nowLocalTime())
    expect(defaults['created_at']).toBeUndefined()
    expect(defaults['title']).toBeUndefined()
  })

  test('lege kolom-array retourneert leeg object', () => {
    expect(buildDateDefaults([])).toEqual({})
  })
})