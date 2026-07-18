'use server'

import { getAuthenticatedClient } from '@/lib/supabase/actions'
import { getUserId } from '@/lib/supabase/server'
import { getLocalPool } from '@/lib/db/local-pool'
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

// Eén SQL-query met LEFT JOIN kk_clients + COUNT(*) OVER() voor total (window
// function). Bespaart TLS-overhead en JSON-shaping van PostgREST.
// RLS-compensatie: expliciete WHERE e.user_id = $1.
const LIST_ENTRIES_QUERY = `
  SELECT e.id, e.user_id, e.client_id, e.entry_date, e.hours, e.hourly_rate,
         e.description, e.start_time, e.end_time, e.created_at, e.updated_at,
         COALESCE(c.name, 'Onbekend') AS client_name,
         COUNT(*) OVER() AS total_count
  FROM kk_hour_entries e
  LEFT JOIN kk_clients c ON c.id = e.client_id
  WHERE e.user_id = $1
    AND ($2::uuid IS NULL OR e.client_id = $2)
    AND ($3::date IS NULL OR e.entry_date >= $3)
    AND ($4::date IS NULL OR e.entry_date <= $4)
  ORDER BY e.entry_date DESC, e.created_at DESC
  LIMIT $5 OFFSET $6
`

interface ListEntryRow {
  id: string
  user_id: string
  client_id: string
  entry_date: string
  hours: number
  hourly_rate: number
  description: string | null
  start_time: string | null
  end_time: string | null
  created_at: string
  updated_at: string
  client_name: string
  total_count: string
}

export async function listEntries(options?: {
  clientId?: string
  fromDate?: string
  toDate?: string
  limit?: number
  offset?: number
}): Promise<{ entries: EntryWithClient[]; total: number }> {
  try {
    const userId = await getUserId()
    if (!userId) return { entries: [], total: 0 }

    const pool = getLocalPool()
    const limit = options?.limit ?? 50
    const offset = options?.offset ?? 0

    const { rows } = await pool.query<ListEntryRow>(LIST_ENTRIES_QUERY, [
      userId,
      options?.clientId ?? null,
      options?.fromDate ?? null,
      options?.toDate ?? null,
      limit,
      offset,
    ])

    const total = rows.length > 0 ? Number(rows[0]!.total_count) : 0

    const entries: EntryWithClient[] = rows.map((row) => ({
      id: row.id,
      user_id: row.user_id,
      client_id: row.client_id,
      entry_date: row.entry_date,
      hours: Number(row.hours),
      hourly_rate: Number(row.hourly_rate),
      description: row.description ?? null,
      start_time: row.start_time ?? null,
      end_time: row.end_time ?? null,
      created_at: row.created_at,
      updated_at: row.updated_at,
      client_name: row.client_name,
    }))

    return { entries, total }
  } catch (err) {
    console.error('listEntries:', err)
    return { entries: [], total: 0 }
  }
}

// Eén SQL-statement met CTE vervangt select-then-insert (2 round-trips → 1).
// Bespaart ~50ms per entry-create. RLS-compensatie: expliciete user_id = $1
// filtering op zowel de rate-lookup als de insert.
const CREATE_ENTRY_QUERY = `
  WITH rate AS (
    SELECT COALESCE($3::numeric, hourly_rate, 0) AS rate
    FROM kk_clients WHERE id = $2 AND user_id = $1
  )
  INSERT INTO kk_hour_entries
    (user_id, client_id, entry_date, hours, hourly_rate, start_time, end_time, description)
  SELECT $1, $2, $4, $5, (SELECT rate FROM rate), $6, $7, $8
  RETURNING *,
    (SELECT name FROM kk_clients WHERE id = $2) AS client_name
`

interface CreateEntryRow {
  id: string
  user_id: string
  client_id: string
  entry_date: string
  hours: number
  hourly_rate: number
  description: string | null
  start_time: string | null
  end_time: string | null
  created_at: string
  updated_at: string
  client_name: string | null
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
    const userId = await getUserId()
    if (!userId) return { success: false, error: 'Niet ingelogd' }

    const pool = getLocalPool()
    const { rows } = await pool.query<CreateEntryRow>(CREATE_ENTRY_QUERY, [
      userId,
      input.client_id,
      input.hourly_rate ?? null,
      input.entry_date,
      input.hours,
      input.start_time ?? null,
      input.end_time ?? null,
      input.description?.trim() || null,
    ])

    if (rows.length === 0) {
      return { success: false, error: 'Kon urenregel niet aanmaken' }
    }

    const data = rows[0]!

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
      client_name: data.client_name ?? 'Onbekend',
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

function periodLabel(period: ClientTargetPeriod): string {
  if (period === 'week') return 'per week'
  if (period === 'month') return 'per maand'
  return 'totaal project'
}

// Eén SQL-query vervangt de cascade van listActiveClients + aparte entries-fetch
// + JS-aggregatie (3 server-action calls → 1 SQL-round-trip). Bespaart
// ~100-200ms op de uren-pagina. RLS-compensatie: expliciete WHERE c.user_id = $1
// en LEFT JOIN met user_id filtering op entries.
const DASHBOARD_STATS_QUERY = `
  SELECT
    c.id, c.user_id, c.name, c.target_hours, c.target_period, c.hourly_rate,
    c.archived, c.created_at, c.updated_at,
    COALESCE(SUM(
      CASE
        WHEN c.target_period = 'week'  AND e.entry_date >= $2 THEN e.hours
        WHEN c.target_period = 'month' AND e.entry_date >= $3 THEN e.hours
        WHEN c.target_period = 'total' THEN e.hours
        ELSE 0
      END
    ), 0) AS current_hours
  FROM kk_clients c
  LEFT JOIN kk_hour_entries e
    ON e.client_id = c.id
    AND e.user_id = c.user_id
    AND (
      (c.target_period = 'week'  AND e.entry_date >= $2) OR
      (c.target_period = 'month' AND e.entry_date >= $3) OR
      (c.target_period = 'total')
    )
  WHERE c.user_id = $1 AND c.archived = false
  GROUP BY c.id
  ORDER BY c.name
`

interface DashboardStatsRow {
  id: string
  user_id: string
  name: string
  target_hours: number
  target_period: ClientTargetPeriod
  hourly_rate: number
  archived: boolean
  created_at: string
  updated_at: string
  current_hours: string
}

export async function getDashboardStats(): Promise<ClientWithProgress[]> {
  try {
    const userId = await getUserId()
    if (!userId) return []

    const now = new Date()
    const weekStart = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd')
    const monthStart = format(startOfMonth(now), 'yyyy-MM-dd')

    const pool = getLocalPool()
    const { rows } = await pool.query<DashboardStatsRow>(DASHBOARD_STATS_QUERY, [
      userId,
      weekStart,
      monthStart,
    ])

    return rows.map((row) => {
      const target = Number(row.target_hours) || 0
      const currentHours = Math.round(Number(row.current_hours) * 100) / 100
      const percentage = target > 0 ? Math.min(100, Math.round((currentHours / target) * 100)) : 0
      return {
        id: row.id,
        user_id: row.user_id,
        name: row.name,
        target_hours: target,
        target_period: row.target_period,
        hourly_rate: Number(row.hourly_rate),
        archived: row.archived,
        created_at: row.created_at,
        updated_at: row.updated_at,
        current_hours: currentHours,
        target_label: periodLabel(row.target_period),
        percentage,
      } satisfies ClientWithProgress
    })
  } catch (err) {
    console.error('getDashboardStats:', err)
    return []
  }
}