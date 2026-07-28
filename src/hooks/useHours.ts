import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listClients,
  listEntries,
  listOpenEntries,
  createClient,
  updateClient,
  archiveClient,
  unarchiveClient,
  createEntry,
  updateEntry,
  deleteEntry,
  getDashboardStats,
  getRevenueStats,
} from '@/actions/hours'
import type { Client, ClientTargetPeriod } from '@/types/database.types'

// ============================================================
// CLIENTS
// ============================================================

export function useClients() {
  return useQuery({
    queryKey: ['hours', 'clients'],
    queryFn: listClients,
    staleTime: 30_000,
  })
}

export function useCreateClient() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { name: string; target_hours: number; target_period: ClientTargetPeriod; hourly_rate: number }) =>
      createClient(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hours', 'clients'] })
      queryClient.invalidateQueries({ queryKey: ['hours', 'dashboard'] })
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
      queryClient.invalidateQueries({ queryKey: ['hours', 'clients'] })
      queryClient.invalidateQueries({ queryKey: ['hours', 'dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['hours', 'revenue'] })
    },
  })
}

export function useArchiveClient() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (clientId: string) => archiveClient(clientId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hours', 'clients'] })
      queryClient.invalidateQueries({ queryKey: ['hours', 'dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['hours', 'revenue'] })
    },
  })
}

export function useUnarchiveClient() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (clientId: string) => unarchiveClient(clientId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hours', 'clients'] })
      queryClient.invalidateQueries({ queryKey: ['hours', 'dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['hours', 'revenue'] })
    },
  })
}

// ============================================================
// HOUR ENTRIES
// ============================================================

export function useEntries(options?: {
  clientId?: string
  fromDate?: string
  toDate?: string
  limit?: number
  offset?: number
}) {
  return useQuery({
    queryKey: ['hours', 'entries', options],
    queryFn: () => listEntries(options),
    staleTime: 30_000,
  })
}

export function useOpenEntries() {
  return useQuery({
    queryKey: ['hours', 'open-entries'],
    queryFn: listOpenEntries,
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
      const queryKey = ['hours', 'entries', { limit: 50, offset: 0 }]
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<{ entries: unknown[]; total: number }>(queryKey)
      if (previous) {
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
        queryClient.setQueryData(queryKey, {
          entries: [optimistic, ...previous.entries],
          total: previous.total + 1,
        })
      }
      return { previous }
    },
    onError: (_err, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['hours', 'entries', { limit: 50, offset: 0 }], context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['hours', 'entries'] })
      queryClient.invalidateQueries({ queryKey: ['hours', 'open-entries'] })
      queryClient.invalidateQueries({ queryKey: ['hours', 'dashboard'] })
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
      queryClient.invalidateQueries({ queryKey: ['hours', 'dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['hours', 'revenue'] })
    },
  })
}

export function useDeleteEntry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (entryId: string) => deleteEntry(entryId),
    onMutate: async (entryId) => {
      const queryKey = ['hours', 'entries', { limit: 50, offset: 0 }]
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<{ entries: { id: string }[]; total: number }>(queryKey)
      if (previous) {
        queryClient.setQueryData(queryKey, {
          entries: previous.entries.filter((e) => e.id !== entryId),
          total: Math.max(0, previous.total - 1),
        })
      }
      return { previous }
    },
    onError: (_err, _entryId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['hours', 'entries', { limit: 50, offset: 0 }], context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['hours', 'entries'] })
      queryClient.invalidateQueries({ queryKey: ['hours', 'dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['hours', 'revenue'] })
    },
  })
}

// ============================================================
// DASHBOARD
// ============================================================

export function useDashboardStats() {
  return useQuery({
    queryKey: ['hours', 'dashboard'],
    queryFn: getDashboardStats,
    staleTime: 30_000,
  })
}

export function useRevenueStats() {
  return useQuery({
    queryKey: ['hours', 'revenue'],
    queryFn: getRevenueStats,
    staleTime: 30_000,
  })
}