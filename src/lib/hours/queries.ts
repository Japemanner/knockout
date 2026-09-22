// Shared query- en aggregatielogica voor /uren. Draait op de server (SSR-prefetch
// in src/app/(dashboard)/uren/page.tsx) én in de browser (queryFn's in
// src/hooks/useHours.ts) — vandaar geen 'use server'. Supabase-fouten worden
// gegooid i.p.v. stil [] teruggeven, zodat React Query de retry doet.
// Mutaties blijven server actions in src/actions/hours.ts.

import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, format } from 'date-fns'
import type { Client, ClientTargetPeriod, HourEntry } from '@/types/database.types'
import { amsterdamReferenceDate, amsterdamFirstOfMonthISO, amsterdamTodayISO } from '@/lib/hours/dates'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type UntypedClient = any

export interface ClientWithProgress extends Client {
  current_hours: number
  target_label: string
  percentage: number
}

export interface EntryWithClient extends HourEntry {
  client_name: string
}

export interface RevenueStats {
  week: number
  month: number
}

export interface EntriesOptions {
  clientId?: string
  fromDate?: string
  toDate?: string
  limit?: number
  offset?: number
}

// ============================================================
// QUERY KEYS — exact dezelfde vorm als voorheen in useHours.ts,
// zodat cached entries van eerdere sessies blijven matchen.
// ============================================================

export const hoursKeys = {
  clients: ['hours', 'clients'] as const,
  entries: (options?: EntriesOptions) => ['hours', 'entries', options] as const,
  openEntries: ['hours', 'open-entries'] as const,
  dashboard: ['hours', 'dashboard'] as const,
  revenue: (clientId: string | undefined) => ['hours', 'revenue', clientId ?? 'all'] as const,
}

export function defaultEntriesOptions(): EntriesOptions {
  return {
    fromDate: amsterdamFirstOfMonthISO(),
    toDate: amsterdamTodayISO(),
    limit: 50,
    offset: 0,
  }
}

// ============================================================
// FETCHERS
// ============================================================

function mapEntryRow(row: Record<string, unknown>): EntryWithClient {
  const client = row.kk_clients as { name: string } | null
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    client_id: row.client_id as string,
    entry_date: row.entry_date as string,
    hours: Number(row.hours),
    hourly_rate: Number(row.hourly_rate),
    description: (row.description as string | null) ?? null,
    start_time: (row.start_time as string | null) ?? null,
    end_time: (row.end_time as string | null) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    client_name: client?.name ?? 'Onbekend',
  }
}

export async function fetchClients(supabase: UntypedClient, userId: string): Promise<Client[]> {
  const { data, error } = await supabase
    .from('kk_clients')
    .select('*')
    .eq('user_id', userId)
    .order('name', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []) as Client[]
}

export async function fetchOpenEntries(supabase: UntypedClient, userId: string): Promise<EntryWithClient[]> {
  const { data, error } = await supabase
    .from('kk_hour_entries')
    .select('*, kk_clients!inner(name)')
    .eq('user_id', userId)
    .is('end_time', null)
    .order('entry_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []).map((row: Record<string, unknown>) => mapEntryRow(row))
}

export async function fetchEntries(
  supabase: UntypedClient,
  userId: string,
  options?: EntriesOptions,
): Promise<{ entries: EntryWithClient[]; total: number }> {
  let query = supabase
    .from('kk_hour_entries')
    .select('*, kk_clients!inner(name)', { count: 'exact' })
    .eq('user_id', userId)
    .order('entry_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (options?.clientId) query = query.eq('client_id', options.clientId)
  if (options?.fromDate) query = query.gte('entry_date', options.fromDate)
  if (options?.toDate) query = query.lte('entry_date', options.toDate)

  const limit = options?.limit ?? 50
  const offset = options?.offset ?? 0
  query = query.range(offset, offset + limit - 1)

  const { data, count, error } = await query
  if (error) throw new Error(error.message)

  const entries: EntryWithClient[] = (data ?? []).map((row: Record<string, unknown>) => mapEntryRow(row))
  return { entries, total: count ?? 0 }
}

// ============================================================
// PERIODE HELPERS
// ============================================================

function periodStart(period: ClientTargetPeriod, now: Date): Date | null {
  if (period === 'week') return startOfWeek(now, { weekStartsOn: 1 })
  if (period === 'month') return startOfMonth(now)
  return null // total = no start boundary
}

function periodEnd(period: ClientTargetPeriod, now: Date): Date | null {
  if (period === 'week') return endOfWeek(now, { weekStartsOn: 1 })
  if (period === 'month') return endOfMonth(now)
  return null // total = no end boundary
}

function periodLabel(period: ClientTargetPeriod): string {
  if (period === 'week') return 'per week'
  if (period === 'month') return 'per maand'
  return 'totaal project'
}

export async function fetchRevenueStats(
  supabase: UntypedClient,
  userId: string,
  clientId?: string,
): Promise<RevenueStats> {
  const now = amsterdamReferenceDate()
  const weekStart = startOfWeek(now, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 })
  const monthStart = startOfMonth(now)
  const monthEnd = endOfMonth(now)

  const weekStartStr = format(weekStart, 'yyyy-MM-dd')
  const weekEndStr = format(weekEnd, 'yyyy-MM-dd')
  const monthStartStr = format(monthStart, 'yyyy-MM-dd')
  const monthEndStr = format(monthEnd, 'yyyy-MM-dd')

  // Fetch entries covering both week and month windows (month is the wider net)
  let query = supabase
    .from('kk_hour_entries')
    .select('hours, hourly_rate, entry_date')
    .eq('user_id', userId)
    .gte('entry_date', monthStartStr)
    .lte('entry_date', monthEndStr)

  if (clientId) query = query.eq('client_id', clientId)

  const { data, error } = await query
  if (error) throw new Error(error.message)

  let weekRevenue = 0
  let monthRevenue = 0
  for (const row of data as Array<{ hours: number; hourly_rate: number; entry_date: string }>) {
    const hours = Number(row.hours)
    if (hours <= 0) continue // lopende regels (zonder eindtijd) tellen niet mee
    const revenue = hours * Number(row.hourly_rate)
    monthRevenue += revenue
    if (row.entry_date >= weekStartStr && row.entry_date <= weekEndStr) {
      weekRevenue += revenue
    }
  }

  return {
    week: Math.round(weekRevenue * 100) / 100,
    month: Math.round(monthRevenue * 100) / 100,
  }
}

export async function fetchDashboardStats(
  supabase: UntypedClient,
  userId: string,
): Promise<ClientWithProgress[]> {
  const { data: clientRows, error: clientsError } = await supabase
    .from('kk_clients')
    .select('*')
    .eq('user_id', userId)
    .order('name', { ascending: true })

  if (clientsError) throw new Error(clientsError.message)

  const clients: Client[] = (clientRows ?? []).filter((c: Client) => !c.archived) as Client[]
  if (clients.length === 0) return []

  // Find the earliest period start and latest period end across all clients (for batch filtering)
  const now = amsterdamReferenceDate()
  let earliestStart: Date | null = null
  let latestEnd: Date | null = null
  for (const client of clients) {
    const start = periodStart(client.target_period, now)
    if (start && (!earliestStart || start < earliestStart)) {
      earliestStart = start
    }
    const end = periodEnd(client.target_period, now)
    if (end && (!latestEnd || end > latestEnd)) {
      latestEnd = end
    }
  }

  // Single query: fetch client_id + hours + entry_date for all active clients
  let query = supabase
    .from('kk_hour_entries')
    .select('client_id, hours, entry_date')
    .eq('user_id', userId)
    .in('client_id', clients.map((c) => c.id))

  if (earliestStart) {
    query = query.gte('entry_date', format(earliestStart, 'yyyy-MM-dd'))
  }
  if (latestEnd) {
    query = query.lte('entry_date', format(latestEnd, 'yyyy-MM-dd'))
  }

  const { data, error } = await query
  if (error || !data) {
    return clients.map((client) => ({
      ...client,
      current_hours: 0,
      target_label: periodLabel(client.target_period),
      percentage: 0,
    }))
  }

  // Build a map of entries per client for aggregation
  const entriesByClient = new Map<string, Array<{ hours: number; entry_date: string }>>()
  for (const row of data as Array<{ client_id: string; hours: number; entry_date: string }>) {
    if (!entriesByClient.has(row.client_id)) {
      entriesByClient.set(row.client_id, [])
    }
    entriesByClient.get(row.client_id)!.push({ hours: Number(row.hours), entry_date: row.entry_date })
  }

  // Aggregate per client applying each client's own period start AND end
  return clients.map((client) => {
    const entries = entriesByClient.get(client.id) ?? []
    const start = periodStart(client.target_period, now)
    const end = periodEnd(client.target_period, now)
    const startDateStr = start ? format(start, 'yyyy-MM-dd') : null
    const endDateStr = end ? format(end, 'yyyy-MM-dd') : null

    const totalHours = entries
      .filter((e) => (!startDateStr || e.entry_date >= startDateStr) && (!endDateStr || e.entry_date <= endDateStr))
      .filter((e) => e.hours > 0) // lopende regels (zonder eindtijd) tellen niet mee
      .reduce((sum, e) => sum + e.hours, 0)

    const target = Number(client.target_hours) || 0
    const percentage = target > 0 ? Math.min(100, Math.round((totalHours / target) * 100)) : 0

    return {
      ...client,
      current_hours: Math.round(totalHours * 100) / 100,
      target_label: periodLabel(client.target_period),
      percentage,
    }
  })
}