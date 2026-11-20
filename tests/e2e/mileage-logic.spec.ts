import { test, expect } from '@playwright/test'

// Pure unit-tests op de kilometerlogica (feature 031). Geen pagina-interactie,
// directe imports — conform tests/e2e/content-ideas-logic.spec.ts.

import { defaultRateForDate, MILEAGE_RATE_BY_YEAR } from '@/lib/mileage/rates'
import {
  aggregateMileageStats,
  buildMileageCsv,
  buildTripWritePayload,
  csvEscape,
  formatTripDateNL,
  mileageCsvFilename,
  recentRoutes,
  tripAmount,
  tripDistanceKm,
  validateTripPatch,
  type MileageCsvRow,
  type TripWritePatch,
} from '@/lib/mileage/trips'

// ---------------------------------------------------------------- tarief

test.describe('defaultRateForDate', () => {
  test('gebruikt het juiste jaartarief', () => {
    expect(defaultRateForDate('2024-06-01')).toBe(0.23)
    expect(defaultRateForDate('2025-01-01')).toBe(0.23)
    expect(defaultRateForDate('2026-01-01')).toBe(0.25)
    expect(defaultRateForDate('2026-11-20')).toBe(0.25)
  })

  test('toekomstig jaar neemt het hoogste bekende tarief', () => {
    expect(defaultRateForDate('2030-04-01')).toBe(MILEAGE_RATE_BY_YEAR[2026])
  })

  test('datum vóór 2024 (of ongeldig) valt terug op 2024', () => {
    expect(defaultRateForDate('2020-07-01')).toBe(MILEAGE_RATE_BY_YEAR[2024])
    expect(defaultRateForDate('geen-datum')).toBe(MILEAGE_RATE_BY_YEAR[2024])
  })
})

// ---------------------------------------------------------------- afstand en bedrag

test.describe('tripDistanceKm en tripAmount', () => {
  test('retour verdubbelt de enkele afstand, niet-retour laat hem staan', () => {
    expect(tripDistanceKm(31.2, true)).toBe(62.4)
    expect(tripDistanceKm(31.2, false)).toBe(31.2)
    expect(tripDistanceKm(0.05, true)).toBe(0.1)
  })

  test('bedrag wordt op twee decimalen afgerond', () => {
    expect(tripAmount(62.4, 0.25)).toBe(15.6)
    expect(tripAmount(10.1, 0.23)).toBe(2.32)
    expect(tripAmount(0, 0.25)).toBe(0)
  })
})

// ---------------------------------------------------------------- whitelist

test.describe('buildTripWritePayload', () => {
  test('laat alleen toegestane velden door en trimt tekst', () => {
    const payload = buildTripWritePayload({
      trip_date: '2026-11-20',
      client_id: 'client-1',
      from_location: '  Amsterdam  ',
      to_location: '  Utrecht ',
      purpose: '  Klantbezoek  ',
      distance_km: 62.4,
      is_return: true,
      rate_per_km: 0.25,
      reimbursed_at: null,
      notes: '  Parkeerkosten  ',
    })

    expect(payload).toEqual({
      trip_date: '2026-11-20',
      client_id: 'client-1',
      from_location: 'Amsterdam',
      to_location: 'Utrecht',
      purpose: 'Klantbezoek',
      distance_km: 62.4,
      is_return: true,
      rate_per_km: 0.25,
      reimbursed_at: null,
      notes: 'Parkeerkosten',
    })
  })

  test('lege opdrachtgever en notities worden NULL', () => {
    const payload = buildTripWritePayload({ client_id: '', notes: '   ' })
    expect(payload).toEqual({ client_id: null, notes: null })
  })

  test('amount, user_id, created_at en updated_at worden nooit meegestuurd', () => {
    const patch = {
      from_location: 'A',
      amount: 15.6,
      user_id: 'user-1',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    } as unknown as TripWritePatch

    const payload = buildTripWritePayload(patch)

    expect(payload).toEqual({ from_location: 'A' })
    expect(payload).not.toHaveProperty('amount')
    expect(payload).not.toHaveProperty('user_id')
    expect(payload).not.toHaveProperty('created_at')
    expect(payload).not.toHaveProperty('updated_at')
  })

  test('een lege patch levert een lege payload', () => {
    expect(buildTripWritePayload({})).toEqual({})
  })
})

// ---------------------------------------------------------------- validatie

test.describe('validateTripPatch', () => {
  const valid: TripWritePatch = {
    trip_date: '2026-11-20',
    from_location: 'Amsterdam',
    to_location: 'Utrecht',
    purpose: 'Klantbezoek',
    distance_km: 62.4,
    rate_per_km: 0.25,
  }

  test('keurt een volledige geldige rit goed', () => {
    expect(validateTripPatch(valid)).toBeNull()
  })

  test('weigert lege verplichte velden, afstand <= 0 en negatief tarief', () => {
    expect(validateTripPatch({ ...valid, from_location: '   ' })).not.toBeNull()
    expect(validateTripPatch({ ...valid, distance_km: 0 })).not.toBeNull()
    expect(validateTripPatch({ ...valid, rate_per_km: -0.01 })).not.toBeNull()
  })

  test('weigert een ongeldige datum en accepteert een geldige uitbetaaldatum', () => {
    expect(validateTripPatch({ ...valid, trip_date: '2026-02-30' })).not.toBeNull()
    expect(validateTripPatch({ reimbursed_at: '2026-11-20' }, { partial: true })).toBeNull()
    expect(validateTripPatch({ reimbursed_at: '20-11-2026' }, { partial: true })).not.toBeNull()
  })
})

// ---------------------------------------------------------------- statistieken

test.describe('aggregateMileageStats', () => {
  test('aggregeert maand, jaar en openstaand over één set rijen', () => {
    const stats = aggregateMileageStats(
      [
        { trip_date: '2026-11-02', distance_km: 10, amount: '2.50', reimbursed_at: null },
        { trip_date: '2026-11-15', distance_km: '20.0', amount: 5, reimbursed_at: '2026-11-16' },
        { trip_date: '2026-03-01', distance_km: 30, amount: 7.5, reimbursed_at: null },
        { trip_date: '2025-12-31', distance_km: 40, amount: 10, reimbursed_at: null },
      ],
      '2026-11-20',
    )

    expect(stats).toEqual({
      monthKm: 30,
      monthAmount: 7.5,
      yearKm: 60,
      yearAmount: 15,
      openAmount: 20,
      openCount: 3,
    })
  })

  test('lege set geeft nullen', () => {
    expect(aggregateMileageStats([], '2026-11-20')).toEqual({
      monthKm: 0,
      monthAmount: 0,
      yearKm: 0,
      yearAmount: 0,
      openAmount: 0,
      openCount: 0,
    })
  })
})

// ---------------------------------------------------------------- recente routes

test.describe('recentRoutes', () => {
  const trip = (overrides: Partial<Parameters<typeof recentRoutes>[0][number]> = {}) => ({
    from_location: 'Amsterdam',
    to_location: 'Utrecht',
    purpose: 'Klantbezoek',
    distance_km: 62.4,
    rate_per_km: 0.25,
    is_return: false,
    client_id: 'client-1',
    ...overrides,
  })

  test('dedupliceert op van/naar/doel/afstand en behoudt de nieuwste-volgorde', () => {
    const routes = recentRoutes([
      trip(),
      trip({ from_location: '  amsterdam ', to_location: 'UTRECHT' }),
      trip({ purpose: 'Iets anders' }),
      trip({ distance_km: 31.2 }),
    ])

    expect(routes).toHaveLength(3)
    expect(routes.map((route) => [route.from_location, route.purpose, route.distance_km])).toEqual([
      ['Amsterdam', 'Klantbezoek', 62.4],
      ['Amsterdam', 'Iets anders', 62.4],
      ['Amsterdam', 'Klantbezoek', 31.2],
    ])
  })

  test('beperkt tot vijf routes', () => {
    const routes = recentRoutes(
      Array.from({ length: 8 }, (_, i) => trip({ purpose: `Doel ${i}` })),
    )
    expect(routes).toHaveLength(5)
    expect(routes.map((route) => route.purpose)).toEqual([
      'Doel 0',
      'Doel 1',
      'Doel 2',
      'Doel 3',
      'Doel 4',
    ])
  })
})

// ---------------------------------------------------------------- CSV

test.describe('buildMileageCsv', () => {
  const rows: MileageCsvRow[] = [
    {
      trip_date: '2026-11-20',
      client_name: 'Acme BV',
      from_location: 'Amsterdam',
      to_location: 'Utrecht',
      purpose: 'Klantbezoek',
      distance_km: 62.4,
      is_return: true,
      rate_per_km: 0.25,
      amount: 15.6,
      reimbursed_at: null,
    },
    {
      trip_date: '2026-11-21',
      client_name: null,
      from_location: 'Den Haag',
      to_location: 'Rotterdam',
      purpose: 'Afspraak; met "quotes"',
      distance_km: 24,
      is_return: false,
      rate_per_km: 0.25,
      amount: 6,
      reimbursed_at: '2026-11-22',
    },
  ]

  test('begint met UTF-8 BOM en gebruikt een ;-gescheiden header', () => {
    const csv = buildMileageCsv([])
    expect(csv.charCodeAt(0)).toBe(0xfeff)
    expect(csv.slice(1).split('\r\n')[0]).toBe(
      'Datum;Opdrachtgever;Van;Naar;Zakelijk doel;Kilometers;Retour;Tarief;Bedrag;Uitbetaald op',
    )
  })

  test('gebruikt komma-decimalen en Nederlandse datums', () => {
    const csv = buildMileageCsv(rows)
    expect(csv).toContain('20-11-2026;Acme BV;Amsterdam;Utrecht;Klantbezoek;62,4;Ja;0,25;15,60;')
    expect(csv).toContain('21-11-2026;;Den Haag;Rotterdam;')
    expect(csv).toContain(';24,0;Nee;0,25;6,00;22-11-2026')
  })

  test('quotet velden met ; of " en verdubbelt aanhalingstekens', () => {
    expect(csvEscape('Afspraak; met "quotes"')).toBe('"Afspraak; met ""quotes"""')
    expect(buildMileageCsv(rows)).toContain('"Afspraak; met ""quotes"""')
  })

  test('bestandsnaam bevat de periode', () => {
    expect(mileageCsvFilename('2026-11-01', '2026-11-30')).toBe(
      'kilometers-2026-11-01-2026-11-30.csv',
    )
  })

  test('formatteert ISO-datums zonder tijdzone-verschuiving', () => {
    expect(formatTripDateNL('2026-11-20')).toBe('20-11-2026')
    expect(formatTripDateNL(null)).toBe('')
  })
})
