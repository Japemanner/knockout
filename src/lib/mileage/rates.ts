// Onbelaste kilometervergoeding per kalenderjaar (gerichte vrijstelling).
// 2026: € 0,25, met terugwerkende kracht per 1-1-2026 (beleidsbesluit, Stcrt. 2026, 18302).
export const MILEAGE_RATE_BY_YEAR: Record<number, number> = {
  2024: 0.23,
  2025: 0.23,
  2026: 0.25,
}

const KNOWN_YEARS = Object.keys(MILEAGE_RATE_BY_YEAR)
  .map(Number)
  .sort((a, b) => a - b)

/**
 * Tarief voor de opgegeven ISO-datum (YYYY-MM-DD).
 * - Onbekend jaar: het tarief van het hoogste bekende jaar ≤ dat jaar.
 * - Vóór 2024 (of een ongeldige datum): het tarief van 2024.
 */
export function defaultRateForDate(isoDate: string): number {
  const year = Number(isoDate.slice(0, 4))
  const firstYear = KNOWN_YEARS[0] ?? 2024
  if (!Number.isFinite(year) || year < firstYear) {
    return MILEAGE_RATE_BY_YEAR[firstYear] ?? 0
  }

  const eligible = KNOWN_YEARS.filter((known) => known <= year)
  const best = eligible.length > 0 ? Math.max(...eligible) : firstYear
  return MILEAGE_RATE_BY_YEAR[best] ?? 0
}
