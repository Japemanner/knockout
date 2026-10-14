import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query'
import { createClient, getUserId } from '@/lib/supabase/server'
import { ContentView } from '@/components/content/ContentView'
import { monthGridRange } from '@/lib/content/calendar'
import { contentKeys, fetchIdeas, fetchMonthPosts, fetchPillarsWithSlots } from '@/lib/content/queries'
import { amsterdamTodayISO } from '@/lib/hours/dates'

// SSR-prefetch conform decisions/2026-09-22-uren-reads-browser-client.md:
// reads parallel vanaf de server, resultaten via dehydrate + HydrationBoundary
// naar de client; 0 server-action-calls voor reads na hydratie (SC-004).
export default async function ContentPage() {
  const userId = await getUserId()
  if (!userId) return null

  const supabase = await createClient()
  const queryClient = new QueryClient()

  const ym = amsterdamTodayISO().slice(0, 7)
  const { gridStart, gridEnd } = monthGridRange(ym)

  await Promise.all([
    queryClient.prefetchQuery({ queryKey: contentKeys.pillars, queryFn: () => fetchPillarsWithSlots(supabase, userId) }),
    queryClient.prefetchQuery({ queryKey: contentKeys.month(ym), queryFn: () => fetchMonthPosts(supabase, userId, gridStart, gridEnd) }),
    queryClient.prefetchQuery({ queryKey: contentKeys.ideas, queryFn: () => fetchIdeas(supabase, userId) }),
  ])

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ContentView initialYm={ym} />
    </HydrationBoundary>
  )
}