import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query'
import { createClient, getUserId } from '@/lib/supabase/server'
import { HoursView } from '@/components/hours/HoursView'
import {
  hoursKeys, defaultEntriesOptions,
  fetchClients, fetchEntries, fetchOpenEntries, fetchDashboardStats, fetchRevenueStats,
} from '@/lib/hours/queries'

export default async function UrenPage() {
  const userId = await getUserId()
  if (!userId) return null

  const supabase = await createClient()
  const queryClient = new QueryClient()
  const entriesOptions = defaultEntriesOptions()

  await Promise.all([
    queryClient.prefetchQuery({ queryKey: hoursKeys.clients, queryFn: () => fetchClients(supabase, userId) }),
    queryClient.prefetchQuery({ queryKey: hoursKeys.entries(entriesOptions), queryFn: () => fetchEntries(supabase, userId, entriesOptions) }),
    queryClient.prefetchQuery({ queryKey: hoursKeys.openEntries, queryFn: () => fetchOpenEntries(supabase, userId) }),
    queryClient.prefetchQuery({ queryKey: hoursKeys.dashboard, queryFn: () => fetchDashboardStats(supabase, userId) }),
    queryClient.prefetchQuery({ queryKey: hoursKeys.revenue(undefined), queryFn: () => fetchRevenueStats(supabase, userId) }),
  ])

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <HoursView />
    </HydrationBoundary>
  )
}