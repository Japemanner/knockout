import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient as createBrowserSupabaseClient } from '@/lib/supabase/client'
import {
  createTrip,
  updateTrip,
  deleteTrip,
  markTripsReimbursed,
  unmarkTripsReimbursed,
} from '@/actions/mileage'
import {
  mileageKeys,
  fetchTrips,
  fetchMileageStats,
  type MileageTripWithClient,
  type TripFilters,
} from '@/lib/mileage/queries'
import { tripAmount, type TripWritePatch } from '@/lib/mileage/trips'
import { amsterdamTodayISO } from '@/lib/hours/dates'
import { useAuthStore } from '@/store/authStore'

// Reads gaan rechtstreeks vanuit de browser naar Supabase (RLS: user_id =
// auth.uid() op kk_mileage_trips). De browser-client is singleton via
// src/lib/supabase/client.ts. Mutaties blijven server actions.
// Bij SSR-hydratie matchen de keys met de prefetch in
// src/app/(dashboard)/km/page.tsx.

function browserSupabase(): ReturnType<typeof createBrowserSupabaseClient> {
  return createBrowserSupabaseClient()
}

function currentUserId(): string {
  const userId = useAuthStore.getState().userId
  if (!userId) throw new Error('Niet ingelogd')
  return userId
}

export interface CreateTripInput {
  trip_date: string
  client_id?: string | null
  from_location: string
  to_location: string
  purpose: string
  distance_km: number
  is_return?: boolean
  rate_per_km: number
  notes?: string | null
}

// ============================================================
// READS
// ============================================================

export function useTrips(filters?: TripFilters) {
  const userId = useAuthStore((s) => s.userId)
  return useQuery({
    queryKey: mileageKeys.trips(filters),
    queryFn: () => fetchTrips(browserSupabase(), currentUserId(), filters),
    enabled: !!userId,
    staleTime: 30_000,
  })
}

export function useMileageStats(referenceDate: string = amsterdamTodayISO()) {
  const userId = useAuthStore((s) => s.userId)
  return useQuery({
    queryKey: mileageKeys.stats(referenceDate),
    queryFn: () => fetchMileageStats(browserSupabase(), currentUserId(), referenceDate),
    enabled: !!userId,
    staleTime: 30_000,
  })
}

// ============================================================
// MUTATIES (optimistic met rollback, daarna invalidatie van ['mileage'])
// ============================================================

export function useCreateTrip() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateTripInput) =>
      createTrip({
        trip_date: input.trip_date,
        client_id: input.client_id ?? null,
        from_location: input.from_location,
        to_location: input.to_location,
        purpose: input.purpose,
        distance_km: input.distance_km,
        is_return: input.is_return ?? false,
        rate_per_km: input.rate_per_km,
        notes: input.notes ?? null,
      }),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: ['mileage', 'trips'] })
      const snapshots = queryClient.getQueriesData<MileageTripWithClient[]>({
        queryKey: ['mileage', 'trips'],
      })

      const optimistic: MileageTripWithClient = {
        id: `temp-${Date.now()}`,
        user_id: '',
        client_id: input.client_id ?? null,
        trip_date: input.trip_date,
        from_location: input.from_location.trim(),
        to_location: input.to_location.trim(),
        purpose: input.purpose.trim(),
        distance_km: input.distance_km,
        is_return: input.is_return ?? false,
        rate_per_km: input.rate_per_km,
        amount: tripAmount(input.distance_km, input.rate_per_km),
        reimbursed_at: null,
        notes: input.notes?.trim() || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        client_name: null,
      }

      for (const [key, previous] of snapshots) {
        if (!previous) continue
        queryClient.setQueryData(key, [optimistic, ...previous])
      }
      return { snapshots }
    },
    onError: (_err, _input, context) => {
      for (const [key, snapshot] of context?.snapshots ?? []) {
        queryClient.setQueryData(key, snapshot)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['mileage'] })
    },
  })
}

export function useUpdateTrip() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ tripId, patch }: { tripId: string; patch: TripWritePatch }) =>
      updateTrip(tripId, patch),
    onMutate: async ({ tripId, patch }) => {
      await queryClient.cancelQueries({ queryKey: ['mileage', 'trips'] })
      const snapshots = queryClient.getQueriesData<MileageTripWithClient[]>({
        queryKey: ['mileage', 'trips'],
      })

      for (const [key, previous] of snapshots) {
        if (!previous) continue
        queryClient.setQueryData(
          key,
          previous.map((trip) => {
            if (trip.id !== tripId) return trip
            const next = { ...trip, ...patch }
            const distance = patch.distance_km ?? trip.distance_km
            const rate = patch.rate_per_km ?? trip.rate_per_km
            return {
              ...next,
              distance_km: distance,
              rate_per_km: rate,
              amount: tripAmount(distance, rate),
            } as MileageTripWithClient
          }),
        )
      }
      return { snapshots }
    },
    onError: (_err, _input, context) => {
      for (const [key, snapshot] of context?.snapshots ?? []) {
        queryClient.setQueryData(key, snapshot)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['mileage'] })
    },
  })
}

export function useDeleteTrip() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (tripId: string) => deleteTrip(tripId),
    onMutate: async (tripId) => {
      await queryClient.cancelQueries({ queryKey: ['mileage', 'trips'] })
      const snapshots = queryClient.getQueriesData<MileageTripWithClient[]>({
        queryKey: ['mileage', 'trips'],
      })

      for (const [key, previous] of snapshots) {
        if (!previous) continue
        queryClient.setQueryData(key, previous.filter((trip) => trip.id !== tripId))
      }
      return { snapshots }
    },
    onError: (_err, _tripId, context) => {
      for (const [key, snapshot] of context?.snapshots ?? []) {
        queryClient.setQueryData(key, snapshot)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['mileage'] })
    },
  })
}

export function useMarkTripsReimbursed() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ tripIds, reimbursedAt }: { tripIds: string[]; reimbursedAt: string }) =>
      markTripsReimbursed(tripIds, reimbursedAt),
    onMutate: async ({ tripIds, reimbursedAt }) => {
      await queryClient.cancelQueries({ queryKey: ['mileage', 'trips'] })
      const snapshots = queryClient.getQueriesData<MileageTripWithClient[]>({
        queryKey: ['mileage', 'trips'],
      })
      const ids = new Set(tripIds)

      for (const [key, previous] of snapshots) {
        if (!previous) continue
        queryClient.setQueryData(
          key,
          previous.map((trip) => (ids.has(trip.id) ? { ...trip, reimbursed_at: reimbursedAt } : trip)),
        )
      }
      return { snapshots }
    },
    onError: (_err, _input, context) => {
      for (const [key, snapshot] of context?.snapshots ?? []) {
        queryClient.setQueryData(key, snapshot)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['mileage'] })
    },
  })
}

export function useUnmarkTripsReimbursed() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (tripIds: string[]) => unmarkTripsReimbursed(tripIds),
    onMutate: async (tripIds) => {
      await queryClient.cancelQueries({ queryKey: ['mileage', 'trips'] })
      const snapshots = queryClient.getQueriesData<MileageTripWithClient[]>({
        queryKey: ['mileage', 'trips'],
      })
      const ids = new Set(tripIds)

      for (const [key, previous] of snapshots) {
        if (!previous) continue
        queryClient.setQueryData(
          key,
          previous.map((trip) => (ids.has(trip.id) ? { ...trip, reimbursed_at: null } : trip)),
        )
      }
      return { snapshots }
    },
    onError: (_err, _tripIds, context) => {
      for (const [key, snapshot] of context?.snapshots ?? []) {
        queryClient.setQueryData(key, snapshot)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['mileage'] })
    },
  })
}
