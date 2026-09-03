import type { ColumnInfo } from '@/lib/db/introspect'

const DATE_TYPES = ['date']
const TIMESTAMP_TYPES = ['timestamp', 'timestamp without time zone', 'timestamp with time zone', 'timestamptz']
const TIME_TYPES = ['time', 'time without time zone', 'time with time zone', 'timetz']

export function isDateColumn(dataType: string): boolean {
  return DATE_TYPES.includes(dataType)
}

export function isTimestampColumn(dataType: string): boolean {
  return TIMESTAMP_TYPES.includes(dataType)
}

export function isTimeColumn(dataType: string): boolean {
  return TIME_TYPES.includes(dataType)
}

export function todayISO(): string {
  const d = new Date()
  const tzOffset = d.getTimezoneOffset() * 60000
  return new Date(d.getTime() - tzOffset).toISOString().split('T')[0] ?? ''
}

export function nowLocalDateTime(): string {
  const d = new Date()
  const tzOffset = d.getTimezoneOffset() * 60000
  const local = new Date(d.getTime() - tzOffset)
  return local.toISOString().slice(0, 16)
}

export function nowLocalTime(): string {
  const d = new Date()
  const h = d.getHours().toString().padStart(2, '0')
  const m = d.getMinutes().toString().padStart(2, '0')
  return `${h}:${m}`
}

export function buildDateDefaults(columns: ColumnInfo[]): Record<string, string> {
  const defaults: Record<string, string> = {}
  for (const col of columns) {
    if (col.defaultValue !== null) continue
    if (isDateColumn(col.dataType)) {
      defaults[col.name] = todayISO()
    } else if (isTimestampColumn(col.dataType)) {
      defaults[col.name] = nowLocalDateTime()
    } else if (isTimeColumn(col.dataType)) {
      defaults[col.name] = nowLocalTime()
    }
  }
  return defaults
}