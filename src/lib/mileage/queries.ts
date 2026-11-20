// Shared query- en aggregatielogica voor /km. Draait op de server (SSR-prefetch
// in src/app/(dashboard)/km/page.tsx) én in de browser (queryFn's in
// src/hooks/useMileage.ts) — vandaar geen 'use server'. Supabase-fouten worden
// gegooid i.p.v. stil [] terug te geven, zodat React Query de retry doet.
// Mutaties blijven server actions in src/actions/mileage.ts.

import type { MileageTrip } from '@/types/database.types'
import { amsterdamFirstOfMonthISO, amsterdamTodayISO } from '@/lib/hours/dates'
import { aggregateMileageStats, type MileageStats } from '@/lib/mileage/trips'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type UntypedClient = any

export interface MileageTripWithClient extends MileageTrip {
  client_name: string | null
}

export type TripStatusFilter = 'all' | 'open' | 'reimbursed'

export interface TripFilters {
  fromDate?: string
  toDate?: string
  clientId?: string
  status?: TripStatusFilter
}

export const mileageKeys = {
  trips: (filters?: TripFilters) => ['mileage', 'trips', filters] as const,
  stats: (referenceDate: string) => ['mileage', 'stats', referenceDate] as const,
}

export function defaultTripFilters(): TripFilters {
  return {
    fromDate: amsterdamFirstOfMonthISO(),
    toDate: amsterdamTodayISO(),
    status: 'all',
  }
}

export function mapMileageTripRow(row: Record<string, unknown>): MileageTripWithClient {
  const client = row.kk_clients as { name: string } | null
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    client_id: (row.client_id as string | null) ?? null,
    trip_date: row.trip_date as string,
    from_location: row.from_location as string,
    to_location: row.to_location as string,
    purpose: row.purpose as string,
    distance_km: Number(row.distance_km),
    is_return: Boolean(row.is_return),
    rate_per_km: Number(row.rate_per_km),
    amount: Number(row.amount),
    reimbursed_at: (row.reimbursed_at as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    client_name: client?.name ?? null,
  }
}

export async function fetchTrips(
  supabase: UntypedClient,
  userId: string,
  filters?: TripFilters,
): Promise<MileageTripWithClient[]> {
  let query = supabase
    .from('kk_mileage_trips')
    .select('*, kk_clients(name)')
    .eq('user_id', userId)
    .order('trip_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (filters?.clientId) query = query.eq('client_id', filters.clientId)
  if (filters?.fromDate) query = query.gte('trip_date', filters.fromDate)
  if (filters?.toDate) query = query.lte('trip_date', filters.toDate)
  if (filters?.status === 'open') query = query.is('reimbursed_at', null)
  if (filters?.status === 'reimbursed') query = query.not('reimbursed_at', 'is', null)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []).map((row: Record<string, unknown>) => mapMileageTripRow(row))
}

/**
 * Eén query met alleen de velden die de aggregatie nodig heeft; maand, jaar en
 * openstaand worden in TypeScript berekend (geen N+1, geen extra count-query).
 */
export async function fetchMileageStats(
  supabase: UntypedClient,
  userId: string,
  referenceDate: string = amsterdamTodayISO(),
): Promise<MileageStats> {
  const { data, error } = await supabase
    .from('kk_mileage_trips')
    .select('trip_date, distance_km, amount, reimbursed_at')
    .eq('user_id', userId)
    .order('trip_date', { ascending: false })

  if (error) throw new Error(error.message)
  return aggregateMileageStats((data ?? []) as Parameters<typeof aggregateMileageStats>[0], referenceDate)
}
