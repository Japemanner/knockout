// Zelfde uitkomst op de server (UTC) en in de browser (Europe/Amsterdam).
const TZ = 'Europe/Amsterdam'

export function amsterdamTodayISO(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date())
}

export function amsterdamFirstOfMonthISO(): string {
  return `${amsterdamTodayISO().slice(0, 7)}-01`
}

// Lokale middernacht van de Amsterdamse kalenderdag, als referentie voor date-fns
// (startOfWeek, endOfMonth, ...). Geeft in elke runtime-tijdzone dezelfde datums.
export function amsterdamReferenceDate(): Date {
  const [y = 1970, m = 1, d = 1] = amsterdamTodayISO().split('-').map(Number)
  return new Date(y, m - 1, d)
}