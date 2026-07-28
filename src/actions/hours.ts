'use server'

import { getAuthenticatedClient } from '@/lib/supabase/actions'
import { revalidatePath } from 'next/cache'
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, format } from 'date-fns'
import type { Client, ClientTargetPeriod, HourEntry } from '@/types/database.types'

export type ActionResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string }

export interface ClientWithProgress extends Client {
  current_hours: number
  target_label: string
  percentage: number
}

export interface EntryWithClient extends HourEntry {
  client_name: string
}

// ============================================================
// CLIENTS
// ============================================================

export async function listClients(): Promise<Client[]> {
  try {
    const { supabase, userId } = await getAuthenticatedClient()
    const { data, error } = await supabase
      .from('kk_clients')
      .select('*')
      .eq('user_id', userId)
      .order('name', { ascending: true })

    if (error) return []
    return (data ?? []) as Client[]
  } catch (err) {
    console.error('listClients:', err)
    return []
  }
}

export async function listActiveClients(): Promise<Client[]> {
  const all = await listClients()
  return all.filter((c) => !c.archived)
}

export async function createClient(input: {
  name: string
  target_hours: number
  target_period: ClientTargetPeriod
  hourly_rate: number
}): Promise<ActionResult<Client>> {
  try {
    const { supabase, userId } = await getAuthenticatedClient()
    const { data, error } = await supabase
      .from('kk_clients')
      .insert({
        user_id: userId,
        name: input.name.trim(),
        target_hours: input.target_hours,
        target_period: input.target_period,
        hourly_rate: input.hourly_rate,
      })
      .select()
      .single()

    if (error || !data) return { success: false, error: error?.message ?? 'Kon opdrachtgever niet aanmaken' }
    revalidatePath('/uren')
    return { success: true, data: data as Client }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Onbekende fout' }
  }
}

export async function updateClient(
  clientId: string,
  patch: Partial<Pick<Client, 'name' | 'target_hours' | 'target_period' | 'hourly_rate' | 'archived'>>
): Promise<ActionResult<Client>> {
  try {
    const { supabase } = await getAuthenticatedClient()
    const updateData: Record<string, unknown> = {}
    if (patch.name !== undefined) updateData.name = patch.name.trim()
    if (patch.target_hours !== undefined) updateData.target_hours = patch.target_hours
    if (patch.target_period !== undefined) updateData.target_period = patch.target_period
    if (patch.hourly_rate !== undefined) updateData.hourly_rate = patch.hourly_rate
    if (patch.archived !== undefined) updateData.archived = patch.archived
    if (Object.keys(updateData).length === 0) return { success: true, data: {} as Client }

    const { data, error } = await supabase
      .from('kk_clients')
      .update(updateData)
      .eq('id', clientId)
      .select()
      .single()

    if (error || !data) return { success: false, error: error?.message ?? 'Kon opdrachtgever niet bijwerken' }
    revalidatePath('/uren')
    return { success: true, data: data as Client }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Onbekende fout' }
  }
}

export async function archiveClient(clientId: string): Promise<ActionResult<null>> {
  const res = await updateClient(clientId, { archived: true })
  return res.success ? { success: true, data: null } : res
}

export async function unarchiveClient(clientId: string): Promise<ActionResult<null>> {
  const res = await updateClient(clientId, { archived: false })
  return res.success ? { success: true, data: null } : res
}

// ============================================================
// HOUR ENTRIES
// ============================================================

export async function listOpenEntries(): Promise<EntryWithClient[]> {
  try {
    const { supabase, userId } = await getAuthenticatedClient()

    const { data, error } = await supabase
      .from('kk_hour_entries')
      .select('*, kk_clients!inner(name)')
      .eq('user_id', userId)
      .is('end_time', null)
      .order('entry_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) return []

    const entries: EntryWithClient[] = (data ?? []).map((row: Record<string, unknown>) => {
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
    })

    return entries
  } catch (err) {
    console.error('listOpenEntries:', err)
    return []
  }
}

export async function listEntries(options?: {
  clientId?: string
  fromDate?: string
  toDate?: string
  limit?: number
  offset?: number
}): Promise<{ entries: EntryWithClient[]; total: number }> {
  try {
    const { supabase, userId } = await getAuthenticatedClient()

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
    if (error) return { entries: [], total: 0 }

    const entries: EntryWithClient[] = (data ?? []).map((row: Record<string, unknown>) => {
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
    })

    return { entries, total: count ?? 0 }
  } catch (err) {
    console.error('listEntries:', err)
    return { entries: [], total: 0 }
  }
}

export async function createEntry(input: {
  client_id: string
  entry_date: string
  hours: number
  start_time?: string | null
  end_time?: string | null
  description?: string | null
  hourly_rate?: number
}): Promise<ActionResult<EntryWithClient>> {
  try {
    const { supabase, userId } = await getAuthenticatedClient()

    // Haal huidig uurtarief van de opdrachtgever op als snapshot
    let rateSnapshot = input.hourly_rate ?? 0
    if (input.hourly_rate === undefined) {
      const { data: clientRow } = await supabase
        .from('kk_clients')
        .select('hourly_rate')
        .eq('id', input.client_id)
        .eq('user_id', userId)
        .single()
      rateSnapshot = clientRow ? Number(clientRow.hourly_rate) : 0
    }

    // Bij ontbrekende eindtijd: hours = 0 (lopende regel, wordt later aangevuld)
    const hasEndTime = !!input.end_time
    const hoursToStore = hasEndTime ? input.hours : 0

    const { data, error } = await supabase
      .from('kk_hour_entries')
      .insert({
        user_id: userId,
        client_id: input.client_id,
        entry_date: input.entry_date,
        hours: hoursToStore,
        hourly_rate: rateSnapshot,
        start_time: input.start_time ?? null,
        end_time: input.end_time ?? null,
        description: input.description?.trim() || null,
      })
      .select('*, kk_clients!inner(name)')
      .single()

    if (error || !data) return { success: false, error: error?.message ?? 'Kon urenregel niet aanmaken' }

    const client = data.kk_clients as { name: string } | null
    const entry: EntryWithClient = {
      id: data.id,
      user_id: data.user_id,
      client_id: data.client_id,
      entry_date: data.entry_date,
      hours: Number(data.hours),
      hourly_rate: Number(data.hourly_rate),
      description: data.description ?? null,
      start_time: (data.start_time as string | null) ?? null,
      end_time: (data.end_time as string | null) ?? null,
      created_at: data.created_at,
      updated_at: data.updated_at,
      client_name: client?.name ?? 'Onbekend',
    }
    return { success: true, data: entry }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Onbekende fout' }
  }
}

export async function updateEntry(
  entryId: string,
  patch: Partial<Pick<HourEntry, 'client_id' | 'entry_date' | 'hours' | 'hourly_rate' | 'description' | 'start_time' | 'end_time'>>
): Promise<ActionResult<HourEntry>> {
  try {
    const { supabase } = await getAuthenticatedClient()
    const updateData: Record<string, unknown> = {}
    if (patch.client_id !== undefined) updateData.client_id = patch.client_id
    if (patch.entry_date !== undefined) updateData.entry_date = patch.entry_date
    if (patch.hours !== undefined) updateData.hours = patch.hours
    if (patch.hourly_rate !== undefined) updateData.hourly_rate = patch.hourly_rate
    if (patch.description !== undefined) updateData.description = patch.description?.trim() || null
    if (patch.start_time !== undefined) updateData.start_time = patch.start_time
    if (patch.end_time !== undefined) updateData.end_time = patch.end_time
    if (Object.keys(updateData).length === 0) return { success: true, data: {} as HourEntry }

    const { data, error } = await supabase
      .from('kk_hour_entries')
      .update(updateData)
      .eq('id', entryId)
      .select()
      .single()

    if (error || !data) return { success: false, error: error?.message ?? 'Kon urenregel niet bijwerken' }
    return { success: true, data: data as HourEntry }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Onbekende fout' }
  }
}

export async function deleteEntry(entryId: string): Promise<ActionResult<null>> {
  try {
    const { supabase } = await getAuthenticatedClient()
    const { error } = await supabase.from('kk_hour_entries').delete().eq('id', entryId)
    if (error) return { success: false, error: error.message }
    return { success: true, data: null }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Onbekende fout' }
  }
}

// ============================================================
// DASHBOARD STATS
// ============================================================

function periodStart(period: ClientTargetPeriod, now: Date = new Date()): Date | null {
  if (period === 'week') return startOfWeek(now, { weekStartsOn: 1 })
  if (period === 'month') return startOfMonth(now)
  return null // total = no start boundary
}

function periodEnd(period: ClientTargetPeriod, now: Date = new Date()): Date | null {
  if (period === 'week') return endOfWeek(now, { weekStartsOn: 1 })
  if (period === 'month') return endOfMonth(now)
  return null // total = no end boundary
}

function periodLabel(period: ClientTargetPeriod): string {
  if (period === 'week') return 'per week'
  if (period === 'month') return 'per maand'
  return 'totaal project'
}

export interface RevenueStats {
  week: number
  month: number
}

export async function getRevenueStats(): Promise<RevenueStats> {
  try {
    const { supabase, userId } = await getAuthenticatedClient()
    const now = new Date()
    const weekStart = startOfWeek(now, { weekStartsOn: 1 })
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 })
    const monthStart = startOfMonth(now)
    const monthEnd = endOfMonth(now)

    const weekStartStr = format(weekStart, 'yyyy-MM-dd')
    const weekEndStr = format(weekEnd, 'yyyy-MM-dd')
    const monthStartStr = format(monthStart, 'yyyy-MM-dd')
    const monthEndStr = format(monthEnd, 'yyyy-MM-dd')

    // Fetch entries covering both week and month windows (month is the wider net)
    const { data, error } = await supabase
      .from('kk_hour_entries')
      .select('hours, hourly_rate, entry_date')
      .eq('user_id', userId)
      .gte('entry_date', monthStartStr)
      .lte('entry_date', monthEndStr)

    if (error || !data) return { week: 0, month: 0 }

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
  } catch (err) {
    console.error('getRevenueStats:', err)
    return { week: 0, month: 0 }
  }
}

export async function getDashboardStats(): Promise<ClientWithProgress[]> {
  try {
    const clients = await listActiveClients()
    if (clients.length === 0) return []

    const { supabase, userId } = await getAuthenticatedClient()

    // Find the earliest period start and latest period end across all clients (for batch filtering)
    const now = new Date()
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
  } catch (err) {
    console.error('getDashboardStats:', err)
    return []
  }
}