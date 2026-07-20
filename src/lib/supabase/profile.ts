import { cache } from 'react'
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