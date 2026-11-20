import type { MileageTrip } from '@/types/database.types'

// Pure hulptypes en -functies voor de kilometerregistratie. Geen React, geen
// Supabase; unit-testbaar in tests/e2e/mileage-logic.spec.ts.

export type TripWriteField =
  | 'trip_date'
  | 'client_id'
  | 'from_location'
  | 'to_location'
  | 'purpose'
  | 'distance_km'
  | 'is_return'
  | 'rate_per_km'
  | 'reimbursed_at'
  | 'notes'

export type TripWritePatch = Partial<Pick<MileageTrip, TripWriteField>>
export type TripWritePayload = Pick<MileageTrip, TripWriteField>

function round1(value: number): number {
  return Math.round(value * 10) / 10
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

/** Totale afstand: bij "retour" wordt de enkele afstand verdubbeld. */
export function tripDistanceKm(singleKm: number, isReturn: boolean): number {
  return round1(isReturn ? singleKm * 2 : singleKm)
}

/** Bedrag zoals de generated column het berekent: round(km × tarief, 2). */
export function tripAmount(distanceKm: number, ratePerKm: number): number {
  return round2(distanceKm * ratePerKm)
}

/**
 * De enige plek die bepaalt welke keys naar kk_mileage_trips mogen.
 * amount (generated), user_id, created_at en updated_at kunnen hier nooit
 * in terechtkomen, ook niet als een aanroeper ze via een cast meestuurt.
 */
export function buildTripWritePayload(patch: TripWritePatch): Record<string, unknown> {
  const payload: Record<string, unknown> = {}
  if (patch.trip_date !== undefined) payload.trip_date = patch.trip_date
  if (patch.client_id !== undefined) payload.client_id = patch.client_id || null
  if (patch.from_location !== undefined) payload.from_location = patch.from_location.trim()
  if (patch.to_location !== undefined) payload.to_location = patch.to_location.trim()
  if (patch.purpose !== undefined) payload.purpose = patch.purpose.trim()
  if (patch.distance_km !== undefined) payload.distance_km = patch.distance_km
  if (patch.is_return !== undefined) payload.is_return = patch.is_return
  if (patch.rate_per_km !== undefined) payload.rate_per_km = patch.rate_per_km
  if (patch.reimbursed_at !== undefined) payload.reimbursed_at = patch.reimbursed_at || null
  if (patch.notes !== undefined) payload.notes = patch.notes?.trim() || null
  return payload
}

function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

/**
 * Server-side validatie vóór de write. `partial` geldt voor updates: alleen
 * meegegeven velden worden gecontroleerd, maar ze mogen nooit leeg/ongeldig zijn.
 */
export function validateTripPatch(
  patch: TripWritePatch,
  options: { partial?: boolean } = {},
): string | null {
  const partial = options.partial ?? false

  if (patch.trip_date !== undefined) {
    if (!isValidIsoDate(patch.trip_date)) return 'Ongeldige datum'
  } else if (!partial) {
    return 'Datum is verplicht'
  }

  for (const field of ['from_location', 'to_location', 'purpose'] as const) {
    const value = patch[field]
    if (value !== undefined) {
      if (!value.trim()) return 'Van, naar en zakelijk doel zijn verplicht'
    } else if (!partial) {
      return 'Van, naar en zakelijk doel zijn verplicht'
    }
  }

  if (patch.distance_km !== undefined) {
    if (!Number.isFinite(patch.distance_km) || patch.distance_km <= 0) {
      return 'Afstand moet groter zijn dan 0'
    }
    if (patch.distance_km > 99999.9) return 'Afstand is te groot'
  } else if (!partial) {
    return 'Afstand is verplicht'
  }

  if (patch.rate_per_km !== undefined) {
    if (!Number.isFinite(patch.rate_per_km) || patch.rate_per_km < 0) {
      return 'Tarief moet 0 of hoger zijn'
    }
    if (patch.rate_per_km > 99.99) return 'Tarief is te hoog'
  } else if (!partial) {
    return 'Tarief is verplicht'
  }

  if (patch.reimbursed_at !== undefined && patch.reimbursed_at !== null) {
    if (!isValidIsoDate(patch.reimbursed_at)) return 'Ongeldige uitbetaaldatum'
  }

  return null
}

// ============================================================
// STATISTIEKEN
// ============================================================

export interface MileageStats {
  monthKm: number
  monthAmount: number
  yearKm: number
  yearAmount: number
  openAmount: number
  openCount: number
}

export interface MileageStatsRow {
  trip_date: string
  distance_km: number | string
  amount: number | string
  reimbursed_at: string | null
}

/**
 * Aggregeert één set rijen (geen N+1) tot maand-, jaar- en openstaande cijfers.
 * `referenceDate` is een Amsterdamse kalenderdag (YYYY-MM-DD).
 */
export function aggregateMileageStats(
  rows: MileageStatsRow[],
  referenceDate: string,
): MileageStats {
  const monthPrefix = referenceDate.slice(0, 7)
  const yearPrefix = referenceDate.slice(0, 4)

  let monthKm = 0
  let monthAmount = 0
  let yearKm = 0
  let yearAmount = 0
  let openAmount = 0
  let openCount = 0

  for (const row of rows) {
    const km = Number(row.distance_km)
    const amount = Number(row.amount)
    const inMonth = row.trip_date.startsWith(monthPrefix)
    const inYear = row.trip_date.startsWith(yearPrefix)

    if (inMonth) {
      monthKm += km
      monthAmount += amount
    }
    if (inYear) {
      yearKm += km
      yearAmount += amount
    }
    if (row.reimbursed_at === null) {
      openAmount += amount
      openCount += 1
    }
  }

  return {
    monthKm: round1(monthKm),
    monthAmount: round2(monthAmount),
    yearKm: round1(yearKm),
    yearAmount: round2(yearAmount),
    openAmount: round2(openAmount),
    openCount,
  }
}

// ============================================================
// RECENTE ROUTES
// ============================================================

export interface RecentRoute {
  from_location: string
  to_location: string
  purpose: string
  distance_km: number
  rate_per_km: number
  is_return: boolean
  client_id: string | null
}

type RecentRouteCandidate = Pick<
  MileageTrip,
  'from_location' | 'to_location' | 'purpose' | 'distance_km' | 'rate_per_km' | 'is_return' | 'client_id'
>

/**
 * Laatste N unieke van/naar/doel/afstand-combinaties (invoervolgorde behouden,
 * dus nieuwste eerst). Dedupliceert op genormaliseerde tekst en afstand.
 */
export function recentRoutes(trips: RecentRouteCandidate[], limit = 5): RecentRoute[] {
  const seen = new Set<string>()
  const routes: RecentRoute[] = []

  for (const trip of trips) {
    const key = [
      trip.from_location.trim().toLowerCase(),
      trip.to_location.trim().toLowerCase(),
      trip.purpose.trim().toLowerCase(),
      round1(Number(trip.distance_km)),
    ].join('|')
    if (seen.has(key)) continue
    seen.add(key)
    routes.push({
      from_location: trip.from_location,
      to_location: trip.to_location,
      purpose: trip.purpose,
      distance_km: Number(trip.distance_km),
      rate_per_km: Number(trip.rate_per_km),
      is_return: Boolean(trip.is_return),
      client_id: trip.client_id,
    })
    if (routes.length >= limit) break
  }

  return routes
}

// ============================================================
// FORMATTERING (Nederlands)
// ============================================================

const euroFormatter = new Intl.NumberFormat('nl-NL', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const kmFormatter = new Intl.NumberFormat('nl-NL', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

export function formatEuroNL(value: number): string {
  return euroFormatter.format(value)
}

export function formatKmNL(value: number): string {
  return kmFormatter.format(value)
}

export function formatRateNL(value: number): string {
  return Number(value).toFixed(2).replace('.', ',')
}

/** ISO-datum (YYYY-MM-DD) naar dd-mm-jjjj zonder tijdzone-verschuiving. */
export function formatTripDateNL(iso: string | null): string {
  if (!iso) return ''
  const [year, month, day] = iso.slice(0, 10).split('-')
  if (!year || !month || !day) return ''
  return `${day}-${month}-${year}`
}

// ============================================================
// CSV-EXPORT (Excel NL: ; als scheidingsteken, komma-decimalen, UTF-8 BOM)
// ============================================================

export interface MileageCsvRow
  extends Pick<
    MileageTrip,
    | 'trip_date'
    | 'from_location'
    | 'to_location'
    | 'purpose'
    | 'distance_km'
    | 'is_return'
    | 'rate_per_km'
    | 'amount'
    | 'reimbursed_at'
  > {
  client_name: string | null
}

export const MILEAGE_CSV_HEADER = [
  'Datum',
  'Opdrachtgever',
  'Van',
  'Naar',
  'Zakelijk doel',
  'Kilometers',
  'Retour',
  'Tarief',
  'Bedrag',
  'Uitbetaald op',
]

export function csvEscape(value: string): string {
  if (/[";\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function csvNumber(value: number, decimals: number): string {
  return Number(value).toFixed(decimals).replace('.', ',')
}

export function buildMileageCsv(rows: MileageCsvRow[]): string {
  const lines = [MILEAGE_CSV_HEADER.join(';')]

  for (const row of rows) {
    lines.push(
      [
        formatTripDateNL(row.trip_date),
        row.client_name ?? '',
        row.from_location,
        row.to_location,
        row.purpose,
        csvNumber(Number(row.distance_km), 1),
        row.is_return ? 'Ja' : 'Nee',
        csvNumber(Number(row.rate_per_km), 2),
        csvNumber(Number(row.amount), 2),
        formatTripDateNL(row.reimbursed_at),
      ]
        .map((value) => csvEscape(String(value)))
        .join(';'),
    )
  }

  return `\uFEFF${lines.join('\r\n')}\r\n`
}

export function mileageCsvFilename(fromDate: string, toDate: string): string {
  return `kilometers-${fromDate}-${toDate}.csv`
}
