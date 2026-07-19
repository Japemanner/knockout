import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'

// Per-request dedup: if multiple server components in the same request
// need the profile, this ensures only one database round-trip.
// Selects only the columns actually used by the UI (full_name, role, avatar_url).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getProfile = cache(async (supabase: SupabaseClient<any, 'public', any>, userId: string) => {
  const { data } = await supabase
    .from('kk_profiles')
    .select('full_name, role, avatar_url')
    .eq('id', userId)
    .single()
  return data
})

// Cross-request cache: profiel verandert zelden, dus cache 5 minuten over alle
// requests van dezelfde user. Bespaart ~30-50ms per dashboard-navigatie.
// Maakt zelf de Supabase-client aan (unstable_cache requires serializable args).
const cachedProfileFetcher = unstable_cache(
  async (userId: string) => {
    const supabase = await createClient()
    const { data } = await supabase
      .from('kk_profiles')
      .select('full_name, role, avatar_url')
      .eq('id', userId)
      .single()
    return data
  },
  ['profile'],
  { revalidate: 300 },
)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getCachedProfile(supabase: SupabaseClient<any, 'public', any> | undefined, userId: string) {
  return cachedProfileFetcher(userId)
}