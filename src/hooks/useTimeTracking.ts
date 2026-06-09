import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getActiveTimeEntry,
  getTimeEntries,
  startTimeTracking,
  stopTimeTracking,
  updateTimeEntry,
  deleteTimeEntry,
} from '@/actions/time-tracking'
import type { TimeEntry } from '@/actions/time-tracking'

export function useActiveTimeEntry() {
  return useQuery({
    queryKey: ['time-tracking', 'active'],
    queryFn: getActiveTimeEntry,
    staleTime: 10_000,
    refetchInterval: 15_000,
  })
}

export function useTimeEntries(options?: { taskId?: string; boardId?: string; limit?: number }) {
  return useQuery({
    queryKey: ['time-tracking', 'entries', options],
    queryFn: () => getTimeEntries(options),
    staleTime: 30_000,
  })
}

export function useStartTimeTracking() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: startTimeTracking,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-tracking'] })
    },
  })
}

export function useStopTimeTracking() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: stopTimeTracking,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-tracking'] })
    },
  })
}

export function useUpdateTimeEntry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ entryId, description }: { entryId: string; description: string }) =>
      updateTimeEntry(entryId, description),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-tracking'] })
    },
  })
}

export function useDeleteTimeEntry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteTimeEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-tracking'] })
    },
  })
}