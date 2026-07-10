'use server'

import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type UntypedClient = SupabaseClient<any, 'public', any>

async function getSupabase(): Promise<UntypedClient> {
  return (await createClient()) as unknown as UntypedClient
}

export async function toggleStar(data: { cardId: string; isStarred: boolean }) {
  try {
    const supabase = await getSupabase()
    const { error } = await supabase.from('kk_cards').update({ is_starred: data.isStarred }).eq('id', data.cardId)
    if (error) return { success: false, error: error.message }

    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Onbekende fout' }
  }
}

export async function batchToggleStars(data: { cardIds: string[]; isStarred: boolean }) {
  try {
    const supabase = await getSupabase()
    const { error } = await supabase.rpc('kk_batch_toggle_stars', {
      p_card_ids: data.cardIds,
      p_is_starred: data.isStarred,
    })
    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Onbekende fout' }
  }
}