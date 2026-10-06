import { test, expect } from '@playwright/test'
import {
  isDecimalType,
  isIntegerType,
  normalizeForDisplay,
  parseDecimalInput,
  parseIntegerInput,
  validateDecimalFinal,
} from '@/lib/decimal'

test.describe('isDecimalType', () => {
  test('herkent decimale types', () => {
    expect(isDecimalType('numeric')).toBe(true)
    expect(isDecimalType('decimal')).toBe(true)
    expect(isDecimalType('real')).toBe(true)
    expect(isDecimalType('double precision')).toBe(true)
    expect(isDecimalType('float4')).toBe(true)
    expect(isDecimalType('float8')).toBe(true)
  })

  test('wijst niet-decimale types af', () => {
    expect(isDecimalType('integer')).toBe(false)
    expect(isDecimalType('text')).toBe(false)
    expect(isDecimalType('bigint')).toBe(false)
  })
})

test.describe('isIntegerType', () => {
  test('herkent integer types', () => {
    expect(isIntegerType('integer')).toBe(true)
    expect(isIntegerType('int')).toBe(true)
    expect(isIntegerType('int4')).toBe(true)
    expect(isIntegerType('smallint')).toBe(true)
    expect(isIntegerType('int2')).toBe(true)
    expect(isIntegerType('bigint')).toBe(true)
    expect(isIntegerType('int8')).toBe(true)
  })

  test('wijst niet-integer types af', () => {
    expect(isIntegerType('numeric')).toBe(false)
    expect(isIntegerType('decimal')).toBe(false)
    expect(isIntegerType('text')).toBe(false)
  })
})

test.describe('normalizeForDisplay', () => {
  test('null en undefined worden lege string', () => {
    expect(normalizeForDisplay(null)).toBe('')
    expect(normalizeForDisplay(undefined)).toBe('')
  })

  test('Number wordt string met punt', () => {
    expect(normalizeForDisplay(1.5)).toBe('1.5')
    expect(normalizeForDisplay(42)).toBe('42')
    expect(normalizeForDisplay(-0.75)).toBe('-0.75')
  })

  test('string met komma wordt punt', () => {
    expect(normalizeForDisplay('1,5')).toBe('1.5')
    expect(normalizeForDisplay('1.5')).toBe('1.5')
  })
})

test.describe('parseDecimalInput', () => {
  test('accepteert punt als decimaal scheidingsteken', () => {
    const result = parseDecimalInput('1.5', true)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value).toBe(1.5)
  })

  test('accepteert komma als decimaal scheidingsteken en normaliseert naar punt', () => {
    const result = parseDecimalInput('1,5', true)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value).toBe(1.5)
  })

  test('accepteert negatieve waarden met punt en komma', () => {
    const r1 = parseDecimalInput('-1.5', true)
    expect(r1.ok).toBe(true)
    if (r1.ok) expect(r1.value).toBe(-1.5)

    const r2 = parseDecimalInput('-1,5', true)
    expect(r2.ok).toBe(true)
    if (r2.ok) expect(r2.value).toBe(-1.5)
  })

  test('accepteert gehele getallen', () => {
    const result = parseDecimalInput('42', true)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value).toBe(42)
  })

  test('accepteert leidende nul', () => {
    const r1 = parseDecimalInput('0.5', true)
    expect(r1.ok).toBe(true)
    if (r1.ok) expect(r1.value).toBe(0.5)

    const r2 = parseDecimalInput('0,5', true)
    expect(r2.ok).toBe(true)
    if (r2.ok) expect(r2.value).toBe(0.5)
  })

  test('leeg + nullable => null', () => {
    const result = parseDecimalInput('', true)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value).toBeNull()
  })

  test('leeg + niet-nullable => fout', () => {
    const result = parseDecimalInput('', false)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('Dit veld is verplicht')
  })

  test('whitespace-only + nullable => null', () => {
    const result = parseDecimalInput('   ', true)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value).toBeNull()
  })

  test('wijst meerdere punten af', () => {
    const result = parseDecimalInput('1..5', true)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('Ongeldige decimale waarde')
  })

  test('wijst meerdere komma\'s af', () => {
    const result = parseDecimalInput('1,,5', true)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('Ongeldige decimale waarde')
  })

  test('wijst gemengde scheidingstekens af', () => {
    const r1 = parseDecimalInput('1,5.0', true)
    expect(r1.ok).toBe(false)

    const r2 = parseDecimalInput('1.5,0', true)
    expect(r2.ok).toBe(false)
  })

  test('wijst duizendtals-scheidingstekens af', () => {
    const r1 = parseDecimalInput('1.234,56', true)
    expect(r1.ok).toBe(false)

    const r2 = parseDecimalInput('1,234.56', true)
    expect(r2.ok).toBe(false)
  })

  test('wijst letters af', () => {
    const r1 = parseDecimalInput('1abc', true)
    expect(r1.ok).toBe(false)

    const r2 = parseDecimalInput('abc', true)
    expect(r2.ok).toBe(false)
  })

  test('enkele punt of komma is een geldige tussenstatus tijdens typen (null, geen fout)', () => {
    const r1 = parseDecimalInput('.', true)
    expect(r1.ok).toBe(true)
    if (r1.ok) expect(r1.value).toBeNull()

    const r2 = parseDecimalInput(',', true)
    expect(r2.ok).toBe(true)
    if (r2.ok) expect(r2.value).toBeNull()
  })

  test('enkele punt of komma in verplicht veld is ook een tussenstatus (null)', () => {
    // Live-typen blokkeert niet; submit-lagen (zoals ClientManageDialog)
    // wijzen value === null zelf af met hun eigen foutmelding.
    const r = parseDecimalInput('.', false)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value).toBeNull()
  })

  test('tussenstatus "-" en "-." zijn geldig tijdens typen', () => {
    const r1 = parseDecimalInput('-', true)
    expect(r1.ok).toBe(true)
    if (r1.ok) expect(r1.value).toBeNull()

    const r2 = parseDecimalInput('-.', true)
    expect(r2.ok).toBe(true)
    if (r2.ok) expect(r2.value).toBeNull()
  })

  test('tussenstatus "3." en "3," zijn geldig tijdens typen', () => {
    const r1 = parseDecimalInput('3.', true)
    expect(r1.ok).toBe(true)
    if (r1.ok) expect(r1.value).toBe(3)

    const r2 = parseDecimalInput('3,', true)
    expect(r2.ok).toBe(true)
    if (r2.ok) expect(r2.value).toBe(3)
  })

  test('trimt whitespace rondom geldige invoer', () => {
    const result = parseDecimalInput('  1.5  ', true)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value).toBe(1.5)
  })
})

test.describe('parseIntegerInput', () => {
  test('accepteert gehele getallen', () => {
    const r1 = parseIntegerInput('42', true)
    expect(r1.ok).toBe(true)
    if (r1.ok) expect(r1.value).toBe(42)

    const r2 = parseIntegerInput('0', true)
    expect(r2.ok).toBe(true)
    if (r2.ok) expect(r2.value).toBe(0)
  })

  test('accepteert negatieve gehele getallen', () => {
    const result = parseIntegerInput('-42', true)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value).toBe(-42)
  })

  test('wijst punt af met specifieke foutmelding', () => {
    const result = parseIntegerInput('1.5', true)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('Gehele getallen toegestaan — geen decimale scheidingsteken')
  })

  test('wijst komma af met specifieke foutmelding', () => {
    const result = parseIntegerInput('1,5', true)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('Gehele getallen toegestaan — geen decimale scheidingsteken')
  })

  test('wijst 1.0 af (zelfs als numeriek gelijk aan integer)', () => {
    const result = parseIntegerInput('1.0', true)
    expect(result.ok).toBe(false)
  })

  test('wijst letters af', () => {
    const result = parseIntegerInput('42abc', true)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('Ongeldig geheel getal')
  })

  test('leeg + nullable => null', () => {
    const result = parseIntegerInput('', true)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value).toBeNull()
  })

  test('leeg + niet-nullable => fout', () => {
    const result = parseIntegerInput('', false)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('Dit veld is verplicht')
  })
})

test.describe('validateDecimalFinal', () => {
  test('wijst tussenstatussen af die parseDecimalInput toestaat', () => {
    expect(validateDecimalFinal('.', true).ok).toBe(false)
    expect(validateDecimalFinal(',', true).ok).toBe(false)
    expect(validateDecimalFinal('-', true).ok).toBe(false)
    expect(validateDecimalFinal('-.', true).ok).toBe(false)
    expect(validateDecimalFinal('3.', true).ok).toBe(false)
    expect(validateDecimalFinal('3,', true).ok).toBe(false)
  })

  test('accepteert complete decimale waarden', () => {
    const r1 = validateDecimalFinal('1.5', true)
    expect(r1.ok).toBe(true)
    if (r1.ok) expect(r1.value).toBe(1.5)

    const r2 = validateDecimalFinal('1,5', true)
    expect(r2.ok).toBe(true)
    if (r2.ok) expect(r2.value).toBe(1.5)

    const r3 = validateDecimalFinal('42', false)
    expect(r3.ok).toBe(true)
    if (r3.ok) expect(r3.value).toBe(42)
  })

  test('leeg + nullable => null; leeg + niet-nullable => fout', () => {
    const r1 = validateDecimalFinal('', true)
    expect(r1.ok).toBe(true)
    if (r1.ok) expect(r1.value).toBeNull()

    const r2 = validateDecimalFinal('', false)
    expect(r2.ok).toBe(false)
  })
})