'use server'

// Server actions voor kilometerregistratie (031). Mutaties conform het
// ActionResult-patroon uit src/actions/hours.ts, via getAuthenticatedClient().
// Geen revalidatePath — de client invalideert React Query-keys (mileageKeys).
// Alle writes lopen via buildTripWritePayload, zodat amount (generated),
// user_id bij update, created_at en updated_at nooit worden meegestuurd.

import { getAuthenticatedClient } from '@/lib/supabase/actions'
import { buildTripWritePayload, validateTripPatch, type TripWritePatch } from '@/lib/mileage/trips'
import { mapMileageTripRow, type MileageTripWithClient } from '@/lib/mileage/queries'

export type ActionResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type UntypedClient = any

async function assertClientOwnership(
  supabase: UntypedClient,
  userId: string,
  clientId: string | null | undefined,
): Promise<string | null> {
  if (!clientId) return null
  const { data, error } = await supabase
    .from('kk_clients')
    .select('id')
    .eq('id', clientId)
    .eq('user_id', userId)
    .maybeSingle()
  if (error) return error.message
  if (!data) return 'Opdrachtgever niet gevonden'
  return null
}

export async function createTrip(input: TripWritePatch & {
  trip_date: string
  from_location: string
  to_location: string
  purpose: string
  distance_km: number
  rate_per_km: number
}): Promise<ActionResult<MileageTripWithClient>> {
  try {
    const { supabase, userId } = await getAuthenticatedClient()

    const validationError = validateTripPatch(input, { partial: false })
    if (validationError) return { success: false, error: validationError }

    const clientError = await assertClientOwnership(supabase, userId, input.client_id)
    if (clientError) return { success: false, error: clientError }

    const payload = buildTripWritePayload(input)
    const { data, error } = await supabase
      .from('kk_mileage_trips')
      .insert({ user_id: userId, ...payload })
      .select('*, kk_clients(name)')
      .single()

    if (error || !data) return { success: false, error: error?.message ?? 'Kon rit niet opslaan' }
    return { success: true, data: mapMileageTripRow(data as Record<string, unknown>) }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Onbekende fout' }
  }
}

export async function updateTrip(
  tripId: string,
  patch: TripWritePatch,
): Promise<ActionResult<MileageTripWithClient | null>> {
  try {
    const { supabase, userId } = await getAuthenticatedClient()

    const validationError = validateTripPatch(patch, { partial: true })
    if (validationError) return { success: false, error: validationError }

    const clientError = await assertClientOwnership(supabase, userId, patch.client_id)
    if (clientError) return { success: false, error: clientError }

    const payload = buildTripWritePayload(patch)
    if (Object.keys(payload).length === 0) return { success: true, data: null }

    const { data, error } = await supabase
      .from('kk_mileage_trips')
      .update(payload)
      .eq('id', tripId)
      .select('*, kk_clients(name)')
      .single()

    if (error || !data) return { success: false, error: error?.message ?? 'Kon rit niet bijwerken' }
    return { success: true, data: mapMileageTripRow(data as Record<string, unknown>) }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Onbekende fout' }
  }
}

export async function deleteTrip(tripId: string): Promise<ActionResult<null>> {
  try {
    const { supabase } = await getAuthenticatedClient()
    const { error } = await supabase.from('kk_mileage_trips').delete().eq('id', tripId)
    if (error) return { success: false, error: error.message }
    return { success: true, data: null }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Onbekende fout' }
  }
}

export async function markTripsReimbursed(
  tripIds: string[],
  reimbursedAt: string,
): Promise<ActionResult<number>> {
  try {
    if (tripIds.length === 0) return { success: false, error: 'Geen ritten geselecteerd' }
    const validationError = validateTripPatch({ reimbursed_at: reimbursedAt }, { partial: true })
    if (validationError) return { success: false, error: validationError }

    const { supabase } = await getAuthenticatedClient()
    const { data, error } = await supabase
      .from('kk_mileage_trips')
      .update({ reimbursed_at: reimbursedAt })
      .in('id', tripIds)
      .select('id')

    if (error) return { success: false, error: error.message }
    return { success: true, data: (data ?? []).length }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Onbekende fout' }
  }
}

export async function unmarkTripsReimbursed(tripIds: string[]): Promise<ActionResult<number>> {
  try {
    if (tripIds.length === 0) return { success: false, error: 'Geen ritten geselecteerd' }

    const { supabase } = await getAuthenticatedClient()
    const { data, error } = await supabase
      .from('kk_mileage_trips')
      .update({ reimbursed_at: null })
      .in('id', tripIds)
      .select('id')

    if (error) return { success: false, error: error.message }
    return { success: true, data: (data ?? []).length }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Onbekende fout' }
  }
}
