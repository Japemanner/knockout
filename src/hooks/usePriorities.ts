import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getPriorities, savePriorities, type PrioritiesData } from '@/actions/priorities'

export function usePriorities() {
  return useQuery({
    queryKey: ['priorities'],
    queryFn: getPriorities,
    staleTime: 60_000,
  })
}

export function useSavePriorities() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: PrioritiesData) => savePriorities(input),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.setQueryData(['priorities'], result.data)
      }
    },
  })
}