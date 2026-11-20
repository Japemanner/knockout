import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query'
import { createClient, getUserId } from '@/lib/supabase/server'
import { MileageView } from '@/components/mileage/MileageView'
import { hoursKeys, fetchClients } from '@/lib/hours/queries'
import {
  mileageKeys,
  defaultTripFilters,
  fetchTrips,
  fetchMileageStats,
} from '@/lib/mileage/queries'
import { amsterdamTodayISO } from '@/lib/hours/dates'

export default async function KilometerPage() {
  const userId = await getUserId()
  if (!userId) return null

  const supabase = await createClient()
  const queryClient = new QueryClient()
  const filters = defaultTripFilters()
  const referenceDate = amsterdamTodayISO()

  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: mileageKeys.trips(filters),
      queryFn: () => fetchTrips(supabase, userId, filters),
    }),
    queryClient.prefetchQuery({
      queryKey: mileageKeys.stats(referenceDate),
      queryFn: () => fetchMileageStats(supabase, userId, referenceDate),
    }),
    queryClient.prefetchQuery({
      queryKey: hoursKeys.clients,
      queryFn: () => fetchClients(supabase, userId),
    }),
  ])

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <MileageView />
    </HydrationBoundary>
  )
}
