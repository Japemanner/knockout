import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query'
import { createClient, getUserId } from '@/lib/supabase/server'
import { ContentView } from '@/components/content/ContentView'
import { contentKeys, fetchPillars, fetchPosts } from '@/lib/content/queries'

// SSR-prefetch conform decisions/2026-09-22-uren-reads-browser-client.md: reads
// parallel vanaf de server, resultaten via dehydrate + HydrationBoundary naar
// de client; 0 server-action-calls voor reads na hydratie (SC-002/SC-003).
export default async function ContentPage() {
  const userId = await getUserId()
  if (!userId) return null

  const supabase = await createClient()
  const queryClient = new QueryClient()

  await Promise.all([
    queryClient.prefetchQuery({ queryKey: contentKeys.pillars, queryFn: () => fetchPillars(supabase, userId) }),
    queryClient.prefetchQuery({ queryKey: contentKeys.posts, queryFn: () => fetchPosts(supabase, userId) }),
  ])

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ContentView />
    </HydrationBoundary>
  )
}
