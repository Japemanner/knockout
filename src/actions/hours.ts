'use server'

import { getAuthenticatedClient } from '@/lib/supabase/actions'
import { revalidatePath } from 'next/cache'
import { startOfWeek, startOfMonth, format } from 'date-fns'
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
  patch: Partial<Pick<Client, 'name' | 'target_hours' | 'target_period' | 'archived'>>
): Promise<ActionResult<Client>> {
  try {
    const { supabase } = await getAuthenticatedClient()
    const updateData: Record<string, unknown> = {}
    if (patch.name !== undefined) updateData.name = patch.name.trim()
    if (patch.target_hours !== undefined) updateData.target_hours = patch.target_hours
    if (patch.target_period !== undefined) updateData.target_period = patch.target_period
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
}): Promise<ActionResult<EntryWithClient>> {
  try {
    const { supabase, userId } = await getAuthenticatedClient()

    const { data, error } = await supabase
      .from('kk_hour_entries')
      .insert({
        user_id: userId,
        client_id: input.client_id,
        entry_date: input.entry_date,
        hours: input.hours,
        start_time: input.start_time ?? null,
        end_time: input.end_time ?? null,
        description: input.description?.trim() || null,
      })
      .select('*, kk_clients!inner(name)')
      .single()

    if (error || !data) return { success: false, error: error?.message ?? 'Kon urenregel niet aanmaken' }
    revalidatePath('/uren')

    const client = data.kk_clients as { name: string } | null
    const entry: EntryWithClient = {
      id: data.id,
      user_id: data.user_id,
      client_id: data.client_id,
      entry_date: data.entry_date,
      hours: Number(data.hours),
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
  patch: Partial<Pick<HourEntry, 'client_id' | 'entry_date' | 'hours' | 'description' | 'start_time' | 'end_time'>>
): Promise<ActionResult<HourEntry>> {
  try {
    const { supabase } = await getAuthenticatedClient()
    const updateData: Record<string, unknown> = {}
    if (patch.client_id !== undefined) updateData.client_id = patch.client_id
    if (patch.entry_date !== undefined) updateData.entry_date = patch.entry_date
    if (patch.hours !== undefined) updateData.hours = patch.hours
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
    revalidatePath('/uren')
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
    revalidatePath('/uren')
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

function periodLabel(period: ClientTargetPeriod): string {
  if (period === 'week') return 'per week'
  if (period === 'month') return 'per maand'
  return 'totaal project'
}

export async function getDashboardStats(): Promise<ClientWithProgress[]> {
  try {
    const clients = await listActiveClients()
    if (clients.length === 0) return []

    const { supabase, userId } = await getAuthenticatedClient()

    const results: ClientWithProgress[] = await Promise.all(
      clients.map(async (client) => {
        let query = supabase
          .from('kk_hour_entries')
          .select('hours')
          .eq('user_id', userId)
          .eq('client_id', client.id)

        const start = periodStart(client.target_period)
        if (start) {
          query = query.gte('entry_date', format(start, 'yyyy-MM-dd'))
        }

        const { data, error } = await query
        if (error || !data) {
          return { ...client, current_hours: 0, target_label: periodLabel(client.target_period), percentage: 0 }
        }
        const totalHours = data.reduce((sum: number, row: Record<string, unknown>) => sum + Number(row.hours), 0)
        const target = Number(client.target_hours) || 0
        const percentage = target > 0 ? Math.min(100, Math.round((totalHours / target) * 100)) : 0
        return {
          ...client,
          current_hours: Math.round(totalHours * 100) / 100,
          target_label: periodLabel(client.target_period),
          percentage,
        }
      })
    )

    return results
  } catch (err) {
    console.error('getDashboardStats:', err)
    return []
  }
}