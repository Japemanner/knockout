export type DecimalParseResult =
  | { ok: true; value: number | null }
  | { ok: false; error: string }

const DECIMAL_TYPES = ['numeric', 'decimal', 'real', 'double precision', 'float4', 'float8']
const INTEGER_TYPES = ['integer', 'int', 'int4', 'smallint', 'int2', 'bigint', 'int8']

// Toestaan van tussenstatussen tijdens typen: '-', '3.', '3,', '-.', '3.14', '3,14'
const DECIMAL_REGEX = /^-?(\d+([.,]\d*)?|[.,]\d+)$/
const DECIMAL_FINAL_REGEX = /^-?(\d+([.,]\d+)?|[.,]\d+)$/
const INTEGER_REGEX = /^-?\d+$/

export function isDecimalType(dataType: string): boolean {
  return DECIMAL_TYPES.includes(dataType)
}

export function isIntegerType(dataType: string): boolean {
  return INTEGER_TYPES.includes(dataType)
}

export function normalizeForDisplay(value: unknown): string {
  if (value === null || value === undefined) return ''
  return String(value).replace(/,/g, '.')
}

export function parseDecimalInput(raw: string, isNullable: boolean): DecimalParseResult {
  const trimmed = raw.trim()
  if (trimmed === '') {
    return isNullable
      ? { ok: true, value: null }
      : { ok: false, error: 'Dit veld is verplicht' }
  }
  const normalized = trimmed.replace(/,/g, '.')
  // Tussenstatussen zoals '-', '3.', '-.' zijn geldig tijdens typen maar nog geen getal
  if (normalized === '-' || normalized === '.' || normalized === '-.') {
    return { ok: true, value: null }
  }
  if (!DECIMAL_REGEX.test(normalized)) {
    return { ok: false, error: 'Ongeldige decimale waarde' }
  }
  const parsed = Number(normalized)
  if (!Number.isFinite(parsed)) {
    return { ok: false, error: 'Ongeldige decimale waarde' }
  }
  return { ok: true, value: parsed }
}

// Strenge validatie voor definitieve opslag — wijst '3.' en '-' af
export function validateDecimalFinal(raw: string, isNullable: boolean): DecimalParseResult {
  const trimmed = raw.trim()
  if (trimmed === '') {
    return isNullable
      ? { ok: true, value: null }
      : { ok: false, error: 'Dit veld is verplicht' }
  }
  const normalized = trimmed.replace(/,/g, '.')
  if (!DECIMAL_FINAL_REGEX.test(normalized)) {
    return { ok: false, error: 'Ongeldige decimale waarde' }
  }
  const parsed = Number(normalized)
  if (!Number.isFinite(parsed)) {
    return { ok: false, error: 'Ongeldige decimale waarde' }
  }
  return { ok: true, value: parsed }
}

export function parseIntegerInput(raw: string, isNullable: boolean): DecimalParseResult {
  const trimmed = raw.trim()
  if (trimmed === '') {
    return isNullable
      ? { ok: true, value: null }
      : { ok: false, error: 'Dit veld is verplicht' }
  }
  if (!INTEGER_REGEX.test(trimmed)) {
    if (trimmed.includes('.') || trimmed.includes(',')) {
      return { ok: false, error: 'Gehele getallen toegestaan — geen decimale scheidingsteken' }
    }
    return { ok: false, error: 'Ongeldig geheel getal' }
  }
  const parsed = Number(trimmed)
  if (!Number.isFinite(parsed)) {
    return { ok: false, error: 'Ongeldig geheel getal' }
  }
  return { ok: true, value: parsed }
}