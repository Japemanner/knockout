'use server'

import { getAuthenticatedClient } from '@/lib/supabase/actions'
import type { Client, ClientTargetPeriod, HourEntry } from '@/types/database.types'
import type { EntryWithClient } from '@/lib/hours/queries'

export type ActionResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string }

// Types zijn verhuisd naar src/lib/hours/queries.ts — hier re-exporteerd zodat
// bestaande imports uit '@/actions/hours' blijven werken.
export type { ClientWithProgress, EntryWithClient, RevenueStats } from '@/lib/hours/queries'

// ============================================================
// CLIENTS
// ============================================================

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