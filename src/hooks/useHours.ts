import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  createClient as createBrowserSupabaseClient,
} from '@/lib/supabase/client'
import {
  createClient,
  updateClient,
  archiveClient,
  unarchiveClient,
  createEntry,
  updateEntry,
  deleteEntry,
} from '@/actions/hours'
import {
  hoursKeys,
  fetchClients,
  fetchEntries,
  fetchOpenEntries,
  fetchDashboardStats,
  fetchRevenueStats,
  type EntriesOptions,
} from '@/lib/hours/queries'
import { useAuthStore } from '@/store/authStore'
import type { Client, ClientTargetPeriod } from '@/types/database.types'

// Reads gaan rechtstreeks vanuit de browser naar Supabase (RLS: user_id =
// auth.uid() op kk_clients en kk_hour_entries). De browser-client is singleton
// via src/lib/supabase/client.ts. Mutaties blijven server actions.
// Bij SSR-hydratie matchen de keys met de prefetch in
// src/app/(dashboard)/uren/page.tsx, dus geen server-action round-trips meer.

function browserSupabase(): ReturnType<typeof createBrowserSupabaseClient> {
  return createBrowserSupabaseClient()
}

function currentUserId(): string {
  const userId = useAuthStore.getState().userId
  if (!userId) throw new Error('Niet ingelogd')
  return userId
}

// ============================================================
// CLIENTS
// ============================================================

export function useClients() {
  const userId = useAuthStore((s) => s.userId)
  return useQuery({
    queryKey: hoursKeys.clients,
    queryFn: () => fetchClients(browserSupabase(), currentUserId()),
    enabled: !!userId,
    staleTime: 30_000,
  })
}

export function useCreateClient() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { name: string; target_hours: number; target_period: ClientTargetPeriod; hourly_rate: number }) =>
      createClient(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: hoursKeys.clients })
      queryClient.invalidateQueries({ queryKey: hoursKeys.dashboard })
      queryClient.invalidateQueries({ queryKey: ['hours', 'revenue'] })
    },
  })
}

export function useUpdateClient() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      clientId,
      patch,
    }: {
      clientId: string
      patch: Partial<Pick<Client, 'name' | 'target_hours' | 'target_period' | 'hourly_rate' | 'archived'>>
    }) => updateClient(clientId, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: hoursKeys.clients })
      queryClient.invalidateQueries({ queryKey: hoursKeys.dashboard })
      queryClient.invalidateQueries({ queryKey: ['hours', 'revenue'] })
    },
  })
}

export function useArchiveClient() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (clientId: string) => archiveClient(clientId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: hoursKeys.clients })
      queryClient.invalidateQueries({ queryKey: hoursKeys.dashboard })
      queryClient.invalidateQueries({ queryKey: ['hours', 'revenue'] })
    },
  })
}

export function useUnarchiveClient() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (clientId: string) => unarchiveClient(clientId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: hoursKeys.clients })
      queryClient.invalidateQueries({ queryKey: hoursKeys.dashboard })
      queryClient.invalidateQueries({ queryKey: ['hours', 'revenue'] })
    },
  })
}

// ============================================================
// HOUR ENTRIES
// ============================================================

export function useEntries(options?: EntriesOptions) {
  const userId = useAuthStore((s) => s.userId)
  return useQuery({
    queryKey: hoursKeys.entries(options),
    queryFn: () => fetchEntries(browserSupabase(), currentUserId(), options),
    enabled: !!userId,
    staleTime: 30_000,
  })
}

export function useOpenEntries() {
  const userId = useAuthStore((s) => s.userId)
  return useQuery({
    queryKey: hoursKeys.openEntries,
    queryFn: () => fetchOpenEntries(browserSupabase(), currentUserId()),
    enabled: !!userId,
    staleTime: 15_000,
  })
}

export function useCreateEntry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      client_id: string
      entry_date: string
      hours: number
      start_time?: string | null
      end_time?: string | null
      description?: string | null
      hourly_rate?: number
    }) => createEntry(input),
    onMutate: async (input) => {
      // Cancel alle in-flight entries-queries op de prefix — de exacte key
      // varieert (fromDate/toDate/clientId zitten erin).
      await queryClient.cancelQueries({ queryKey: ['hours', 'entries'] })
      const snapshots = queryClient.getQueriesData<{ entries: unknown[]; total: number }>({
        queryKey: ['hours', 'entries'],
      })

      for (const [key, previous] of snapshots) {
        if (!previous) continue
        const optimistic = {
          id: `temp-${Date.now()}`,
          user_id: '',
          client_id: input.client_id,
          entry_date: input.entry_date,
          hours: input.hours,
          description: input.description ?? null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          client_name: '',
        }
        queryClient.setQueryData(key, {
          entries: [optimistic, ...previous.entries],
          total: previous.total + 1,
        })
      }
      return { snapshots }
    },
    onError: (_err, _input, context) => {
      for (const [key, snapshot] of context?.snapshots ?? []) {
        queryClient.setQueryData(key, snapshot)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['hours', 'entries'] })
      queryClient.invalidateQueries({ queryKey: hoursKeys.openEntries })
      queryClient.invalidateQueries({ queryKey: hoursKeys.dashboard })
      queryClient.invalidateQueries({ queryKey: ['hours', 'revenue'] })
    },
  })
}

export function useUpdateEntry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      entryId,
      patch,
    }: {
      entryId: string
      patch: Partial<{ client_id: string; entry_date: string; hours: number; hourly_rate: number; description: string | null; start_time: string | null; end_time: string | null }>
    }) => updateEntry(entryId, patch),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['hours', 'entries'] })
      queryClient.invalidateQueries({ queryKey: hoursKeys.dashboard })
      queryClient.invalidateQueries({ queryKey: ['hours', 'revenue'] })
    },
  })
}

export function useDeleteEntry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (entryId: string) => deleteEntry(entryId),
    onMutate: async (entryId) => {
      await queryClient.cancelQueries({ queryKey: ['hours', 'entries'] })
      const snapshots = queryClient.getQueriesData<{ entries: { id: string }[]; total: number }>({
        queryKey: ['hours', 'entries'],
      })

      for (const [key, previous] of snapshots) {
        if (!previous) continue
        queryClient.setQueryData(key, {
          entries: previous.entries.filter((e) => e.id !== entryId),
          total: Math.max(0, previous.total - 1),
        })
      }
      return { snapshots }
    },
    onError: (_err, _entryId, context) => {
      for (const [key, snapshot] of context?.snapshots ?? []) {
        queryClient.setQueryData(key, snapshot)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['hours', 'entries'] })
      queryClient.invalidateQueries({ queryKey: hoursKeys.dashboard })
      queryClient.invalidateQueries({ queryKey: ['hours', 'revenue'] })
    },
  })
}

// ============================================================
// DASHBOARD
// ============================================================

export function useDashboardStats() {
  const userId = useAuthStore((s) => s.userId)
  return useQuery({
    queryKey: hoursKeys.dashboard,
    queryFn: () => fetchDashboardStats(browserSupabase(), currentUserId()),
    enabled: !!userId,
    staleTime: 30_000,
  })
}

export function useRevenueStats(clientId?: string) {
  const userId = useAuthStore((s) => s.userId)
  return useQuery({
    queryKey: hoursKeys.revenue(clientId),
    queryFn: () => fetchRevenueStats(browserSupabase(), currentUserId(), clientId),
    enabled: !!userId,
    staleTime: 30_000,
  })
}